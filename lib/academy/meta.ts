import type { PatchHeroMeta, PatchMetaTier } from '@/lib/drafts/current-patch-meta'

export type MetaLane = 'exp' | 'jungle' | 'mid' | 'gold' | 'roam'

export const META_LANES: readonly MetaLane[] = [
  'exp',
  'jungle',
  'mid',
  'gold',
  'roam',
]

export interface MetaHero {
  id: string
  name: string
  imageUrl: string | null
  tier: PatchMetaTier
  score: number
}

export interface HeroLookup {
  name: string
  imageUrl: string | null
}

/**
 * The strongest heroes of the current patch in one lane, best first.
 *
 * A hero is listed under its primary lane only — the first one the source
 * gives. Flex lanes are real, but ranking a mid laner among roamers because
 * it can be flexed there misstates what the tier measures.
 */
export function topHeroesForLane(
  meta: Record<string, PatchHeroMeta>,
  heroes: Record<string, HeroLookup>,
  lane: MetaLane,
  limit: number,
): MetaHero[] {
  return Object.entries(meta)
    .filter(([, item]) => item.lanes[0] === lane)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, limit)
    .map(([id, item]) => ({
      id,
      name: heroes[id]?.name ?? id,
      imageUrl: heroes[id]?.imageUrl ?? null,
      tier: item.tier,
      score: item.score,
    }))
}

/** One hero per lane: the top-ranked pick of the patch for each position. */
export function metaFive(
  meta: Record<string, PatchHeroMeta>,
  heroes: Record<string, HeroLookup>,
): { lane: MetaLane; hero: MetaHero }[] {
  return META_LANES.flatMap((lane) => {
    const [hero] = topHeroesForLane(meta, heroes, lane, 1)
    return hero ? [{ lane, hero }] : []
  })
}
