import type { RegionDefinition } from '@/lib/content/regions'

export interface QueueEntry {
  kind: 'league'
  page: string
  regionSlug: string
}

/** League pages fetched per hourly run, on top of the match ticker. */
export const LEAGUES_PER_RUN = 3

/**
 * Round-robins league pages in batches so every region refreshes within a few
 * hours at an hourly cadence. Rosters change far slower than that.
 */
export function queueEntriesForRun(
  regions: RegionDefinition[],
  runIndex: number,
  count: number = LEAGUES_PER_RUN,
): QueueEntry[] {
  const size = Math.min(count, regions.length)
  const start = (runIndex * size) % regions.length

  return Array.from({ length: size }, (_, offset) => {
    const region = regions[(start + offset) % regions.length]
    return {
      kind: 'league' as const,
      page: region.liquipediaLeaguePage,
      regionSlug: region.slug,
    }
  })
}
