import type { DraftLeague, DraftSeries } from '@/lib/data/types'
import { buildDraftCoachModel, compareCompletedDrafts, currentSeasonDraftLeagues, heroKey, type HeroCatalogItem } from './coach'

function seriesTime(series: DraftSeries): number | null {
  const value = series.startsAt ?? (series.playedOn ? Date.parse(series.playedOn) / 1000 : NaN)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Chronological split by whole series; full-season summary tables are
 * deliberately stripped, since they contain the evaluation games' results. */
export function splitDraftEvidence(leagues: DraftLeague[], fraction = 0.7) {
  if (fraction <= 0 || fraction >= 1) throw new Error('Split must be between zero and one')
  const active = currentSeasonDraftLeagues(leagues)
  const times = [...new Set(active.flatMap((league) => league.series.map(seriesTime)).filter((time): time is number => time !== null))].sort((a, b) => a - b)
  if (times.length < 2) return null
  const cutoff = times[Math.min(times.length - 1, Math.max(1, Math.floor(times.length * fraction)))]
  const select = (training: boolean) => active.map((league) => ({
    ...league,
    gamesAnalyzed: 0,
    heroStats: [],
    series: league.series.filter((series) => {
      const time = seriesTime(series)
      return time !== null && (training ? time < cutoff : time >= cutoff)
    }),
  })).filter((league) => league.series.length > 0)
  return { cutoff, training: select(true), evaluation: select(false) }
}

export function evaluateDraftComparison(leagues: DraftLeague[], catalog: HeroCatalogItem[]) {
  const split = splitDraftEvidence(leagues)
  if (!split) return null
  const model = buildDraftCoachModel(split.training, 'all', null, catalog)
  let games = 0, correct = 0, brier = 0
  for (const league of split.evaluation) for (const series of league.series) for (const game of series.games) {
    if (game.winner === null || game.team1Picks.length !== 5 || game.team2Picks.length !== 5) continue
    const keys = [...game.team1Picks, ...game.team2Picks].map((hero) => heroKey(hero.id || hero.name))
    if (new Set(keys).size !== 10) continue
    const result = compareCompletedDrafts(model, {
      allyPicks: keys.slice(0, 5), enemyPicks: keys.slice(5), allyBans: [], enemyBans: [],
    })
    if (!result) continue
    const actual = game.winner === 1 ? 1 : 0
    const predicted = result.allyWinProbability
    games += 1
    correct += predicted === 0.5 ? 0.5 : Number((predicted > 0.5) === Boolean(actual))
    brier += (predicted - actual) ** 2
  }
  return {
    trainingGames: model.gamesAnalyzed, evaluationGames: games,
    cutoff: new Date(split.cutoff * 1000).toISOString(),
    accuracy: games ? correct / games : null,
    brierScore: games ? brier / games : null,
    neutralBrierScore: 0.25,
    note: 'Chronological held-out series; no full-season summary leakage. Lower Brier is better. Observational full-draft comparison, not a test of causal pick quality or pick order. No calibrated win probability is claimed.',
  }
}
