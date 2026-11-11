import { describe, expect, it } from 'vitest'
import type { PlayerPhoto, StandingTable, Team } from '@/lib/data/types'
import { buildAcademyRoster } from './roster'

const player = (handle: string) => ({
  handle,
  realName: null,
  role: 'mid',
  country: null,
})

const teams: Team[] = [
  {
    pageSlug: 'Team_B',
    name: 'Team B',
    code: 'B',
    logoUrl: null,
    regionSlug: 'mena',
    roster: [player('Seven')],
  },
  {
    pageSlug: 'Team_A',
    name: 'Team A',
    code: 'A',
    logoUrl: null,
    regionSlug: 'mena',
    roster: [player('Seven'), player('Solo')],
  },
  {
    pageSlug: 'Elsewhere',
    name: 'Elsewhere',
    code: 'E',
    logoUrl: null,
    regionSlug: 'indonesia',
    roster: [],
  },
]

const row = (position: number, name: string, pageSlug: string) => ({
  position,
  team: { code: name, name, pageSlug, logoUrl: `/teams/${pageSlug}.png` },
  matchWins: 5,
  matchLosses: 2,
  gameWins: null,
  gameLosses: null,
  gameDiff: null,
  points: null,
  zone: 'neutral' as const,
})

const standings: StandingTable[] = [
  {
    id: 'mena',
    regionSlug: 'mena',
    leagueName: 'MPL MENA',
    leaguePageSlug: 'MPL/MENA/Season_10',
    stageName: 'Regular Season',
    rows: [row(1, 'Team A', 'team_a')],
  },
]

const photos: PlayerPhoto[] = [
  {
    teamPageSlug: 'Team_A',
    handle: 'Seven',
    photoUrl: '/players/seven.jpg',
    sourceFile: 'Seven.jpg',
  },
]

describe('buildAcademyRoster', () => {
  const roster = buildAcademyRoster(teams, standings, photos, 'mena')

  it('keeps only the requested region', () => {
    expect(roster.map((team) => team.pageSlug)).not.toContain('Elsewhere')
  })

  it('orders ranked teams first', () => {
    expect(roster.map((team) => team.pageSlug)).toEqual(['Team_A', 'Team_B'])
  })

  it('takes the crest and record from the standings, across spellings', () => {
    expect(roster[0]).toMatchObject({
      logoUrl: '/teams/team_a.png',
      wins: 5,
      losses: 2,
    })
    expect(roster[1]).toMatchObject({ logoUrl: null, wins: null })
  })

  it('never gives one team’s portrait to a namesake on another team', () => {
    expect(roster[0].players[0].photoUrl).toBe('/players/seven.jpg')
    expect(roster[1].players[0].photoUrl).toBeNull()
  })
})
