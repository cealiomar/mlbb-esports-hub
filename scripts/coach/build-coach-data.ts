/**
 * Daily coach data job. Covers every official tournament listed in
 * content/regions.json (MPL and national leagues) and
 * content/official-tournaments.json (MSC, M-series), assigns each series to
 * the patch it was played on, and writes data/coach/*.json for the iOS app.
 *
 *   npm run coach:daily              harvest within the parse budget, then write
 *   npm run coach:offline            no network: rebuild from state + snapshots
 *   COACH_MAX_PARSES=40 ...          lower the Liquipedia parse budget (default 90)
 *   ... -- --full                    re-parse pages even if parsed in the last 20 h
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseDraftSeries } from '@/lib/data/liquipedia/parse-drafts'
import { newerSeasonPage } from '@/lib/data/liquipedia/season-drift'
import { isOk } from '@/lib/data/source'
import { readSnapshot } from '@/lib/data/snapshots'
import { getRegions } from '@/lib/content/regions'
import type { DraftLeague } from '@/lib/data/types'
import officialTournaments from '@/content/official-tournaments.json'
import {
  buildLeagues,
  buildManifest,
  buildTeams,
  emptyState,
  seedFromSnapshot,
  type CoachState,
  type Family,
  type TournamentKind,
} from './build'
import { createCoachLiquipedia, slugOf, titleOf, type CoachLiquipedia } from './liquipedia'
import { baseVersion, mergePatches, parseReleaseDate, type PatchRelease } from './patches'

const OUT_DIR = path.join(process.cwd(), 'data', 'coach')
const STATE_FILE = path.join(OUT_DIR, 'state.json')
const STAGE_WORDS = ['Regular Season', 'Playoffs', 'Group Stage', 'Knockout Stage', 'Swiss Stage', 'Wildcard', 'Wild Card', 'Play-In', 'Main Event', 'Grand Final', 'Week ']
const SKIP_WORDS = ['Statistics', 'Additional Content', 'Qualification', 'Qualifier', 'Broadcast', 'Talent']
const FRESH_HOURS = 20

const offline = process.argv.includes('--offline')
const full = process.argv.includes('--full')
const maxParses = Number.parseInt(process.env.COACH_MAX_PARSES ?? '90', 10)

function families(): Family[] {
  const regional: Family[] = getRegions().map((region) => ({
    slug: region.slug,
    kind: (region.liquipediaLeaguePage.startsWith('MPL/') ? 'mpl' : 'national') as TournamentKind,
    label: region.leagueName,
    root: region.liquipediaLeaguePage,
    regionSlug: region.slug,
  }))
  const international: Family[] = (officialTournaments as Array<{ slug: string; kind: TournamentKind; label: string; root: string }>).map((item) => ({
    slug: item.slug,
    kind: item.kind,
    label: item.label,
    root: slugOf(item.root),
    regionSlug: 'international',
  }))
  return [...regional, ...international]
}

function readState(): CoachState {
  if (!existsSync(STATE_FILE)) return emptyState()
  return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as CoachState
}

function isStagePage(title: string, root: string): boolean {
  const normalized = slugOf(title)
  if (!normalized.startsWith(`${root}/`)) return false
  const rest = normalized.slice(root.length + 1)
  if (rest.includes('/')) return false
  if (SKIP_WORDS.some((word) => titleOf(rest).includes(word))) return false
  return STAGE_WORDS.some((word) => titleOf(rest).includes(word))
}

/** Season roots: the configured page plus a newer numbered season when one exists. */
async function seasonRoots(api: CoachLiquipedia, family: Family): Promise<string[]> {
  const roots = [family.root]
  const stem = family.root.match(/^(.*\/Season_)\d+$/)?.[1]
  if (stem) {
    const titles = await api.listPages(titleOf(stem), 50)
    const newer = newerSeasonPage(family.root, titles)
    if (newer) roots.push(newer)
  }
  return roots
}

async function discoverPages(api: CoachLiquipedia, family: Family): Promise<string[]> {
  const pages: string[] = []
  for (const root of await seasonRoots(api, family)) {
    pages.push(root)
    const titles = await api.listPages(`${titleOf(root)}/`, 50)
    for (const title of titles) if (isStagePage(title, root)) pages.push(slugOf(title))
  }
  return [...new Set(pages)]
}

