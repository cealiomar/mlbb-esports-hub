import type { DraftLeague } from '@/lib/data/types'
import { buildDraftCoachModel, compareCompletedDrafts, heroKey, type HeroCatalogItem } from './coach'
import { draftSeriesTime, observedRateInterval, scopeDraftEvidence, type EvidenceWindow } from './evidence'
import { predictDraftOutcome, trainDraftOutcomeModel } from './result-model'

interface Prediction {
  region: string
  seriesId: string
  game: number
  evaluatedOn: string
  trainedThrough: string
  trainingGames: number
  probability: number
  challengerProbability: number
  actual: 0 | 1
  baselineProbability: number
}

function scorePredictions(predictions: Prediction[]) {
  const decided = predictions.filter((row) => Math.abs(row.probability - 0.5) > 1e-10)
  const correct = decided.filter((row) => (row.probability > 0.5) === Boolean(row.actual)).length
  const average = (fn: (row: Prediction) => number) => predictions.length
    ? predictions.reduce((sum, row) => sum + fn(row), 0) / predictions.length : null
  return {
    games: predictions.length,
    decisions: decided.length,
    abstentions: predictions.length - decided.length,
    correct,
    accuracy: decided.length ? correct / decided.length : null,
    accuracyInterval95: observedRateInterval(correct, decided.length),
    brierScore: average((row) => (row.probability - row.actual) ** 2),
    neutralBrierScore: predictions.length ? 0.25 : null,
    historicalBaseRateBrier: average((row) => (row.baselineProbability - row.actual) ** 2),
    historicalMajorityAccuracy: average((row) => row.baselineProbability === 0.5
      ? 0.5 : Number((row.baselineProbability > 0.5) === Boolean(row.actual))),
  }
}

/** Prequential test of the fixed production model, NOT an optimizer. Train on
 * earlier calendar days, predict the next day's complete series, then advance.
 * Never infer source pick order from lane-ordered hero arrays. */
export function walkForwardDraftEvaluation(
  leagues: DraftLeague[],
  catalog: HeroCatalogItem[],
  options: { now: number; window?: EvidenceWindow; seasonPages?: Record<string, string>; minTrainingGames?: number },
) {
  const window = options.window ?? 14
  const minTrainingGames = options.minTrainingGames ?? 20
  if (!Number.isInteger(minTrainingGames) || minTrainingGames < 1) throw new Error('Minimum training games must be positive')
  const clean = scopeDraftEvidence(leagues, { now: options.now, window: 'season', seasonPages: options.seasonPages })
  const predictions: Prediction[] = []
  let skippedGames = 0
  let trainingUpdates = 0
  const regions = [...new Set(clean.leagues.map((league) => league.regionSlug))].sort()
  const dayOf = (time: number) => Math.floor(time / 86400) * 86400

  for (const region of regions) {
    const regional = clean.leagues.filter((league) => league.regionSlug === region)
    const days = [...new Set(regional.flatMap((league) => league.series.map((series) => dayOf(draftSeriesTime(series)!))))].sort((a, b) => a - b)
    for (const day of days) {
      const testing = regional.flatMap((league) => league.series.filter((series) => dayOf(draftSeriesTime(series)!) === day))
      // End at yesterday, even if some series have a precise kickoff time.
      // This avoids learning a same-day result whose publication time is unknown.
      const training = scopeDraftEvidence(regional, { now: day - 1, window }).leagues
      const trainingGames = training.flatMap((league) => league.series.flatMap((series) => series.games))
      if (trainingGames.length < minTrainingGames) {
        skippedGames += testing.reduce((total, series) => total + series.games.length, 0)
        continue
      }
      const model = buildDraftCoachModel(training, region, null, catalog)
      const challenger = trainDraftOutcomeModel(trainingGames.map((game) => ({
        team1: game.team1Picks.map((hero) => heroKey(hero.id || hero.name)),
        team2: game.team2Picks.map((hero) => heroKey(hero.id || hero.name)),
        winner: game.winner as 1 | 2,
      })))
      const baselineProbability = trainingGames.filter((game) => game.winner === 1).length / trainingGames.length
      trainingUpdates += 1
      for (const series of testing) for (const game of series.games) {
        const team1 = game.team1Picks.map((hero) => heroKey(hero.id || hero.name))
        const team2 = game.team2Picks.map((hero) => heroKey(hero.id || hero.name))
        const result = compareCompletedDrafts(model, {
          allyPicks: team1, enemyPicks: team2,
          allyBans: [], enemyBans: [],
        })
        if (!result) continue
        predictions.push({ region, seriesId: series.id, game: game.number,
          evaluatedOn: new Date(day * 1000).toISOString(),
          trainedThrough: new Date((day - 1) * 1000).toISOString(),
          trainingGames: trainingGames.length,
          probability: result.allyWinProbability, actual: game.winner === 1 ? 1 : 0,
          challengerProbability: predictDraftOutcome(challenger, team1, team2),
          baselineProbability,
        })
      }
    }
  }
  return {
    method: 'Region-specific next-day walk-forward; fixed production model; no test-set tuning',
    window, minTrainingGames, trainingUpdates, skippedGames,
    quality: clean.audit,
    overall: scorePredictions(predictions),
    byRegion: regions.map((region) => ({ region, ...scorePredictions(predictions.filter((row) => row.region === region)) })),
    challenger: {
      method: 'Offline L2 logistic model: signed hero and recurring teammate-pair features; fixed parameters; no team IDs, tier scores or test-set tuning; NOT enabled in the coach',
      overall: scorePredictions(predictions.map((row) => ({ ...row, probability: row.challengerProbability }))),
      byRegion: regions.map((region) => ({ region, ...scorePredictions(predictions.filter((row) => row.region === region).map((row) => ({ ...row, probability: row.challengerProbability }))) })),
    },
    predictions,
    note: 'Retrospective result prediction, not proof that a recommended draft causes a win or an exact pick-order replay. Only prior dated current-season games enter each regional training batch. Same-day games are withheld together; data publication delays and historical patch/role revisions are unknown. Games from recurring teams are correlated, so the displayed binomial interval is approximate. Cold-start days are skipped, not counted as successes. No 90% guarantee or commercial validation.',
  }
}
