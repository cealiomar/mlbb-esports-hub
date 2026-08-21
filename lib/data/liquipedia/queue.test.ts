import { describe, it, expect } from 'vitest'
import { queueEntriesForRun, LEAGUES_PER_RUN } from './queue'
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
