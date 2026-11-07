import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
// COACH_DATA_DIR=data/coach generates fixtures from the daily job's output instead of the site snapshots.
const dataDir = path.join(root, process.env.COACH_DATA_DIR ?? 'data/snapshots')
const snapshot = (name) => JSON.parse(readFileSync(path.join(dataDir, `${name}.json`), 'utf8'))

const context = vm.createContext({
  __COACH_DATA__: { patchMeta: snapshot('patch-meta'), heroCatalog: snapshot('hero-catalog') },
  console,
})
vm.runInContext(readFileSync(path.join(here, 'dist/Engine.js'), 'utf8'), context)
const call = (name, args) => {
  const out = context.DraftCoachEngine.call(name, args === undefined ? '' : JSON.stringify(args))
  if (out[0] === 'E') throw new Error(out.slice(1))
  return JSON.parse(out.slice(1))
}

call('load', { drafts: snapshot('drafts'), heroCatalog: snapshot('hero-catalog') })
// With coach data the series carry patches, so exercise the patch scope the app uses.
const currentPatch = process.env.COACH_DATA_DIR ? JSON.parse(readFileSync(path.join(dataDir, 'manifest.json'), 'utf8')).currentPatch : null
const buildModel = { windowDays: 30, patch: currentPatch, minPatchGames: 40, mapName: null }
call('buildModel', buildModel)
const flow = call('flow', true)
const empty = { allyPicks: [], enemyPicks: [], allyBans: [], enemyBans: [], allyPickLanes: [], enemyPickLanes: [] }

// Walk one full draft, always locking the top recommendation, recording every step.
const cases = []
let state = structuredClone(empty)
for (let step = 0; step < flow.length; step += 1) {
  const action = flow[step]
  const input = {
    state: structuredClone(state),
    action,
    plan: step < 10 ? 'balanced' : 'counter',
    allyFirstPick: true,
    allyTeam: null,
    enemyTeam: null,
    preferredHeroes: [],
    nextAction: flow[step + 1] ?? null,
    limit: 8,
  }
  const output = call('recommend', input)
  cases.push({ name: `step-${step}-${action.side}-${action.kind}`, input, output })
  const top = output.recommendations[0]
  if (!top) throw new Error(`no recommendation at step ${step}`)
  const field = action.side === 'ally' ? (action.kind === 'pick' ? 'allyPicks' : 'allyBans') : action.kind === 'pick' ? 'enemyPicks' : 'enemyBans'
  state[field] = [...state[field], top.key]
  if (action.kind === 'pick') {
    const { lane } = call('laneForHero', { state, side: action.side, hero: top.key, lane: top.suggestedLane, allowAnyRole: true })
    const laneField = action.side === 'ally' ? 'allyPickLanes' : 'enemyPickLanes'
    state[laneField] = [...state[laneField], lane]
  }
}
const compare = { state, output: call('compare', { state }) }
const version = call('version')

mkdirSync(path.join(here, 'fixtures'), { recursive: true })
writeFileSync(
  path.join(here, 'fixtures/parity.json'),
  JSON.stringify({ engine: version.engine, generatedAt: new Date().toISOString(), buildModel, cases, compare }, null, 1),
)
console.log(`wrote ${cases.length} cases, engine ${version.engine}`)
