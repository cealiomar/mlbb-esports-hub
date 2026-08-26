import { describe, expect, it } from 'vitest'
import { readSnapshot } from '@/lib/data/snapshots'
import type { DraftLeague } from '@/lib/data/types'
import {
  buildDraftCoachModel,
  compareCompletedDrafts,
  currentSeasonDraftLeagues,
  DRAFT_PLANS,
  heroKey,
  nextSuggestedLane,
  openDraftLanes,
  recommendDraftDuos,
  recommendDraftHeroes,
  suggestedLaneForHero,
  type DraftCoachState,
  type DraftLane,
  type HeroCatalogItem,
} from './coach'
import {
  CURRENT_PATCH_META,
  PATCH_META_VERSION,
} from './current-patch-meta'

function currentModel() {
  const leagues = readSnapshot<DraftLeague[]>('drafts')?.data ?? []
  const heroCatalog =
    readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []
  return buildDraftCoachModel(leagues, 'all', null, heroCatalog)
}

describe('draft coach current tournament data', () => {
  it('has current-patch role data for every hero in the 133-hero catalog', () => {
    const heroCatalog =
      readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []
    const catalogKeys = new Set(
      heroCatalog.map((item) => heroKey(item.hero.id || item.hero.name)),
    )

    expect(PATCH_META_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    expect(heroCatalog).toHaveLength(133)
    expect(Object.keys(CURRENT_PATCH_META)).toHaveLength(133)
    expect(
      heroCatalog.filter(
        (item) =>
          !CURRENT_PATCH_META[heroKey(item.hero.id || item.hero.name)]?.lanes
            .length,
      ),
    ).toEqual([])
    expect(
      Object.keys(CURRENT_PATCH_META).filter((key) => !catalogKeys.has(key)),
    ).toEqual([])
  })

  it('excludes regions that have no complete current-season game', () => {
    const leagues = readSnapshot<DraftLeague[]>('drafts')?.data ?? []
    const active = currentSeasonDraftLeagues(leagues)
    const regions = active.map((league) => league.regionSlug)

    expect(regions).toContain('indonesia')
    expect(regions).not.toContain('cambodia')
    expect(regions).not.toContain('mena')
  })

  it('reads all four map variants for Philippines after piped team comments', () => {
    const leagues = readSnapshot<DraftLeague[]>('drafts')?.data ?? []
    const heroCatalog =
      readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []
    const philippines = buildDraftCoachModel(
      leagues,
      'philippines',
      null,
      heroCatalog,
    )

    expect(philippines.maps.map((map) => map.name).sort()).toEqual([
      'Broken Walls',
      'Dangerous Grass',
      'Expanding Rivers',
      'Flying Cloud',
    ])
  })

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

  it('locks Mid after a manually selected Mage and never suggests another Mid', () => {
    const model = currentModel()
    const state: DraftCoachState = {
      allyPicks: ["Chang'e"],
      allyPickLanes: ['mid'],
      enemyPicks: [],
      enemyPickLanes: [],
      allyBans: [],
      enemyBans: [],
    }
    const recommendations = recommendDraftHeroes(model, {
      kind: 'pick',
      state,
      plan: 'balanced',
      limit: 5,
    })

    expect(suggestedLaneForHero(model, "Chang'e", [], [])).toBe('mid')
    expect(openDraftLanes(model, state.allyPicks, state.allyPickLanes)).toEqual([
      'exp',
      'jungle',
      'gold',
      'roam',
    ])
    expect(
      recommendations.every((item) => item.suggestedLane !== 'mid'),
    ).toBe(true)
  })

  it('keeps a flex pick locked to the role actually chosen by the drafter', () => {
    const model = currentModel()

    for (const lane of ['jungle', 'mid'] satisfies DraftLane[]) {
      expect(openDraftLanes(model, ['Gusion'], [lane])).not.toContain(lane)
      const recommendations = recommendDraftHeroes(model, {
        kind: 'pick',
        state: {
          allyPicks: ['Gusion'],
          allyPickLanes: [lane],
          enemyPicks: [],
          enemyPickLanes: [],
          allyBans: [],
          enemyBans: [],
        },
        plan: 'balanced',
        limit: 5,
      })
      expect(
        recommendations.every((item) => item.suggestedLane !== lane),
      ).toBe(true)
    }
  })

  it('keeps every catalog hero in a valid role and closes that role after pick', () => {
    const model = currentModel()
    const failures: string[] = []

    for (const profile of model.heroes) {
      const assignedLane = suggestedLaneForHero(model, profile.key, [], [])
      if (!assignedLane) {
        failures.push(`${profile.hero.name}: no role`)
        continue
      }
      const state: DraftCoachState = {
        allyPicks: [profile.key],
        allyPickLanes: [assignedLane],
        enemyPicks: [],
        enemyPickLanes: [],
        allyBans: [],
        enemyBans: [],
      }
      const recommendations = recommendDraftHeroes(model, {
        kind: 'pick',
        state,
        plan: 'balanced',
        limit: 5,
      })
      if (
        recommendations.some(
          (recommendation) =>
            recommendation.suggestedLane === assignedLane ||
            recommendation.suggestedLane === null,
        )
      ) {
        failures.push(`${profile.hero.name}: repeated ${assignedLane}`)
      }
    }

    expect(failures).toEqual([])
  })

  it('completes five unique roles for every plan in every active region', () => {
    const leagues = readSnapshot<DraftLeague[]>('drafts')?.data ?? []
    const heroCatalog =
      readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []
    const regions = ['all', 'indonesia', 'philippines', 'malaysia']

    for (const region of regions) {
      const model = buildDraftCoachModel(leagues, region, null, heroCatalog)
      for (const plan of DRAFT_PLANS) {
        const state: DraftCoachState = {
          allyPicks: [],
          allyPickLanes: [],
          enemyPicks: [],
          enemyPickLanes: [],
          allyBans: [],
          enemyBans: [],
        }

        for (let pickIndex = 0; pickIndex < 5; pickIndex += 1) {
          const before = openDraftLanes(
            model,
            state.allyPicks,
            state.allyPickLanes,
          )
          expect(before).toHaveLength(5 - pickIndex)
          const targetLane = nextSuggestedLane(
            model,
            state.allyPicks,
            state.allyPickLanes,
          )
          const recommendation = recommendDraftHeroes(model, {
            kind: 'pick',
            state,
            plan,
            targetLane,
            limit: 5,
          })[0]

          expect(recommendation, `${region}/${plan}/pick-${pickIndex + 1}`).toBeDefined()
          expect(before).toContain(recommendation.suggestedLane)
          state.allyPicks.push(recommendation.hero.id)
          state.allyPickLanes?.push(recommendation.suggestedLane as DraftLane)
        }

        expect(
          openDraftLanes(model, state.allyPicks, state.allyPickLanes),
        ).toEqual([])
        expect(new Set(state.allyPickLanes)).toHaveProperty('size', 5)
      }
    }
  })

  it('keeps patch-only heroes in the pool but never auto-recommends them', () => {
    const model = currentModel()
    const midRecommendations = recommendDraftHeroes(model, {
      kind: 'pick',
      state: {
        allyPicks: [],
        allyPickLanes: [],
        enemyPicks: [],
        enemyPickLanes: [],
        allyBans: [],
        enemyBans: [],
      },
      plan: 'balanced',
      targetLane: 'mid',
      limit: model.heroes.length,
    })
    const change = midRecommendations.find(
      (item) => heroKey(item.hero.name) === 'change',
    )

    expect(change).toBeUndefined()
    expect(suggestedLaneForHero(model, "Chang'e", [], [])).toBe('mid')
  })

  it('only recommends bans for roles the opponent still needs in phase two', () => {
    const model = currentModel()
    const state: DraftCoachState = {
      allyPicks: ['Melissa', 'Uranus', 'Rafaela'],
      allyPickLanes: ['gold', 'exp', 'mid'],
      enemyPicks: ['Novaria', 'Barats', 'Mathilda'],
      enemyPickLanes: ['mid', 'exp', 'roam'],
      allyBans: ['Freya', 'Atlas', 'Marcel'],
      enemyBans: ['Paquito', 'Hirara', 'Fanny'],
    }
    const bans = recommendDraftHeroes(model, {
      kind: 'ban',
      state,
      plan: 'balanced',
      phase: 2,
      limit: 10,
    })

    expect(openDraftLanes(model, state.enemyPicks, state.enemyPickLanes)).toEqual([
      'jungle',
      'gold',
    ])
    expect(bans.length).toBeGreaterThan(0)
    expect(
      bans.every(
        (recommendation) =>
          recommendation.suggestedLane === 'jungle' ||
          recommendation.suggestedLane === 'gold',
      ),
    ).toBe(true)
    expect(bans.map((item) => item.hero.name)).not.toContain('Eudora')
  })

  it('puts Harley first when Jungle is missing in the reported scenario', () => {
    const model = currentModel()
    const recommendations = recommendDraftHeroes(model, {
      kind: 'pick',
      state: {
        allyPicks: ['Melissa', 'Uranus', 'Rafaela', 'Gloo'],
        allyPickLanes: ['gold', 'exp', 'mid', 'roam'],
        enemyPicks: ['Novaria', 'Barats', 'Mathilda', 'Suyou', 'Brody'],
        enemyPickLanes: ['mid', 'exp', 'roam', 'jungle', 'gold'],
        allyBans: ['Freya', 'Atlas', 'Marcel', 'Belerick'],
        enemyBans: ['Paquito', 'Hirara', 'Fanny', 'Nolan'],
      },
      plan: 'balanced',
      targetLane: 'jungle',
      limit: 5,
    })

    expect(recommendations[0].hero.name).toBe('Harley')
    expect(recommendations[0].suggestedLane).toBe('jungle')
    expect(recommendations[0].pickRate).toBeGreaterThan(
      recommendations[1].pickRate,
    )
    expect(recommendations[0].reasons).toContain('composition')
  })

  it('compares two completed drafts conservatively and symmetrically', () => {
    const model = currentModel()
    const state: DraftCoachState = {
      allyPicks: ['Uranus', 'Harley', 'Novaria', 'Brody', 'Mathilda'],
      allyPickLanes: ['exp', 'jungle', 'mid', 'gold', 'roam'],
      enemyPicks: ['Barats', 'Suyou', 'Eudora', 'Melissa', 'Gloo'],
      enemyPickLanes: ['exp', 'jungle', 'mid', 'gold', 'roam'],
      allyBans: [],
      enemyBans: [],
    }
    const comparison = compareCompletedDrafts(model, state)
    const reversed = compareCompletedDrafts(model, {
      ...state,
      allyPicks: state.enemyPicks,
      allyPickLanes: state.enemyPickLanes,
      enemyPicks: state.allyPicks,
      enemyPickLanes: state.allyPickLanes,
    })

    expect(comparison).not.toBeNull()
    expect(reversed).not.toBeNull()
    expect(comparison!.allyWinProbability).toBeGreaterThanOrEqual(0.28)
    expect(comparison!.allyWinProbability).toBeLessThanOrEqual(0.72)
    expect(
      comparison!.allyWinProbability + comparison!.enemyWinProbability,
    ).toBeCloseTo(1)
    expect(comparison!.allyWinProbability).toBeCloseTo(
      reversed!.enemyWinProbability,
    )
    expect(comparison!.gamesAnalyzed).toBeGreaterThan(0)
  })

  it('ranks heroes repeatedly removed in the first three bans first', () => {
    const model = currentModel()
    const bans = recommendDraftHeroes(model, {
      kind: 'ban',
      state: {
        allyPicks: [],
        enemyPicks: [],
        allyBans: [],
        enemyBans: [],
      },
      plan: 'balanced',
      phase: 1,
      limit: 5,
    })

    expect(bans[0].hero.name).toBe('Freya')
    expect(bans[0].earlyBanRate).toBeGreaterThan(0.9)
    expect(bans[0].firstBanRate).toBeGreaterThan(0.8)
    expect(
      bans.every((recommendation) =>
        recommendation.reasons.includes('firstBanPriority'),
      ),
    ).toBe(true)
  })

  it('protects first-pick priorities from the allied ban list', () => {
    const model = currentModel()
    const state: DraftCoachState = {
      allyPicks: [],
      enemyPicks: [],
      allyBans: [],
      enemyBans: [],
    }
    const priorities = recommendDraftHeroes(model, {
      kind: 'pick',
      state,
      plan: 'balanced',
      limit: 3,
    })
    const protectedHeroes = priorities.map((item) => item.hero.id)
    const bans = recommendDraftHeroes(model, {
      kind: 'ban',
      state,
      plan: 'balanced',
      phase: 1,
      excludeHeroes: protectedHeroes,
      limit: 10,
    })

    expect(
      bans.some((item) => protectedHeroes.includes(item.hero.id)),
    ).toBe(false)
    expect(new Set(priorities.map((item) => item.suggestedLane)).size).toBe(3)
  })

  it('offers observed, role-safe Mid duos for consecutive second-pick turns', () => {
    const model = currentModel()
    const state: DraftCoachState = {
      allyPicks: [],
      allyPickLanes: [],
      enemyPicks: ['Belerick'],
      enemyPickLanes: ['roam'],
      allyBans: [],
      enemyBans: [],
    }
    const duos = recommendDraftDuos(model, {
      state,
      plan: 'balanced',
      limit: 3,
    })

    expect(duos).toHaveLength(3)
    expect(duos.every((duo) => duo.games > 0)).toBe(true)
    expect(
      duos.every(
        (duo) =>
          duo.first.suggestedLane !== duo.second.suggestedLane,
      ),
    ).toBe(true)
    expect(
      duos.some(
        (duo) =>
          duo.first.suggestedLane === 'mid' ||
          duo.second.suggestedLane === 'mid',
      ),
    ).toBe(true)
  })
})
