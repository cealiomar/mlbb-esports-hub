import { describe, it, expect } from 'vitest'
import { getRegions, getRegionBySlug } from './regions'

describe('regions', () => {
  it('defines every MLBB region that has a league on Liquipedia', () => {
    expect(getRegions()).toHaveLength(11)
  })

  it('gives every region at least one tournament prefix to match on', () => {
    for (const r of getRegions()) {
      expect(r.matchPrefixes.length).toBeGreaterThan(0)
      for (const prefix of r.matchPrefixes) {
        expect(prefix).not.toMatch(/\s/)
      }
    }
  })

  it('harvests each region from a page under one of its prefixes', () => {
    for (const r of getRegions()) {
      expect(
        r.matchPrefixes.some((p) => r.liquipediaLeaguePage.startsWith(p)),
      ).toBe(true)
    }
  })

  it('never maps the same prefix to two regions', () => {
    const all = getRegions().flatMap((r) => r.matchPrefixes)
    expect(new Set(all).size).toBe(all.length)
  })

  it('gives every region a unique slug', () => {
    const slugs = getRegions().map((r) => r.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('gives every region plottable coordinates', () => {
    for (const r of getRegions()) {
      expect(r.lat).toBeGreaterThanOrEqual(-90)
      expect(r.lat).toBeLessThanOrEqual(90)
      expect(r.lng).toBeGreaterThanOrEqual(-180)
      expect(r.lng).toBeLessThanOrEqual(180)
    }
  })

  it('gives every region a hex accent colour', () => {
    for (const r of getRegions()) {
      expect(r.accent).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('looks a region up by slug', () => {
    expect(getRegionBySlug('indonesia')?.name.en).toBe('Indonesia')
  })

  it('returns undefined for an unknown slug', () => {
    expect(getRegionBySlug('atlantis')).toBeUndefined()
  })
})
