// Types and constants that client components may import. `lib/data.ts`
// reads the file system, so it must never reach the browser bundle.
export type Locale = 'ar' | 'en'
export type Lane = 'exp' | 'jungle' | 'mid' | 'gold' | 'roam'
export type Tier = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D'
export const LANES: readonly Lane[] = ['exp', 'jungle', 'mid', 'gold', 'roam']
export const TIERS: readonly Tier[] = ['SS', 'S', 'A', 'B', 'C', 'D']

export interface Hero {
  id: string
  name: string
  image: string | null
  lane: Lane
  lanes: Lane[]
  tier: Tier
  score: number
  roles: string[]
}
