import { setTimeout as delay } from 'node:timers/promises'
import { createLiquipediaClient } from '@/lib/data/liquipedia/client'
import { parseDraftSeries } from '@/lib/data/liquipedia/parse-drafts'
import { readSnapshot, writeSnapshot } from '@/lib/data/snapshots'
import { isOk } from '@/lib/data/source'
import type { DraftLeague } from '@/lib/data/types'

async function main(): Promise<void> {
  const leagues = readSnapshot<DraftLeague[]>('drafts')?.data ?? []
  if (leagues.length === 0) throw new Error('No draft snapshot to refresh')

  const client = createLiquipediaClient({
    fetch: globalThis.fetch,
    now: () => Date.now(),
    sleep: (milliseconds) => delay(milliseconds),
  })
  let refreshed = 0

  const updated: DraftLeague[] = []
  for (const league of leagues) {
    let series = league.series
    const pages = [...new Set(series.map((item) => item.tournamentPageSlug))]

    for (const page of pages) {
      const result = await client.parsePage(page, 'wikitext')
      if (!isOk(result)) {
        console.warn(`draft refresh skipped for ${page}: ${result.error}`)
        continue
      }

      const parsed = parseDraftSeries(result.value, {
        regionSlug: league.regionSlug,
        leagueName: league.leagueName,
        leaguePageSlug: page,
      })
      if (parsed.length === 0) {
        console.warn(`no draft series parsed from ${page}`)
        continue
      }

      series = [
        ...series.filter((item) => item.tournamentPageSlug !== page),
        ...parsed,
      ]
      refreshed += parsed.length
      console.log(`refreshed ${parsed.length} series for ${league.regionSlug}`)
    }

    updated.push({ ...league, series })
  }

  if (refreshed === 0) throw new Error('No draft series could be refreshed')
  writeSnapshot('drafts', updated)
  console.log(`wrote ${refreshed} current-season draft series`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
