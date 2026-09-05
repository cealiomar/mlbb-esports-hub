import { describe, expect, it } from 'vitest'
import type { DraftLeague } from '@/lib/data/types'
import { splitDraftEvidence } from './evaluation'

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
})
