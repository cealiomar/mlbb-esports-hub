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
  /** Direct replay/VOD links supplied for completed games. */
  vodUrls?: string[]
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

export type StandingZone = 'advance' | 'playoff' | 'eliminated' | 'neutral'

export interface StandingTeam {
  code: string
  name: string
  pageSlug: string
  logoUrl: string | null
}

export interface StandingRow {
  position: number
  team: StandingTeam
  matchWins: number | null
  matchLosses: number | null
  gameWins: number | null
  gameLosses: number | null
  gameDiff: number | null
  points: number | null
  zone: StandingZone
}

export interface StandingTable {
  id: string
  regionSlug: string
  leagueName: string
  leaguePageSlug: string
  stageName: string
  rows: StandingRow[]
}

export interface DraftHero {
  /** Lower-case Liquipedia hero key, e.g. "yi sun-shin". */
  id: string
  name: string
  pageSlug: string
}

export interface HeroDraftStat {
  hero: DraftHero
  /** Mirrored hero portrait when Liquipedia publishes one. */
  imageUrl: string | null
  picks: number
  pickWins: number
  pickLosses: number
  pickRate: number
  bans: number
  banRate: number
  presence: number
  presenceRate: number
}

export interface DraftGame {
  number: number
  winner: 1 | 2 | null
  durationSeconds: number | null
  mapName: string | null
  vodUrl: string | null
  team1Side: 'blue' | 'red' | null
  team2Side: 'blue' | 'red' | null
  team1Picks: DraftHero[]
  team2Picks: DraftHero[]
  team1Bans: DraftHero[]
  team2Bans: DraftHero[]
}

export interface DraftTeam {
  name: string
  pageSlug: string
}

export interface DraftSeries {
  id: string
  regionSlug: string
  leagueName: string
  tournamentPageSlug: string
  /** Calendar date published with the draft, formatted as YYYY-MM-DD. */
  playedOn?: string | null
  /** Unix seconds from the matching fixture snapshot when available. */
  startsAt?: number | null
  /** Source round label, e.g. "Week 2". */
  roundLabel?: string | null
  /** Tournament phase, e.g. "Regular Season". */
  stageName?: string | null
  team1: DraftTeam
  team2: DraftTeam
  team1Score?: number
  team2Score?: number
  winner?: 1 | 2 | null
  mvp: string | null
  games: DraftGame[]
}

export interface DraftLeague {
  regionSlug: string
  leagueName: string
  leaguePageSlug: string
  gamesAnalyzed: number
  heroStats: HeroDraftStat[]
  series: DraftSeries[]
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
