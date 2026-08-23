import { describe, it, expect } from 'vitest'
import {
  todayMatches,
  upcomingMatches,
  liveMatches,
  recentResults,
  byRegion,
  LIVE_ASSUMED_WINDOW_SECONDS,
} from './select'
import type { Match } from '@/lib/data/types'

const HOUR = 3600
const NOW = 1_787_300_000

function make(over: Partial<Match>): Match {
  return {
    id: 'x',
    startsAt: NOW,
    status: 'upcoming',
    bestOf: 3,
    opponents: [
      { code: 'A', name: 'A', pageSlug: 'A', logoUrl: null, score: null, isWinner: false },
      { code: 'B', name: 'B', pageSlug: 'B', logoUrl: null, score: null, isWinner: false },
    ],
    tournamentName: 'T',
    tournamentPageSlug: 'T',
    regionSlug: 'indonesia',
    streamUrls: [],
    ...over,
  } as Match
}

describe('match selection', () => {
  it('includes matches within the same Egypt day', () => {
    expect(todayMatches([make({ id: 'a', startsAt: NOW + HOUR })], NOW)).toHaveLength(1)
  })

  it('excludes matches on a different day', () => {
    expect(todayMatches([make({ id: 'b', startsAt: NOW + 72 * HOUR })], NOW)).toHaveLength(0)
  })

  it('sorts today by start time ascending', () => {
    const result = todayMatches(
      [make({ id: 'late', startsAt: NOW + 5 * HOUR }), make({ id: 'early', startsAt: NOW + HOUR })],
      NOW,
    )
    expect(result.map((m) => m.id)).toEqual(['early', 'late'])
  })

  it('uses Cairo midnight instead of UTC midnight', () => {
    const cairoAfterMidnight = Date.parse('2026-01-01T22:30:00Z') / 1000
    const sameCairoDay = Date.parse('2026-01-02T21:30:00Z') / 1000
    const previousCairoDay = Date.parse('2026-01-01T21:30:00Z') / 1000

    const result = todayMatches(
      [
        make({ id: 'same', startsAt: sameCairoDay }),
        make({ id: 'previous', startsAt: previousCairoDay }),
      ],
      cairoAfterMidnight,
    )

    expect(result.map((match) => match.id)).toEqual(['same'])
  })

  it('upcoming excludes anything already started', () => {
    const result = upcomingMatches(
      [make({ id: 'past', startsAt: NOW - HOUR }), make({ id: 'future', startsAt: NOW + HOUR })],
      NOW,
    )
    expect(result.map((m) => m.id)).toEqual(['future'])
  })

  it('upcoming excludes live matches', () => {
    const result = upcomingMatches(
      [make({ id: 'live', status: 'live', startsAt: NOW + HOUR })],
      NOW,
    )
    expect(result).toHaveLength(0)
  })

  it('keeps explicitly live matches visible', () => {
    const result = liveMatches(
      [make({ id: 'live', status: 'live', startsAt: NOW - 10 * HOUR })],
      NOW,
    )
    expect(result.map((m) => m.id)).toEqual(['live'])
  })

  it('treats a recently started upcoming match as live while scores catch up', () => {
    const result = liveMatches(
      [make({ id: 'started', status: 'upcoming', startsAt: NOW - 10 * 60 })],
      NOW,
    )
    expect(result.map((m) => m.id)).toEqual(['started'])
    expect(result[0].status).toBe('live')
  })

  it('does not treat future or stale upcoming matches as live', () => {
    const result = liveMatches(
      [
        make({ id: 'future', startsAt: NOW + HOUR }),
        make({
          id: 'stale',
          startsAt: NOW - LIVE_ASSUMED_WINDOW_SECONDS - 1,
        }),
      ],
      NOW,
    )
    expect(result).toHaveLength(0)
  })

  it('recent results returns completed matches newest first', () => {
    const result = recentResults(
      [
        make({ id: 'old', status: 'completed', startsAt: NOW - 10 * HOUR }),
        make({ id: 'new', status: 'completed', startsAt: NOW - HOUR }),
        make({ id: 'pending', status: 'upcoming', startsAt: NOW + HOUR }),
      ],
      10,
    )
    expect(result.map((m) => m.id)).toEqual(['new', 'old'])
  })

  it('recent results respects the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      make({ id: `m${i}`, status: 'completed', startsAt: NOW - i * HOUR }),
    )
    expect(recentResults(many, 5)).toHaveLength(5)
  })

  it('filters by region slug', () => {
    const result = byRegion(
      [make({ id: 'id', regionSlug: 'indonesia' }), make({ id: 'ph', regionSlug: 'philippines' })],
      'philippines',
    )
    expect(result.map((m) => m.id)).toEqual(['ph'])
  })
})
