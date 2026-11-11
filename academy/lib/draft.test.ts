import { describe, expect, it } from 'vitest'
import type { Hero, Lane } from './data-types'
import {
  DRAFT_ORDER,
  assignLanes,
  metaScore,
  openLanes,
  readDraft,
  suggest,
} from './draft'

const hero = (id: string, lanes: Lane[], score: number): Hero => ({
  id,
  name: id,
  image: null,
  lane: lanes[0],
  lanes,
  tier: 'A',
  score,
  roles: [],
})

const heroes = [
  hero('exp1', ['exp'], 0.9),
  hero('exp2', ['exp', 'roam'], 0.8),
  hero('jg1', ['jungle'], 0.7),
  hero('mid1', ['mid'], 0.6),
  hero('gold1', ['gold'], 0.5),
  hero('roam1', ['roam'], 0.4),
]

describe('draft order', () => {
  it('is ten bans then ten picks, five of each per side', () => {
    expect(DRAFT_ORDER).toHaveLength(20)
    for (const side of ['blue', 'red'] as const) {
      for (const kind of ['ban', 'pick'] as const) {
        expect(
          DRAFT_ORDER.filter((step) => step.side === side && step.kind === kind),
        ).toHaveLength(5)
      }
    }
    expect(DRAFT_ORDER.slice(0, 10).every((step) => step.kind === 'ban')).toBe(true)
  })

  it('never lets a side pick three times in a row', () => {
    const picks = DRAFT_ORDER.slice(10).map((step) => step.side)
    for (let i = 2; i < picks.length; i += 1) {
      expect(picks[i] === picks[i - 1] && picks[i] === picks[i - 2]).toBe(false)
    }
  })
})

describe('readDraft', () => {
  it('files each action under the side and kind of its step', () => {
    const state = readDraft(['exp1', 'jg1'], heroes)
    expect(state.bans.blue.map((h) => h.id)).toEqual(['exp1'])
    expect(state.bans.red.map((h) => h.id)).toEqual(['jg1'])
    expect(state.current).toEqual({ side: 'blue', kind: 'ban' })
  })

  it('has no current step once all twenty are played', () => {
    expect(readDraft(Array(20).fill('exp1'), heroes).current).toBeNull()
  })
})

describe('lanes', () => {
  it('seats a flex hero in its second lane when the first is taken', () => {
    expect(assignLanes([heroes[0], heroes[1]])).toEqual(['exp', 'roam'])
  })

  it('leaves a hero unseated when every lane it plays is taken', () => {
    expect(assignLanes([heroes[0], hero('exp3', ['exp'], 0.1)])).toEqual(['exp', null])
  })

  it('lists the lanes a lineup still needs', () => {
    expect(openLanes([heroes[0], heroes[2]])).toEqual(['mid', 'gold', 'roam'])
  })
})

describe('suggest', () => {
  const tenBans = Array.from({ length: 10 }, (_, i) => `ban${i}`)

  it('offers the strongest available hero first', () => {
    expect(suggest(readDraft([], heroes), heroes, 3).map((h) => h.id)).toEqual([
      'exp1',
      'exp2',
      'jg1',
    ])
  })

  it('never offers a hero that is already banned or picked', () => {
    const state = readDraft(['exp1'], heroes)
    expect(suggest(state, heroes, 6).map((h) => h.id)).not.toContain('exp1')
  })

  it('only offers a pick for a lane the side still needs', () => {
    // Blue picks exp1; red picks jg1 and mid1; blue is on the clock again.
    const state = readDraft([...tenBans, 'exp1', 'jg1', 'mid1'], heroes)
    expect(state.current).toEqual({ side: 'blue', kind: 'pick' })
    // exp2 can still play roam, so it stays; a pure EXP hero would not.
    expect(suggest(state, heroes, 6).map((h) => h.id)).toEqual([
      'exp2',
      'gold1',
      'roam1',
    ])
  })
})

describe('metaScore', () => {
  it('averages tier scores on a 0-100 scale', () => {
    expect(metaScore([heroes[0], heroes[2]])).toBe(80)
    expect(metaScore([])).toBe(0)
  })
})
