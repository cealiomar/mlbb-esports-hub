import { describe, expect, it } from 'vitest'
import type { DraftCoachState } from './coach'
import { buildDraftCoachModel, recommendDraftHeroes } from './coach'
import { findDraftBlueprints } from './playbook'
import { evidenceLeague, evidenceSeries } from './__fixtures__/coach-evidence'

const empty: DraftCoachState = { allyPicks: [], enemyPicks: [], allyBans: [], enemyBans: [] }
const model = () => buildDraftCoachModel([evidenceLeague(['a', 'b', 'c', 'd'].map((id) => evidenceSeries(id)))])
describe('observed draft playbooks', () => {
  it('returns only cores observed in the same game with accurate W/L and provenance', () => {
    const result = findDraftBlueprints(model(), empty, 'balanced')
    expect(result.length).toBeGreaterThan(0)
    for (const core of result) {
      expect(core.games).toBe(4)
      expect(core.wins === 0 || core.wins === 4).toBe(true)
      expect(new Set(core.heroes.map((hero) => hero.lane)).size).toBe(3)
      expect(core.examples).toHaveLength(3)
      expect(core.examples.every((example) => core.heroes.every((hero) => example.picks.includes(hero.key)))).toBe(true)
      expect(core.examples[0].sourcePage).toContain('Season_18')
    }
  })
  it('does not manufacture a core from one game or a blocked hero', () => {
    expect(findDraftBlueprints(buildDraftCoachModel([evidenceLeague([evidenceSeries('one')])]), empty, 'early')).toEqual([])
    const cores = findDraftBlueprints(model(), { ...empty, enemyBans: ['Fanny', 'Nolan'] }, 'balanced')
    expect(cores.every((core) => core.heroes.every((hero) => !['fanny', 'nolan'].includes(hero.key)))).toBe(true)
  })
  it('respects chosen roles and never swaps an already-filled lane', () => {
    const state: DraftCoachState = { ...empty, allyPicks: ['Fanny'], allyPickLanes: ['jungle'] }
    const cores = findDraftBlueprints(model(), state, 'balanced')
    expect(cores.length).toBeGreaterThan(0)
    expect(cores.every((core) => core.heroes.some((hero) => hero.key === 'fanny') && !core.heroes.some((hero) => hero.lane === 'jungle' && hero.key !== 'fanny'))).toBe(true)
    expect(recommendDraftHeroes(model(), { state, kind: 'pick', plan: 'balanced', preferredHeroes: ['Nolan'] }).every((hero) => hero.suggestedLane !== 'jungle')).toBe(true)
  })
})