async function harvest(state: CoachState, list: Family[]): Promise<void> {
  const api = createCoachLiquipedia()
  let parses = 0
  const budgetLeft = () => parses < maxParses

  // 1. Patch calendar: only pages never seen before cost a parse.
  const patchTitles = await api.listPages('Patch 2.', 100)
  const seen = new Set(state.patchPagesSeen)
  const found: PatchRelease[] = [...state.patches]
  for (const title of patchTitles) {
    if (seen.has(title) || !budgetLeft()) continue
    const version = baseVersion(title)
    if (!version) { seen.add(title); continue }
    const result = await api.client.parsePage(slugOf(title), 'wikitext')
    parses += 1
    if (!isOk(result)) { console.warn(`patch page skipped ${title}: ${result.error}`); continue }
    const releasedAt = parseReleaseDate(result.value)
    seen.add(title)
    if (releasedAt) found.push({ version, page: title, releasedAt })
    else console.warn(`no release date on ${title}`)
  }
  state.patches = mergePatches(found)
  state.patchPagesSeen = [...seen]

  // 2. Tournament pages, least recently parsed first.
  const wanted: Array<{ page: string; family: Family }> = []
  for (const family of list) {
    try {
      for (const page of await discoverPages(api, family)) wanted.push({ page, family })
    } catch (error) {
      console.warn(`discovery failed for ${family.slug}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const cutoff = Date.now() - FRESH_HOURS * 3600 * 1000
  const queue = wanted
    .filter(({ page }) => full || !state.pages[page] || Date.parse(state.pages[page].parsedAt) < cutoff)
    .sort((a, b) => Date.parse(state.pages[a.page]?.parsedAt ?? '1970-01-01') - Date.parse(state.pages[b.page]?.parsedAt ?? '1970-01-01'))
  console.log(`${wanted.length} tournament pages known, ${queue.length} due, budget ${maxParses - parses} parses`)

  for (const { page, family } of queue) {
    if (!budgetLeft()) { console.log('parse budget reached; remaining pages wait for the next run'); break }
    const result = await api.client.parsePage(page, 'wikitext')
    parses += 1
    if (!isOk(result)) { console.warn(`skipped ${page}: ${result.error}`); continue }
    const series = parseDraftSeries(result.value, { regionSlug: family.regionSlug, leagueName: family.label, leaguePageSlug: page })
    state.pages[page] = { family: family.slug, parsedAt: new Date().toISOString(), series }
    console.log(`${page}: ${series.length} series, ${series.reduce((sum, item) => sum + item.games.length, 0)} games`)
  }
  console.log(`${parses} parse requests used`)
}

function writeOutputs(state: CoachState, list: Family[], now: Date): void {
  const snapshotDir = path.join(process.cwd(), 'data', 'snapshots')
  const leagues = buildLeagues(state, list)
  const teams = buildTeams(leagues)
  const harvestedAt = Math.floor(now.getTime() / 1000)
  const files: Record<string, string> = {
    'drafts.json': JSON.stringify({ harvestedAt, data: leagues }),
    'patches.json': JSON.stringify({ harvestedAt, data: state.patches }),
    'teams.json': JSON.stringify({ harvestedAt, data: teams }),
    'patch-meta.json': readFileSync(path.join(snapshotDir, 'patch-meta.json'), 'utf8'),
    'hero-catalog.json': readFileSync(path.join(snapshotDir, 'hero-catalog.json'), 'utf8'),
  }
  const manifest = buildManifest(files, leagues, teams, state.patches, now)
  mkdirSync(OUT_DIR, { recursive: true })
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(OUT_DIR, name), text)
  writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
  writeFileSync(STATE_FILE, JSON.stringify(state))
  console.log(`wrote data/coach: ${manifest.counts.games} games, ${manifest.counts.tournaments} tournaments, ${manifest.counts.teams} teams, patch ${manifest.currentPatch ?? 'unknown'}`)
}

async function main(): Promise<void> {
  const list = families()
  const state = readState()
  const now = new Date()
  if (Object.keys(state.pages).length === 0) {
    const snapshot = readSnapshot<DraftLeague[]>('drafts')?.data ?? []
    state.pages = seedFromSnapshot(snapshot, list, now)
    console.log(`seeded ${Object.keys(state.pages).length} pages from data/snapshots/drafts.json`)
  }
  if (!offline) await harvest(state, list)
  writeOutputs(state, list, now)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
