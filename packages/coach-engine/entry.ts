import type { DraftLeague, DraftSeries, DraftTeam } from '@/lib/data/types'
import {
  buildDraftCoachModel,
  compareCompletedDrafts,
  counterPicksByRole,
  heroKey,
  nextSuggestedLane,
  openDraftLanes,
  proDraftFlow,
  recommendDraftDuos,
  recommendDraftHeroes,
  suggestedLaneForHero,
  type DraftAction,
  type DraftActionSide,
  type DraftCoachModel,
  type DraftCoachState,
  type DraftLane,
  type DraftPlan,
  type DraftRecommendation,
  type HeroCatalogItem,
} from '@/lib/drafts/coach'
import { scopeDraftEvidence } from '@/lib/drafts/evidence'
import { findDraftBlueprints } from '@/lib/drafts/playbook'
import { PATCH_META_UPDATED_AT, PATCH_META_VERSION } from '@/lib/drafts/current-patch-meta'

declare const __ENGINE_VERSION__: string

interface Snapshot<T> { harvestedAt: number; data: T }
type SeriesWithPatch = DraftSeries & { patch?: string | null }

interface LoadInput { drafts: Snapshot<DraftLeague[]>; heroCatalog: Snapshot<HeroCatalogItem[]> }
interface BuildModelInput { windowDays: number; patch?: string | null; minPatchGames?: number; mapName?: string | null }
interface RecommendInput {
  state: DraftCoachState
  action: DraftAction
  plan: DraftPlan
  allyFirstPick: boolean
  allyTeam?: string | null
  enemyTeam?: string | null
  preferredHeroes?: string[]
  nextAction?: DraftAction | null
  limit?: number
}
interface LaneForHeroInput { state: DraftCoachState; side: DraftActionSide; hero: string; lane?: DraftLane | null; allowAnyRole: boolean }
interface CountersInput { state: DraftCoachState; side: DraftActionSide; targetHero: string; allyTeam?: string | null; enemyTeam?: string | null }
interface TeamProfileInput { team: string; limit?: number }

interface HeroRef { key: string; name: string }
interface HeroCount extends HeroRef { count: number; wins: number; losses: number; winRate: number }
interface TeamGameRow {
  playedOn: string | null
  time: number
  opponent: DraftTeam
  won: boolean | null
  side: 'blue' | 'red' | null
  picks: HeroRef[]
  bans: HeroRef[]
  facedBans: HeroRef[]
  league: string
  gameNumber: number
}

const session: {
  leagues: DraftLeague[]
  now: number
  catalog: HeroCatalogItem[]
  model: DraftCoachModel | null
} = { leagues: [], now: 0, catalog: [], model: null }

function requireModel(): DraftCoachModel {
  if (!session.model) throw new Error('buildModel has not been called')
  return session.model
}

/** The engine always scores from the acting side's point of view. */
function perspective(state: DraftCoachState, side: DraftActionSide): DraftCoachState {
  if (side === 'ally') return { ...state, allyPickLanes: state.allyPickLanes ?? [], enemyPickLanes: state.enemyPickLanes ?? [] }
  return {
    allyPicks: state.enemyPicks,
    enemyPicks: state.allyPicks,
    allyBans: state.enemyBans,
    enemyBans: state.allyBans,
    allyPickLanes: state.enemyPickLanes ?? [],
    enemyPickLanes: state.allyPickLanes ?? [],
  }
}

function ref(hero: { id: string; name: string }): HeroRef {
  return { key: heroKey(hero.id || hero.name), name: hero.name }
}

function slim(item: DraftRecommendation) {
  return {
    key: heroKey(item.hero.id),
    id: item.hero.id,
    name: item.hero.name,
    score: item.score,
    confidence: item.confidence,
    sampleSize: item.sampleSize,
    resultGames: item.resultGames,
    wins: item.wins,
    losses: item.losses,
    observedWinRate: item.observedWinRate,
    primaryLane: item.primaryLane,
    suggestedLane: item.suggestedLane,
    flexLanes: item.flexLanes,
    patchMetaTier: item.patchMetaTier,
    pickRate: item.pickRate,
    banRate: item.banRate,
    firstBanRate: item.firstBanRate,
    earlyBanRate: item.earlyBanRate,
    winRate: item.winRate,
    matchupRate: item.matchupRate,
    matchupGames: item.matchupGames,
    synergyRate: item.synergyRate,
    synergyGames: item.synergyGames,
    teamRate: item.teamRate,
    reasons: item.reasons,
  }
}

