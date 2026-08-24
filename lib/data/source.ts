import type {
  DraftLeague,
  Match,
  Ok,
  Result,
  StandingTable,
  Team,
} from './types'

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
  /** Unix seconds of the newest data this source can serve, or null if unknown. */
  getFreshness(): Promise<number | null>
}
