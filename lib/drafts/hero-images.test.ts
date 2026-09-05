import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readSnapshot } from '@/lib/data/snapshots'
import type { DraftHero, DraftLeague } from '@/lib/data/types'
import {
  buildHeroImageMap,
  heroKey,
  resolveHeroImage,
  type HeroCatalogItem,
} from './hero-images'

function allGameHeroes(leagues: DraftLeague[]): DraftHero[] {
  return leagues.flatMap((league) =>
    league.series.flatMap((series) =>
      series.games.flatMap((game) => [
        ...game.team1Picks,
        ...game.team2Picks,
        ...game.team1Bans,
        ...game.team2Bans,
      ]),
    ),
  )
}

describe('draft hero images', () => {
  it('normalises shortened source names', () => {
    expect(heroKey('Guin')).toBe('guinevere')
    expect(heroKey('Lapu')).toBe('lapulapu')
    expect(heroKey('Yz')).toBe('yuzhong')
    expect(heroKey('Yi Sun-Shin')).toBe('yisunshin')
  })

  it('has a valid local portrait for every current game pick and ban', () => {
    const leagues = readSnapshot<DraftLeague[]>('drafts')?.data ?? []
    const catalog =
      readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []
    const images = buildHeroImageMap([
      ...leagues.flatMap((league) => league.heroStats),
      ...catalog,
    ])
    const heroes = allGameHeroes(leagues)
    const unresolved = heroes.filter((hero) => !resolveHeroImage(images, hero))
    const missingFiles = heroes.filter((hero) => {
      const imageUrl = resolveHeroImage(images, hero)
      return (
        !imageUrl ||
        !imageUrl.startsWith('/') ||
        !existsSync(join(process.cwd(), 'public', imageUrl))
      )
    })

    expect(heroes.length).toBeGreaterThan(1_000)
    expect(unresolved.map((hero) => hero.name)).toEqual([])
    expect(missingFiles.map((hero) => hero.name)).toEqual([])
  })
})

describe('hero shorthand resolution', () => {
  it('resolves prefixes Liquipedia uses in draft tables', () => {
    expect(heroKey('Leo')).toBe('leomord')
    expect(heroKey('Esme')).toBe('esmeralda')
    expect(heroKey('Mino')).toBe('minotaur')
    expect(heroKey('Guin')).toBe('guinevere')
  })

  it('resolves initials that no prefix rule would catch', () => {
    expect(heroKey('Yss')).toBe('yisunshin')
    expect(heroKey('YZ')).toBe('yuzhong')
  })

  it('never rewrites a hero whose name is a prefix of another', () => {
    // "Vale" starts "Valentina" but is its own hero; it must stay itself.
    expect(heroKey('Vale')).toBe('vale')
    expect(heroKey('Valentina')).toBe('valentina')
  })

  it('leaves a genuinely unknown name untouched', () => {
    expect(heroKey('Notahero')).toBe('notahero')
  })

  it('is unaffected by punctuation and case', () => {
    expect(heroKey('Yi Sun-shin')).toBe('yisunshin')
    expect(heroKey('lapu-lapu')).toBe('lapulapu')
  })
})
