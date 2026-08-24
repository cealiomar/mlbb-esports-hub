import fallbackMatches from '@/content/fallback/matches.json'
import { readSnapshot, DEFAULT_SNAPSHOT_DIR } from './snapshots'
import { err, ok } from './source'
import type { DataSource } from './source'
import type {
  DraftLeague,
  Match,
  Result,
  Snapshot,
  StandingTable,
  Team,
} from './types'
import { normalizeMatch } from './normalize-matches'

export interface LocalOptions {
  snapshotDir?: string
}

function resolve<T>(
  name: string,
  dir: string,
  fallback: Snapshot<T> | null,
): Snapshot<T> | null {
  return readSnapshot<T>(name, dir) ?? fallback
}

export function createLocalDataSource(options: LocalOptions = {}): DataSource {
  const dir = options.snapshotDir ?? DEFAULT_SNAPSHOT_DIR
  const matchFallback = fallbackMatches as unknown as Snapshot<Match[]>

  function matches(): Snapshot<Match[]> {
    return (
      resolve<Match[]>('matches', dir, matchFallback) ?? {
        harvestedAt: 0,
        data: [],
      }
    )
  }

  return {
    async getMatches(): Promise<Result<Match[]>> {
      return ok(matches().data.map(normalizeMatch))
    },

    async getStandings(regionSlug?: string): Promise<Result<StandingTable[]>> {
      const snap = resolve<StandingTable[]>('standings', dir, null)
      const all = snap?.data ?? []
      return ok(
        regionSlug
          ? all.filter((table) => table.regionSlug === regionSlug)
          : all,
      )
    },

    async getDraftLeagues(regionSlug?: string): Promise<Result<DraftLeague[]>> {
      const snap = resolve<DraftLeague[]>('drafts', dir, null)
      const all = snap?.data ?? []
      return ok(
        regionSlug
          ? all.filter((league) => league.regionSlug === regionSlug)
          : all,
      )
    },

    async getTeamsByRegion(regionSlug: string): Promise<Result<Team[]>> {
      const snap = resolve<Team[]>('teams', dir, null)
      const all = snap?.data ?? []
      return ok(all.filter((t) => t.regionSlug === regionSlug))
    },

    async getTeam(pageSlug: string): Promise<Result<Team>> {
      const snap = resolve<Team[]>('teams', dir, null)
      const found = snap?.data.find((t) => t.pageSlug === pageSlug)
      if (!found) return err(`no team snapshot for ${pageSlug}`)
      return ok(found)
    },

    async getFreshness(): Promise<number | null> {
      return matches().harvestedAt || null
    },
  }
}
