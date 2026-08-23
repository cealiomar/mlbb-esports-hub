import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createLiquipediaClient } from '@/lib/data/liquipedia/client'
import { parseMatches } from '@/lib/data/liquipedia/parse-matches'
import { queueEntriesForRun } from '@/lib/data/liquipedia/queue'
import { parseLeagueTeams } from '@/lib/data/liquipedia/parse-league'
import {
  isTournamentWindowActive,
  parseStandings,
  parseTournamentWindow,
} from '@/lib/data/liquipedia/parse-standings'
import { readSnapshot, writeSnapshot } from '@/lib/data/snapshots'
import type { StandingTable, Team } from '@/lib/data/types'
import {
  LOGO_PUBLIC_DIR,
  isRemote,
  localLogoName,
  localLogoUrl,
} from '@/lib/data/liquipedia/mirror'
import { getRegions } from '@/lib/content/regions'
import { isOk } from '@/lib/data/source'
import { USER_AGENT } from '@/lib/data/liquipedia/client'
import type { Match } from '@/lib/data/types'

/**
 * Liquipedia answers 403 to image requests carrying an off-site Referer, so
 * hotlinking their crests would break every logo on a deployed site. We pull
 * each one down once and serve it ourselves — more reliable, and it keeps us
 * off their bandwidth.
 */
async function mirrorRemoteLogos(urls: Iterable<string>): Promise<void> {
  mkdirSync(LOGO_PUBLIC_DIR, { recursive: true })

  const wanted = new Set(urls)

  let fetched = 0
  let cached = 0

  for (const url of wanted) {
    const target = join(LOGO_PUBLIC_DIR, localLogoName(url))
    if (existsSync(target)) {
      cached++
      continue
    }

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!response.ok) {
        console.warn(`logo ${response.status}: ${url}`)
        continue
      }
      writeFileSync(target, Buffer.from(await response.arrayBuffer()))
      fetched++
      // Be a considerate client; these are not API calls but they are theirs.
      await delay(250)
    } catch (cause) {
      console.warn(`logo failed: ${url} (${String(cause)})`)
    }
  }

  console.log(`logos: ${fetched} fetched, ${cached} already local`)
}

function localizeLogo(url: string | null): string | null {
  if (!isRemote(url)) return url
  const exists = existsSync(join(LOGO_PUBLIC_DIR, localLogoName(url)))
  return exists ? localLogoUrl(url) : url
}

function localizeStandingLogo(url: string | null): string | null {
  if (!isRemote(url)) return url
  const exists = existsSync(join(LOGO_PUBLIC_DIR, localLogoName(url)))
  // Standings are a new surface: prefer the readable monogram fallback over
  // shipping a fragile third-party image URL when a mirror download fails.
  return exists ? localLogoUrl(url) : null
}

async function mirrorLogos(matches: Match[]): Promise<Match[]> {
  const wanted = matches.flatMap((match) =>
    match.opponents
      .map((side) => side.logoUrl)
      .filter((url): url is string => isRemote(url)),
  )
  await mirrorRemoteLogos(wanted)

  // Rewrite to local paths, but only where the file really exists — a failed
  // download must leave the original URL rather than a dead link.
  return matches.map((match) => ({
    ...match,
    opponents: match.opponents.map((side) => ({
      ...side,
      logoUrl: localizeLogo(side.logoUrl),
    })) as Match['opponents'],
  }))
}

async function mirrorStandingLogos(
  tables: StandingTable[],
): Promise<StandingTable[]> {
  const wanted = tables.flatMap((table) =>
    table.rows
      .map((row) => row.team.logoUrl)
      .filter((url): url is string => isRemote(url)),
  )
  await mirrorRemoteLogos(wanted)

  return tables.map((table) => ({
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      team: { ...row.team, logoUrl: localizeStandingLogo(row.team.logoUrl) },
    })),
  }))
}

