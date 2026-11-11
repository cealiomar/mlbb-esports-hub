import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { API_BASE, USER_AGENT } from '@/lib/data/liquipedia/client'
import { localLogoName } from '@/lib/data/liquipedia/mirror'
import {
  parsePlayerPage,
  playerPhotoFile,
} from '@/lib/data/liquipedia/parse-player'
import { readSnapshot, writeSnapshot } from '@/lib/data/snapshots'
import type { PlayerPhoto, Team } from '@/lib/data/types'

/**
 * Mirrors player portraits for the regions the Academy presents.
 *
 * Uses only `action=query` (1 request / 2 s, never `parse`), 50 titles per
 * request, so a whole region costs a handful of calls. Portraits are
 * downloaded into `public/players/` because Liquipedia answers 403 to
 * hotlinked images.
 *
 * Kept in its own snapshot: the roster harvest rewrites `teams.json` region
 * by region and would otherwise drop the photos every time it ran.
 */
const PHOTO_REGIONS = ['mena']
const PLAYER_PUBLIC_DIR = 'public/players'
const PLAYER_URL_PREFIX = '/players'
const QUERY_INTERVAL_MS = 2_100
const TITLES_PER_QUERY = 50
const THUMB_WIDTH = 360

interface QueryPage {
  title: string
  missing?: string
  revisions?: { slots?: { main?: { '*'?: string } } }[]
  imageinfo?: { thumburl?: string; url?: string }[]
}

interface QueryResponse {
  query?: {
    pages?: Record<string, QueryPage>
    normalized?: { from: string; to: string }[]
  }
}

async function query(
  params: Record<string, string>,
): Promise<QueryResponse | null> {
  const url = new URL(API_BASE)
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    ...params,
  }).toString()

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Encoding': 'gzip' },
    })
    await delay(QUERY_INTERVAL_MS)
    if (!response.ok) {
      console.warn(`player query returned HTTP ${response.status}`)
      return null
    }
    return (await response.json()) as QueryResponse
  } catch (cause) {
    console.warn(`player query failed: ${String(cause)}`)
    return null
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** The API echoes titles in its own normalised spelling; map them back. */
function titleLookup(response: QueryResponse): Map<string, QueryPage> {
  const byTitle = new Map<string, QueryPage>()
  for (const page of Object.values(response.query?.pages ?? {})) {
    byTitle.set(page.title, page)
  }
  for (const { from, to } of response.query?.normalized ?? []) {
    const page = byTitle.get(to)
    if (page) byTitle.set(from, page)
  }
  return byTitle
}

async function main(): Promise<void> {
  const teams = (readSnapshot<Team[]>('teams')?.data ?? []).filter(
    (team) => team.regionSlug && PHOTO_REGIONS.includes(team.regionSlug),
  )
  if (teams.length === 0) {
    console.warn('no rosters for the photo regions; snapshot unchanged')
    return
  }

  const previous = readSnapshot<PlayerPhoto[]>('player-photos')?.data ?? []
  const handles = [
    ...new Set(teams.flatMap((team) => team.roster.map((p) => p.handle))),
  ]

  // 1. Each handle's own page. Redirects are deliberately not followed: a
  //    redirect means the page belongs to somebody spelled differently.
  const pages = new Map<string, ReturnType<typeof parsePlayerPage>>()
  let failedQueries = 0
  for (const batch of chunks(handles, TITLES_PER_QUERY)) {
    const response = await query({
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: batch.join('|'),
    })
    if (!response) {
      failedQueries++
      continue
    }
    const lookup = titleLookup(response)
    for (const handle of batch) {
      const text = lookup.get(handle)?.revisions?.[0]?.slots?.main?.['*']
      if (text) pages.set(handle, parsePlayerPage(text))
    }
  }

  // 2. Decide, per roster entry, whether the page is that person.
  const wanted: { team: Team; handle: string; file: string }[] = []
  for (const team of teams) {
    for (const player of team.roster) {
      const page = pages.get(player.handle)
      const file = page ? playerPhotoFile(player, page) : null
      if (file) wanted.push({ team, handle: player.handle, file })
    }
  }

  // 3. Resolve file names to a sized thumbnail URL.
  const thumbs = new Map<string, string>()
  const files = [...new Set(wanted.map((entry) => entry.file))]
  for (const batch of chunks(files, TITLES_PER_QUERY)) {
    const response = await query({
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: String(THUMB_WIDTH),
      titles: batch.map((file) => `File:${file}`).join('|'),
    })
    if (!response) {
      failedQueries++
      continue
    }
    const lookup = titleLookup(response)
    for (const file of batch) {
      const info = lookup.get(`File:${file}`)?.imageinfo?.[0]
      const url = info?.thumburl ?? info?.url
      if (url) thumbs.set(file, url)
    }
  }

  // 4. Mirror, and record only what is actually on disk.
  mkdirSync(PLAYER_PUBLIC_DIR, { recursive: true })
  const photos: PlayerPhoto[] = []
  let fetched = 0
  for (const entry of wanted) {
    const remote = thumbs.get(entry.file)
    if (!remote) continue
    const name = localLogoName(remote)
    const target = join(PLAYER_PUBLIC_DIR, name)

    if (!existsSync(target)) {
      try {
        const response = await fetch(remote, {
          headers: { 'User-Agent': USER_AGENT },
        })
        if (!response.ok) {
          console.warn(`portrait ${response.status}: ${remote}`)
          continue
        }
        writeFileSync(target, Buffer.from(await response.arrayBuffer()))
        fetched++
        await delay(250)
      } catch (cause) {
        console.warn(`portrait failed: ${remote} (${String(cause)})`)
        continue
      }
    }

    photos.push({
      teamPageSlug: entry.team.pageSlug,
      handle: entry.handle,
      photoUrl: `${PLAYER_URL_PREFIX}/${name}`,
      sourceFile: entry.file,
    })
  }

  // A run that could not reach the API proves nothing about who has a
  // portrait, so it must not wipe the ones already published.
  if (failedQueries > 0 && photos.length < previous.length) {
    console.warn(
      `${failedQueries} player queries failed; keeping the previous ${previous.length} portraits`,
    )
    return
  }

  writeSnapshot('player-photos', photos)
  console.log(
    `player portraits: ${photos.length} of ${handles.length} handles (${fetched} downloaded)`,
  )
}

main().catch((cause) => {
  console.error(cause)
  process.exit(1)
})
