import type { RegionDefinition } from '@/lib/content/regions'
import type { DraftLeague, Match } from '@/lib/data/types'

export interface QueueEntry {
  kind: 'league'
  page: string
  regionSlug: string
}

/** League pages fetched per hourly run, on top of the match ticker. */
export const LEAGUES_PER_RUN = 3

/** A completed game this much newer than the newest stored draft is new. */
const DRAFT_LAG_TOLERANCE_SECONDS = 60

function belongsToLeague(
  match: Pick<Match, 'tournamentPageSlug'>,
  leaguePage: string,
): boolean {
  return (
    match.tournamentPageSlug === leaguePage ||
    match.tournamentPageSlug.startsWith(`${leaguePage}/`)
  )
}

function seriesTime(series: DraftLeague['series'][number]): number {
  if (series.startsAt) return series.startsAt
  if (series.playedOn) {
    const parsed = Date.parse(series.playedOn)
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000)
  }
  return 0
}

/**
 * Regions whose league has finished a game that its stored drafts do not yet
 * cover, newest game first.
 *
 * Rosters and statistics rotate through every region, three per hour, so a
 * region used to wait up to four hours for its turn — even when it had just
 * played and the other slots went to regions between seasons. Fetching these
 * first means a finished game's picks and bans appear on the next full run.
 */
export function staleDraftRegions(
  regions: RegionDefinition[],
  matches: Pick<
    Match,
    'status' | 'regionSlug' | 'startsAt' | 'tournamentPageSlug'
  >[],
  drafts: Pick<DraftLeague, 'regionSlug' | 'series'>[],
): string[] {
  const newestDraft = new Map<string, number>()
  for (const league of drafts) {
    const newest = Math.max(0, ...league.series.map(seriesTime))
    newestDraft.set(
      league.regionSlug,
      Math.max(newestDraft.get(league.regionSlug) ?? 0, newest),
    )
  }

  const stale: Array<{ slug: string; latestGame: number }> = []
  for (const region of regions) {
    const latestGame = Math.max(
      0,
      ...matches
        .filter(
          (match) =>
            match.status === 'completed' &&
            match.regionSlug === region.slug &&
            belongsToLeague(match, region.liquipediaLeaguePage),
        )
        .map((match) => match.startsAt),
    )
    if (latestGame === 0) continue
    const covered = newestDraft.get(region.slug) ?? 0
    if (latestGame > covered + DRAFT_LAG_TOLERANCE_SECONDS) {
      stale.push({ slug: region.slug, latestGame })
    }
  }

  return stale
    .sort((a, b) => b.latestGame - a.latestGame)
    .map((item) => item.slug)
}

/**
 * Round-robins league pages in batches so every region refreshes within a few
 * hours at an hourly cadence. Rosters change far slower than that.
 *
 * `priority` regions — those with games their drafts do not cover yet — take
 * the front of the batch, but never all of it: at least one slot always goes
 * to the rotation, so a league that is slow to publish its drafts cannot
 * starve every other region of roster updates.
 */
export function queueEntriesForRun(
  regions: RegionDefinition[],
  runIndex: number,
  count: number = LEAGUES_PER_RUN,
  priority: string[] = [],
): QueueEntry[] {
  const size = Math.min(count, regions.length)
  if (size <= 0) return []

  const bySlug = new Map(regions.map((region) => [region.slug, region]))
  const reserved = size > 1 ? size - 1 : 0
  const chosen: RegionDefinition[] = []

  for (const slug of priority) {
    if (chosen.length >= reserved) break
    const region = bySlug.get(slug)
    if (region && !chosen.includes(region)) chosen.push(region)
  }

  const start = (runIndex * size) % regions.length
  for (let offset = 0; chosen.length < size && offset < regions.length; offset++) {
    const region = regions[(start + offset) % regions.length]
    if (!chosen.includes(region)) chosen.push(region)
  }

  return chosen.map((region) => ({
    kind: 'league' as const,
    page: region.liquipediaLeaguePage,
    regionSlug: region.slug,
  }))
}
