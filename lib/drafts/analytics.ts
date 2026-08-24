import type {
  DraftGame,
  DraftHero,
  DraftLeague,
  DraftSeries,
  DraftTeam,
  HeroDraftStat,
} from '@/lib/data/types'

export interface TeamHeroStat {
  hero: DraftHero
  count: number
  wins: number
  losses: number
  winRate: number
}

export interface TeamDraftGame {
  game: DraftGame
  side: 'blue' | 'red' | null
  won: boolean | null
  picks: DraftHero[]
  bans: DraftHero[]
}

export interface TeamDraftSeries {
  series: DraftSeries
  opponent: DraftTeam
  games: TeamDraftGame[]
}

export interface TeamDraftProfile {
  team: DraftTeam
  gamesAnalyzed: number
  topPicks: TeamHeroStat[]
  topBans: TeamHeroStat[]
  recentSeries: TeamDraftSeries[]
}

export function topLeaguePicks(
  league: DraftLeague,
  limit = 5,
): HeroDraftStat[] {
  return [...league.heroStats]
    .sort((a, b) => b.picks - a.picks || b.pickRate - a.pickRate)
    .slice(0, limit)
}

export function topLeagueBans(
  league: DraftLeague,
  limit = 5,
): HeroDraftStat[] {
  return [...league.heroStats]
    .sort((a, b) => b.bans - a.bans || b.banRate - a.banRate)
    .slice(0, limit)
}

export function draftTeams(league: DraftLeague): DraftTeam[] {
  const teams = new Map<string, DraftTeam>()
  for (const series of league.series) {
    teams.set(series.team1.pageSlug, series.team1)
    teams.set(series.team2.pageSlug, series.team2)
  }
  return [...teams.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function teamHeroStats(
  games: TeamDraftGame[],
  field: 'picks' | 'bans',
): TeamHeroStat[] {
  const counts = new Map<string, TeamHeroStat>()

  for (const game of games) {
    for (const hero of game[field]) {
      const stat = counts.get(hero.id) ?? {
        hero,
        count: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
      }
      stat.count += 1
      if (game.won === true) stat.wins += 1
      if (game.won === false) stat.losses += 1
      counts.set(hero.id, stat)
    }
  }

  return [...counts.values()]
    .map((stat) => ({
      ...stat,
      winRate:
        stat.wins + stat.losses > 0
          ? (stat.wins / (stat.wins + stat.losses)) * 100
          : 0,
    }))
    .sort((a, b) => b.count - a.count || b.winRate - a.winRate)
}

export function teamDraftProfile(
  league: DraftLeague,
  teamPageSlug: string,
): TeamDraftProfile | null {
  let team: DraftTeam | null = null
  const seriesViews: TeamDraftSeries[] = []

  for (const series of league.series) {
    const isTeam1 = series.team1.pageSlug === teamPageSlug
    const isTeam2 = series.team2.pageSlug === teamPageSlug
    if (!isTeam1 && !isTeam2) continue

    team = isTeam1 ? series.team1 : series.team2
    seriesViews.push({
      series,
      opponent: isTeam1 ? series.team2 : series.team1,
      games: series.games.map((game) => ({
        game,
        side: isTeam1 ? game.team1Side : game.team2Side,
        won:
          game.winner === null
            ? null
            : isTeam1
              ? game.winner === 1
              : game.winner === 2,
        picks: isTeam1 ? game.team1Picks : game.team2Picks,
        bans: isTeam1 ? game.team1Bans : game.team2Bans,
      })),
    })
  }

  if (!team) return null
  const games = seriesViews.flatMap((series) => series.games)

  return {
    team,
    gamesAnalyzed: games.length,
    topPicks: teamHeroStats(games, 'picks').slice(0, 5),
    topBans: teamHeroStats(games, 'bans').slice(0, 5),
    recentSeries: seriesViews.reverse().slice(0, 4),
  }
}
