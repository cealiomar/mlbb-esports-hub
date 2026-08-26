import { describe, expect, it } from 'vitest'
import { parseLivePatchMeta } from './parse-live-patch-meta'

function pageWithHeroes(count: number): string {
  const heroes = Array.from({ length: count }, (_, index) => ({
    hero_name: `Hero ${index}`,
    lane: [index % 2 === 0 ? 'Gold Lane' : 'Jungle'],
    role: [index % 2 === 0 ? 'Marksman' : 'Assassin'],
    speciality: ['Damage'],
    tier: index % 3 === 0 ? 'SS' : 'A',
    score: 900 - index,
  }))
  const chunk = `5:["$",null,null,{"initialHeroes":${JSON.stringify(
    heroes,
  )},"initialLastUpdated":"2026-08-25T23:03:59.000Z"}]`
  return `<p>Patch 2.1.96</p><script>self.__next_f.push(${JSON.stringify([
    1,
    chunk,
  ])})</script>`
}

describe('live patch metadata parser', () => {
  it('reads validated Next.js flight data and normalizes lanes', () => {
    const parsed = parseLivePatchMeta(
      pageWithHeroes(133),
      'https://example.com/meta',
      '2.1.95',
    )

    expect(Object.keys(parsed.heroes)).toHaveLength(133)
    expect(parsed.version).toBe('2.1.96')
    expect(parsed.heroes.hero0).toMatchObject({
      lanes: ['gold'],
      tier: 'SS',
      score: 0.9,
      roles: ['Marksman'],
      specialties: ['Damage'],
    })
    expect(parsed.heroes.hero1.lanes).toEqual(['jungle'])
  })

  it('rejects a truncated update instead of replacing the last good snapshot', () => {
    expect(() =>
      parseLivePatchMeta(pageWithHeroes(10), 'https://example.com', '2.1.95'),
    ).toThrow('Only 10 valid heroes')
  })
})
