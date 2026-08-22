import { describe, expect, it } from 'vitest'
import { replayUrl } from './replay'
import type { Match } from '@/lib/data/types'

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: 'result',
    startsAt: 1_787_000_000,
    status: 'completed',
    bestOf: 3,
    opponents: [
      { code: 'A', name: 'A', pageSlug: '', logoUrl: null, score: 2, isWinner: true },
      { code: 'B', name: 'B', pageSlug: '', logoUrl: null, score: 0, isWinner: false },
    ],
    tournamentName: 'Tournament',
    tournamentPageSlug: 'Tournament',
    regionSlug: null,
    streamUrls: [],
    vodUrls: [],
    ...overrides,
  }
}

describe('replayUrl', () => {
  it('uses a match-specific VOD on a completed result', () => {
    expect(
      replayUrl(match({ vodUrls: ['https://www.youtube.com/watch?v=game'] })),
    ).toBe('https://www.youtube.com/watch?v=game')
  })

  it('accepts an archived direct stream from a legacy snapshot', () => {
    expect(
      replayUrl(match({ streamUrls: ['https://www.youtube.com/live/archive'] })),
    ).toBe('https://www.youtube.com/live/archive')
  })

  it('does not pretend a channel redirect is a match replay', () => {
    expect(
      replayUrl(
        match({
          streamUrls: [
            'https://liquipedia.net/mobilelegends/Special:Stream/youtube/MPL_Indonesia',
          ],
        }),
      ),
    ).toBeUndefined()
  })

  it('never labels a live or upcoming link as a replay', () => {
    expect(
      replayUrl(
        match({
          status: 'live',
          vodUrls: ['https://youtu.be/game'],
        }),
      ),
    ).toBeUndefined()
  })
})
