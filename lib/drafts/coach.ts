import type {
  DraftGame,
  DraftHero,
  DraftLeague,
  DraftTeam,
} from '@/lib/data/types'
import { heroKey, type HeroCatalogItem } from './hero-images'

export { heroKey } from './hero-images'
export type { HeroCatalogItem } from './hero-images'

export const DRAFT_LANES = ['exp', 'jungle', 'mid', 'gold', 'roam'] as const
export type DraftLane = (typeof DRAFT_LANES)[number]

export const DRAFT_PLANS = [
  'balanced',
  'early',
  'scaling',
  'counter',
  'comfort',
] as const
export type DraftPlan = (typeof DRAFT_PLANS)[number]

export type DraftActionSide = 'ally' | 'enemy'
export type DraftActionKind = 'pick' | 'ban'

export interface DraftAction {
  side: DraftActionSide
  kind: DraftActionKind
  phase: 1 | 2
}

export interface DraftCoachState {
  allyPicks: string[]
  enemyPicks: string[]
  allyBans: string[]
  enemyBans: string[]
}

export interface PairMetric {
  games: number
  wins: number
}

export interface DraftCoachTeamProfile {
  team: DraftTeam
  games: number
  picks: Record<string, PairMetric>
  bans: Record<string, number>
}

export interface DraftCoachHeroProfile {
  key: string
  hero: DraftHero
  imageUrl: string | null
  summaryPicks: number
  summaryWins: number
  summaryBans: number
  presenceRate: number
  exactGames: number
  exactBans: number
  exactWins: number
  laneGames: Record<DraftLane, number>
  laneRates: Record<DraftLane, number>
  primaryLane: DraftLane | null
  flexLanes: DraftLane[]
  earlyScore: number
  scalingScore: number
}

export interface DraftCoachModel {
  regionSlug: string
  mapName: string | null
  gamesAnalyzed: number
  historyGamesAnalyzed: number
  heroes: DraftCoachHeroProfile[]
  heroByKey: Record<string, DraftCoachHeroProfile>
  synergy: Record<string, PairMetric>
  matchups: Record<string, PairMetric>
  teams: DraftCoachTeamProfile[]
  maps: { name: string; games: number }[]
}

export interface DraftHistoryPrior {
  regionSlug: string
  gamesAnalyzed: number
  synergy: Record<string, PairMetric>
  matchups: Record<string, PairMetric>
}

export type RecommendationReason =
  | 'meta'
  | 'winRate'
  | 'lane'
  | 'flex'
  | 'synergy'
  | 'counter'
  | 'comfort'
  | 'denyComfort'
  | 'early'
  | 'scaling'
  | 'limitedSample'

export interface DraftRecommendation {
  hero: DraftHero
  imageUrl: string | null
  score: number
  confidence: 'high' | 'medium' | 'low'
  sampleSize: number
  primaryLane: DraftLane | null
  suggestedLane: DraftLane | null
  flexLanes: DraftLane[]
  presenceRate: number
  winRate: number
  matchupRate: number | null
  matchupGames: number
  synergyRate: number | null
  synergyGames: number
  teamRate: number | null
  reasons: RecommendationReason[]
}

export interface RecommendationOptions {
  kind: DraftActionKind
  state: DraftCoachState
  plan: DraftPlan
  targetLane?: DraftLane | null
  allyTeamPageSlug?: string | null
  enemyTeamPageSlug?: string | null
  limit?: number
}

const VALID_MAPS = new Set([
  'Broken Walls',
  'Dangerous Grass',
  'Expanding Rivers',
  'Flying Cloud',
])

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function pairKey(first: string, second: string): string {
  return [first, second].sort().join('::')
}

function matchupKey(hero: string, opponent: string): string {
  return `${hero}::${opponent}`
}

function blankLaneRecord(): Record<DraftLane, number> {
  return { exp: 0, jungle: 0, mid: 0, gold: 0, roam: 0 }
}

