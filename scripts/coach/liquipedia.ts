import { setTimeout as delay } from 'node:timers/promises'
import { API_BASE, USER_AGENT, createLiquipediaClient, type LiquipediaClient } from '@/lib/data/liquipedia/client'

/** Non-parse requests are capped at one every 2 seconds. */
const LIST_MIN_INTERVAL_MS = 2_000

export interface CoachLiquipedia {
  client: LiquipediaClient
  /** `list=allpages` titles under a prefix (cheap, alphabetical, space-separated titles). */
  listPages(prefix: string, limit?: number): Promise<string[]>
}

export function createCoachLiquipedia(): CoachLiquipedia {
  const client = createLiquipediaClient({
    fetch: globalThis.fetch,
    now: () => Date.now(),
    sleep: (milliseconds) => delay(milliseconds),
  })
  let lastListAt = 0

  async function listPages(prefix: string, limit = 50): Promise<string[]> {
    const wait = LIST_MIN_INTERVAL_MS - (Date.now() - lastListAt)
    if (wait > 0) await delay(wait)
    lastListAt = Date.now()
    const url = new URL(API_BASE)
    url.searchParams.set('action', 'query')
    url.searchParams.set('list', 'allpages')
    url.searchParams.set('apprefix', prefix)
    url.searchParams.set('aplimit', String(limit))
    url.searchParams.set('format', 'json')
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Encoding': 'gzip' },
    })
    if (!response.ok) throw new Error(`allpages ${prefix}: HTTP ${response.status}`)
    const body = (await response.json()) as { query?: { allpages?: Array<{ title: string }> } }
    return (body.query?.allpages ?? []).map((page) => page.title)
  }

  return { client, listPages }
}

/** Liquipedia titles use spaces; page slugs in snapshots use underscores. */
export function slugOf(title: string): string {
  return title.replaceAll(' ', '_')
}

export function titleOf(slug: string): string {
  return slug.replaceAll('_', ' ')
}
