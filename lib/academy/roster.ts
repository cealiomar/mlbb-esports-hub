import type { PlayerPhoto, StandingTable, Team } from '@/lib/data/types'
import { teamKey } from '@/lib/data/team-slug'

export interface AcademyRosterTeam {
  pageSlug: string
  name: string
  logoUrl: string | null
  wins: number | null
  losses: number | null
  position: number | null
  players: {
    handle: string
    role: string | null
    country: string | null
    photoUrl: string | null
  }[]
}

/**
 * One region's rosters joined with their crests, records and portraits.
 *
 * Roster snapshots carry no crest for most teams, so the crest and the
 * record come from the standings table, matched on the team key. Teams are
 * ordered by league position, with unranked teams last in roster order.
 */
export function buildAcademyRoster(
  teams: Team[],
  standings: StandingTable[],
  photos: PlayerPhoto[],
  regionSlug: string,
): AcademyRosterTeam[] {
  const rows = new Map(
    standings
      .filter((table) => table.regionSlug === regionSlug)
      .flatMap((table) => table.rows)
      .map((row) => [teamKey(row.team.pageSlug || row.team.name), row]),
  )
  const photoByPlayer = new Map(
    photos.map((photo) => [`${photo.teamPageSlug}\n${photo.handle}`, photo.photoUrl]),
  )

  return teams
    .filter((team) => team.regionSlug === regionSlug)
    .map((team) => {
      const row = rows.get(teamKey(team.pageSlug)) ?? rows.get(teamKey(team.name))
      return {
        pageSlug: team.pageSlug,
        name: team.name,
        logoUrl: team.logoUrl ?? row?.team.logoUrl ?? null,
        wins: row?.matchWins ?? null,
        losses: row?.matchLosses ?? null,
        position: row?.position ?? null,
        players: team.roster.map((player) => ({
          handle: player.handle,
          role: player.role,
          country: player.country,
          photoUrl:
            photoByPlayer.get(`${team.pageSlug}\n${player.handle}`) ?? null,
        })),
      }
    })
    .sort(
      (a, b) =>
        (a.position ?? Number.POSITIVE_INFINITY) -
        (b.position ?? Number.POSITIVE_INFINITY),
    )
}
