import { describe, expect, it } from 'vitest'
import { isGenericTeamLogo, normalizeMatch } from './normalize-matches'
import type { Match } from './types'

function fixture(): Match {
  return {
    id: 'match',
    startsAt: 1_787_389_200,
    status: 'completed',
    bestOf: 3,
    opponents: [
      {
        code: 'TNR',
        name: 'TNR Esports (page does not exist)',
        pageSlug: 'index.php?title=TNR_Esports&action=edit&redlink=1',
        logoUrl: '/teams/48px-Mobile_Legends_2025_allmode-deadbeef.png',
        score: 2,
        isWinner: true,
      },
      {
        code: 'MG',
        name: 'MCC GM (page does not exist)',
        pageSlug: 'index.php?title=MCC_GM&action=edit&redlink=1',
        logoUrl: null,
        score: 0,
        isWinner: false,
      },
    ],
    tournamentName: 'MPL KH S11 Qual.',
    tournamentPageSlug: 'MPL/Cambodia/Season_11/Qualifier',
    regionSlug: 'cambodia',
    streamUrls: [],
  }
}

describe('match normalization', () => {
  it('recognises the generic MLBB placeholder crest', () => {
    expect(
      isGenericTeamLogo('/teams/48px-Mobile_Legends_2025_allmode-x.png'),
    ).toBe(true)
    expect(isGenericTeamLogo('/teams/50px-FW_allmode-x.png')).toBe(false)
  })

  it('cleans redlink metadata and removes misleading generic crests', () => {
    const match = normalizeMatch(fixture())
    expect(match.opponents[0]).toMatchObject({
      name: 'TNR Esports',
      pageSlug: '',
      logoUrl: null,
    })
    expect(match.opponents[1].name).toBe('MCC GM')
  })

  it('backfills an empty VOD list for legacy snapshots', () => {
    expect(normalizeMatch(fixture()).vodUrls).toEqual([])
  })
})
