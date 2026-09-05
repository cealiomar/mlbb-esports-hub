import type {
  DraftGame,
  DraftHero,
  DraftLeague,
  DraftTeam,
} from '@/lib/data/types'
import { heroKey, type HeroCatalogItem } from './hero-images'
import {
  CURRENT_PATCH_META,
  type PatchMetaTier,
} from './current-patch-meta'

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
  allyPickLanes?: DraftLane[]
  enemyPickLanes?: DraftLane[]
}

export interface PairMetric {
  games: number
  wins: number
}

export interface DraftCompositionSample {
  picks: string[]
  won: boolean | null
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
  pickRate: number
  banRate: number
  exactGames: number
  exactBans: number
  exactFirstBans: number
  exactEarlyBans: number
  exactWins: number
  firstBanRate: number
  earlyBanRate: number
  laneGames: Record<DraftLane, number>
  laneRates: Record<DraftLane, number>
  primaryLane: DraftLane | null
  flexLanes: DraftLane[]
  patchLanes: DraftLane[]
  patchMetaTier: PatchMetaTier | null
  patchMetaScore: number
  earlyScore: number
  scalingScore: number
}

export interface DraftCoachModel {
  regionSlug: string
  mapName: string | null
  gamesAnalyzed: number
  heroes: DraftCoachHeroProfile[]
  heroByKey: Record<string, DraftCoachHeroProfile>
  synergy: Record<string, PairMetric>
  matchups: Record<string, PairMetric>
  compositions: DraftCompositionSample[]
  teams: DraftCoachTeamProfile[]
  maps: { name: string; games: number }[]
}

export type RecommendationReason =
  | 'meta'
  | 'patchMeta'
  | 'firstBanPriority'
  | 'antiEarly'
  | 'antiScaling'
  | 'winRate'
  | 'lane'
  | 'targetOpenRole'
  | 'flex'
  | 'synergy'
  | 'composition'
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
  patchMetaTier: PatchMetaTier | null
  patchMetaScore: number
  presenceRate: number
  pickRate: number
  banRate: number
  firstBanRate: number
  earlyBanRate: number
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
  counterTargets?: string[]
  excludeHeroes?: string[]
  phase?: 1 | 2
  limit?: number
}

export interface RoleCounterRecommendation {
  lane: DraftLane
  recommendation: DraftRecommendation
  observed: boolean
}

export interface DraftDuoRecommendation {
  first: DraftRecommendation
  second: DraftRecommendation
  games: number
  winRate: number
  score: number
}

export interface DraftComparison {
  allyWinProbability: number
  enemyWinProbability: number
  allyProForm: number
  enemyProForm: number
  allySynergy: number
  enemySynergy: number
  allyCompositionFit: number
  enemyCompositionFit: number
  allyMatchupEdge: number
  enemyMatchupEdge: number
  gamesAnalyzed: number
  confidence: 'high' | 'medium' | 'low'
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
  exactFirstBans: number
  exactEarlyBans: number
  exactWins: number
  laneGames: Record<DraftLane, number>
  earlyGames: number
  lateGames: number
  earlyWins: number
  lateWins: number
}

const PATCH_LANE_PRIOR = 0.75

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

/**
 * A league is current only after it publishes at least one complete game draft.
 * This keeps an old season's summary table from leaking into a new-season meta
 * while a region is still waiting for its first match.
 */
