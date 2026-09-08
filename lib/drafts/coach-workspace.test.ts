import { describe, expect, it } from 'vitest'
import { readSnapshot } from '@/lib/data/snapshots'
import type { DraftLeague } from '@/lib/data/types'
import { buildDraftCoachModel, DRAFT_PLANS, heroKey, openDraftLanes, proDraftFlow, recommendDraftHeroes, type DraftCoachState, type HeroCatalogItem } from './coach'
import { scopeDraftEvidence } from './evidence'

const snapshot = readSnapshot<DraftLeague[]>('drafts')!
const catalog = readSnapshot<HeroCatalogItem[]>('hero-catalog')!.data
describe('scoped draft workspace scenarios', () => {
  for (const region of ['all', ...snapshot.data.map((league) => league.regionSlug)]) {
    for (const window of [14, 28, 'season'] as const) {
      it(`${region} / ${window}: both sides and every plan preserve pick/ban legality`, () => {
        const scoped = scopeDraftEvidence(snapshot.data, { now: snapshot.harvestedAt, window, regionSlug: region })
        const model = buildDraftCoachModel(scoped.leagues, region, null, catalog)
        for (const first of [true, false]) for (const plan of DRAFT_PLANS) {
          const state: DraftCoachState = { allyPicks: [], enemyPicks: [], allyBans: [], enemyBans: [], allyPickLanes: [], enemyPickLanes: [] }
          for (const action of proDraftFlow(first)) {
            const own = action.side === 'ally'
            const perspective = own ? state : { allyPicks: state.enemyPicks, enemyPicks: state.allyPicks, allyBans: state.enemyBans, enemyBans: state.allyBans, allyPickLanes: state.enemyPickLanes, enemyPickLanes: state.allyPickLanes }
            const options = recommendDraftHeroes(model, { state: perspective, plan, kind: action.kind, phase: action.phase })
            const used = [...state.allyPicks, ...state.enemyPicks, ...state.allyBans, ...state.enemyBans].map(heroKey)
            const open = action.kind === 'pick' ? openDraftLanes(model, perspective.allyPicks, perspective.allyPickLanes) : openDraftLanes(model, perspective.enemyPicks, perspective.enemyPickLanes)
            for (const rec of options) {
              expect(used).not.toContain(heroKey(rec.hero.id))
              expect(open).toContain(rec.suggestedLane)
              expect(rec.wins + rec.losses).toBe(rec.resultGames)
              expect(rec.score).toBeGreaterThanOrEqual(0)
              expect(rec.score).toBeLessThanOrEqual(99)
              if (action.kind === 'pick') expect(model.heroByKey[heroKey(rec.hero.id)].exactGames).toBeGreaterThan(0)
            }
            // Thin regional samples may run out of observed picks; the UI
            // must abstain and preserve free manual picks, not import old data.
            const chosen = options[0]
            if (!chosen) break
            if (action.kind === 'pick') {
              (own ? state.allyPicks : state.enemyPicks).push(chosen.hero.id)
              ;(own ? state.allyPickLanes! : state.enemyPickLanes!).push(chosen.suggestedLane!)
            } else (own ? state.allyBans : state.enemyBans).push(chosen.hero.id)
          }
          expect(new Set(state.allyPickLanes).size).toBe(state.allyPicks.length)
          expect(new Set(state.enemyPickLanes).size).toBe(state.enemyPicks.length)
        }
      })
    }
  }
})
