import type { DraftHero } from '@/lib/data/types'

export interface HeroImageSource {
  hero: DraftHero
  imageUrl: string | null
}

export interface HeroCatalogItem extends HeroImageSource {
  imageUrl: string
}

export type HeroImageMap = Record<string, string>

const HERO_ALIASES: Record<string, string> = {
  guin: 'guinevere',
  lapu: 'lapulapu',
  yz: 'yuzhong',
}

export function heroKey(value: string): string {
  const key = value.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return HERO_ALIASES[key] ?? key
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