export function currentSeasonDraftLeagues(
  leagues: DraftLeague[],
): DraftLeague[] {
  return leagues.filter((league) => allExactGames([league]).length > 0)
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
  heroCatalog: HeroCatalogItem[] = [],
): DraftCoachModel {
  const activeLeagues = currentSeasonDraftLeagues(leagues)
  const selectedLeagues =
    regionSlug === 'all'
      ? activeLeagues
      : activeLeagues.filter((league) => league.regionSlug === regionSlug)
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
      exactFirstBans: 0,
      exactEarlyBans: 0,
      exactWins: 0,
      laneGames: blankLaneRecord(),
      earlyGames: 0,
      lateGames: 0,
      earlyWins: 0,
      lateWins: 0,
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
        exactFirstBans: 0,
        exactEarlyBans: 0,
        exactWins: 0,
        laneGames: blankLaneRecord(),
        earlyGames: 0,
        lateGames: 0,
        earlyWins: 0,
        lateWins: 0,
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

  // The current patch supplies role knowledge for heroes that have not yet
  // appeared in an active pro league. A single exact regional observation is
  // weighted four times as strongly, so pro drafts always override this prior.
  for (const [key, profile] of catalog) {
    const patchMeta = CURRENT_PATCH_META[key]
    if (!patchMeta) continue
    for (const lane of patchMeta.lanes) {
      profile.laneGames[lane] += PATCH_LANE_PRIOR
    }
  }

  // Lane inference deliberately uses every current league as a lightweight
  // prior. Regional games below count three times and therefore dominate it.
  for (const { game } of allExactGames(activeLeagues)) {
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
  const allCurrentGames = allExactGames(activeLeagues).filter(({ game }) =>
    mapName ? validMapName(game.mapName) === mapName : true,
  )
  const durationMedian = median(
    allSelectedGames
      .map(({ game }) => game.durationSeconds)
      .filter((value): value is number => value !== null),
  )
  const synergy: Record<string, PairMetric> = {}
  const matchups: Record<string, PairMetric> = {}
  const compositions: DraftCompositionSample[] = []
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
            exactFirstBans: 0,
            exactEarlyBans: 0,
            exactWins: 0,
            laneGames: blankLaneRecord(),
            earlyGames: 0,
            lateGames: 0,
            earlyWins: 0,
            lateWins: 0,
          }
          catalog.set(key, profile)
        }
        profile.exactGames += 1
        if (durationMedian && game.durationSeconds) {
          if (game.durationSeconds <= durationMedian) {
            profile.earlyGames += 1
            if (side.won === true) profile.earlyWins += 1
          } else {
            profile.lateGames += 1
            if (side.won === true) profile.lateWins += 1
          }
        }
        if (side.won === true) profile.exactWins += 1
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
            exactFirstBans: 0,
            exactEarlyBans: 0,
            exactWins: 0,
            laneGames: blankLaneRecord(),
            earlyGames: 0,
            lateGames: 0,
            earlyWins: 0,
            lateWins: 0,
          }
          catalog.set(key, profile)
        }
        profile.exactBans += 1
        if (banIndex === 0) profile.exactFirstBans += 1
        if (banIndex < 3) profile.exactEarlyBans += 1
        addCount(teamProfile.bans, key)
      })

    })
  }

  // Composition and matchup knowledge is shared across every active current-
  // season pro league. A regional filter still controls hero priority, team
  // comfort and win rates, while proven global combinations stay available.
  for (const { game } of allCurrentGames) {
    const sides = gameTeams(game)
    sides.forEach((side, sideIndex) => {
      const pickKeys = side.picks.map((item) => heroKey(item.id || item.name))
      compositions.push({ picks: pickKeys, won: side.won })

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

  const summaryGames = selectedLeagues.reduce(
    (total, league) => total + league.gamesAnalyzed,
    0,
  )
  const heroes = [...catalog.entries()]
    .map(([key, profile]): DraftCoachHeroProfile => {
      const patchMeta = CURRENT_PATCH_META[key] ?? null
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
      const flexLanes = DRAFT_LANES.filter((lane) => {
        const observedFlex =
          profile.laneGames[lane] >= 3 && laneRates[lane] >= 0.16
        const patchFlex =
          Boolean(patchMeta?.lanes.includes(lane)) &&
          (patchMeta?.lanes.length ?? 0) > 1
        return observedFlex || patchFlex
      })
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
      const summaryPickRate =
        summaryGames > 0 ? clamp(profile.summaryPicks / summaryGames) : 0
      const summaryBanRate =
        summaryGames > 0 ? clamp(profile.summaryBans / summaryGames) : 0
      const exactPickRate =
        allSelectedGames.length > 0
          ? clamp(profile.exactGames / allSelectedGames.length)
          : 0
      const exactBanRate =
        allSelectedGames.length > 0
          ? clamp(profile.exactBans / allSelectedGames.length)
          : 0
      const presenceRate = Math.max(summaryPresenceRate, exactPresenceRate)
      const pickRate = Math.max(summaryPickRate, exactPickRate)
      const banRate = Math.max(summaryBanRate, exactBanRate)
      const firstBanRate =
        allSelectedGames.length > 0
          ? profile.exactFirstBans / allSelectedGames.length
          : 0
      const earlyBanRate =
        allSelectedGames.length > 0
          ? profile.exactEarlyBans / allSelectedGames.length
          : 0
      const timedGames = profile.earlyGames + profile.lateGames
      const earlyShare = (profile.earlyGames + 2) / (timedGames + 4)
      const lateShare = (profile.lateGames + 2) / (timedGames + 4)
      const earlyWinRate =
        (profile.earlyWins + 2) / (profile.earlyGames + 4)
      const lateWinRate = (profile.lateWins + 2) / (profile.lateGames + 4)

      return {
        key,
        hero: profile.hero,
        imageUrl: profile.imageUrl,
        summaryPicks: profile.summaryPicks,
        summaryWins: profile.summaryWins,
        summaryBans: profile.summaryBans,
        presenceRate,
        pickRate,
        banRate,
        exactGames: profile.exactGames,
        exactBans: profile.exactBans,
        exactFirstBans: profile.exactFirstBans,
        exactEarlyBans: profile.exactEarlyBans,
        exactWins: profile.exactWins,
        firstBanRate,
        earlyBanRate,
        laneGames: profile.laneGames,
        laneRates,
        primaryLane,
        flexLanes,
        patchLanes: patchMeta?.lanes ?? [],
        patchMetaTier: patchMeta?.tier ?? null,
        patchMetaScore: patchMeta?.score ?? 0,
        earlyScore:
          timedGames > 0 ? clamp(earlyShare * 0.55 + earlyWinRate * 0.45) : 0.5,
        scalingScore:
          timedGames > 0 ? clamp(lateShare * 0.55 + lateWinRate * 0.45) : 0.5,
      }
    })
    .sort(
      (a, b) =>
        b.presenceRate - a.presenceRate ||
        b.summaryPicks - a.summaryPicks ||
        b.patchMetaScore - a.patchMetaScore ||
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
    heroes,
    heroByKey,
    synergy,
    matchups,
    compositions,
    teams: [...teams.values()].sort((a, b) =>
      a.team.name.localeCompare(b.team.name),
    ),
    maps: [...mapCounts.entries()]
      .map(([name, games]) => ({ name, games }))
      .sort((a, b) => b.games - a.games),
  }
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

export const MIN_LANE_FIT = 0.16

function coveredLanes(
  model: DraftCoachModel,
  picks: string[],
  assignedLanes: DraftLane[] = [],
): Set<DraftLane> {
  const profiles = selectedKeys(picks).flatMap((key, index) => {
    const profile = model.heroByKey[key]
    return profile ? [{ profile, assignedLane: assignedLanes[index] }] : []
  })
  const lockedLanes = new Set<DraftLane>()
  const unlockedProfiles: DraftCoachHeroProfile[] = []

  for (const { profile, assignedLane } of profiles) {
    if (
      assignedLane &&
      !lockedLanes.has(assignedLane) &&
      profile.laneRates[assignedLane] >= MIN_LANE_FIT
    ) {
      lockedLanes.add(assignedLane)
    } else {
      unlockedProfiles.push(profile)
    }
  }

  let bestLanes = new Set<DraftLane>(lockedLanes)
  let bestAssigned = -1
  let bestRate = -1

  function assign(
    index: number,
    lanes: Set<DraftLane>,
    assigned: number,
    rate: number,
  ) {
    if (index >= unlockedProfiles.length) {
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
      const laneRate = unlockedProfiles[index].laneRates[lane]
      if (lanes.has(lane) || laneRate < MIN_LANE_FIT) continue
      lanes.add(lane)
      assign(index + 1, lanes, assigned + 1, rate + laneRate)
      lanes.delete(lane)
    }
  }

  assign(0, new Set<DraftLane>(lockedLanes), 0, 0)
  return bestLanes
}

export function openDraftLanes(
  model: DraftCoachModel,
  picks: string[],
  assignedLanes: DraftLane[] = [],
): DraftLane[] {
  const covered = coveredLanes(model, picks, assignedLanes)
  return DRAFT_LANES.filter((lane) => !covered.has(lane))
}

export function nextSuggestedLane(
  model: DraftCoachModel,
  picks: string[],
  assignedLanes: DraftLane[] = [],
): DraftLane | null {
  if (picks.length < 4) return null
  const open = openDraftLanes(model, picks, assignedLanes)
  return open.length === 1 ? open[0] : null
}

function laneFit(
  hero: DraftCoachHeroProfile,
  model: DraftCoachModel,
  picks: string[],
  assignedLanes: DraftLane[],
  requested: DraftLane | null,
): number {
  if (requested) return hero.laneRates[requested]
  const open = openDraftLanes(model, picks, assignedLanes)
  const candidates = open.length > 0 ? open : [...DRAFT_LANES]
  return Math.max(...candidates.map((lane) => hero.laneRates[lane]), 0)
}

function bestOpenLane(
  model: DraftCoachModel,
  hero: DraftCoachHeroProfile,
  picks: string[],
  assignedLanes: DraftLane[] = [],
): DraftLane | null {
  const lanes = openDraftLanes(model, picks, assignedLanes)
  const best = [...lanes].sort(
    (first, second) => hero.laneRates[second] - hero.laneRates[first],
  )[0]
  return best && hero.laneRates[best] >= MIN_LANE_FIT ? best : null
}

function bestLaneFrom(
  hero: DraftCoachHeroProfile,
  lanes: DraftLane[],
): DraftLane | null {
  const best = [...lanes].sort(
    (first, second) => hero.laneRates[second] - hero.laneRates[first],
  )[0]
  return best && hero.laneRates[best] >= MIN_LANE_FIT ? best : null
}

function compositionAffinity(
  model: DraftCoachModel,
  candidateKey: string,
  allyKeys: string[],
): { rate: number; games: number; coverage: number; bestOverlap: number } {
  const selected = [...new Set(allyKeys)]
  if (selected.length === 0) {
    return { rate: 0.5, games: 0, coverage: 0, bestOverlap: 0 }
  }

  let games = 0
  let wins = 0
  let overlapTotal = 0
  let bestOverlap = 0

  for (const composition of model.compositions) {
    if (!composition.picks.includes(candidateKey)) continue
    const overlap = selected.filter((key) => composition.picks.includes(key)).length
    if (overlap === 0) continue
    games += 1
    overlapTotal += overlap
    bestOverlap = Math.max(bestOverlap, overlap)
    if (composition.won === true) wins += 1
  }

  return {
    rate: smoothedRate(games > 0 ? { games, wins } : undefined),
    games,
    coverage:
      games > 0 ? clamp(overlapTotal / (games * selected.length)) : 0,
    bestOverlap,
  }
}

/** Lock a manual or recommended hero into its strongest still-open role. */
export function suggestedLaneForHero(
  model: DraftCoachModel,
  heroValue: string,
  picks: string[],
  assignedLanes: DraftLane[] = [],
): DraftLane | null {
  const profile = model.heroByKey[heroKey(heroValue)]
  return profile ? bestOpenLane(model, profile, picks, assignedLanes) : null
}

/**
 * Spread bans across every role the opponent can still draft before doubling
 * up on any one of them.
 *
 * Ranking bans purely by score hands back five heroes from whichever role the
 * current meta favours, leaving the opponent's other open roles untouched —
 * which is exactly the lane they will then draft. Covering each threat first,
 * then reinforcing the most dangerous, is what a coach actually does.
 */
function diverseBanRecommendations(
  ranked: DraftRecommendation[],
  openLanes: DraftLane[],
  limit: number,
): DraftRecommendation[] {
  if (openLanes.length <= 1) return ranked.slice(0, limit)

  const selected: DraftRecommendation[] = []
  const takenLanes = new Set<DraftLane>()

  // One pass per open lane: the best remaining ban that threatens it.
  for (const recommendation of ranked) {
    if (selected.length >= Math.min(limit, openLanes.length)) break
    const lane = recommendation.suggestedLane
    if (!lane || takenLanes.has(lane)) continue
    selected.push(recommendation)
    takenLanes.add(lane)
  }

  // Then fill any remaining slots with the strongest bans left, whatever
  // their lane.
  for (const recommendation of ranked) {
    if (selected.length >= limit) break
    if (selected.includes(recommendation)) continue
    selected.push(recommendation)
  }

  return selected
}

function diversePickRecommendations(
  model: DraftCoachModel,
  ranked: DraftRecommendation[],
  picks: string[],
  assignedLanes: DraftLane[],
  limit: number,
): DraftRecommendation[] {
  const open = openDraftLanes(model, picks, assignedLanes)
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
    const lane = profile
      ? bestOpenLane(model, profile, picks, assignedLanes)
      : null
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
  const counterKeys = selectedKeys(
    options.counterTargets ?? options.state.enemyPicks,
  )
  const used = new Set(
    selectedKeys([
      ...options.state.allyPicks,
      ...options.state.enemyPicks,
      ...options.state.allyBans,
      ...options.state.enemyBans,
      ...(options.excludeHeroes ?? []),
    ]),
  )
  const allyTeam = teamBySlug(model, options.allyTeamPageSlug)
  const enemyTeam = teamBySlug(model, options.enemyTeamPageSlug)
  const targetLane = options.targetLane ?? null
  const allyPickLanes = options.state.allyPickLanes ?? []
  const enemyPickLanes = options.state.enemyPickLanes ?? []
  const banTargetOpenLanes = openDraftLanes(
    model,
    options.state.enemyPicks,
    enemyPickLanes,
  )

  const ranked = model.heroes
    .filter((profile) => {
      if (used.has(profile.key)) return false
      if (options.kind === 'pick') {
        // The Patch catalog still supplies roles and manual Hero Pool entries,
        // but an automatic Pick must have appeared in this season's pro data.
        return profile.exactGames > 0 || profile.summaryPicks > 0
      }
      const hasCurrentProEvidence =
        profile.exactGames +
          profile.summaryPicks +
          profile.exactBans +
          profile.summaryBans >
        0
      if (!hasCurrentProEvidence) return false
      // Once the opponent has locked roles, do not waste a Phase 2 ban on a
      // role they can no longer draft. Flex heroes remain eligible when they
      // genuinely fit one of the opponent's open roles.
      return Boolean(bestLaneFrom(profile, banTargetOpenLanes))
    })
    .map((profile): DraftRecommendation => {
      const exactMetric = {
        games: profile.exactGames,
        wins: profile.exactWins,
      }
      const winRate = smoothedRate(exactMetric)
      const hasCurrentProEvidence =
        profile.summaryPicks +
          profile.summaryBans +
          profile.exactGames +
          profile.exactBans >
        0
      const proPickPriority = clamp(profile.pickRate / 0.3)
      const proMeta =
        options.kind === 'ban'
          ? clamp(
              profile.banRate * 0.58 +
                profile.presenceRate * 0.22 +
                winRate * 0.2,
            )
          : clamp(proPickPriority * 0.78 + winRate * 0.22)
      const meta = hasCurrentProEvidence
        ? clamp(proMeta * 0.92 + profile.patchMetaScore * 0.08)
        : clamp(profile.patchMetaScore * 0.7)
      const role = laneFit(
        profile,
        model,
        options.state.allyPicks,
        allyPickLanes,
        targetLane,
      )
      const suggestedLane =
        options.kind === 'pick'
          ? targetLane ??
            bestOpenLane(
              model,
              profile,
              options.state.allyPicks,
              allyPickLanes,
            )
          : bestLaneFrom(profile, banTargetOpenLanes)
      const synergy = averageMetrics(
        allyKeys.map((ally) => model.synergy[pairKey(profile.key, ally)]),
      )
      const composition = compositionAffinity(model, profile.key, allyKeys)
      const synergyScore =
        composition.games > 0
          ? clamp(
              synergy.rate * 0.42 +
                composition.rate * 0.38 +
                composition.coverage * 0.2,
            )
          : synergy.rate
      const counter = averageMetrics(
        counterKeys.map(
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
      const banPace =
        options.plan === 'scaling'
          ? profile.earlyScore
          : options.plan === 'early'
            ? profile.scalingScore
            : 0.5
      const firstBanPriority = clamp(
        profile.earlyBanRate * 0.72 + profile.firstBanRate * 0.28,
      )

      let rawScore: number
      let relevantSample: number
      let teamRate: number | null

      if (options.kind === 'ban') {
        const threat = reverseThreat.games > 0 ? reverseThreat.rate : meta
        rawScore = options.phase === 2
          ? meta * 0.16 +
            firstBanPriority * 0.08 +
            threat * 0.27 +
            enemySynergy.rate * 0.15 +
            enemyComfort.rate * 0.14 +
            enemyBan.rate * 0.04 +
            banPace * 0.16
          : meta * 0.2 +
            firstBanPriority * 0.23 +
            threat * 0.15 +
            enemySynergy.rate * 0.09 +
            enemyComfort.rate * 0.11 +
            enemyBan.rate * 0.04 +
            banPace * 0.18
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
          balanced: { meta: 0.36, role: 0.2, synergy: 0.2, counter: 0.14, pace: 0.03, comfort: 0.07 },
          early: { meta: 0.3, role: 0.18, synergy: 0.17, counter: 0.12, pace: 0.18, comfort: 0.05 },
          scaling: { meta: 0.3, role: 0.18, synergy: 0.17, counter: 0.12, pace: 0.18, comfort: 0.05 },
          counter: { meta: 0.23, role: 0.17, synergy: 0.16, counter: 0.39, pace: 0.01, comfort: 0.04 },
          comfort: { meta: 0.24, role: 0.16, synergy: 0.16, counter: 0.1, pace: 0.02, comfort: 0.32 },
        }
        const weight = weights[options.plan]
        rawScore =
          meta * weight.meta +
          role * weight.role +
          synergyScore * weight.synergy +
          counter.rate * weight.counter +
          pace * weight.pace +
          comfort.rate * weight.comfort
        relevantSample =
          profile.exactGames +
          synergy.games +
          composition.games +
          counter.games +
          comfort.games
        teamRate = comfort.games > 0 ? comfort.rate : null
      }

      if (options.kind === 'pick' && role < MIN_LANE_FIT) rawScore *= 0.45
      if (targetLane && role < MIN_LANE_FIT) rawScore *= 0.55

      const reasons: RecommendationReason[] = []
      if (options.kind === 'ban') {
        addReason(reasons, 'targetOpenRole', Boolean(suggestedLane))
        addReason(
          reasons,
          'firstBanPriority',
          profile.exactEarlyBans >= 2 && profile.earlyBanRate >= 0.08,
        )
        addReason(
          reasons,
          'antiEarly',
          options.plan === 'scaling' && profile.earlyScore >= 0.54,
        )
        addReason(
          reasons,
          'antiScaling',
          options.plan === 'early' && profile.scalingScore >= 0.54,
        )
        addReason(reasons, 'denyComfort', enemyComfort.games >= 2)
        addReason(reasons, 'counter', reverseThreat.games >= 3 && reverseThreat.rate >= 0.54)
        addReason(reasons, 'synergy', enemySynergy.games >= 3 && enemySynergy.rate >= 0.54)
      } else {
        addReason(reasons, 'lane', role >= 0.52)
        addReason(reasons, 'meta', profile.exactGames >= 3 || profile.pickRate >= 0.08)
        addReason(
          reasons,
          'composition',
          composition.games >= 2 &&
            composition.bestOverlap >= Math.min(2, allyKeys.length),
        )
        addReason(reasons, 'synergy', synergy.games >= 3 && synergy.rate >= 0.54)
        addReason(reasons, 'counter', counter.games >= 3 && counter.rate >= 0.54)
        addReason(reasons, 'comfort', comfort.games >= 2)
        addReason(reasons, 'flex', profile.flexLanes.length >= 2)
        addReason(reasons, 'early', options.plan === 'early' && profile.earlyScore >= 0.58)
        addReason(reasons, 'scaling', options.plan === 'scaling' && profile.scalingScore >= 0.58)
      }
      addReason(
        reasons,
        'meta',
        options.kind === 'ban'
          ? profile.banRate >= 0.24
          : profile.pickRate >= 0.08,
      )
      addReason(
        reasons,
        'patchMeta',
        profile.patchMetaScore >= 0.59 &&
          (!hasCurrentProEvidence || profile.patchMetaTier === 'SS'),
      )
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
        patchMetaTier: profile.patchMetaTier,
        patchMetaScore: profile.patchMetaScore,
        presenceRate: profile.presenceRate,
        pickRate: profile.pickRate,
        banRate: profile.banRate,
        firstBanRate: profile.firstBanRate,
        earlyBanRate: profile.earlyBanRate,
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
  if (options.kind === 'ban') {
    return diverseBanRecommendations(ranked, banTargetOpenLanes, limit)
  }
  if (!targetLane) {
    return diversePickRecommendations(
      model,
      ranked,
      options.state.allyPicks,
      allyPickLanes,
      limit,
    )
  }

  const fitting = ranked.filter((recommendation) => {
    const profile = model.heroByKey[heroKey(recommendation.hero.id)]
    return profile && profile.laneRates[targetLane] >= MIN_LANE_FIT
  })
  return fitting.slice(0, limit)
}

/** Best current-season answer to one enemy hero in every pro role. */
export function counterPicksByRole(
  model: DraftCoachModel,
  options: {
    state: DraftCoachState
    targetHero: string
    allyTeamPageSlug?: string | null
    enemyTeamPageSlug?: string | null
  },
): RoleCounterRecommendation[] {
  return DRAFT_LANES.flatMap((lane) => {
    const candidates = recommendDraftHeroes(model, {
      kind: 'pick',
      state: options.state,
      plan: 'counter',
      targetLane: lane,
      counterTargets: [options.targetHero],
      allyTeamPageSlug: options.allyTeamPageSlug,
      enemyTeamPageSlug: options.enemyTeamPageSlug,
      limit: model.heroes.length,
    })
    const recommendation =
      candidates.find((candidate) => candidate.matchupGames > 0) ??
      candidates[0]
    return recommendation
      ? [{ lane, recommendation, observed: recommendation.matchupGames > 0 }]
      : []
  })
}

/**
 * Rank observed two-pick packages for consecutive draft turns. Both heroes
 * must occupy different still-open roles, and the pair must have appeared
 * together in a complete current-season pro game.
 */
export function recommendDraftDuos(
  model: DraftCoachModel,
  options: Omit<RecommendationOptions, 'kind' | 'targetLane' | 'limit'> & {
    limit?: number
  },
): DraftDuoRecommendation[] {
  const candidates = recommendDraftHeroes(model, {
    ...options,
    kind: 'pick',
    targetLane: null,
    limit: model.heroes.length,
  }).slice(0, 36)
  const duos: DraftDuoRecommendation[] = []

  for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) {
    const first = candidates[firstIndex]
    if (!first.suggestedLane) continue
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < candidates.length;
      secondIndex += 1
    ) {
      const second = candidates[secondIndex]
      if (
        !second.suggestedLane ||
        first.suggestedLane === second.suggestedLane
      ) {
        continue
      }
      const metric =
        model.synergy[
          pairKey(heroKey(first.hero.id), heroKey(second.hero.id))
        ]
      if (!metric || metric.games === 0) continue
      const winRate = smoothedRate(metric)
      const includesMid =
        first.suggestedLane === 'mid' || second.suggestedLane === 'mid'
      const score =
        (first.score + second.score) * 0.38 +
        winRate * 22 +
        Math.min(metric.games, 10) * 0.8 +
        (includesMid ? 4 : 0)
      duos.push({
        first,
        second,
        games: metric.games,
        winRate,
        score: Math.round(score),
      })
    }
  }

  return duos
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.games - a.games ||
        a.first.hero.name.localeCompare(b.first.hero.name),
    )
    .slice(0, options.limit ?? 3)
}

function teamProForm(model: DraftCoachModel, picks: string[]): number {
  const rates = selectedKeys(picks).flatMap((key) => {
    const profile = model.heroByKey[key]
    return profile?.exactGames
      ? [smoothedRate({ games: profile.exactGames, wins: profile.exactWins })]
      : []
  })
  return rates.length > 0
    ? rates.reduce((total, rate) => total + rate, 0) / rates.length
    : 0.5
}

function teamSynergyRate(model: DraftCoachModel, picks: string[]): number {
  const keys = selectedKeys(picks)
  const metrics: PairMetric[] = []
  for (let first = 0; first < keys.length; first += 1) {
    for (let second = first + 1; second < keys.length; second += 1) {
      const metric = model.synergy[pairKey(keys[first], keys[second])]
      if (metric) metrics.push(metric)
    }
  }
  return averageMetrics(metrics).rate
}

function nearestCompositionRate(
  model: DraftCoachModel,
  picks: string[],
): { rate: number; games: number } {
  const keys = selectedKeys(picks)
  let games = 0
  let wins = 0

  for (const composition of model.compositions) {
    const overlap = keys.filter((key) => composition.picks.includes(key)).length
    if (overlap < 2) continue
    // A four-hero historical overlap is much stronger evidence than a pair,
    // without pretending that the exact five has already been played.
    const weight = overlap * overlap
    games += weight
    if (composition.won === true) wins += weight
  }

  return {
    rate: smoothedRate(games > 0 ? { games, wins } : undefined, 12),
    games,
  }
}

function matchupRate(
  model: DraftCoachModel,
  picks: string[],
  opponents: string[],
): { rate: number; games: number } {
  const metrics = selectedKeys(picks).flatMap((hero) =>
    selectedKeys(opponents).map(
      (opponent) => model.matchups[matchupKey(hero, opponent)],
    ),
  )
  return averageMetrics(metrics)
}

/**
 * Conservative post-draft comparison from current-season pro evidence.
 * This is an estimate, not a guarantee: execution, player comfort and the
 * in-game economy remain outside a static draft model.
 */
export function compareCompletedDrafts(
  model: DraftCoachModel,
  state: DraftCoachState,
): DraftComparison | null {
  if (state.allyPicks.length !== 5 || state.enemyPicks.length !== 5) return null

  const allyProForm = teamProForm(model, state.allyPicks)
  const enemyProForm = teamProForm(model, state.enemyPicks)
  const allySynergy = teamSynergyRate(model, state.allyPicks)
  const enemySynergy = teamSynergyRate(model, state.enemyPicks)
  const allyComposition = nearestCompositionRate(model, state.allyPicks)
  const enemyComposition = nearestCompositionRate(model, state.enemyPicks)
  const allyMatchup = matchupRate(model, state.allyPicks, state.enemyPicks)
  const enemyMatchup = matchupRate(model, state.enemyPicks, state.allyPicks)

  // Matchup rates are complementary by construction: every game that records
  // A beating B also records B losing to A, so rate(A,B) + rate(B,A) is
  // exactly 1. Subtracting one side from the other therefore counts the same
  // evidence twice. It is measured once, as a signed edge around even.
  const edge =
    (allyProForm - enemyProForm) * 0.3 +
    (allySynergy - enemySynergy) * 0.32 +
    (allyComposition.rate - enemyComposition.rate) * 0.24 +
    (allyMatchup.rate - 0.5) * 0.38

  const raw = 1 / (1 + Math.exp(-edge * 5))

  /**
   * Pull the estimate back towards even in proportion to how much pro
   * evidence actually stands behind it.
   *
   * With ~130 heroes there are thousands of possible pairings, so a single
   * season supplies only a handful of games for most of them. Backtesting
   * this model on held-out games showed no reliable edge over a coin flip,
   * and an unshrunk figure would present that noise as a confident call.
   * Shrinking does not manufacture skill — it stops the number claiming more
   * than the data supports.
   */
  const evidence =
    allyComposition.games +
    enemyComposition.games +
    allyMatchup.games +
    enemyMatchup.games
  const trust = evidence / (evidence + 400)
  const probability = clamp(0.5 + (raw - 0.5) * trust, 0.3, 0.7)
  const evidenceGames = Math.round(model.compositions.length / 2)
  const comparisonSample =
    allyComposition.games +
    enemyComposition.games +
    allyMatchup.games +
    enemyMatchup.games

  return {
    allyWinProbability: probability,
    enemyWinProbability: 1 - probability,
    allyProForm,
    enemyProForm,
    allySynergy,
    enemySynergy,
    allyCompositionFit: allyComposition.rate,
    enemyCompositionFit: enemyComposition.rate,
    allyMatchupEdge: allyMatchup.rate,
    enemyMatchupEdge: enemyMatchup.rate,
    gamesAnalyzed: evidenceGames,
    confidence: confidence(comparisonSample),
  }
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
    // Phase two follows the official 1–2–1 sequence: the side that opens
    // this phase locks one hero, the other side locks two, then the opener
    // makes the final pick.
    { side: red, kind: 'pick', phase: 2 },
    { side: blue, kind: 'pick', phase: 2 },
    { side: blue, kind: 'pick', phase: 2 },
    { side: red, kind: 'pick', phase: 2 },
  ]
}
