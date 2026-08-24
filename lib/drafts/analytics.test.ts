import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDraftSeries } from '@/lib/data/liquipedia/parse-drafts'
import type { DraftLeague } from '@/lib/data/types'
import { draftTeams, teamDraftProfile } from './analytics'

const league: DraftLeague = {
  regionSlug: 'indonesia',
  leagueName: 'MPL Indonesia',
  leaguePageSlug: 'MPL/Indonesia/Season_18',
  gamesAnalyzed: 2,
  heroStats: [],
  series: parseDraftSeries(
    readFileSync(
      join(__dirname, '..', 'data', 'liquipedia', '__fixtures__', 'draft-id.wikitext'),
      'utf8',
    ),
    {
      regionSlug: 'indonesia',
      leagueName: 'MPL Indonesia',
      leaguePageSlug: 'MPL/Indonesia/Season_18/Regular_Season',
    },
  ),
}

describe('draft analytics', () => {
  it('discovers every team with captured series data', () => {
    expect(draftTeams(league).map((team) => team.pageSlug)).toEqual([
      'EVOS',
      'RRQ_Hoshi',
    ])
  })

  it('builds a team perspective with its own picks, bans, side and result', () => {
    const profile = teamDraftProfile(league, 'EVOS')
    expect(profile?.gamesAnalyzed).toBe(2)
    expect(profile?.recentSeries[0].opponent.pageSlug).toBe('RRQ_Hoshi')
    expect(profile?.recentSeries[0].games[0]).toMatchObject({
      side: 'blue',
      won: true,
    })
    expect(profile?.recentSeries[0].games[0].picks[0].id).toBe('dyrroth')
    expect(profile?.recentSeries[0].games[0].bans[0].id).toBe('atlas')
  })

  it('ranks a team’s most frequent heroes from the exact game drafts', () => {
    const profile = teamDraftProfile(league, 'EVOS')
    expect(profile?.topPicks.find((stat) => stat.hero.id === 'eudora')).toMatchObject({
      hero: { id: 'eudora' },
      count: 2,
      wins: 2,
      winRate: 100,
    })
    expect(profile?.topBans[0]).toMatchObject({
      hero: { id: 'atlas' },
      count: 2,
    })
  })
})
