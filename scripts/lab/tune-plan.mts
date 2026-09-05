/**
 * Searches for pick weights that agree more with what winners actually draft.
 *
 * Three periods, in time order, so nothing is judged on data it was fitted
 * to: the model is built from the earliest games, candidate weights are
 * chosen on the middle slice, and the single winner is reported once on a
 * final slice that the search never saw. Any "improvement" that only exists
 * on the tuning slice is noise, and this layout makes that visible instead
 * of flattering.
 *
 *   npx tsx scripts/lab/tune-plan.mts
 */
import {
  buildDraftCoachModel,
  recommendDraftHeroes,
  heroKey,
  PLAN_WEIGHTS,
  type PlanWeights,
} from '@/lib/drafts/coach'
import type { DraftLeague } from '@/lib/data/types'
import draftsSnapshot from '@/data/snapshots/drafts.json'
import catalogSnapshot from '@/data/snapshots/hero-catalog.json'

const leagues = draftsSnapshot.data as unknown as DraftLeague[]
const catalog = catalogSnapshot.data as never

interface Replay {
  when: number
  winnerPicks: string[]
  loserPicks: string[]
  bans: string[]
}

const games: Replay[] = []
for (const league of leagues) {
  for (const series of league.series) {
    const when =
      series.startsAt ??
      (series.playedOn ? Date.parse(series.playedOn) / 1000 : 0)
    for (const game of series.games) {
      if (!game.winner) continue
      const keys = (hs: { id: string; name: string }[]) =>
        hs.map((h) => heroKey(h.id || h.name))
      const a = { picks: keys(game.team1Picks), bans: keys(game.team1Bans) }
      const b = { picks: keys(game.team2Picks), bans: keys(game.team2Bans) }
      if (a.picks.length !== 5 || b.picks.length !== 5) continue
      const [w, l] = game.winner === 1 ? [a, b] : [b, a]
      games.push({
        when,
        winnerPicks: w.picks,
        loserPicks: l.picks,
        bans: [...a.bans, ...b.bans],
      })
    }
  }
}
games.sort((a, b) => a.when - b.when)

const fitEnd = Math.floor(games.length * 0.55)
const tuneEnd = Math.floor(games.length * 0.78)
const cutoff = games[fitEnd].when

const model = buildDraftCoachModel(
  leagues
    .map((l) => ({
      ...l,
      series: l.series.filter(
        (s) =>
          (s.startsAt ?? (s.playedOn ? Date.parse(s.playedOn) / 1000 : 0)) <
          cutoff,
      ),
    }))
    .filter((l) => l.series.length > 0),
  'all',
  null,
  catalog,
)

const TOP = 5

function edgeOn(slice: Replay[], weights: PlanWeights): number {
  let winnerHits = 0
  let loserHits = 0
  let steps = 0

  const rank = (ally: string[], enemy: string[], bans: string[], actual: string) => {
    const list = recommendDraftHeroes(model, {
      kind: 'pick',
      state: {
        allyPicks: ally,
        enemyPicks: enemy,
        allyPickLanes: [],
        enemyPickLanes: [],
        allyBans: bans,
        enemyBans: [],
      },
      plan: 'balanced',
      weights,
      limit: TOP,
    })
    return list.some((r) => heroKey(r.hero.id) === actual)
  }

  for (const g of slice) {
    for (let i = 0; i < 5; i++) {
      steps++
      if (rank(g.winnerPicks.slice(0, i), g.loserPicks.slice(0, i), g.bans, g.winnerPicks[i])) winnerHits++
      if (rank(g.loserPicks.slice(0, i), g.winnerPicks.slice(0, i), g.bans, g.loserPicks[i])) loserHits++
    }
  }
  return ((winnerHits - loserHits) * 100) / steps
}

const tune = games.slice(fitEnd, tuneEnd)
const test = games.slice(tuneEnd)

const norm = (w: PlanWeights): PlanWeights => {
  const total = w.meta + w.role + w.synergy + w.counter + w.pace + w.comfort
  return {
    meta: w.meta / total, role: w.role / total, synergy: w.synergy / total,
    counter: w.counter / total, pace: w.pace / total, comfort: w.comfort / total,
  }
}

const candidates: Array<{ name: string; w: PlanWeights }> = [
  { name: 'current balanced', w: PLAN_WEIGHTS.balanced },
]
for (const meta of [0.28, 0.36, 0.46, 0.56]) {
  for (const role of [0.14, 0.22, 0.3]) {
    for (const synergy of [0.1, 0.2, 0.3]) {
      for (const counter of [0.06, 0.14]) {
        candidates.push({
          name: `meta${meta} role${role} syn${synergy} ctr${counter}`,
          w: norm({ meta, role, synergy, counter, pace: 0.03, comfort: 0.07 }),
        })
      }
    }
  }
}

console.log(
  `fit ${fitEnd} games · tune ${tune.length} games · held-out test ${test.length} games`,
)
console.log(`searching ${candidates.length} weightings on the tuning slice…\n`)

const scored = candidates.map((c) => ({ ...c, edge: edgeOn(tune, c.w) }))
scored.sort((a, b) => b.edge - a.edge)

console.log('top of the tuning slice:')
for (const c of scored.slice(0, 5)) {
  console.log(`  ${c.edge >= 0 ? '+' : ''}${c.edge.toFixed(1)}  ${c.name}`)
}
const baselineTune = scored.find((c) => c.name === 'current balanced')!
console.log(`  (current balanced scored ${baselineTune.edge >= 0 ? '+' : ''}${baselineTune.edge.toFixed(1)} here)`)

const best = scored[0]
console.log('\nheld-out test — the slice neither the model nor the search saw:')
console.log(`  current balanced : ${(() => { const e = edgeOn(test, PLAN_WEIGHTS.balanced); return `${e >= 0 ? '+' : ''}${e.toFixed(1)}` })()} points`)
console.log(`  best candidate   : ${(() => { const e = edgeOn(test, best.w); return `${e >= 0 ? '+' : ''}${e.toFixed(1)}` })()} points   (${best.name})`)
console.log(`\n  weights: ${JSON.stringify(best.w, (_, v) => typeof v === 'number' ? Number(v.toFixed(3)) : v)}`)
