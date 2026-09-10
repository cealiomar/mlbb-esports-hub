import { DEFAULT_SNAPSHOT_DIR, readSnapshot } from './snapshots'
import { isTeamPageSlug, teamKey } from './team-slug'
import type { Match, Team } from './types'

/**
 * Every team that gets a prerendered `/teams/<slug>/` page — one per team.
 *
 * The team route builds its pages from this list, and every surface that
 * links to a team checks against it, so a link can never point at a page that
 * was not built.
 *
 * Sources spell the same team differently (`Mythic_SEAL` in fixtures,
 * `Mythic_Seal` in rosters). Those collapse to one page, and the roster's
 * spelling wins because that page is the one that has a roster to show.
 */
export function teamPageSlugs(dir: string = DEFAULT_SNAPSHOT_DIR): string[] {
  const teams = readSnapshot<Team[]>('teams', dir)?.data ?? []
  const matches = readSnapshot<Match[]>('matches', dir)?.data ?? []
  const byKey = new Map<string, string>()
  for (const slug of [
    ...teams.map((team) => team.pageSlug),
    ...matches.flatMap((match) =>
      match.opponents.map((opponent) => opponent.pageSlug),
    ),
  ]) {
    if (!isTeamPageSlug(slug)) continue
    const key = teamKey(slug)
    if (key && !byKey.has(key)) byKey.set(key, slug)
  }
  return [...byKey.values()]
}
