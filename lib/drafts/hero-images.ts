import heroCatalog from '@/data/snapshots/hero-catalog.json'
import type { DraftHero } from '@/lib/data/types'

export interface HeroImageSource {
  hero: DraftHero
  imageUrl: string | null
}

export interface HeroCatalogItem extends HeroImageSource {
  imageUrl: string
}

export type HeroImageMap = Record<string, string>

/**
 * Liquipedia writes hero names in shorthand inside draft tables. Most are a
 * plain prefix ("Leo" → Leomord) and are derived from the catalog below, so
 * new ones resolve on their own. These are the ones that are not — initials
 * and contractions that no rule would produce.
 */
const IRREGULAR_ALIASES: Record<string, string> = {
  yz: 'yuzhong',
  yss: 'yisunshin',
  ling: 'ling',
}

function bareKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

const CATALOG_KEYS: ReadonlySet<string> = new Set(
  (heroCatalog.data as Array<{ hero: { name: string; id: string } }>).flatMap(
    (item) => [bareKey(item.hero.name), bareKey(item.hero.id)],
  ),
)

/**
 * Every prefix that identifies exactly one hero, so shorthand resolves
 * without anyone maintaining a list.
 *
 * A prefix that is itself a hero name is never aliased — "Vale" is its own
 * hero as well as the start of "Valentina", and it must stay Vale.
 */
const PREFIX_ALIASES: ReadonlyMap<string, string> = (() => {
  const owners = new Map<string, Set<string>>()

  for (const key of CATALOG_KEYS) {
    for (let length = 3; length < key.length; length += 1) {
      const prefix = key.slice(0, length)
      if (CATALOG_KEYS.has(prefix)) continue
      const set = owners.get(prefix) ?? new Set<string>()
      set.add(key)
      owners.set(prefix, set)
    }
  }

  const aliases = new Map<string, string>()
  for (const [prefix, matches] of owners) {
    if (matches.size === 1) aliases.set(prefix, [...matches][0])
  }
  return aliases
})()

export function heroKey(value: string): string {
  const key = bareKey(value)
  if (CATALOG_KEYS.has(key)) return key
  return IRREGULAR_ALIASES[key] ?? PREFIX_ALIASES.get(key) ?? key
}

function heroKeys(hero: DraftHero): string[] {
  return [...new Set([hero.id, hero.name, hero.pageSlug].map(heroKey))]
}

export function buildHeroImageMap(
  sources: readonly HeroImageSource[],
): HeroImageMap {
  const images: HeroImageMap = {}

  for (const source of sources) {
    if (!source.imageUrl) continue
    for (const key of heroKeys(source.hero)) images[key] = source.imageUrl
  }

  return images
}

export function resolveHeroImage(
  images: HeroImageMap,
  hero: DraftHero,
): string | null {
  for (const key of heroKeys(hero)) {
    if (images[key]) return images[key]
  }
  return null
}
