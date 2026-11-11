import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Everything the site shows comes from JSON committed in the repository
 * root: snapshots written by the harvest, plus hand-edited content. It is
 * read at build time only — no page fetches anything while being served.
 */
const ROOT = join(process.cwd(), '..')

function readJson<T>(path: string, fallback: T): T {
  const file = join(ROOT, path)
  if (!existsSync(file)) return fallback
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch {
    return fallback
  }
}

function snapshot<T>(name: string, fallback: T): T {
  return readJson<{ data?: T }>(`data/snapshots/${name}.json`, {}).data ?? fallback
}

import type { Hero, Lane, Locale, Tier } from './data-types'

export { LANES, TIERS } from './data-types'
export type { Hero, Lane, Locale, Tier } from './data-types'

export interface Opponent {
  code: string
  name: string
  logoUrl: string | null
  score: number | null
  isWinner: boolean
}
export interface Match {
  id: string
  startsAt: number
  status: 'upcoming' | 'live' | 'completed'
  bestOf: number | null
  opponents: [Opponent, Opponent]
  tournamentName: string
  regionSlug: string | null
  streamUrls: string[]
}
export interface RosterPlayer {
  handle: string
  role: string | null
  country: string | null
  photo: string | null
}
export interface RosterTeam {
  slug: string
  name: string
  logo: string | null
  position: number | null
  wins: number | null
  losses: number | null
  gameDiff: number | null
  players: RosterPlayer[]
}
export interface Lesson {
  slug: string
  track: string
  role: 'all' | Lane
  minutes: number
  title: Record<Locale, string>
  summary: Record<Locale, string>
  points: Record<Locale, string[]>
  youtubeId?: string
}
export interface Track {
  id: string
  title: Record<Locale, string>
  summary: Record<Locale, string>
}

const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

export function getMatches(): Match[] {
  return snapshot<Match[]>('matches', []).sort((a, b) => a.startsAt - b.startsAt)
}

export function getPatch(): { version: string; updatedAt: string | null } {
  const meta = snapshot<{ version?: string; updatedAt?: string }>('patch-meta', {})
  return { version: meta.version ?? '—', updatedAt: meta.updatedAt ?? null }
}

/** Every hero of the patch with its tier, best first. */
export function getHeroes(): Hero[] {
  const meta = snapshot<{
    heroes?: Record<
      string,
      { lanes: Lane[]; tier: Tier; score: number; roles?: string[] }
    >
  }>('patch-meta', {}).heroes ?? {}
  const catalog = snapshot<
    { hero: { id: string; name: string }; imageUrl: string | null }[]
  >('hero-catalog', [])
  // The two sources spell some ids differently ("popolandkupa" against
  // "popol-and-kupa"), so they are joined on letters and digits only.
  const byKey = new Map(catalog.flatMap((item) => [
    [key(item.hero.id), item] as const,
    [key(item.hero.name), item] as const,
  ]))

  return Object.entries(meta)
    .map(([id, item]) => {
      const entry = byKey.get(key(id))
      return {
        id,
        name: entry?.hero.name ?? id,
        image: entry?.imageUrl ?? null,
        lane: item.lanes[0],
        lanes: item.lanes,
        tier: item.tier,
        score: item.score,
        roles: item.roles ?? [],
      }
    })
    .filter((hero) => hero.lane)
    .sort((a, b) => b.score - a.score)
}

interface StandingRow {
  position: number
  team: { name: string; pageSlug: string; logoUrl: string | null }
  matchWins: number | null
  matchLosses: number | null
  gameDiff: number | null
}

/** One region's teams with crest, record and portraits, by league position. */
export function getRoster(region = 'mena'): RosterTeam[] {
  const teams = snapshot<
    {
      pageSlug: string
      name: string
      logoUrl: string | null
      regionSlug: string | null
      roster: { handle: string; role: string | null; country: string | null }[]
    }[]
  >('teams', []).filter((team) => team.regionSlug === region)
  const rows = new Map(
    snapshot<{ regionSlug: string; rows: StandingRow[] }[]>('standings', [])
      .filter((table) => table.regionSlug === region)
      .flatMap((table) => table.rows)
      .map((row) => [key(row.team.pageSlug || row.team.name), row]),
  )
  // Keyed by team as well as handle: two clubs can field a namesake.
  const photos = new Map(
    snapshot<{ teamPageSlug: string; handle: string; photoUrl: string }[]>(
      'player-photos',
      [],
    ).map((photo) => [`${photo.teamPageSlug}\n${photo.handle}`, photo.photoUrl]),
  )

  return teams
    .map((team) => {
      const row = rows.get(key(team.pageSlug)) ?? rows.get(key(team.name))
      return {
        slug: team.pageSlug,
        name: team.name,
        logo: team.logoUrl ?? row?.team.logoUrl ?? null,
        position: row?.position ?? null,
        wins: row?.matchWins ?? null,
        losses: row?.matchLosses ?? null,
        gameDiff: row?.gameDiff ?? null,
        players: team.roster.map((player) => ({
          handle: player.handle,
          role: player.role === 'jgl' ? 'jungle' : player.role,
          country: player.country,
          photo: photos.get(`${team.pageSlug}\n${player.handle}`) ?? null,
        })),
      }
    })
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
}

export function getTracks(): Track[] {
  return readJson<{ tracks?: Track[] }>('content/academy.json', {}).tracks ?? []
}

export function getLessons(): Lesson[] {
  return readJson<{ lessons?: Lesson[] }>('content/academy.json', {}).lessons ?? []
}

/** Country code to flag emoji. Liquipedia writes Britain as `uk`. */
export function flag(country: string | null): string | null {
  if (!country) return null
  const code = (country === 'uk' ? 'gb' : country).toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  return String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  )
}

/** Match times are shown in Cairo time, the audience's reference clock. */
export function formatWhen(unix: number, locale: Locale): { day: string; time: string } {
  const date = new Date(unix * 1000)
  const tag = locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB'
  return {
    day: new Intl.DateTimeFormat(tag, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Africa/Cairo',
    }).format(date),
    time: new Intl.DateTimeFormat(tag, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Africa/Cairo',
    }).format(date),
  }
}
