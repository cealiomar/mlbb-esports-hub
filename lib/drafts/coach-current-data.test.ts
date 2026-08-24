import { describe, expect, it } from 'vitest'
import { readSnapshot } from '@/lib/data/snapshots'
import type { DraftLeague } from '@/lib/data/types'
import {
  buildDraftCoachModel,
  buildDraftHistoryPriors,
  heroKey,
  nextSuggestedLane,
  openDraftLanes,
  recommendDraftHeroes,
  type HeroCatalogItem,
} from './coach'

function currentModel() {
  const leagues = readSnapshot<DraftLeague[]>('drafts')?.data ?? []
  const history = readSnapshot<DraftLeague[]>('draft-history')?.data ?? []
  const heroCatalog =
    readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []
  return buildDraftCoachModel(
    leagues,
    'all',
    null,
    buildDraftHistoryPriors(history),
    heroCatalog,
  )
}

describe('draft coach current tournament data', () => {
  it('does not repeat Roam after Kaja already covers it', () => {
    const model = currentModel()
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

  it('counts full-game bans so Mathilda is not hidden by a Top 5 summary', () => {
    const model = currentModel()
    const mathilda = model.heroByKey[heroKey('Mathilda')]
    const emptyState = {
      allyPicks: [],
      enemyPicks: [],
      allyBans: [],
      enemyBans: [],
    }
    const roamRecommendations = recommendDraftHeroes(model, {
      kind: 'pick',
      state: emptyState,
      plan: 'balanced',
      targetLane: 'roam',
      limit: 5,
    })

    expect(mathilda.exactGames).toBeGreaterThanOrEqual(15)
    expect(mathilda.exactBans).toBeGreaterThanOrEqual(20)
    expect(mathilda.presenceRate).toBeGreaterThan(0.5)
    expect(
      roamRecommendations.some((item) => heroKey(item.hero.name) === 'mathilda'),
    ).toBe(true)
  })
})
