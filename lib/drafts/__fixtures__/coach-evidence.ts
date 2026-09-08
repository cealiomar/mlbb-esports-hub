import type { DraftLeague, DraftSeries } from '@/lib/data/types'

const hero = (name: string) => ({ id: name.toLowerCase(), name, pageSlug: name })
export const evidenceSeries = (id: string, day = '2026-09-07'): DraftSeries => ({
  id, regionSlug: 'indonesia', leagueName: 'MPL', tournamentPageSlug: 'MPL/Indonesia/Season_18/Regular_Season',
  playedOn: day, team1: { name: 'Alpha', pageSlug: 'Alpha' }, team2: { name: 'Beta', pageSlug: 'Beta' }, mvp: null,
  games: [{ number: 1, winner: 1, durationSeconds: 900, mapName: 'Broken Walls', vodUrl: null,
    team1Side: 'blue', team2Side: 'red', team1Bans: [], team2Bans: [],
    team1Picks: ['Terizla', 'Fanny', 'Zhuxin', 'Claude', 'Tigreal'].map(hero),
    team2Picks: ['Hilda', 'Nolan', 'Valentina', 'Melissa', 'Mathilda'].map(hero),
  }],
})
export const evidenceLeague = (series: DraftSeries[]): DraftLeague => ({
  regionSlug: 'indonesia', leagueName: 'MPL', leaguePageSlug: 'MPL/Indonesia/Season_18', gamesAnalyzed: 999,
  heroStats: [], series,
})
