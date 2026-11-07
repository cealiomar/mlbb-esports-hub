import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

const here = path.dirname(new URL(import.meta.url).pathname)
const root = path.resolve(here, '../..')
const snapshot = (name: string) =>
  JSON.parse(readFileSync(path.join(root, 'data/snapshots', `${name}.json`), 'utf8'))

function loadEngine() {
  const bundle = path.join(here, 'dist/Engine.js')
  if (!existsSync(bundle)) throw new Error('run `npm run coach-engine:build` first')
  const context = vm.createContext({
    __COACH_DATA__: { patchMeta: snapshot('patch-meta'), heroCatalog: snapshot('hero-catalog') },
    console,
  })
  vm.runInContext(readFileSync(bundle, 'utf8'), context)
  const engine = context.DraftCoachEngine as { call(name: string, args: string): string }
  return {
    call<T>(name: string, args: unknown = undefined): T {
      const out = engine.call(name, args === undefined ? '' : JSON.stringify(args))
      if (out[0] === 'E') throw new Error(out.slice(1))
      return JSON.parse(out.slice(1)) as T
    },
  }
}

describe('coach engine bundle', () => {
  it('loads snapshots, builds a model and recommends a first ban', () => {
    const engine = loadEngine()
    const version = engine.call<{ engine: string; patch: string }>('version')
    expect(version.patch).toMatch(/^\d+\.\d+\.\d+$/)

    const loaded = engine.call<{ games: number; teams: number }>('load', {
      drafts: snapshot('drafts'),
      heroCatalog: snapshot('hero-catalog'),
    })
    expect(loaded.games).toBeGreaterThan(50)
    expect(loaded.teams).toBeGreaterThan(10)

    const scope = engine.call<{ scope: string; games: number; heroes: number }>('buildModel', {
      windowDays: 30,
      patch: null,
      minPatchGames: 40,
      mapName: null,
    })
    expect(scope.scope).toBe('days')
    expect(scope.games).toBeGreaterThan(0)
    expect(scope.heroes).toBeGreaterThan(100)

    const flow = engine.call<Array<{ side: string; kind: string; phase: number }>>('flow', true)
    expect(flow).toHaveLength(20)
    expect(flow[0]).toEqual({ side: 'ally', kind: 'ban', phase: 1 })

    const out = engine.call<{ recommendations: Array<{ key: string; score: number; reasons: string[] }> }>('recommend', {
      state: { allyPicks: [], enemyPicks: [], allyBans: [], enemyBans: [], allyPickLanes: [], enemyPickLanes: [] },
      action: flow[0],
      plan: 'balanced',
      allyFirstPick: true,
      allyTeam: null,
      enemyTeam: null,
      preferredHeroes: [],
      nextAction: flow[1],
      limit: 8,
    })
    expect(out.recommendations.length).toBeGreaterThan(0)
    expect(out.recommendations[0].score).toBeGreaterThanOrEqual(out.recommendations[1].score)
    expect(out.recommendations[0].key).toMatch(/^[a-z0-9]+$/)
  })

  it('reports an unknown function as an E result', () => {
    const engine = loadEngine()
    expect(() => engine.call('nope')).toThrow(/unknown engine function/)
  })
})
