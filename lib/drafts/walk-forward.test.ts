import { describe, expect, it } from 'vitest'
import { evidenceLeague, evidenceSeries } from './__fixtures__/coach-evidence'
import { walkForwardDraftEvaluation } from './walk-forward'

const now = Date.parse('2026-09-08T23:59:59Z') / 1000
const fixture = () => evidenceLeague([
  evidenceSeries('old', '2026-08-01'),
  evidenceSeries('a', '2026-09-01'),
  evidenceSeries('b', '2026-09-02'),
  evidenceSeries('c', '2026-09-02'),
  evidenceSeries('d', '2026-09-03'),
])

describe('regional walk-forward evaluation', () => {
  it('trains only on prior days and never on another game in the same day', () => {
    const report = walkForwardDraftEvaluation([fixture()], [], { now, minTrainingGames: 1 })
    expect(report.predictions.map((row) => [row.seriesId, row.trainingGames])).toEqual([['b', 1], ['c', 1], ['d', 3]])
    expect(report.skippedGames).toBe(2)
    expect(report.trainingUpdates).toBe(2)
    for (const row of report.predictions) expect(row.trainedThrough < row.evaluatedOn).toBe(true)
  })

  it('does not change a prediction when that test-day result is changed', () => {
    const league = fixture()
    const original = walkForwardDraftEvaluation([league], [], { now, minTrainingGames: 1 })
    league.series[2].games[0].winner = 2
    const changed = walkForwardDraftEvaluation([league], [], { now, minTrainingGames: 1 })
    for (const id of ['b', 'c']) {
      expect(changed.predictions.find((row) => row.seriesId === id)?.probability)
        .toBe(original.predictions.find((row) => row.seriesId === id)?.probability)
      expect(changed.predictions.find((row) => row.seriesId === id)?.challengerProbability)
        .toBe(original.predictions.find((row) => row.seriesId === id)?.challengerProbability)
    }
  })

  it('does not use other regions to disguise a cold start', () => {
    const other = evidenceLeague([evidenceSeries('other', '2026-09-03')])
    other.regionSlug = 'philippines'
    const report = walkForwardDraftEvaluation([fixture(), other], [], { now, minTrainingGames: 1 })
    expect(report.byRegion.find((row) => row.region === 'philippines')?.games).toBe(0)
    expect(report.overall.games).toBe(3)
  })

  it('reports no measured success without enough eligible games', () => {
    const report = walkForwardDraftEvaluation([fixture()], [], { now })
    expect(report.overall.accuracy).toBeNull()
    expect(report.overall.brierScore).toBeNull()
    expect(report.overall.accuracyInterval95).toBeNull()
    expect(report.skippedGames).toBe(5)
    expect(() => walkForwardDraftEvaluation([], [], { now, minTrainingGames: 0 })).toThrow()
  })
})
