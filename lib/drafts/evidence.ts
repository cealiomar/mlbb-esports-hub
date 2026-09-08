import type { DraftGame, DraftLeague, DraftSeries } from '@/lib/data/types'
import { heroKey } from './hero-images'

export type EvidenceWindow = 14 | 28 | 'season'

/** Wilson 95% interval for an observed proportion, not a future-match odds range. */
export function observedRateInterval(wins: number, games: number): [number, number] | null {
  if (games <= 0 || wins < 0 || wins > games) return null
  const z = 1.96, rate = wins / games, denominator = 1 + z * z / games
  const middle = (rate + z * z / (2 * games)) / denominator
  const radius = z * Math.sqrt(rate * (1 - rate) / games + z * z / (4 * games * games)) / denominator
  return [Math.max(0, middle - radius), Math.min(1, middle + radius)]
}

export function draftSeriesTime(series: DraftSeries): number | null {
  const time = series.startsAt ?? (series.playedOn ? Date.parse(`${series.playedOn}T00:00:00Z`) / 1000 : NaN)
  return Number.isFinite(time) && time > 0 ? time : null
}

export function validDraftGame(game: DraftGame): boolean {
  if (game.team1Picks.length !== 5 || game.team2Picks.length !== 5) return false
  if (game.winner !== 1 && game.winner !== 2) return false
  if (game.team1Bans.length > 5 || game.team2Bans.length > 5) return false
  const keys = [...game.team1Picks, ...game.team2Picks, ...game.team1Bans, ...game.team2Bans]
    .map((hero) => heroKey(hero.id || hero.name))
  return keys.every(Boolean) && new Set(keys).size === keys.length
}

/** An auditable input boundary, not a claim that dates identify a game patch.
 * Summary tables are always removed: they cannot describe a filtered window.
 * Unknown dates, unresolved/malformed games and conflicting duplicate records
 * cannot train the coach. No fallback silently broadens the requested scope. */
export function scopeDraftEvidence(
  leagues: DraftLeague[],
  options: { now: number; window: EvidenceWindow; regionSlug?: string; seasonPages?: Record<string, string> },
) {
  const audit = { total: 0, included: 0, outsideWindow: 0, undated: 0, invalid: 0, duplicate: 0, conflict: 0, wrongSeason: 0 }
  const cutoff = options.window === 'season' ? 0 : options.now - options.window * 86400
  const seen = new Map<string, { signature: string; conflict: boolean }>()
  const recordKey = (league: DraftLeague, series: DraftSeries, game: DraftGame) =>
    `${league.leaguePageSlug}::${series.id}::${game.number}`
  const signature = (game: DraftGame) => JSON.stringify([
    game.team1Picks.map((hero) => heroKey(hero.id || hero.name)),
    game.team2Picks.map((hero) => heroKey(hero.id || hero.name)),
    game.team1Bans.map((hero) => heroKey(hero.id || hero.name)),
    game.team2Bans.map((hero) => heroKey(hero.id || hero.name)), game.winner,
  ])
  const regional = leagues.filter((league) => !options.regionSlug || options.regionSlug === 'all' || league.regionSlug === options.regionSlug)
  for (const league of regional) for (const series of league.series) for (const game of series.games) {
    const key = recordKey(league, series, game), value = signature(game), previous = seen.get(key)
    seen.set(key, { signature: value, conflict: Boolean(previous?.conflict || (previous && previous.signature !== value)) })
  }
  const emitted = new Set<string>()
  const data = regional.map((league) => ({
    ...league, heroStats: [], gamesAnalyzed: 0,
    series: league.series.map((series) => ({
      ...series,
      games: series.games.filter((game) => {
        audit.total += 1
        if (options.seasonPages && options.seasonPages[league.regionSlug] !== league.leaguePageSlug) {
          audit.wrongSeason += 1; return false
        }
        const time = draftSeriesTime(series)
        if (time === null) { audit.undated += 1; return false }
        if (time < cutoff || time > options.now) { audit.outsideWindow += 1; return false }
        if (!validDraftGame(game)) { audit.invalid += 1; return false }
        const key = recordKey(league, series, game)
        if (seen.get(key)?.conflict) { audit.conflict += 1; return false }
        if (emitted.has(key)) { audit.duplicate += 1; return false }
        emitted.add(key)
        audit.included += 1
        return true
      }),
    })).filter((series) => series.games.length > 0),
  })).filter((league) => league.series.length > 0)
  const dates = data.flatMap((league) => league.series.map(draftSeriesTime)).filter((time): time is number => time !== null)
  return { leagues: data, audit, from: dates.length ? Math.min(...dates) : null, to: dates.length ? Math.max(...dates) : null }
}
