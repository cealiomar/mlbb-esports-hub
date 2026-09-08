import { describe, expect, it } from 'vitest'
import { observedRateInterval, scopeDraftEvidence } from './evidence'
import { buildDraftCoachModel, recommendDraftHeroes } from './coach'
import { evidenceLeague, evidenceSeries } from './__fixtures__/coach-evidence'

const hero = (name: string) => ({ id: name.toLowerCase(), name, pageSlug: name })
const now = Date.parse('2026-09-08T12:00:00Z') / 1000

describe('coach evidence boundary', () => {
  it('uses the selected date window and never falls back to older/undated/future games', () => {
    const data = evidenceLeague([evidenceSeries('recent'), evidenceSeries('old', '2026-08-01'), evidenceSeries('future', '2026-09-09'), { ...evidenceSeries('unknown'), playedOn: null }])
    const result = scopeDraftEvidence([data], { now, window: 14 })
    expect(result.audit).toMatchObject({ total: 4, included: 1, undated: 1, outsideWindow: 2 })
    expect(result.leagues[0].series.map((series) => series.id)).toEqual(['recent'])
    expect(result.leagues[0].gamesAnalyzed).toBe(0)
    expect(result.leagues[0].heroStats).toEqual([])
    expect(scopeDraftEvidence([evidenceLeague([evidenceSeries('old', '2026-08-01')])], { now, window: 14 }).leagues).toEqual([])
  })
  it('gates the configured season and the selected region without mixing contexts', () => {
    const source = evidenceLeague([evidenceSeries('recent')])
    expect(scopeDraftEvidence([source], { now, window: 14, regionSlug: 'philippines' }).audit.total).toBe(0)
    expect(scopeDraftEvidence([source], { now, window: 14, seasonPages: { indonesia: 'MPL/Indonesia/Season_19' } }).audit.wrongSeason).toBe(1)
  })
  it('drops malformed drafts, unknown outcomes and duplicate heroes across picks and bans', () => {
    const series = ['incomplete', 'duplicate', 'unresolved'].map((id) => evidenceSeries(id))
    series[0].games[0].team1Picks.pop()
    series[1].games[0].team2Bans.push(hero('Fanny'))
    series[2].games[0].winner = null
    expect(scopeDraftEvidence([evidenceLeague(series)], { now, window: 14 }).audit.invalid).toBe(3)
  })
  it('counts exact duplicates once and excludes every copy of conflicting outcomes', () => {
    expect(scopeDraftEvidence([evidenceLeague([evidenceSeries('a'), evidenceSeries('a')])], { now, window: 14 }).audit).toMatchObject({ included: 1, duplicate: 1 })
    const conflict = evidenceSeries('a'); conflict.games[0].winner = 2
    expect(scopeDraftEvidence([evidenceLeague([evidenceSeries('a'), conflict])], { now, window: 14 }).audit).toMatchObject({ included: 0, conflict: 2 })
  })
  it('does not let ranked tier scores change tournament recommendations', () => {
    const model = buildDraftCoachModel([evidenceLeague([evidenceSeries('one'), evidenceSeries('two')])])
    const options = { kind: 'pick' as const, plan: 'balanced' as const, state: { allyPicks: [], enemyPicks: [], allyBans: [], enemyBans: [] }, limit: 20 }
    const before = recommendDraftHeroes(model, options).map(({ hero, score }) => [hero.id, score])
    for (const profile of model.heroes) profile.patchMetaScore = profile.patchMetaScore > 0.5 ? 0 : 1
    expect(recommendDraftHeroes(model, options).map(({ hero, score }) => [hero.id, score])).toEqual(before)
  })
  it('shows uncertainty instead of treating 1/1 as a certain result', () => {
    expect(observedRateInterval(0, 0)).toBeNull()
    const tiny = observedRateInterval(1, 1)!, broad = observedRateInterval(100, 100)!
    expect(tiny[0]).toBeLessThan(0.3)
    expect(broad[0]).toBeGreaterThan(0.95)
  })
  it('does not label a repeatedly losing overlap as a strong composition', () => {
    const model = buildDraftCoachModel([evidenceLeague(['a', 'b', 'c', 'd'].map((id) => evidenceSeries(id)))])
    const rec = recommendDraftHeroes(model, { kind: 'pick', plan: 'balanced', targetLane: 'roam', state: { allyPicks: ['Hilda', 'Nolan'], allyPickLanes: ['exp', 'jungle'], enemyPicks: [], allyBans: [], enemyBans: [] }, limit: 20 }).find((item) => item.hero.name === 'Mathilda')!
    expect(rec.synergyGames).toBe(4)
    expect(rec.reasons).not.toContain('composition')
    expect(rec.reasons).not.toContain('synergy')
  })
})
