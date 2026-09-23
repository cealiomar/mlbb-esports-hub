import { describe, expect, it } from 'vitest'
import { newerSeasonPage } from './season-drift'

describe('newerSeasonPage', () => {
  // Real `list=allpages` order for MPL/MENA/ on 2026-09-23 (alphabetical).
  const mena = [
    'MPL/MENA/Season 1',
    'MPL/MENA/Season 10',
    'MPL/MENA/Season 10/Playoffs',
    'MPL/MENA/Season 5',
    'MPL/MENA/Season 9',
  ]

  it('finds the newer season despite alphabetical ordering', () => {
    expect(newerSeasonPage('MPL/MENA/Season_9', mena)).toBe('MPL/MENA/Season_10')
  })

  it('reports nothing when the configured season is already the newest', () => {
    expect(newerSeasonPage('MPL/MENA/Season_10', mena)).toBeNull()
  })

  it('ignores sub-pages and pages that are not numbered seasons', () => {
    expect(
      newerSeasonPage('MPL/LATAM/Season_4', ['MPL/LATAM/Season 4/Playoffs', 'MPL/LATAM/Season 5 Qualifier']),
    ).toBeNull()
    expect(newerSeasonPage('Vietnam_MLBB_Championship/2026/Fall', ['Vietnam MLBB Championship/2027/Spring'])).toBeNull()
  })
})