async function main(): Promise<void> {
  const runIndex = Number.parseInt(process.env.RUN_INDEX ?? '0', 10)
  // Overridable so a first-run backfill can sweep every region in one go.
  const batchSize = process.env.LEAGUES_PER_RUN
    ? Number.parseInt(process.env.LEAGUES_PER_RUN, 10)
    : undefined

  const client = createLiquipediaClient({
    fetch: globalThis.fetch,
    now: () => Date.now(),
    sleep: (ms) => delay(ms),
  })

  // Always refresh the ticker: one call, every region's fixtures and results.
  const previousMatchSnapshot = readSnapshot<Match[]>('matches')
  const ticker = await client.parsePage('Liquipedia:Matches', 'text')
  if (!isOk(ticker)) {
    if ((previousMatchSnapshot?.data.length ?? 0) > 0) {
      console.warn(
        `matches harvest unavailable after retries: ${ticker.error}; keeping ${previousMatchSnapshot?.data.length} last-known matches`,
      )
      return
    }
    console.error(`matches harvest failed with no fallback snapshot: ${ticker.error}`)
    process.exit(1)
  }

  const parsed = parseMatches(ticker.value)
  if (parsed.length === 0) {
    if ((previousMatchSnapshot?.data.length ?? 0) > 0) {
      console.warn(
        `parsed zero matches; keeping ${previousMatchSnapshot?.data.length} last-known matches`,
      )
      return
    }
    console.error('parsed zero matches with no fallback snapshot')
    process.exit(1)
  }

  const matches = await mirrorLogos(parsed)
  writeSnapshot('matches', matches)
  console.log(`wrote ${matches.length} matches`)

  const regions = getRegions()
  const previousStandings =
    readSnapshot<StandingTable[]>('standings')?.data ?? []
  const refreshedRegions = new Set<string>()
  const refreshedTables: StandingTable[] = []

  // Standings change with every completed series, so refresh every active
  // regional league each hour. The client spaces every parse call by 30s.
  for (const region of regions) {
    const rendered = await client.parsePage(region.liquipediaLeaguePage, 'text')
    if (!isOk(rendered)) {
      console.warn(
        `standings harvest skipped for ${region.liquipediaLeaguePage}: ${rendered.error}`,
      )
      continue
    }

    // A successful response replaces this region, even when it proves the
    // configured season has ended or has not published a table. Keeping the
    // previous rows here would silently relabel last season as current.
    refreshedRegions.add(region.slug)

    const windowStatus = isTournamentWindowActive(
      parseTournamentWindow(rendered.value),
      Math.floor(Date.now() / 1000),
    )
    const hasCurrentMatch = matches.some(
      (match) =>
        match.tournamentPageSlug === region.liquipediaLeaguePage ||
        match.tournamentPageSlug.startsWith(`${region.liquipediaLeaguePage}/`),
    )
    const isCurrentSeason = windowStatus ?? hasCurrentMatch
    if (!isCurrentSeason) {
      console.warn(
        `standings suppressed for inactive season ${region.liquipediaLeaguePage}`,
      )
      continue
    }

    const tables = parseStandings(rendered.value, {
      regionSlug: region.slug,
      leagueName: region.leagueName,
      leaguePageSlug: region.liquipediaLeaguePage,
    })
    if (tables.length === 0) {
      console.warn(
        `no current standings parsed from ${region.liquipediaLeaguePage}; old rows cleared`,
      )
      continue
    }

    refreshedTables.push(...tables)
    console.log(
      `parsed ${tables.reduce((sum, table) => sum + table.rows.length, 0)} standing rows for ${region.slug}`,
    )
  }

  if (refreshedRegions.size > 0) {
    const mergedStandings = [
      ...previousStandings.filter(
        (table) => !refreshedRegions.has(table.regionSlug),
      ),
      ...refreshedTables,
    ].sort(
      (a, b) =>
        regions.findIndex((region) => region.slug === a.regionSlug) -
        regions.findIndex((region) => region.slug === b.regionSlug),
    )
    const standings = await mirrorStandingLogos(mergedStandings)
    writeSnapshot('standings', standings)
    console.log(`wrote ${standings.length} standings tables`)
  }

  // Then a batch of rotating league pages. The client enforces the 30s gap.
  for (const entry of queueEntriesForRun(regions, runIndex, batchSize)) {
    const league = await client.parsePage(entry.page, 'wikitext')
    if (!isOk(league)) {
      // A missing league page is not fatal — seasons start and end.
      console.warn(`league harvest skipped for ${entry.page}: ${league.error}`)
      continue
    }
    const teams = parseLeagueTeams(league.value, entry.regionSlug)
    if (teams.length === 0) {
      console.warn(`no teams parsed from ${entry.page}; snapshot unchanged`)
      continue
    }

    const existing = readSnapshot<Team[]>('teams')?.data ?? []
    const merged = [
      ...existing.filter((t) => t.regionSlug !== entry.regionSlug),
      ...teams,
    ]
    writeSnapshot('teams', merged)
    console.log(`wrote ${teams.length} teams for ${entry.regionSlug}`)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
