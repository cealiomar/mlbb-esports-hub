/** Offline challenger only. Fits coefficients to prior results rather than
 * assigning hand-written power scores. It is not enabled in the live coach. */
export interface OutcomeGame {
  team1: string[]
  team2: string[]
  winner: 1 | 2
}

interface OutcomeModel {
  games: number
  weights: Map<string, number>
}

const pairKeys = (heroes: string[]) => heroes.flatMap((hero, index) =>
  heroes.slice(index + 1).map((other) => `pair:${[hero, other].sort().join('|')}`))
const sigmoid = (value: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))))

function features(team1: string[], team2: string[]) {
  const result = new Map<string, number>()
  for (const [heroes, sign] of [[team1, 1], [team2, -1]] as const) {
    for (const hero of heroes) result.set(`hero:${hero}`, sign)
    for (const pair of pairKeys(heroes)) result.set(pair, sign * 0.5)
  }
  return result
}

export function trainDraftOutcomeModel(games: OutcomeGame[]): OutcomeModel {
  const valid = games.filter((game) => game.team1.length === 5 && game.team2.length === 5 &&
    new Set([...game.team1, ...game.team2]).size === 10 &&
    [...game.team1, ...game.team2].every(Boolean) && [1, 2].includes(game.winner))
  const pairSupport = new Map<string, number>()
  for (const game of valid) for (const pair of [...pairKeys(game.team1), ...pairKeys(game.team2)]) {
    pairSupport.set(pair, (pairSupport.get(pair) ?? 0) + 1)
  }
  const rows = valid.map((game) => ({
    x: [...features(game.team1, game.team2)].filter(([key]) => !key.startsWith('pair:') || (pairSupport.get(key) ?? 0) >= 3),
    y: game.winner === 1 ? 1 : 0,
  }))
  const weights = new Map<string, number>(rows.flatMap((row) => row.x.map(([key]) => [key, 0] as const)))
  // Fixed protocol; no selection/tuning using held-out outcomes. Mean logistic
  // loss + L2 (lambda .2), 400 deterministic full-batch steps at rate .1.
  // No intercept/team IDs: swapping the two drafts must complement the output.
  for (let step = 0; step < 400 && rows.length; step += 1) {
    const gradients = new Map([...weights].map(([key, weight]) => [key, 0.2 * weight]))
    for (const row of rows) {
      const error = sigmoid(row.x.reduce((sum, [key, value]) => sum + weights.get(key)! * value, 0)) - row.y
      for (const [key, value] of row.x) gradients.set(key, gradients.get(key)! + error * value / rows.length)
    }
    for (const [key, gradient] of gradients) weights.set(key, weights.get(key)! - 0.1 * gradient)
  }
  return { games: valid.length, weights }
}

export function predictDraftOutcome(model: OutcomeModel, team1: string[], team2: string[]): number {
  if (team1.length !== 5 || team2.length !== 5 || new Set([...team1, ...team2]).size !== 10) return 0.5
  return sigmoid([...features(team1, team2)].reduce((sum, [key, value]) => sum + (model.weights.get(key) ?? 0) * value, 0))
}
