import { setTimeout as delay } from 'node:timers/promises'
import { createLiquipediaClient } from '@/lib/data/liquipedia/client'
import { parseDraftSeries } from '@/lib/data/liquipedia/parse-drafts'
import { writeSnapshot } from '@/lib/data/snapshots'
import { isOk } from '@/lib/data/source'
import type { DraftLeague } from '@/lib/data/types'

const ARCHIVE = [
  {
    regionSlug: 'indonesia',
    leagueName: 'MPL Indonesia Season 17',
    leaguePageSlug: 'MPL/Indonesia/Season_17',
    draftPageSlug: 'MPL/Indonesia/Season_17/Regular_Season',
  },
  {
    regionSlug: 'philippines',
    leagueName: 'MPL Philippines Season 17',
    leaguePageSlug: 'MPL/Philippines/Season_17',
    draftPageSlug: 'MPL/Philippines/Season_17/Regular_Season',
  },
  {
    regionSlug: 'malaysia',
    leagueName: 'MPL Malaysia Season 17',
    leaguePageSlug: 'MPL/Malaysia/Season_17',
    draftPageSlug: 'MPL/Malaysia/Season_17/Regular_Season',
  },
] as const

async function main(): Promise<void> {
  const client = createLiquipediaClient({
    fetch: globalThis.fetch,
    now: () => Date.now(),
    sleep: (milliseconds) => delay(milliseconds),
  })
  const leagues: DraftLeague[] = []

  for (const item of ARCHIVE) {
    const result = await client.parsePage(item.draftPageSlug, 'wikitext')
    if (!isOk(result)) {
      throw new Error(`archive fetch failed for ${item.draftPageSlug}: ${result.error}`)
    }
    const series = parseDraftSeries(result.value, {
      regionSlug: item.regionSlug,
      leagueName: item.leagueName,
      leaguePageSlug: item.draftPageSlug,
    })
    const gamesAnalyzed = series.reduce(
      (total, current) => total + current.games.length,
      0,
    )
    if (gamesAnalyzed === 0) {
      throw new Error(`no exact archive games parsed for ${item.draftPageSlug}`)
    }

    leagues.push({
      regionSlug: item.regionSlug,
      leagueName: item.leagueName,
      leaguePageSlug: item.leaguePageSlug,
      gamesAnalyzed,
      heroStats: [],
      series,
    })
    console.log(
      `archived ${series.length} series / ${gamesAnalyzed} games for ${item.regionSlug}`,
    )
  }

  writeSnapshot('draft-history', leagues)
  console.log(
    `wrote ${leagues.reduce((total, league) => total + league.gamesAnalyzed, 0)} previous-season games`,
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
