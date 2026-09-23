import type { Match, StandingTable, Team } from './types'

/**
 * Teams that belong to the region's configured current season.
 *
 * A roster snapshot records which season page it came from
 * (`leaguePageSlug`). Older snapshots do not, so for those a team counts as
 * current only if it actually appears in this season's fixtures or table —
 * evidence, not the mere fact that the region has some current matches.
 * Otherwise last season's roster (e.g. a team that was relegated) is shown
 * as if it were playing now.
 */
export function currentSeasonTeams(
  teams: readonly Team[],
  seasonPage: string,
  matches: readonly Match[],
  standings: readonly StandingTable[],
): Team[] {
  const inSeason = (page: string) =>
    page === seasonPage || page.startsWith(`${seasonPage}/`)

  const seen = new Set<string>()
  for (const match of matches) {
    if (!inSeason(match.tournamentPageSlug)) continue
    for (const opponent of match.opponents) {
      if (opponent.pageSlug) seen.add(opponent.pageSlug)
    }
  }
  for (const table of standings) {
    for (const row of table.rows) {
      if (row.team.pageSlug) seen.add(row.team.pageSlug)
    }
  }

  return teams.filter((team) =>
    team.leaguePageSlug
      ? team.leaguePageSlug === seasonPage
      : seen.has(team.pageSlug),
  )
}
