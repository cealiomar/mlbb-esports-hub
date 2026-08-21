import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createLiquipediaClient } from '@/lib/data/liquipedia/client'
import { parseMatches } from '@/lib/data/liquipedia/parse-matches'
import { queueEntriesForRun } from '@/lib/data/liquipedia/queue'
import { parseLeagueTeams } from '@/lib/data/liquipedia/parse-league'
import { readSnapshot, writeSnapshot } from '@/lib/data/snapshots'
import type { Team } from '@/lib/data/types'
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
async function mirrorLogos(matches: Match[]): Promise<Match[]> {
  mkdirSync(LOGO_PUBLIC_DIR, { recursive: true })

  const wanted = new Set<string>()
  for (const match of matches) {
    for (const side of match.opponents) {
      if (isRemote(side.logoUrl)) wanted.add(side.logoUrl)
    }
  }

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

  // Rewrite to local paths, but only where the file really exists — a failed
  // download must leave the original URL rather than a dead link.
  return matches.map((match) => ({
    ...match,
    opponents: match.opponents.map((side) => {
      if (!isRemote(side.logoUrl)) return side
      const exists = existsSync(join(LOGO_PUBLIC_DIR, localLogoName(side.logoUrl)))
      return exists ? { ...side, logoUrl: localLogoUrl(side.logoUrl) } : side
    }) as Match['opponents'],
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
  const ticker = await client.parsePage('Liquipedia:Matches', 'text')
  if (!isOk(ticker)) {
    console.error(`matches harvest failed: ${ticker.error}`)
    process.exit(1)
  }

  const parsed = parseMatches(ticker.value)
  if (parsed.length === 0) {
    console.error('parsed zero matches — refusing to overwrite the snapshot')
    process.exit(1)
  }

  const matches = await mirrorLogos(parsed)
  writeSnapshot('matches', matches)
  console.log(`wrote ${matches.length} matches`)

  // Then a batch of rotating league pages. The client enforces the 30s gap.
  for (const entry of queueEntriesForRun(getRegions(), runIndex, batchSize)) {
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
