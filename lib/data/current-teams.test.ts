import { describe, expect, it } from 'vitest'
import { currentSeasonTeams } from './current-teams'
import type { Match, StandingTable, Team } from './types'

const team = (pageSlug: string, leaguePageSlug?: string): Team => ({
  pageSlug,
  name: pageSlug,
  code: pageSlug.slice(0, 3).toUpperCase(),
  logoUrl: null,
  regionSlug: 'mena',
  roster: [],
  ...(leaguePageSlug ? { leaguePageSlug } : {}),
})

const fixture = (page: string, a: string, b: string) =>
  ({
    tournamentPageSlug: page,
    opponents: [{ pageSlug: a }, { pageSlug: b }],
  }) as unknown as Match

describe('currentSeasonTeams', () => {
  const season = 'MPL/MENA/Season_10'

  it('keeps legacy roster entries only when they play in the current season', () => {
    const teams = [team('Team_Falcons'), team('GAMAX_Esports')]
    const matches = [
      fixture(`${season}/Regular_Season`, 'Team_Falcons', 'Geekay_Esports'),
      fixture('MPL/MENA/Season_9', 'GAMAX_Esports', 'Team_Falcons'),
    ]

    expect(currentSeasonTeams(teams, season, matches, []).map((t) => t.pageSlug)).toEqual([
      'Team_Falcons',
    ])
  })

  it('counts a team in the current table as current', () => {
    const standings = [
      { rows: [{ team: { pageSlug: 'GS_Team' } }] },
    ] as unknown as StandingTable[]

    expect(currentSeasonTeams([team('GS_Team')], season, [], standings)).toHaveLength(1)
  })

  it('trusts recorded season provenance over appearances', () => {
    const teams = [team('Old', 'MPL/MENA/Season_9'), team('New', season)]
    const matches = [fixture(season, 'Old', 'New')]

    expect(currentSeasonTeams(teams, season, matches, []).map((t) => t.pageSlug)).toEqual(['New'])
  })
})
