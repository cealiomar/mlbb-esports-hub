import type {
  DraftLeague,
  DraftSeries,
  DraftTeam,
  Match,
  MatchOpponent,
  StandingTable,
} from '@/lib/data/types'

export interface DraftTeamVisual {
  regionSlug: string | null
  pageSlug: string
  name: string
  code: string
  logoUrl: string | null
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function words(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)
}

function initials(name: string): string {
  const parts = words(name)
  return (parts.length > 1 ? parts.map((part) => part[0]) : parts)
    .join('')
    .slice(0, 4)
    .toUpperCase()
}

function identifiers(team: Pick<DraftTeamVisual, 'pageSlug' | 'name' | 'code'>): string[] {
  return [team.pageSlug, team.name, team.code].map(normalise).filter(Boolean)
}

function exactTeamMatch(
  draftTeam: DraftTeam,
  candidate: Pick<DraftTeamVisual, 'pageSlug' | 'name' | 'code'>,
): boolean {
  const draftIds = [draftTeam.pageSlug, draftTeam.name].map(normalise).filter(Boolean)
  const candidateIds = identifiers(candidate)
  return draftIds.some((id) => candidateIds.includes(id))
}

function fuzzyTeamMatch(
  draftTeam: DraftTeam,
  candidate: Pick<DraftTeamVisual, 'pageSlug' | 'name' | 'code'>,
): boolean {
  const draftWords = words(`${draftTeam.pageSlug} ${draftTeam.name}`)
  const candidateWords = new Set(words(`${candidate.pageSlug} ${candidate.name}`))
  const uniqueDraftWords = [...new Set(draftWords)]
  return (
    uniqueDraftWords.length >= 2 &&
    uniqueDraftWords.every((word) => candidateWords.has(word))
  )
}

function opponentVisual(opponent: MatchOpponent, regionSlug: string | null): DraftTeamVisual {
  return {
    regionSlug,
    pageSlug: opponent.pageSlug,
    name: opponent.name,
    code: opponent.code,
    logoUrl: opponent.logoUrl,
  }
}

export function buildDraftTeamVisuals(
  leagues: DraftLeague[],
  matches: Match[],
  standings: StandingTable[],
): DraftTeamVisual[] {
  const candidates: DraftTeamVisual[] = []

  for (const table of standings) {
    for (const { team } of table.rows) {
      candidates.push({ regionSlug: table.regionSlug, ...team })
    }
  }
  for (const match of matches) {
    for (const opponent of match.opponents) {
      candidates.push(opponentVisual(opponent, match.regionSlug))
    }
  }

  const visuals: DraftTeamVisual[] = []
  for (const league of leagues) {
    const teams = league.series.flatMap((series) => [series.team1, series.team2])
    for (const team of teams) {
      if (
        visuals.some(
          (visual) =>
            visual.regionSlug === league.regionSlug &&
            normalise(visual.pageSlug) === normalise(team.pageSlug),
        )
      ) {
        continue
      }
      const regional = candidates.filter(
        (candidate) => candidate.regionSlug === league.regionSlug,
      )
      const candidate =
        regional.find((item) => exactTeamMatch(team, item)) ??
        regional.find((item) => fuzzyTeamMatch(team, item))
      visuals.push(
        candidate ?? {
          regionSlug: league.regionSlug,
          pageSlug: team.pageSlug,
          name: team.name,
          code: initials(team.name),
          logoUrl: null,
        },
      )
    }
  }

  return visuals
}

export function resolveDraftTeamVisual(
  visuals: DraftTeamVisual[],
  team: DraftTeam,
  regionSlug?: string,
): DraftTeamVisual {
  const regional = regionSlug
    ? visuals.filter((visual) => visual.regionSlug === regionSlug)
    : visuals
  return (
    regional.find((visual) => exactTeamMatch(team, visual)) ??
    regional.find((visual) => fuzzyTeamMatch(team, visual)) ?? {
      regionSlug: regionSlug ?? null,
      pageSlug: team.pageSlug,
      name: team.name,
      code: initials(team.name),
      logoUrl: null,
    }
  )
}

function opponentMatches(team: DraftTeam, opponent: MatchOpponent): boolean {
  return exactTeamMatch(team, opponentVisual(opponent, null)) || fuzzyTeamMatch(team, opponentVisual(opponent, null))
}

function seriesScore(series: DraftSeries): [number, number] {
  return [
    series.team1Score ?? series.games.filter((game) => game.winner === 1).length,
    series.team2Score ?? series.games.filter((game) => game.winner === 2).length,
  ]
}

function matchOrientation(series: DraftSeries, match: Match): 'direct' | 'reverse' | null {
  if (
    opponentMatches(series.team1, match.opponents[0]) &&
    opponentMatches(series.team2, match.opponents[1])
  ) {
    return 'direct'
  }
  if (
    opponentMatches(series.team1, match.opponents[1]) &&
    opponentMatches(series.team2, match.opponents[0])
  ) {
    return 'reverse'
  }
  return null
}

function scoreMatches(series: DraftSeries, match: Match, orientation: 'direct' | 'reverse'): boolean {
  const [team1Score, team2Score] = seriesScore(series)
  const first = orientation === 'direct' ? match.opponents[0].score : match.opponents[1].score
  const second = orientation === 'direct' ? match.opponents[1].score : match.opponents[0].score
  return first === null || second === null || (first === team1Score && second === team2Score)
}

function roundFromTournament(name: string): string | null {
  const week = name.match(/\bWeek\s*(\d+)\b/i)
  if (week) return `Week ${week[1]}`
  const round = name.match(/\bRound\s*(\d+)\b/i)
  return round ? `Round ${round[1]}` : null
}

function stageFromPage(pageSlug: string): string | null {
  const segment = pageSlug.split('/').filter(Boolean).at(-1)
  return segment ? segment.replaceAll('_', ' ') : null
}

/** Join exact draft sheets to the already-harvested fixture snapshot. */
export function enrichDraftLeagues(
  leagues: DraftLeague[],
  matches: Match[],
): DraftLeague[] {
  return leagues.map((league) => {
    const candidates = matches
      .filter(
        (match) =>
          match.status === 'completed' &&
          match.regionSlug === league.regionSlug &&
          match.tournamentPageSlug === league.series[0]?.tournamentPageSlug,
      )
      .sort((a, b) => a.startsAt - b.startsAt)
    const used = new Set<string>()

    const series = league.series.map((draftSeries) => {
      const possible = candidates
        .map((match) => ({ match, orientation: matchOrientation(draftSeries, match) }))
        .filter(
          (entry): entry is { match: Match; orientation: 'direct' | 'reverse' } =>
            entry.orientation !== null && !used.has(entry.match.id),
        )
      const matched =
        possible.find(({ match, orientation }) =>
          scoreMatches(draftSeries, match, orientation),
        ) ?? possible[0]
      if (matched) used.add(matched.match.id)

      const [team1Score, team2Score] = seriesScore(draftSeries)
      return {
        ...draftSeries,
        startsAt: matched?.match.startsAt ?? draftSeries.startsAt ?? null,
        roundLabel:
          draftSeries.roundLabel ??
          (matched ? roundFromTournament(matched.match.tournamentName) : null),
        stageName:
          draftSeries.stageName ?? stageFromPage(draftSeries.tournamentPageSlug),
        team1Score,
        team2Score,
        winner:
          draftSeries.winner ??
          (team1Score === team2Score ? null : team1Score > team2Score ? 1 : 2),
      } satisfies DraftSeries
    })

    return { ...league, series }
  })
}