function addMetric(
  record: Record<string, PairMetric>,
  key: string,
  won: boolean | null,
  weight = 1,
): void {
  const metric = record[key] ?? { games: 0, wins: 0 }
  metric.games += weight
  if (won === true) metric.wins += weight
  record[key] = metric
}

function mergeMetrics(
  target: Record<string, PairMetric>,
  source: Record<string, PairMetric>,
  weight: number,
): void {
  for (const [key, metric] of Object.entries(source)) {
    const current = target[key] ?? { games: 0, wins: 0 }
    current.games += metric.games * weight
    current.wins += metric.wins * weight
    target[key] = current
  }
}

function addCount(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1
}

function smoothedRate(metric: PairMetric | undefined, priorStrength = 6): number {
  if (!metric) return 0.5
  return (metric.wins + priorStrength * 0.5) / (metric.games + priorStrength)
}

function gameTeams(game: DraftGame) {
  return [
    {
      picks: game.team1Picks,
      bans: game.team1Bans,
      won: game.winner === null ? null : game.winner === 1,
    },
    {
      picks: game.team2Picks,
      bans: game.team2Bans,
      won: game.winner === null ? null : game.winner === 2,
    },
  ] as const
}

function validMapName(value: string | null): string | null {
  return value && VALID_MAPS.has(value) ? value : null
}

interface MutableHero {
  hero: DraftHero
  imageUrl: string | null
  summaryPicks: number
  summaryWins: number
  summaryBans: number
  exactGames: number
  exactBans: number
  exactWins: number
  laneGames: Record<DraftLane, number>
  earlyWins: number
  lateWins: number
  timedWins: number
}

interface ExactGameView {
  game: DraftGame
  team1: DraftTeam
  team2: DraftTeam
}

