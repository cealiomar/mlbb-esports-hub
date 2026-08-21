import raw from '@/content/regions.json'

export interface LocalisedName {
  en: string
  ar: string
}

export interface RegionDefinition {
  slug: string
  flag: string
  name: LocalisedName
  lat: number
  lng: number
  accent: string
  /** Page harvested for this region's roster. */
  liquipediaLeaguePage: string
  /**
   * Tournament page prefixes that belong to this region. A region can run
   * more than one competition (a pro league and a development league), so
   * this is separate from the single page we harvest rosters from.
   */
  matchPrefixes: string[]
  leagueName: string
}

const regions = raw as RegionDefinition[]

export function getRegions(): RegionDefinition[] {
  return regions
}

export function getRegionBySlug(slug: string): RegionDefinition | undefined {
  return regions.find((r) => r.slug === slug)
}