function seriesTime(series: DraftSeries): number {
  if (series.startsAt) return series.startsAt
  if (series.playedOn) {
    const parsed = Date.parse(`${series.playedOn}T00:00:00Z`) / 1000
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function teamIndex(): Map<string, { pageSlug: string; name: string; games: number }> {
  const teams = new Map<string, { pageSlug: string; name: string; games: number }>()
  for (const league of session.leagues) {
    for (const series of league.series) {
      for (const team of [series.team1, series.team2]) {
        const slug = team.pageSlug || team.name
        const entry = teams.get(slug) ?? { pageSlug: slug, name: team.name, games: 0 }
        entry.games += series.games.length
        teams.set(slug, entry)
      }
    }
  }
  return teams
}

function heroCounts(rows: TeamGameRow[], field: 'picks' | 'bans' | 'facedBans'): HeroCount[] {
  const counts = new Map<string, HeroCount>()
  for (const row of rows) {
    for (const hero of row[field]) {
      const entry = counts.get(hero.key) ?? { ...hero, count: 0, wins: 0, losses: 0, winRate: 0 }
      entry.count += 1
      if (row.won === true) entry.wins += 1
      if (row.won === false) entry.losses += 1
      counts.set(hero.key, entry)
    }
  }
  return [...counts.values()]
    .map((entry) => ({
      ...entry,
      winRate: entry.wins + entry.losses > 0 ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || b.winRate - a.winRate || a.name.localeCompare(b.name))
}

const api = {
  version() {
    return { engine: __ENGINE_VERSION__, patch: PATCH_META_VERSION, patchUpdatedAt: PATCH_META_UPDATED_AT }
  },

  load(input: LoadInput) {
    session.leagues = input.drafts.data
    session.now = input.drafts.harvestedAt
    session.catalog = input.heroCatalog.data
    session.model = null
    const games = session.leagues.reduce(
      (total, league) => total + league.series.reduce((sum, series) => sum + series.games.length, 0),
      0,
    )
    return { leagues: session.leagues.length, games, teams: teamIndex().size, harvestedAt: session.now }
  },

  buildModel(input: BuildModelInput) {
    const minGames = input.minPatchGames ?? 40
    let leagues = session.leagues
    let scope: 'patch' | 'days' = 'days'
    if (input.patch) {
      const patched = leagues
        .map((league) => ({
          ...league,
          series: league.series.filter((series) => (series as SeriesWithPatch).patch === input.patch),
        }))
        .filter((league) => league.series.length > 0)
      const games = patched.reduce(
        (total, league) => total + league.series.reduce((sum, series) => sum + series.games.length, 0),
        0,
      )
      if (games >= minGames) {
        leagues = patched
        scope = 'patch'
      }
    }
    // scopeDraftEvidence types the window as 14 | 28 | 'season' but only multiplies it.
    const window = (scope === 'patch' ? 'season' : input.windowDays) as 14
    const evidence = scopeDraftEvidence(leagues, { now: session.now, window, regionSlug: 'all' })
    session.model = buildDraftCoachModel(evidence.leagues, 'all', input.mapName ?? null, session.catalog)
    return {
      scope,
      games: evidence.audit.included,
      from: evidence.from,
      to: evidence.to,
      audit: evidence.audit,
      heroes: session.model.heroes.length,
      now: session.now,
    }
  },

  flow(allyFirstPick: boolean): DraftAction[] {
    return proDraftFlow(allyFirstPick)
  },

  recommend(input: RecommendInput) {
    const model = requireModel()
    const { action } = input
    const view = perspective(input.state, action.side)
    const allyTeam = (action.side === 'ally' ? input.allyTeam : input.enemyTeam) ?? null
    const enemyTeam = (action.side === 'ally' ? input.enemyTeam : input.allyTeam) ?? null
    const preferred = action.side === 'ally' ? input.preferredHeroes ?? [] : []
    const targetLane = action.kind === 'pick' ? nextSuggestedLane(model, view.allyPicks, view.allyPickLanes) : null
    const openLanes = action.kind === 'pick' ? openDraftLanes(model, view.allyPicks, view.allyPickLanes) : []
    const priorityPicks =
      action.kind === 'ban' && action.phase === 1 && action.side === 'ally' && input.allyFirstPick
        ? recommendDraftHeroes(model, {
            kind: 'pick',
            state: view,
            plan: input.plan,
            allyTeamPageSlug: allyTeam,
            enemyTeamPageSlug: enemyTeam,
            preferredHeroes: preferred,
            limit: 3,
          })
        : []
    const recommendations = recommendDraftHeroes(model, {
      kind: action.kind,
      state: view,
      plan: input.plan,
      targetLane,
      allyTeamPageSlug: allyTeam,
      enemyTeamPageSlug: enemyTeam,
      excludeHeroes:
        action.kind === 'ban' && action.side === 'ally'
          ? [...priorityPicks.map((item) => item.hero.id), ...preferred]
          : [],
      phase: action.phase,
      preferredHeroes: preferred,
      limit: input.limit ?? 8,
    })
    const next = input.nextAction ?? null
    const canDuo = action.side === 'ally' && action.kind === 'pick' && next?.side === 'ally' && next?.kind === 'pick'
    const duos = canDuo
      ? recommendDraftDuos(model, {
          state: view,
          plan: input.plan,
          allyTeamPageSlug: allyTeam,
          enemyTeamPageSlug: enemyTeam,
          phase: action.phase,
          limit: 3,
        })
      : []
    return {
      targetLane,
      openLanes,
      priorityPicks: priorityPicks.map(slim),
      recommendations: recommendations.map(slim),
      duos: duos.map((duo) => ({
        first: slim(duo.first),
        second: slim(duo.second),
        games: duo.games,
        winRate: duo.winRate,
        score: duo.score,
      })),
    }
  },

  /** Mirrors the website's selectHero(): cards obey open lanes; the pool allows any role. */
  laneForHero(input: LaneForHeroInput) {
    const model = requireModel()
    const view = perspective(input.state, input.side)
    const openLanes = openDraftLanes(model, view.allyPicks, view.allyPickLanes)
    const profile = model.heroByKey[heroKey(input.hero)] ?? null
    const recommended = suggestedLaneForHero(model, input.hero, view.allyPicks, view.allyPickLanes)
    const lane = input.allowAnyRole
      ? input.lane ?? profile?.primaryLane ?? recommended ?? openLanes[0] ?? 'exp'
      : input.lane ?? recommended
    const legal = Boolean(lane) && (input.allowAnyRole || openLanes.includes(lane as DraftLane))
    return { lane: legal ? lane : null, openLanes }
  },

  counters(input: CountersInput) {
    const model = requireModel()
    const view = perspective(input.state, input.side)
    const allyTeam = (input.side === 'ally' ? input.allyTeam : input.enemyTeam) ?? null
    const enemyTeam = (input.side === 'ally' ? input.enemyTeam : input.allyTeam) ?? null
    return counterPicksByRole(model, {
      state: view,
      targetHero: heroKey(input.targetHero),
      allyTeamPageSlug: allyTeam,
      enemyTeamPageSlug: enemyTeam,
    }).map((item) => ({ lane: item.lane, observed: item.observed, recommendation: slim(item.recommendation) }))
  },

  blueprints(input: { state: DraftCoachState; plan: DraftPlan }) {
    return findDraftBlueprints(requireModel(), input.state, input.plan).map((item) => ({
      id: item.id,
      heroes: item.heroes,
      games: item.games,
      wins: item.wins,
      winRate: item.winRate,
      teams: item.teams,
      score: item.score,
    }))
  },

  compare(input: { state: DraftCoachState }) {
    return compareCompletedDrafts(requireModel(), input.state)
  },

  heroPool() {
    return requireModel().heroes.map((hero) => ({
      key: hero.key,
      id: hero.hero.id,
      name: hero.hero.name,
      primaryLane: hero.primaryLane,
      flexLanes: hero.flexLanes,
      patchLanes: hero.patchLanes,
      tier: hero.patchMetaTier,
      pickRate: hero.pickRate,
      banRate: hero.banRate,
      earlyBanRate: hero.earlyBanRate,
      presenceRate: hero.presenceRate,
      exactGames: hero.exactGames,
      winRate: hero.exactResultGames > 0 ? Math.round((hero.exactWins / hero.exactResultGames) * 100) : null,
    }))
  },

  teams() {
    return [...teamIndex().values()].sort((a, b) => a.name.localeCompare(b.name))
  },

  teamProfile(input: TeamProfileInput) {
    const limit = input.limit ?? 10
    const rows: TeamGameRow[] = []
    let team: DraftTeam | null = null
    for (const league of session.leagues) {
      for (const series of league.series) {
        const isTeam1 = series.team1.pageSlug === input.team
        const isTeam2 = series.team2.pageSlug === input.team
        if (!isTeam1 && !isTeam2) continue
        team = isTeam1 ? series.team1 : series.team2
        const time = seriesTime(series)
        for (const game of series.games) {
          rows.push({
            playedOn: series.playedOn ?? null,
            time,
            opponent: isTeam1 ? series.team2 : series.team1,
            won: game.winner === null ? null : isTeam1 ? game.winner === 1 : game.winner === 2,
            side: isTeam1 ? game.team1Side : game.team2Side,
            picks: (isTeam1 ? game.team1Picks : game.team2Picks).map(ref),
            bans: (isTeam1 ? game.team1Bans : game.team2Bans).map(ref),
            facedBans: (isTeam1 ? game.team2Bans : game.team1Bans).map(ref),
            league: league.leagueName,
            gameNumber: game.number,
          })
        }
      }
    }
    if (!team) return null
    rows.sort((a, b) => b.time - a.time || b.gameNumber - a.gameNumber)
    const recent = rows.slice(0, limit)
    return {
      team: { name: team.name, pageSlug: team.pageSlug },
      gamesAnalyzed: rows.length,
      wins: rows.filter((row) => row.won === true).length,
      losses: rows.filter((row) => row.won === false).length,
      recent: recent.map(({ time: _time, ...row }) => row),
      comfort: heroCounts(recent, 'picks').slice(0, 7),
      facedBans: heroCounts(recent, 'facedBans').slice(0, 5),
    }
  },

  metaSummary(input: { limit?: number } | undefined) {
    const model = requireModel()
    const limit = input?.limit ?? 5
    const byBan = [...model.heroes].sort((a, b) => b.earlyBanRate - a.earlyBanRate || b.banRate - a.banRate)
    const byPick = [...model.heroes].sort((a, b) => b.pickRate - a.pickRate || b.exactGames - a.exactGames)
    const rate = (hero: (typeof model.heroes)[number]) => ({
      key: hero.key,
      name: hero.hero.name,
      pickRate: hero.pickRate,
      banRate: hero.banRate,
      earlyBanRate: hero.earlyBanRate,
      winRate: hero.exactResultGames > 0 ? Math.round((hero.exactWins / hero.exactResultGames) * 100) : null,
      games: hero.exactGames,
    })
    const compositions = new Map<string, { heroes: string[]; wins: number; losses: number }>()
    for (const sample of model.compositions) {
      if (sample.won === null || sample.picks.length !== 5) continue
      const key = [...sample.picks].sort().join('+')
      const entry = compositions.get(key) ?? { heroes: sample.picks, wins: 0, losses: 0 }
      if (sample.won) entry.wins += 1
      else entry.losses += 1
      compositions.set(key, entry)
    }
    const winning = [...compositions.values()]
      .filter((entry) => entry.wins + entry.losses >= 3)
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
      .slice(0, limit)
      .map((entry) => ({ ...entry, games: entry.wins + entry.losses }))
    return {
      games: model.gamesAnalyzed,
      topBans: byBan.slice(0, limit).map(rate),
      topPicks: byPick.slice(0, limit).map(rate),
      compositions: winning,
    }
  },
}

type Api = typeof api

function call(name: string, argsJSON: string): string {
  try {
    const fn = (api as Record<string, (input?: unknown) => unknown>)[name]
    if (typeof fn !== 'function') throw new Error(`unknown engine function ${name}`)
    const args = argsJSON === '' ? undefined : JSON.parse(argsJSON)
    return `V${JSON.stringify(fn(args) ?? null)}`
  } catch (error) {
    return `E${error instanceof Error ? error.message : String(error)}`
  }
}

;(globalThis as unknown as { DraftCoachEngine: Api & { call: typeof call } }).DraftCoachEngine = { ...api, call }
