import { describe, expect, it } from 'vitest'
import type {
  DraftLeague,
  Match,
  StandingTable,
} from '@/lib/data/types'
import {
  buildDraftTeamVisuals,
  enrichDraftLeagues,
  resolveDraftTeamVisual,
} from './enrich'

const league: DraftLeague = {
  regionSlug: 'philippines',
  leagueName: 'MPL Philippines',
  leaguePageSlug: 'MPL/Philippines/Season_18',
  gamesAnalyzed: 3,
  heroStats: [],
  series: [
    {
      id: 'rora-tnc',
      regionSlug: 'philippines',
      leagueName: 'MPL Philippines',
      tournamentPageSlug: 'MPL/Philippines/Season_18/Regular_Season',
      team1: { name: 'Aurora PH', pageSlug: 'Aurora_PH' },
      team2: { name: 'TNC Pro Team', pageSlug: 'TNC_Pro_Team' },
      mvp: 'Player One',
      games: [
        {
          number: 1,
          winner: 2,
          durationSeconds: 900,
          mapName: null,
          vodUrl: null,
          team1Side: 'blue',
          team2Side: 'red',
          team1Picks: [],
          team2Picks: [],
          team1Bans: [],
          team2Bans: [],
        },
        {
          number: 2,
          winner: 1,
          durationSeconds: 900,
          mapName: null,
          vodUrl: null,
          team1Side: 'red',
          team2Side: 'blue',
          team1Picks: [],
          team2Picks: [],
          team1Bans: [],
          team2Bans: [],
        },
        {
          number: 3,
          winner: 2,
          durationSeconds: 900,
          mapName: null,
          vodUrl: null,
          team1Side: 'blue',
          team2Side: 'red',
          team1Picks: [],
          team2Picks: [],
          team1Bans: [],
          team2Bans: [],
        },
      ],
    },
  ],
}

const match: Match = {
  id: 'match-1',
  startsAt: 1787484600,
  status: 'completed',
  bestOf: 3,
  tournamentName: 'MPL Philippines Season 18 - RS: Week 1',
  tournamentPageSlug: 'MPL/Philippines/Season_18/Regular_Season',
  regionSlug: 'philippines',
  streamUrls: [],
  opponents: [
    {
      code: 'TNC',
      name: 'TNC Pro Team',
      pageSlug: 'TNC_Pro_Team',
      logoUrl: '/teams/tnc.png',
      score: 2,
      isWinner: true,
    },
    {
      code: 'RORA',
      name: 'Aurora Gaming PH',
      pageSlug: 'Aurora_Gaming_PH',
      logoUrl: '/teams/aurora.png',
      score: 1,
      isWinner: false,
    },
  ],
}

const standings: StandingTable[] = [
  {
    id: 'ph',
    regionSlug: 'philippines',
    leagueName: 'MPL Philippines',
    leaguePageSlug: 'MPL/Philippines/Season_18',
    stageName: 'Regular Season',
    rows: [
      {
        position: 1,
        team: {
          code: 'RORA',
          name: 'Aurora Gaming PH',
          pageSlug: 'Aurora_Gaming_PH',
          logoUrl: '/teams/aurora.png',
        },
        matchWins: 0,
        matchLosses: 1,
        gameWins: 1,
        gameLosses: 2,
        gameDiff: -1,
        points: 0,
        zone: 'neutral',
      },
    ],
  },
]

describe('draft enrichment', () => {
  it('joins a draft to its fixture date, week, score and winner', () => {
    const series = enrichDraftLeagues([league], [match])[0].series[0]
    expect(series).toMatchObject({
      startsAt: 1787484600,
      roundLabel: 'Week 1',
      stageName: 'Regular Season',
      team1Score: 1,
      team2Score: 2,
      winner: 2,
    })
  })

  it('resolves a shortened draft team name to its real local crest', () => {
    const visuals = buildDraftTeamVisuals([league], [match], standings)
    expect(
      resolveDraftTeamVisual(
        visuals,
        { name: 'Aurora PH', pageSlug: 'Aurora_PH' },
        'philippines',
      ),
    ).toMatchObject({
      code: 'RORA',
      logoUrl: '/teams/aurora.png',
    })
  })
})
