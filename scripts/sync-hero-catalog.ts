import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'node-html-parser'
import { writeSnapshot } from '@/lib/data/snapshots'
import type { HeroCatalogItem } from '@/lib/drafts/coach'

const SOURCE_PAGE = 'https://mlbbhub.com/matchups'
const USER_AGENT =
  'MLBBEsportsHub/1.0 (hero catalog sync; cealiomar.work@gmail.com)'

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function officialImage(proxyUrl: string): string {
  try {
    return new URL(proxyUrl).searchParams.get('url') ?? proxyUrl
  } catch {
    return proxyUrl
  }
}

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`)
  return response
}

async function main(): Promise<void> {
  const html = await (await fetchOk(SOURCE_PAGE)).text()
  const root = parse(html)
  const records = new Map<string, { name: string; source: string }>()

  for (const image of root.querySelectorAll('img')) {
    const alt = image.getAttribute('alt')?.trim() ?? ''
    const match = alt.match(/^(.+?) hero icon$/i)
    const src = image.getAttribute('src')
    if (!match || !src) continue
    const name = match[1].trim()
    records.set(name.toLowerCase(), { name, source: officialImage(src) })
  }
  if (records.size < 130) {
    throw new Error(`expected the current roster, found only ${records.size} heroes`)
  }

  const outputDir = join(process.cwd(), 'public', 'heroes', 'catalog')
  mkdirSync(outputDir, { recursive: true })
  const catalog: HeroCatalogItem[] = []

  for (const { name, source } of records.values()) {
    const filename = `${slug(name)}.png`
    const response = await fetchOk(source)
    writeFileSync(join(outputDir, filename), Buffer.from(await response.arrayBuffer()))
    catalog.push({
      hero: {
        id: name.toLowerCase(),
        name,
        pageSlug: name.replace(/\s+/g, '_'),
      },
      imageUrl: `/heroes/catalog/${filename}`,
    })
    console.log(`mirrored ${name}`)
  }

  catalog.sort((a, b) => a.hero.name.localeCompare(b.hero.name))
  writeSnapshot('hero-catalog', catalog)
  console.log(`wrote ${catalog.length} locally mirrored heroes`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
