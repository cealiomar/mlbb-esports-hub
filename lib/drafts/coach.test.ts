import { describe, expect, it } from 'vitest'
import type { DraftGame, DraftHero, DraftLeague } from '@/lib/data/types'
import {
  buildDraftCoachModel,
  heroKey,
  nextSuggestedLane,
  openDraftLanes,
  proDraftFlow,
  recommendDraftHeroes,
} from './coach'

function hero(name: string): DraftHero {
  return { id: name.toLowerCase(), name, pageSlug: name.replaceAll(' ', '_') }
}

const heroes = [
  'Terizla',
  'Fanny',
  'Zhuxin',
  'Claude',
  'Tigreal',
  'Hilda',
  'Nolan',
  'Valentina',
  'Melissa',
  'Mathilda',
].map(hero)

function game(winner: 1 | 2): DraftGame {
  return {
    number: 1,
    winner,
    durationSeconds: winner === 1 ? 780 : 1_200,
    mapName: 'Broken Walls',
    vodUrl: null,
    team1Side: 'blue',
    team2Side: 'red',
    team1Picks: heroes.slice(0, 5),
    team2Picks: heroes.slice(5, 10),
    team1Bans: [hero('Sora')],
    team2Bans: [hero('Marcel')],
  }
}

const league: DraftLeague = {
  regionSlug: 'indonesia',
  leagueName: 'Test League',
  leaguePageSlug: 'Test/Season',
  gamesAnalyzed: 4,
  heroStats: heroes.map((item, index) => ({
    hero: item,
    imageUrl: `/heroes/${item.name}.png`,
    picks: index < 5 ? 4 : 2,
    pickWins: index < 5 ? 3 : 1,
    pickLosses: 1,
    pickRate: 50,
    bans: index === 0 ? 2 : 0,
    banRate: 0,
    presence: index < 5 ? 4 : 2,
    presenceRate: index < 5 ? 100 : 50,
  })),
  series: [
    {
      id: 'series',
      regionSlug: 'indonesia',
      leagueName: 'Test League',
      tournamentPageSlug: 'Test/Season/Regular_Season',
      team1: { name: 'Alpha', pageSlug: 'Alpha' },
      team2: { name: 'Bravo', pageSlug: 'Bravo' },
      mvp: null,
      games: [game(1), game(1), game(1), game(2)],
    },
  ],
}

describe('draft coach model', () => {
  it('normalises source aliases and infers the five pro lanes', () => {
    expect(heroKey('Yi Sun-Shin')).toBe('yisunshin')
    expect(heroKey('Lapu')).toBe('lapulapu')
    const model = buildDraftCoachModel([league], 'indonesia')
    expect(model.heroByKey.terizla.primaryLane).toBe('exp')
    expect(model.heroByKey.fanny.primaryLane).toBe('jungle')
    expect(model.heroByKey.zhuxin.primaryLane).toBe('mid')
    expect(model.heroByKey.claude.primaryLane).toBe('gold')
    expect(model.heroByKey.tigreal.primaryLane).toBe('roam')
  })

  it('ranks observed meta picks and excludes used heroes', () => {
    const model = buildDraftCoachModel([league], 'indonesia')
    const recommendations = recommendDraftHeroes(model, {
      kind: 'pick',
      state: {
        allyPicks: ['Terizla'],
        enemyPicks: ['Hilda'],
        allyBans: [],
        enemyBans: [],
      },
      plan: 'balanced',
      limit: 10,
    })
    expect(recommendations.some((item) => item.hero.name === 'Terizla')).toBe(false)
    expect(recommendations[0].sampleSize).toBeGreaterThan(0)
    expect(recommendations[0].score).toBeGreaterThan(0)
  })

  it('keeps early picks flexible and offers one strong option per open role', () => {
    const model = buildDraftCoachModel([league], 'indonesia')
    const recommendations = recommendDraftHeroes(model, {
      kind: 'pick',
      state: {
        allyPicks: [],
        enemyPicks: [],
        allyBans: [],
        enemyBans: [],
      },
      plan: 'balanced',
      targetLane: nextSuggestedLane(model, []),
      limit: 5,
    })

    expect(nextSuggestedLane(model, [])).toBeNull()
    expect(new Set(recommendations.map((item) => item.suggestedLane))).toEqual(
      new Set(['exp', 'jungle', 'mid', 'gold', 'roam']),
    )
  })

  it('locks only the final missing role instead of forcing a fixed pick order', () => {
    const model = buildDraftCoachModel([league], 'indonesia')
    const picks = ['Terizla', 'Fanny', 'Zhuxin', 'Claude']
    const targetLane = nextSuggestedLane(model, picks)
    const recommendations = recommendDraftHeroes(model, {
      kind: 'pick',
      state: {
        allyPicks: picks,
        enemyPicks: [],
        allyBans: [],
        enemyBans: [],
      },
      plan: 'balanced',
      targetLane,
      limit: 5,
    })

    expect(openDraftLanes(model, picks)).toEqual(['roam'])
    expect(targetLane).toBe('roam')
    expect(recommendations).toHaveLength(2)
    expect(
      recommendations.every((item) => item.suggestedLane === 'roam'),
    ).toBe(true)
  })

  it('creates a complete MPL practice flow', () => {
    const flow = proDraftFlow(true)
    expect(flow).toHaveLength(20)
    expect(flow.filter((step) => step.kind === 'ban')).toHaveLength(10)
    expect(flow.filter((step) => step.kind === 'pick')).toHaveLength(10)
    expect(flow[6]).toMatchObject({ side: 'ally', kind: 'pick' })
  })
})
