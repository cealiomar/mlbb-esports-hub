/**
 * Draft arena — measures whether the coach points at what winners draft.
 *
 * The site's own win model cannot be the judge: scoring the coach with the
 * same numbers it optimises is circular, and a backtest showed that model has
 * no edge over a coin flip anyway. The only honest referee is a real result.
 *
 * So every completed pro game is replayed. At each pick step the coach is
 * asked what it would take, and we record where the hero actually taken
 * ranks in that list — once for the side that went on to win, once for the
 * side that lost. A coach with real judgement ranks the winner's picks
 * higher than the loser's. Everything measured is a real pro pick, so the
 * evaluation never rewards going outside the meta.
 *
 *   npx tsx scripts/lab/draft-arena.mts [--plan balanced] [--split 0.6]
 */
import {
  buildDraftCoachModel,
  recommendDraftHeroes,
  heroKey,
  type DraftPlan,
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
  winnerBans: string[]
  loserBans: string[]
}

function replays(source: DraftLeague[]): Replay[] {
  const out: Replay[] = []
  for (const league of source) {
    for (const series of league.series) {
      const when =
        series.startsAt ??
        (series.playedOn ? Date.parse(series.playedOn) / 1000 : 0)
      for (const game of series.games) {
        if (!game.winner) continue
        const keys = (hs: { id: string; name: string }[]) =>
          hs.map((h) => heroKey(h.id || h.name))
        const one = {
          picks: keys(game.team1Picks),
          bans: keys(game.team1Bans),
        }
        const two = {
          picks: keys(game.team2Picks),
          bans: keys(game.team2Bans),
        }
        if (one.picks.length !== 5 || two.picks.length !== 5) continue
        const [w, l] = game.winner === 1 ? [one, two] : [two, one]
        out.push({
          when,
          winnerPicks: w.picks,
          loserPicks: l.picks,
          winnerBans: w.bans,
          loserBans: l.bans,
        })
      }
    }
  }
  return out.sort((a, b) => a.when - b.when)
}

const RANKED = 12

/** Where the hero actually taken sits in the coach's ranking, or null. */
function rankOfActualPick(
  model: ReturnType<typeof buildDraftCoachModel>,
  plan: DraftPlan,
  ally: string[],
  enemy: string[],
  bans: string[],
  actual: string,
): number | null {
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
    plan,
    limit: RANKED,
  })
  const index = list.findIndex((r) => heroKey(r.hero.id) === actual)
  return index === -1 ? null : index + 1
}

interface Score {
  hits: number
  steps: number
  rankSum: number
  ranked: number
}

function blank(): Score {
  return { hits: 0, steps: 0, rankSum: 0, ranked: 0 }
}

function record(score: Score, rank: number | null, topN: number): void {
  score.steps++
  if (rank !== null) {
    score.ranked++
    score.rankSum += rank
    if (rank <= topN) score.hits++
  }
}

export function runArena(plan: DraftPlan, splitRatio: number, topN: number) {
  const all = replays(leagues)
  const cutIndex = Math.floor(all.length * splitRatio)
  const cutoff = all[cutIndex].when

  const trainLeagues = leagues
    .map((l) => ({
      ...l,
      series: l.series.filter(
        (s) =>
          (s.startsAt ??
            (s.playedOn ? Date.parse(s.playedOn) / 1000 : 0)) < cutoff,
      ),
    }))
    .filter((l) => l.series.length > 0)

  const model = buildDraftCoachModel(trainLeagues, 'all', null, catalog)
  const test = all.slice(cutIndex)

  const winner = blank()
  const loser = blank()

  for (const game of test) {
    const bans = [...game.winnerBans, ...game.loserBans]
    for (let step = 0; step < 5; step++) {
      record(
        winner,
        rankOfActualPick(
          model,
          plan,
          game.winnerPicks.slice(0, step),
          game.loserPicks.slice(0, step),
          bans,
          game.winnerPicks[step],
        ),
        topN,
      )
      record(
        loser,
        rankOfActualPick(
          model,
          plan,
          game.loserPicks.slice(0, step),
          game.winnerPicks.slice(0, step),
          bans,
          game.loserPicks[step],
        ),
        topN,
      )
    }
  }

  return { games: test.length, winner, loser, trained: all.length - test.length }
}

function pct(a: number, b: number) {
  return b === 0 ? '  n/a' : `${((a * 100) / b).toFixed(1).padStart(5)}%`
}

const planArg = (process.argv.find((a) => a.startsWith('--plan='))?.split('=')[1] ??
  'balanced') as DraftPlan
const splitArg = Number(
  process.argv.find((a) => a.startsWith('--split='))?.split('=')[1] ?? '0.6',
)
const topArg = Number(
  process.argv.find((a) => a.startsWith('--top='))?.split('=')[1] ?? '5',
)

const r = runArena(planArg, splitArg, topArg)
console.log(
  `plan=${planArg}  trained on ${r.trained} games  tested on ${r.games} games  top-${topArg}\n`,
)
console.log(`                 in top-${topArg}   mean rank   covered`)
for (const [label, s] of [
  ['winning side', r.winner],
  ['losing side ', r.loser],
] as const) {
  const meanRank = s.ranked ? (s.rankSum / s.ranked).toFixed(2) : 'n/a'
  console.log(
    `  ${label}   ${pct(s.hits, s.steps)}      ${String(meanRank).padStart(5)}      ${pct(s.ranked, s.steps)}`,
  )
}
const edge =
  (r.winner.hits * 100) / r.winner.steps - (r.loser.hits * 100) / r.loser.steps
console.log(
  `\n  edge (winner - loser): ${edge >= 0 ? '+' : ''}${edge.toFixed(1)} points`,
)
console.log(
  `  a coach with no judgement scores 0; positive means it favours what winners take.`,
)
