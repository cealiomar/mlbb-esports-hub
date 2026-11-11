import { describe, expect, it } from 'vitest'
import type { PatchHeroMeta } from '@/lib/drafts/current-patch-meta'
import { metaFive, topHeroesForLane } from './meta'

const meta: Record<string, PatchHeroMeta> = {
  alpha: { lanes: ['exp', 'jungle'], tier: 'S', score: 0.8 },
  beta: { lanes: ['exp'], tier: 'A', score: 0.6 },
  gamma: { lanes: ['jungle'], tier: 'SS', score: 0.9 },
  delta: { lanes: ['mid'], tier: 'B', score: 0.5 },
}

const heroes = {
  alpha: { name: 'Alpha', imageUrl: '/heroes/alpha.png' },
  gamma: { name: 'Gamma', imageUrl: null },
}

describe('topHeroesForLane', () => {
  it('ranks a lane by score, best first', () => {
    expect(
      topHeroesForLane(meta, heroes, 'exp', 5).map((hero) => hero.id),
    ).toEqual(['alpha', 'beta'])
  })

  it('lists a flex hero under its primary lane only', () => {
    expect(
      topHeroesForLane(meta, heroes, 'jungle', 5).map((hero) => hero.id),
    ).toEqual(['gamma'])
  })

  it('respects the limit', () => {
    expect(topHeroesForLane(meta, heroes, 'exp', 1)).toHaveLength(1)
  })

  it('falls back to the id when the catalogue has no entry', () => {
    const [, beta] = topHeroesForLane(meta, heroes, 'exp', 5)
    expect(beta).toMatchObject({ name: 'beta', imageUrl: null })
  })
})

describe('metaFive', () => {
  it('returns one hero per lane and skips lanes with none', () => {
    expect(metaFive(meta, heroes).map((entry) => entry.lane)).toEqual([
      'exp',
      'jungle',
      'mid',
    ])
  })
})
