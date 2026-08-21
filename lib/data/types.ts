export type MatchStatus = 'upcoming' | 'live' | 'completed'

export interface MatchOpponent {
  /** Short display code, e.g. "TLID". */
  code: string
  /** Full team name, e.g. "Team Liquid ID". */
  name: string
  /** Liquipedia page slug, e.g. "Team_Liquid_ID". Empty when the opponent is TBD. */
  pageSlug: string
  /** Absolute logo URL, or null when Liquipedia has no logo for the team. */
  logoUrl: string | null
  /** Maps won. Null for matches that have not been played. */
  score: number | null
  isWinner: boolean
}

export interface Match {
  /** Stable id derived from timestamp and both opponent codes. */
  id: string
  /** Unix seconds, UTC. */
  startsAt: number
  status: MatchStatus
  /** Best-of length parsed from "(Bo3)". Null when absent. */
  bestOf: number | null
  opponents: [MatchOpponent, MatchOpponent]
  tournamentName: string
  tournamentPageSlug: string
  /** Region slug from content/regions.json, or null for international events. */
  regionSlug: string | null
  streamUrls: string[]
}

export interface Player {
  handle: string
  realName: string | null
  role: string | null
  country: string | null
}

export interface Team {
  pageSlug: string
  name: string
  code: string
  logoUrl: string | null
  regionSlug: string | null
  roster: Player[]
}

export interface Snapshot<T> {
  /** Unix seconds when this snapshot was harvested. */
  harvestedAt: number
  data: T
}

export interface Ok<T> {
  readonly kind: 'ok'
  readonly value: T
}

export interface Err {
  readonly kind: 'err'
  readonly error: string
}

export type Result<T> = Ok<T> | Err
