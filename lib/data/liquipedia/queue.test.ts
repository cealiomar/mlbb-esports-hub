import { describe, it, expect } from 'vitest'
import { queueEntriesForRun, LEAGUES_PER_RUN, staleDraftRegions } from './queue'
import { getRegions } from '@/lib/content/regions'

describe('harvest queue', () => {
  it('returns LEAGUES_PER_RUN entries by default', () => {
    expect(queueEntriesForRun(getRegions(), 0)).toHaveLength(LEAGUES_PER_RUN)
  })

  it('starts at the first region on run zero', () => {
    const regions = getRegions()
    const [first] = queueEntriesForRun(regions, 0)
    expect(first.kind).toBe('league')
    expect(first.page).toBe(regions[0].liquipediaLeaguePage)
    expect(first.regionSlug).toBe(regions[0].slug)
  })

  it('advances by a whole batch each run', () => {
    const regions = getRegions()
    const [first] = queueEntriesForRun(regions, 1)
    expect(first.regionSlug).toBe(regions[LEAGUES_PER_RUN % regions.length].slug)
  })

  it('never repeats a region within one run', () => {
    const entries = queueEntriesForRun(getRegions(), 3)
    const slugs = entries.map((e) => e.regionSlug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('covers every region within a full rotation', () => {
    const regions = getRegions()
    const runs = Math.ceil(regions.length / LEAGUES_PER_RUN)
    const seen = new Set<string>()
    for (let i = 0; i < runs; i++) {
      for (const e of queueEntriesForRun(regions, i)) seen.add(e.regionSlug)
    }
    expect(seen.size).toBe(regions.length)
  })

  it('handles a run index far in the future', () => {
    const regions = getRegions()
    const entries = queueEntriesForRun(regions, 10_000)
    expect(entries).toHaveLength(LEAGUES_PER_RUN)
    for (const e of entries) {
      expect(regions.some((r) => r.slug === e.regionSlug)).toBe(true)
    }
  })

  it('caps the batch when fewer regions exist than the batch size', () => {
    const two = getRegions().slice(0, 2)
    expect(queueEntriesForRun(two, 0)).toHaveLength(2)
  })
})

describe('draft freshness priority', () => {
  const regions = getRegions()
  const [first, second, third] = regions
  const completed = (regionSlug: string, page: string, startsAt: number) => ({
    status: 'completed' as const,
    regionSlug,
    startsAt,
    tournamentPageSlug: `${page}/Regular_Season`,
  })

  it('flags a region whose newest finished game is newer than its drafts', () => {
    const stale = staleDraftRegions(
      regions,
      [completed(first.slug, first.liquipediaLeaguePage, 2_000)],
      [{ regionSlug: first.slug, series: [{ startsAt: 1_000 } as never] }],
    )
    expect(stale).toEqual([first.slug])
  })

  it('leaves a region alone once its drafts cover the latest game', () => {
    const stale = staleDraftRegions(
      regions,
      [completed(first.slug, first.liquipediaLeaguePage, 2_000)],
      [{ regionSlug: first.slug, series: [{ startsAt: 2_000 } as never] }],
    )
    expect(stale).toEqual([])
  })

  it('treats a region with games but no drafts at all as stale', () => {
    expect(
      staleDraftRegions(
        regions,
        [completed(second.slug, second.liquipediaLeaguePage, 5_000)],
        [],
      ),
    ).toEqual([second.slug])
  })

  it('ignores games from other competitions in the same region', () => {
    expect(
      staleDraftRegions(
        regions,
        [completed(first.slug, 'Some_Other_Cup/2026', 9_000)],
        [],
      ),
    ).toEqual([])
  })

  it('orders stale regions newest game first', () => {
    const stale = staleDraftRegions(
      regions,
      [
        completed(first.slug, first.liquipediaLeaguePage, 1_000),
        completed(second.slug, second.liquipediaLeaguePage, 3_000),
      ],
      [],
    )
    expect(stale).toEqual([second.slug, first.slug])
  })

  it('puts priority regions at the front of the batch', () => {
    const entries = queueEntriesForRun(regions, 0, 3, [third.slug])
    expect(entries[0].regionSlug).toBe(third.slug)
    expect(entries).toHaveLength(3)
  })

  it('always leaves at least one slot for the rotation', () => {
    const everything = regions.map((r) => r.slug).reverse()
    const entries = queueEntriesForRun(regions, 0, 3, everything)
    const rotationHead = queueEntriesForRun(regions, 0, 3)[0].regionSlug
    expect(entries.map((e) => e.regionSlug)).toContain(rotationHead)
  })

  it('never repeats a region when priority and rotation overlap', () => {
    const entries = queueEntriesForRun(regions, 0, 3, [first.slug])
    const slugs = entries.map((e) => e.regionSlug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('behaves exactly as before with no priority', () => {
    expect(queueEntriesForRun(regions, 5, 3, [])).toEqual(
      queueEntriesForRun(regions, 5, 3),
    )
  })
})
