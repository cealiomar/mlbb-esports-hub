import type {
  DraftLeague,
  Match,
  Ok,
  Result,
  StandingTable,
  Team,
} from './types'

export type SnapshotDataset = 'matches' | 'standings' | 'drafts' | 'teams'

export function ok<T>(value: T): Result<T> {
  return { kind: 'ok', value }
}

export function err<T>(error: string): Result<T> {
  return { kind: 'err', error }
}

export function isOk<T>(r: Result<T>): r is Ok<T> {
  return r.kind === 'ok'
}

/**
 * The only data contract the UI knows about. Swapping providers means
 * writing one new implementation of this interface and nothing else.
 */
export interface DataSource {
  getMatches(): Promise<Result<Match[]>>
  getStandings(regionSlug?: string): Promise<Result<StandingTable[]>>
  getDraftLeagues(regionSlug?: string): Promise<Result<DraftLeague[]>>
  getTeamsByRegion(regionSlug: string): Promise<Result<Team[]>>
  getTeam(pageSlug: string): Promise<Result<Team>>
  /**
   * Unix seconds when one dataset was last harvested, or null if unknown.
   * Datasets refresh on different schedules — fixtures every 20 minutes,
   * standings/rosters/drafts only on the full hourly run — so a page must
   * label each table with its own age, never borrow the fixtures' time.
   */
  getFreshness(dataset?: SnapshotDataset): Promise<number | null>
}