function allExactGames(leagues: DraftLeague[]): ExactGameView[] {
  return leagues.flatMap((league) =>
    league.series.flatMap((series) =>
      series.games.map((game) => ({
        game,
        team1: series.team1,
        team2: series.team2,
      })),
    ),
  )
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function getOrCreateTeam(
  teams: Map<string, DraftCoachTeamProfile>,
  team: DraftTeam,
): DraftCoachTeamProfile {
  const key = team.pageSlug || team.name
  const profile = teams.get(key) ?? {
    team,
    games: 0,
    picks: {},
    bans: {},
  }
  teams.set(key, profile)
  return profile
}

/**
 * Build an explainable pro-draft model from committed tournament snapshots.
 * The five pick fields are role slots in source order: EXP, Jungle, Mid,
 * Gold, Roam. Global lane observations are retained as a prior so a regional
 * filter does not forget a current flex pick after one quiet week.
 */
export function buildDraftCoachModel(
  leagues: DraftLeague[],
  regionSlug = 'all',
  mapName: string | null = null,
  historyPriors: DraftHistoryPrior[] = [],
  heroCatalog: HeroCatalogItem[] = [],
): DraftCoachModel {
  const selectedLeagues =
    regionSlug === 'all'
      ? leagues
      : leagues.filter((league) => league.regionSlug === regionSlug)
  const catalog = new Map<string, MutableHero>()

  for (const item of heroCatalog) {
    catalog.set(heroKey(item.hero.id || item.hero.name), {
      hero: item.hero,
      imageUrl: item.imageUrl,
      summaryPicks: 0,
      summaryWins: 0,
      summaryBans: 0,
      exactGames: 0,
      exactBans: 0,
      exactWins: 0,
      laneGames: blankLaneRecord(),
      earlyWins: 0,
      lateWins: 0,
      timedWins: 0,
    })
  }

  for (const league of leagues) {
    for (const stat of league.heroStats) {
      const key = heroKey(stat.hero.id || stat.hero.name)
      const current = catalog.get(key) ?? {
        hero: stat.hero,
        imageUrl: stat.imageUrl,
        summaryPicks: 0,
        summaryWins: 0,
        summaryBans: 0,
        exactGames: 0,
        exactBans: 0,
        exactWins: 0,
        laneGames: blankLaneRecord(),
        earlyWins: 0,
        lateWins: 0,
        timedWins: 0,
      }
      if (!current.imageUrl && stat.imageUrl) current.imageUrl = stat.imageUrl
      catalog.set(key, current)
    }
  }

  for (const league of selectedLeagues) {
    for (const stat of league.heroStats) {
      const current = catalog.get(heroKey(stat.hero.id || stat.hero.name))
      if (!current) continue
      current.summaryPicks += stat.picks
      current.summaryWins += stat.pickWins
      current.summaryBans += stat.bans
    }
  }

  // Lane inference deliberately uses every current league as a lightweight
  // prior. Regional games below count three times and therefore dominate it.
  for (const { game } of allExactGames(leagues)) {
    for (const side of gameTeams(game)) {
      side.picks.forEach((picked, index) => {
        const profile = catalog.get(heroKey(picked.id || picked.name))
        const lane = DRAFT_LANES[index]
        if (profile && lane) profile.laneGames[lane] += 1
      })
    }
  }

  const allSelectedGames = allExactGames(selectedLeagues).filter(({ game }) =>
    mapName ? validMapName(game.mapName) === mapName : true,
  )
  const durationMedian = median(
    allSelectedGames
      .map(({ game }) => game.durationSeconds)
      .filter((value): value is number => value !== null),
  )
  const synergy: Record<string, PairMetric> = {}
  const matchups: Record<string, PairMetric> = {}
  const teams = new Map<string, DraftCoachTeamProfile>()

  for (const { game, team1, team2 } of allSelectedGames) {
    const sides = gameTeams(game)
    const draftTeams = [team1, team2] as const

    sides.forEach((side, sideIndex) => {
      const teamProfile = getOrCreateTeam(teams, draftTeams[sideIndex])
      teamProfile.games += 1
      const pickKeys = side.picks.map((item) => heroKey(item.id || item.name))
      const banKeys = side.bans.map((item) => heroKey(item.id || item.name))

      pickKeys.forEach((key, laneIndex) => {
        const picked = side.picks[laneIndex]
        let profile = catalog.get(key)
        if (!profile) {
          profile = {
            hero: picked,
            imageUrl: null,
            summaryPicks: 0,
            summaryWins: 0,
            summaryBans: 0,
            exactGames: 0,
            exactBans: 0,
            exactWins: 0,
            laneGames: blankLaneRecord(),
            earlyWins: 0,
            lateWins: 0,
            timedWins: 0,
          }
          catalog.set(key, profile)
        }
        profile.exactGames += 1
        if (side.won === true) {
          profile.exactWins += 1
          if (durationMedian && game.durationSeconds) {
            profile.timedWins += 1
            if (game.durationSeconds <= durationMedian) profile.earlyWins += 1
            if (game.durationSeconds > durationMedian) profile.lateWins += 1
          }
        }
        const lane = DRAFT_LANES[laneIndex]
        if (lane) profile.laneGames[lane] += 3
        addMetric(teamProfile.picks, key, side.won)
      })
      banKeys.forEach((key, banIndex) => {
        let profile = catalog.get(key)
        if (!profile) {
          profile = {
            hero: side.bans[banIndex],
            imageUrl: null,
            summaryPicks: 0,
            summaryWins: 0,
            summaryBans: 0,
            exactGames: 0,
            exactBans: 0,
            exactWins: 0,
            laneGames: blankLaneRecord(),
            earlyWins: 0,
            lateWins: 0,
            timedWins: 0,
          }
          catalog.set(key, profile)
        }
        profile.exactBans += 1
        addCount(teamProfile.bans, key)
      })

      for (let first = 0; first < pickKeys.length; first += 1) {
        for (let second = first + 1; second < pickKeys.length; second += 1) {
          addMetric(synergy, pairKey(pickKeys[first], pickKeys[second]), side.won)
        }
      }

      const enemyPicks = sides[sideIndex === 0 ? 1 : 0].picks.map((item) =>
        heroKey(item.id || item.name),
      )
      for (const picked of pickKeys) {
        for (const enemy of enemyPicks) {
          addMetric(matchups, matchupKey(picked, enemy), side.won)
        }
      }
    })
  }

  const selectedHistory =
    regionSlug === 'all'
      ? historyPriors
      : historyPriors.filter((prior) => prior.regionSlug === regionSlug)
  // The previous season is a prior, never the main signal. Its 25% weight
  // stabilises rare counters without allowing an older patch to dominate the
  // current-season tournament sample.
  for (const prior of selectedHistory) {
    mergeMetrics(synergy, prior.synergy, 0.25)
    mergeMetrics(matchups, prior.matchups, 0.25)
  }

  const summaryGames = selectedLeagues.reduce(
    (total, league) => total + league.gamesAnalyzed,
    0,
  )
  const heroes = [...catalog.entries()]
    .map(([key, profile]): DraftCoachHeroProfile => {
      const totalLanes = DRAFT_LANES.reduce(
        (total, lane) => total + profile.laneGames[lane],
        0,
      )
      const laneRates = Object.fromEntries(
        DRAFT_LANES.map((lane) => [
          lane,
          totalLanes > 0 ? profile.laneGames[lane] / totalLanes : 0,
        ]),
      ) as Record<DraftLane, number>
      const primaryLane =
        totalLanes > 0
          ? [...DRAFT_LANES].sort(
              (a, b) => profile.laneGames[b] - profile.laneGames[a],
            )[0]
          : null
      const flexLanes = DRAFT_LANES.filter(
        (lane) => profile.laneGames[lane] >= 3 && laneRates[lane] >= 0.16,
      )
      const summaryPresenceRate =
        summaryGames > 0
          ? clamp(
              (profile.summaryPicks + profile.summaryBans) / summaryGames,
            )
          : 0
      const exactPresenceRate =
        allSelectedGames.length > 0
          ? clamp(
              (profile.exactGames + profile.exactBans) /
                allSelectedGames.length,
            )
          : 0
      const presenceRate = Math.max(summaryPresenceRate, exactPresenceRate)

      return {
        key,
        hero: profile.hero,
        imageUrl: profile.imageUrl,
        summaryPicks: profile.summaryPicks,
        summaryWins: profile.summaryWins,
        summaryBans: profile.summaryBans,
        presenceRate,
        exactGames: profile.exactGames,
        exactBans: profile.exactBans,
        exactWins: profile.exactWins,
        laneGames: profile.laneGames,
        laneRates,
        primaryLane,
        flexLanes,
        earlyScore:
          profile.timedWins > 0
            ? profile.earlyWins / profile.timedWins
            : 0.5,
        scalingScore:
          profile.timedWins > 0
            ? profile.lateWins / profile.timedWins
            : 0.5,
      }
    })
    .sort(
      (a, b) =>
        b.presenceRate - a.presenceRate ||
        b.summaryPicks - a.summaryPicks ||
        a.hero.name.localeCompare(b.hero.name),
    )

  const heroByKey = Object.fromEntries(heroes.map((hero) => [hero.key, hero]))
  const mapCounts = new Map<string, number>()
  for (const { game } of allExactGames(selectedLeagues)) {
    const name = validMapName(game.mapName)
    if (name) mapCounts.set(name, (mapCounts.get(name) ?? 0) + 1)
  }

  return {
    regionSlug,
    mapName,
    gamesAnalyzed: allSelectedGames.length,
    historyGamesAnalyzed: selectedHistory.reduce(
      (total, prior) => total + prior.gamesAnalyzed,
      0,
    ),
    heroes,
    heroByKey,
    synergy,
    matchups,
    teams: [...teams.values()].sort((a, b) =>
      a.team.name.localeCompare(b.team.name),
    ),
    maps: [...mapCounts.entries()]
      .map(([name, games]) => ({ name, games }))
      .sort((a, b) => b.games - a.games),
  }
}

/** Compress raw previous-season games into the only two priors the coach uses. */
export function buildDraftHistoryPriors(
  leagues: DraftLeague[],
): DraftHistoryPrior[] {
  return leagues.map((league) => {
    const synergy: Record<string, PairMetric> = {}
    const matchups: Record<string, PairMetric> = {}
    const games = allExactGames([league])

    for (const { game } of games) {
      const sides = gameTeams(game)
      sides.forEach((side, sideIndex) => {
        const picks = side.picks.map((item) => heroKey(item.id || item.name))
        const enemyPicks = sides[sideIndex === 0 ? 1 : 0].picks.map((item) =>
          heroKey(item.id || item.name),
        )
        for (let first = 0; first < picks.length; first += 1) {
          for (let second = first + 1; second < picks.length; second += 1) {
            addMetric(synergy, pairKey(picks[first], picks[second]), side.won)
          }
        }
        for (const picked of picks) {
          for (const enemy of enemyPicks) {
            addMetric(matchups, matchupKey(picked, enemy), side.won)
          }
        }
      })
    }

    return {
      regionSlug: league.regionSlug,
      gamesAnalyzed: games.length,
      synergy,
      matchups,
    }
  })
}

function averageMetrics(metrics: (PairMetric | undefined)[]): {
  rate: number
  games: number
} {
  const used = metrics.filter((metric): metric is PairMetric => Boolean(metric))
  if (used.length === 0) return { rate: 0.5, games: 0 }
  const games = used.reduce((total, metric) => total + metric.games, 0)
  const weighted = used.reduce(
    (total, metric) => total + smoothedRate(metric) * metric.games,
    0,
  )
  return { rate: games > 0 ? weighted / games : 0.5, games }
}

function selectedKeys(values: string[]): string[] {
  return values.map(heroKey)
}

const MIN_LANE_FIT = 0.16

function coveredLanes(
  model: DraftCoachModel,
  picks: string[],
): Set<DraftLane> {
  const profiles = selectedKeys(picks)
    .map((key) => model.heroByKey[key])
    .filter((profile): profile is DraftCoachHeroProfile => Boolean(profile))
  let bestLanes = new Set<DraftLane>()
  let bestAssigned = -1
  let bestRate = -1

  function assign(
    index: number,
    lanes: Set<DraftLane>,
    assigned: number,
    rate: number,
  ) {
    if (index >= profiles.length) {
      if (
        assigned > bestAssigned ||
        (assigned === bestAssigned && rate > bestRate)
      ) {
        bestAssigned = assigned
        bestRate = rate
        bestLanes = new Set(lanes)
      }
      return
    }

    assign(index + 1, lanes, assigned, rate)
    for (const lane of DRAFT_LANES) {
      const laneRate = profiles[index].laneRates[lane]
      if (lanes.has(lane) || laneRate < MIN_LANE_FIT) continue
      lanes.add(lane)
      assign(index + 1, lanes, assigned + 1, rate + laneRate)
      lanes.delete(lane)
    }
  }

  assign(0, new Set<DraftLane>(), 0, 0)
  return bestLanes
}

export function openDraftLanes(
  model: DraftCoachModel,
  picks: string[],
): DraftLane[] {
  const covered = coveredLanes(model, picks)
  return DRAFT_LANES.filter((lane) => !covered.has(lane))
}

export function nextSuggestedLane(
  model: DraftCoachModel,
  picks: string[],
): DraftLane | null {
  if (picks.length < 4) return null
  const open = openDraftLanes(model, picks)
  return open.length === 1 ? open[0] : null
}

function laneFit(
  hero: DraftCoachHeroProfile,
  model: DraftCoachModel,
  picks: string[],
  requested: DraftLane | null,
): number {
  if (requested) return hero.laneRates[requested]
  const open = openDraftLanes(model, picks)
  const candidates = open.length > 0 ? open : [...DRAFT_LANES]
  return Math.max(...candidates.map((lane) => hero.laneRates[lane]), 0)
}

function bestOpenLane(
  model: DraftCoachModel,
  hero: DraftCoachHeroProfile,
  picks: string[],
): DraftLane | null {
  const lanes = openDraftLanes(model, picks)
  const best = [...lanes].sort(
    (first, second) => hero.laneRates[second] - hero.laneRates[first],
  )[0]
  return best && hero.laneRates[best] >= MIN_LANE_FIT ? best : null
}

function diversePickRecommendations(
  model: DraftCoachModel,
  ranked: DraftRecommendation[],
  picks: string[],
  limit: number,
): DraftRecommendation[] {
  const open = openDraftLanes(model, picks)
  const selected: DraftRecommendation[] = []
  const selectedHeroes = new Set<string>()
  const selectedLanes = new Set<DraftLane>()

  while (selected.length < Math.min(limit, open.length)) {
    let best:
      | { recommendation: DraftRecommendation; lane: DraftLane; fit: number }
      | undefined

    for (const recommendation of ranked) {
      if (selectedHeroes.has(heroKey(recommendation.hero.id))) continue
      const profile = model.heroByKey[heroKey(recommendation.hero.id)]
      if (!profile) continue
      for (const lane of open) {
        if (selectedLanes.has(lane)) continue
        const laneRate = profile.laneRates[lane]
        if (laneRate < MIN_LANE_FIT) continue
        const fit = recommendation.score + laneRate * 10
        if (!best || fit > best.fit) {
          best = { recommendation, lane, fit }
        }
      }
    }

    if (!best) break
    selected.push({ ...best.recommendation, suggestedLane: best.lane })
    selectedHeroes.add(heroKey(best.recommendation.hero.id))
    selectedLanes.add(best.lane)
  }

  for (const recommendation of ranked) {
    if (selected.length >= limit) break
    const key = heroKey(recommendation.hero.id)
    if (selectedHeroes.has(key)) continue
    const profile = model.heroByKey[key]
    const lane = profile ? bestOpenLane(model, profile, picks) : null
    if (!lane && open.length > 0) continue
    selected.push({ ...recommendation, suggestedLane: lane })
    selectedHeroes.add(key)
  }

  return selected
}

function teamBySlug(
  model: DraftCoachModel,
  pageSlug: string | null | undefined,
): DraftCoachTeamProfile | null {
  if (!pageSlug) return null
  return model.teams.find((team) => team.team.pageSlug === pageSlug) ?? null
}

function teamPickRate(
  profile: DraftCoachTeamProfile | null,
  key: string,
): { rate: number; games: number } {
  if (!profile || profile.games === 0) return { rate: 0.5, games: 0 }
  const metric = profile.picks[key]
  if (!metric) return { rate: 0.35, games: 0 }
  return {
    rate: clamp(0.45 + metric.games / profile.games),
    games: metric.games,
  }
}

function teamBanRate(
  profile: DraftCoachTeamProfile | null,
  key: string,
): { rate: number; games: number } {
  if (!profile || profile.games === 0) return { rate: 0.5, games: 0 }
  const games = profile.bans[key] ?? 0
  return { rate: clamp(0.35 + games / profile.games), games }
}

function confidence(sampleSize: number): 'high' | 'medium' | 'low' {
  if (sampleSize >= 12) return 'high'
  if (sampleSize >= 5) return 'medium'
  return 'low'
}

function addReason(
  reasons: RecommendationReason[],
  reason: RecommendationReason,
  condition: boolean,
): void {
  if (condition && !reasons.includes(reason)) reasons.push(reason)
}

export function recommendDraftHeroes(
  model: DraftCoachModel,
  options: RecommendationOptions,
): DraftRecommendation[] {
  const allyKeys = selectedKeys(options.state.allyPicks)
  const enemyKeys = selectedKeys(options.state.enemyPicks)
  const used = new Set(
    selectedKeys([
      ...options.state.allyPicks,
      ...options.state.enemyPicks,
      ...options.state.allyBans,
      ...options.state.enemyBans,
    ]),
  )
  const allyTeam = teamBySlug(model, options.allyTeamPageSlug)
  const enemyTeam = teamBySlug(model, options.enemyTeamPageSlug)
  const targetLane = options.targetLane ?? null

  const ranked = model.heroes
    .filter((profile) => !used.has(profile.key))
    .map((profile): DraftRecommendation => {
      const exactMetric = {
        games: profile.exactGames,
        wins: profile.exactWins,
      }
      const winRate = smoothedRate(exactMetric)
      const meta = clamp(profile.presenceRate * 0.62 + winRate * 0.38)
      const role = laneFit(profile, model, options.state.allyPicks, targetLane)
      const suggestedLane =
        options.kind === 'pick'
          ? targetLane ?? bestOpenLane(model, profile, options.state.allyPicks)
          : null
      const synergy = averageMetrics(
        allyKeys.map((ally) => model.synergy[pairKey(profile.key, ally)]),
      )
      const counter = averageMetrics(
        enemyKeys.map(
          (enemy) => model.matchups[matchupKey(profile.key, enemy)],
        ),
      )
      const reverseThreat = averageMetrics(
        allyKeys.map(
          (ally) => model.matchups[matchupKey(profile.key, ally)],
        ),
      )
      const enemySynergy = averageMetrics(
        enemyKeys.map((enemy) => model.synergy[pairKey(profile.key, enemy)]),
      )
      const comfort = teamPickRate(allyTeam, profile.key)
      const enemyComfort = teamPickRate(enemyTeam, profile.key)
      const enemyBan = teamBanRate(enemyTeam, profile.key)
      const pace =
        options.plan === 'early'
          ? profile.earlyScore
          : options.plan === 'scaling'
            ? profile.scalingScore
            : 0.5

      let rawScore: number
      let relevantSample: number
      let teamRate: number | null

      if (options.kind === 'ban') {
        const threat = reverseThreat.games > 0 ? reverseThreat.rate : meta
        rawScore =
          meta * 0.28 +
          threat * 0.25 +
          enemySynergy.rate * 0.14 +
          enemyComfort.rate * 0.25 +
          enemyBan.rate * 0.08
        relevantSample =
          profile.exactGames +
          profile.exactBans +
          reverseThreat.games +
          enemySynergy.games +
          enemyComfort.games
        teamRate = enemyComfort.games > 0 ? enemyComfort.rate : null
      } else {
        const weights: Record<
          DraftPlan,
          { meta: number; role: number; synergy: number; counter: number; pace: number; comfort: number }
        > = {
          balanced: { meta: 0.29, role: 0.28, synergy: 0.17, counter: 0.16, pace: 0.03, comfort: 0.07 },
          early: { meta: 0.24, role: 0.22, synergy: 0.14, counter: 0.13, pace: 0.2, comfort: 0.07 },
          scaling: { meta: 0.24, role: 0.22, synergy: 0.14, counter: 0.13, pace: 0.2, comfort: 0.07 },
          counter: { meta: 0.18, role: 0.2, synergy: 0.14, counter: 0.41, pace: 0.02, comfort: 0.05 },
          comfort: { meta: 0.19, role: 0.2, synergy: 0.13, counter: 0.11, pace: 0.02, comfort: 0.35 },
        }
        const weight = weights[options.plan]
        rawScore =
          meta * weight.meta +
          role * weight.role +
          synergy.rate * weight.synergy +
          counter.rate * weight.counter +
          pace * weight.pace +
          comfort.rate * weight.comfort
        relevantSample =
          profile.exactGames + synergy.games + counter.games + comfort.games
        teamRate = comfort.games > 0 ? comfort.rate : null
      }

      // A hero absent from the selected pro sample remains selectable, but a
      // thin sample can never outrank strongly observed current-meta options.
      if (
        profile.summaryPicks +
          profile.summaryBans +
          profile.exactGames +
          profile.exactBans ===
        0
      ) {
        rawScore *= 0.78
      }
      if (options.kind === 'pick' && role < MIN_LANE_FIT) rawScore *= 0.45
      if (targetLane && role < MIN_LANE_FIT) rawScore *= 0.55

      const reasons: RecommendationReason[] = []
      if (options.kind === 'ban') {
        addReason(reasons, 'denyComfort', enemyComfort.games >= 2)
        addReason(reasons, 'counter', reverseThreat.games >= 3 && reverseThreat.rate >= 0.54)
        addReason(reasons, 'synergy', enemySynergy.games >= 3 && enemySynergy.rate >= 0.54)
      } else {
        addReason(reasons, 'counter', counter.games >= 3 && counter.rate >= 0.54)
        addReason(reasons, 'synergy', synergy.games >= 3 && synergy.rate >= 0.54)
        addReason(reasons, 'comfort', comfort.games >= 2)
        addReason(reasons, 'lane', role >= 0.52)
        addReason(reasons, 'flex', profile.flexLanes.length >= 2)
        addReason(reasons, 'early', options.plan === 'early' && profile.earlyScore >= 0.58)
        addReason(reasons, 'scaling', options.plan === 'scaling' && profile.scalingScore >= 0.58)
      }
      addReason(reasons, 'meta', profile.presenceRate >= 0.38)
      addReason(reasons, 'winRate', profile.exactGames >= 4 && winRate >= 0.54)
      addReason(reasons, 'limitedSample', relevantSample < 5)

      return {
        hero: profile.hero,
        imageUrl: profile.imageUrl,
        score: Math.round(clamp(rawScore, 0, 0.99) * 100),
        confidence: confidence(relevantSample),
        sampleSize: Math.round(relevantSample),
        primaryLane: profile.primaryLane,
        suggestedLane,
        flexLanes: profile.flexLanes,
        presenceRate: profile.presenceRate,
        winRate,
        matchupRate: counter.games > 0 ? counter.rate : null,
        matchupGames: counter.games,
        synergyRate: synergy.games > 0 ? synergy.rate : null,
        synergyGames: synergy.games,
        teamRate,
        reasons: reasons.slice(0, 4),
      }
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.sampleSize - a.sampleSize ||
        a.hero.name.localeCompare(b.hero.name),
    )

  const limit = options.limit ?? 5
  if (options.kind === 'ban') return ranked.slice(0, limit)
  if (!targetLane) {
    return diversePickRecommendations(
      model,
      ranked,
      options.state.allyPicks,
      limit,
    )
  }

  const fitting = ranked.filter((recommendation) => {
    const profile = model.heroByKey[heroKey(recommendation.hero.id)]
    return profile && profile.laneRates[targetLane] >= MIN_LANE_FIT
  })
  return fitting.slice(0, limit)
}

/** Tournament-style 3-ban/3-pick/2-ban/2-pick practice sequence. */
export function proDraftFlow(allyFirstPick: boolean): DraftAction[] {
  const blue: DraftActionSide = allyFirstPick ? 'ally' : 'enemy'
  const red: DraftActionSide = allyFirstPick ? 'enemy' : 'ally'
  return [
    { side: blue, kind: 'ban', phase: 1 },
    { side: red, kind: 'ban', phase: 1 },
    { side: blue, kind: 'ban', phase: 1 },
    { side: red, kind: 'ban', phase: 1 },
    { side: blue, kind: 'ban', phase: 1 },
    { side: red, kind: 'ban', phase: 1 },
    { side: blue, kind: 'pick', phase: 1 },
    { side: red, kind: 'pick', phase: 1 },
    { side: red, kind: 'pick', phase: 1 },
    { side: blue, kind: 'pick', phase: 1 },
    { side: blue, kind: 'pick', phase: 1 },
    { side: red, kind: 'pick', phase: 1 },
    { side: red, kind: 'ban', phase: 2 },
    { side: blue, kind: 'ban', phase: 2 },
    { side: red, kind: 'ban', phase: 2 },
    { side: blue, kind: 'ban', phase: 2 },
    { side: red, kind: 'pick', phase: 2 },
    { side: red, kind: 'pick', phase: 2 },
    { side: blue, kind: 'pick', phase: 2 },
    { side: blue, kind: 'pick', phase: 2 },
  ]
}
