import { DRAFT_LANES, heroKey, openDraftLanes, type DraftCoachModel, type DraftCoachState, type DraftCompositionSample, type DraftLane, type DraftPlan } from './coach'

export interface DraftBlueprint {
  id: string
  heroes: { key: string; lane: DraftLane }[]
  games: number
  wins: number
  winRate: number
  teams: number
  overlap: number
  medianMinutes: number | null
  examples: DraftCompositionSample[]
  score: number
}

/** Retrieve actual three-hero cores, not combinations invented by joining
 * unrelated pairs. A game counts once per core; role slots are not pick order.
 * Outcome rates are shrunk only for sorting; UI shows raw W/L and sample size. */
export function findDraftBlueprints(model: DraftCoachModel, state: DraftCoachState, plan: DraftPlan, limit = 3): DraftBlueprint[] {
  const ours = state.allyPicks.map(heroKey)
  const blocked = new Set([...state.allyBans, ...state.enemyBans, ...state.enemyPicks].map(heroKey))
  const open = openDraftLanes(model, state.allyPicks, state.allyPickLanes)
  const cores = new Map<string, { heroes: DraftBlueprint['heroes']; samples: Map<number, DraftCompositionSample> }>()
  for (const sample of model.compositions) {
    if (sample.won === null || sample.picks.length !== 5) continue
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 4; b++) for (let c = b + 1; c < 5; c++) {
      const heroes = [a, b, c].map((i) => ({ key: sample.picks[i], lane: DRAFT_LANES[i] }))
      if (heroes.some(({ key, lane }) => {
        if (blocked.has(key) || !model.heroByKey[key]) return true
        const selected = ours.indexOf(key)
        return selected >= 0
          ? Boolean(state.allyPickLanes?.[selected] && state.allyPickLanes[selected] !== lane)
          : !open.includes(lane)
      })) continue
      const id = heroes.map((hero) => `${hero.lane}:${hero.key}`).join('|')
      const entry = cores.get(id) ?? { heroes, samples: new Map() }
      entry.samples.set(sample.gameId, sample)
      cores.set(id, entry)
    }
  }
  const ranked: DraftBlueprint[] = []
  for (const [id, { heroes, samples }] of cores) {
    if (samples.size < 3) continue
    const rows = [...samples.values()]
    const wins = rows.filter((sample) => sample.won).length
    const overlap = heroes.filter((hero) => ours.includes(hero.key)).length
    if (ours.length && overlap === 0) continue
    const durations = rows.map((sample) => sample.durationSeconds).filter((n): n is number => Boolean(n && n > 0)).sort((a, b) => a - b)
    const middle = Math.floor(durations.length / 2)
    const medianSeconds = durations.length ? durations.length % 2
      ? durations[middle] : (durations[middle - 1] + durations[middle]) / 2 : null
    const pace = heroes.reduce((sum, hero) => sum + (plan === 'early' ? model.heroByKey[hero.key].earlyScore : plan === 'scaling' ? model.heroByKey[hero.key].scalingScore : 0.5), 0) / 3
    ranked.push({
      id, heroes, games: rows.length, wins, winRate: wins / rows.length,
      teams: new Set(rows.map((sample) => sample.team?.pageSlug).filter(Boolean)).size,
      overlap,
      medianMinutes: medianSeconds === null ? null : Math.round(medianSeconds / 6) / 10,
      examples: rows.slice().sort((a, b) => (b.playedOn ?? '').localeCompare(a.playedOn ?? '')).slice(0, 3),
      score: overlap * 2 + (wins + 4) / (rows.length + 8) * 0.5 + Math.min(rows.length / 20, 1) * 0.3 + pace * 0.2,
    })
  }
  // Avoid filling the short list with near-identical versions of one core.
  const result: DraftBlueprint[] = []
  for (const candidate of ranked.sort((a, b) => b.score - a.score || b.games - a.games || a.id.localeCompare(b.id))) {
    if (result.some((item) => item.heroes.filter((hero) => candidate.heroes.some((other) => other.key === hero.key)).length >= 2)) continue
    result.push(candidate)
    if (result.length >= limit) break
  }
  return result
}
