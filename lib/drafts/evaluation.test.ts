import { describe, expect, it } from 'vitest'
import type { DraftLeague } from '@/lib/data/types'
import { evaluateDraftComparison, splitDraftEvidence } from './evaluation'
import { evidenceLeague, evidenceSeries } from './__fixtures__/coach-evidence'

describe('chronological draft validation', () => {
  it('keeps whole series together and strips future season summaries', () => {
    const league = {
      regionSlug: 'indonesia', leagueName: 'Example', leaguePageSlug: 'Example', gamesAnalyzed: 900,
      heroStats: [{ picks: 900 }],
      series: [1, 2, 3, 3, 4].map((day, id) => ({
        id: String(id), startsAt: Date.parse(`2026-08-0${day}T12:00:00Z`) / 1000,
        games: [{}],
      })),
    } as DraftLeague
    const split = splitDraftEvidence([league], 0.5)!
    expect(split.training[0].series.map((series) => series.id)).toEqual(['0', '1'])
    expect(split.evaluation[0].series.map((series) => series.id)).toEqual(['2', '3', '4'])
    expect(split.training[0].heroStats).toEqual([])
    expect(split.training[0].gamesAnalyzed).toBe(0)
    expect(split.training[0].series.every((series) => series.startsAt! < split.cutoff)).toBe(true)
  })

  it('does not invent a validation score without enough dated series', () => {
    expect(splitDraftEvidence([])).toBeNull()
    expect(() => splitDraftEvidence([], 1)).toThrow()
  })

  it('uses only the rolling pre-cutoff window and audits excluded source games', () => {
    const league = evidenceLeague([
      evidenceSeries('old', '2026-07-01'),
      evidenceSeries('a', '2026-08-01'),
      evidenceSeries('b', '2026-08-05'),
      evidenceSeries('c', '2026-08-10'),
      evidenceSeries('d', '2026-08-15'),
      evidenceSeries('e', '2026-08-20'),
      { ...evidenceSeries('undated'), playedOn: null },
    ])
    const report = evaluateDraftComparison([league], [], { trainingWindow: 14 })!
    expect(report.cutoff).toBe('2026-08-15T00:00:00.000Z')
    expect(report.trainingGames).toBe(3)
    expect(report.evaluationGames).toBe(2)
    expect(report.quality.undated).toBe(1)
    expect(report.trainingWindow).toBe(14)
    expect(report.predictionRange?.every((value) => value >= 0 && value <= 1)).toBe(true)
    expect(report.trainingBaseRateBrier).not.toBeNull()
  })
})
