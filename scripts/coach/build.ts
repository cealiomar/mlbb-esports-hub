/**
 * Pure assembly of the coach data set from parsed pages. No network, no
 * filesystem: build-coach-data.ts feeds it and writes the result; the tests
 * feed it fixtures.
 */
import { createHash } from 'node:crypto'
import type { DraftLeague, DraftSeries, DraftTeam } from '@/lib/data/types'
import { patchForDate, type PatchRelease } from './patches'

export type TournamentKind = 'mpl' | 'national' | 'international'

export interface Family {
  slug: string
  kind: TournamentKind
  label: string
  /** Season root page slug, underscores, e.g. "MPL/Indonesia/Season_18". */
  root: string
  /** regionSlug carried into drafts.json ("indonesia", or "international"). */
  regionSlug: string
  /**
   * Parse every subpage (up to two levels) instead of only recognised stage
   * names: MCT splits keep national qualifiers (Japan, South Korea, Laos)
   * under the split page, and those hold the only games some teams play.
   */
  includeAll?: boolean
}

export interface PageState {
  family: string
  parsedAt: string
  series: DraftSeries[]
}

export interface CoachState {
  pages: Record<string, PageState>
  patches: PatchRelease[]
  patchPagesSeen: string[]
}

export type CoachSeries = DraftSeries & { patch: string | null }
export type CoachLeague = Omit<DraftLeague, 'series'> & { tournamentKind: TournamentKind; series: CoachSeries[] }

export interface CoachTeam {
  pageSlug: string
  name: string
  regionSlug: string
  games: number
  wildcard: boolean
}

export interface Manifest {
  generatedAt: string
  currentPatch: string | null
  files: Record<string, { sha256: string; bytes: number }>
  counts: { games: number; tournaments: number; teams: number; patches: number }
}

export function emptyState(): CoachState {
  return { pages: {}, patches: [], patchPagesSeen: [] }
}

export function assignPatch(series: DraftSeries, patches: PatchRelease[]): CoachSeries {
  const date = series.playedOn ?? (series.startsAt ? new Date(series.startsAt * 1000).toISOString().slice(0, 10) : null)
  return { ...series, patch: patchForDate(patches, date) }
}

/** One league per family; series from every parsed page under it, newest first. */
export function buildLeagues(state: CoachState, families: Family[]): CoachLeague[] {
  const byFamily = new Map(families.map((family) => [family.slug, family]))
  const grouped = new Map<string, CoachSeries[]>()
  for (const page of Object.values(state.pages)) {
    if (!byFamily.has(page.family)) continue
    const list = grouped.get(page.family) ?? []
    for (const series of page.series) list.push(assignPatch(series, state.patches))
    grouped.set(page.family, list)
  }
  const leagues: CoachLeague[] = []
  for (const family of families) {
    const series = grouped.get(family.slug)
    if (!series || series.length === 0) continue
    const unique = new Map<string, CoachSeries>()
    for (const item of series) unique.set(item.id, item)
    const sorted = [...unique.values()].sort((a, b) => (b.startsAt ?? 0) - (a.startsAt ?? 0) || (b.playedOn ?? '').localeCompare(a.playedOn ?? ''))
    leagues.push({
      regionSlug: family.regionSlug,
      leagueName: family.label,
      leaguePageSlug: family.root,
      tournamentKind: family.kind,
      gamesAnalyzed: sorted.reduce((sum, item) => sum + item.games.length, 0),
      heroStats: [],
      series: sorted,
    })
  }
  return canonicalTeams(leagues)
}

/**
 * Liquipedia pages spell the same team differently ("Titan Esports Club AR"
 * on one page, "titan esports club ar" on another). Merge by lower-cased slug
 * and keep the best-cased spelling so scouting and team search see one team.
 */
export function canonicalTeams(leagues: CoachLeague[]): CoachLeague[] {
  const best = new Map<string, DraftTeam>()
  const key = (team: DraftTeam) => (team.pageSlug || team.name).toLowerCase()
  const score = (team: DraftTeam) => (team.name.match(/[A-Z]/g) ?? []).length
  for (const league of leagues) {
    for (const series of league.series) {
      for (const team of [series.team1, series.team2]) {
        const current = best.get(key(team))
        if (!current || score(team) > score(current)) best.set(key(team), { name: team.name, pageSlug: team.pageSlug || team.name })
      }
    }
  }
  return leagues.map((league) => ({
    ...league,
    series: league.series.map((series) => ({
      ...series,
      team1: best.get(key(series.team1)) ?? series.team1,
      team2: best.get(key(series.team2)) ?? series.team2,
    })),
  }))
}

export function buildTeams(leagues: CoachLeague[]): CoachTeam[] {
  const teams = new Map<string, CoachTeam>()
  for (const league of leagues) {
    for (const series of league.series) {
      const wildcard = /wild[_ ]?card/i.test(series.tournamentPageSlug)
      for (const team of [series.team1, series.team2]) {
        const slug = team.pageSlug || team.name
        const entry = teams.get(slug) ?? { pageSlug: slug, name: team.name, regionSlug: league.regionSlug, games: 0, wildcard: false }
        entry.games += series.games.length
        entry.wildcard = entry.wildcard || wildcard
        teams.set(slug, entry)
      }
    }
  }
  return [...teams.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export function buildManifest(
  files: Record<string, string>,
  leagues: CoachLeague[],
  teams: CoachTeam[],
  patches: PatchRelease[],
  now: Date,
): Manifest {
  const today = now.toISOString().slice(0, 10)
  return {
    generatedAt: now.toISOString(),
    currentPatch: patchForDate(patches, today),
    files: Object.fromEntries(Object.entries(files).map(([name, text]) => [name, { sha256: sha256(text), bytes: Buffer.byteLength(text) }])),
    counts: {
      games: leagues.reduce((sum, league) => sum + league.gamesAnalyzed, 0),
      tournaments: leagues.length,
      teams: teams.length,
      patches: patches.length,
    },
  }
}

/** Seed page state from the site's existing drafts snapshot (offline mode / first run). */
export function seedFromSnapshot(leagues: DraftLeague[], families: Family[], now: Date): CoachState['pages'] {
  const pages: CoachState['pages'] = {}
  for (const league of leagues) {
    const family = families.find((item) => item.regionSlug === league.regionSlug)
    if (!family) continue
    for (const series of league.series) {
      const page = pages[series.tournamentPageSlug] ?? { family: family.slug, parsedAt: now.toISOString(), series: [] }
      page.series.push(series)
      pages[series.tournamentPageSlug] = page
    }
  }
  return pages
}
