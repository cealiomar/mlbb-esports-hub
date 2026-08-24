import { describe, expect, it } from 'vitest'
import { readSnapshot } from '@/lib/data/snapshots'
import type { DraftLeague } from '@/lib/data/types'
import {
  buildDraftCoachModel,
  buildDraftHistoryPriors,
  nextSuggestedLane,
  openDraftLanes,
  recommendDraftHeroes,
  type HeroCatalogItem,
} from './coach'

describe('draft coach current tournament data', () => {
  it('does not repeat Roam after Kaja already covers it', () => {
    const leagues = readSnapshot<DraftLeague[]>('drafts')?.data ?? []
    const history = readSnapshot<DraftLeague[]>('draft-history')?.data ?? []
    const heroCatalog =
      readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []
    const model = buildDraftCoachModel(
      leagues,
      'all',
      null,
      buildDraftHistoryPriors(history),
      heroCatalog,
    )
    const state = {
      allyPicks: ['Kaja'],
      enemyPicks: ['Marcel', 'Kalea'],
      allyBans: [],
      enemyBans: [],
    }
    const recommendations = recommendDraftHeroes(model, {
      kind: 'pick',
      state,
      plan: 'balanced',
      targetLane: nextSuggestedLane(model, state.allyPicks),
      limit: 5,
    })

    expect(openDraftLanes(model, state.allyPicks)).toEqual([
      'exp',
      'jungle',
      'mid',
      'gold',
    ])
    expect(recommendations).toHaveLength(5)
    expect(
      new Set(recommendations.map((item) => item.suggestedLane)).size,
    ).toBe(4)
    expect(
      recommendations.every((item) => item.suggestedLane !== 'roam'),
    ).toBe(true)
  })
})
