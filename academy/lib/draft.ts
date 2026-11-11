import { LANES, type Hero, type Lane } from './data-types'

export type Side = 'blue' | 'red'
export interface Step {
  side: Side
  kind: 'ban' | 'pick'
}

/**
 * Ranked draft order: ten bans alternating from blue, then ten picks in
 * snake order (1-2-2-2-2-1) so neither side picks twice before the other
 * has answered.
 */
export const DRAFT_ORDER: readonly Step[] = [
  ...Array.from({ length: 10 }, (_, index): Step => ({
    side: index % 2 === 0 ? 'blue' : 'red',
    kind: 'ban',
  })),
  ...(['blue', 'red', 'red', 'blue', 'blue', 'red', 'red', 'blue', 'blue', 'red'] as const).map(
    (side): Step => ({ side, kind: 'pick' }),
  ),
]

export interface DraftState {
  bans: Record<Side, Hero[]>
  picks: Record<Side, Hero[]>
  taken: Set<string>
  /** The step about to be played, or null once the draft is complete. */
  current: Step | null
}

export function readDraft(actions: readonly string[], heroes: readonly Hero[]): DraftState {
  const byId = new Map(heroes.map((hero) => [hero.id, hero]))
  const state: DraftState = {
    bans: { blue: [], red: [] },
    picks: { blue: [], red: [] },
    taken: new Set(actions),
    current: DRAFT_ORDER[actions.length] ?? null,
  }
  actions.forEach((id, index) => {
    const step = DRAFT_ORDER[index]
    const hero = byId.get(id)
    if (!step || !hero) return
    state[step.kind === 'ban' ? 'bans' : 'picks'][step.side].push(hero)
  })
  return state
}

/**
 * Seats each pick in a lane, in pick order: its primary lane if free, else
 * the first other lane it can play. A hero with no free lane stays unseated.
 */
export function assignLanes(picks: readonly Hero[]): (Lane | null)[] {
  const used = new Set<Lane>()
  return picks.map((hero) => {
    const lane = hero.lanes.find((candidate) => !used.has(candidate)) ?? null
    if (lane) used.add(lane)
    return lane
  })
}

export function openLanes(picks: readonly Hero[]): Lane[] {
  const seated = new Set(assignLanes(picks))
  return LANES.filter((lane) => !seated.has(lane))
}

/**
 * The strongest available heroes for the step being played.
 *
 * A pick is suggested only for a lane the side still needs. A ban targets
 * what the opponent still needs, because banning a hero for a lane they
 * have already filled removes nothing from their draft.
 */
export function suggest(
  state: DraftState,
  heroes: readonly Hero[],
  limit: number,
): Hero[] {
  const step = state.current
  if (!step) return []
  const side = step.kind === 'pick' ? step.side : step.side === 'blue' ? 'red' : 'blue'
  const needed = new Set(openLanes(state.picks[side]))
  return heroes
    .filter((hero) => !state.taken.has(hero.id))
    .filter((hero) => hero.lanes.some((lane) => needed.has(lane)))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Average tier score of a lineup, on a 0–100 scale. */
export function metaScore(picks: readonly Hero[]): number {
  if (picks.length === 0) return 0
  return Math.round(
    (picks.reduce((total, hero) => total + hero.score, 0) / picks.length) * 100,
  )
}
