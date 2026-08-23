import { describe, it, expect } from 'vitest'
import { createLocalDataSource } from './local'
import { isOk } from './source'

describe('local data source', () => {
  it('serves matches from the fallback when no snapshot exists', async () => {
    const source = createLocalDataSource({ snapshotDir: '/nonexistent' })
    const r = await source.getMatches()

    expect(isOk(r)).toBe(true)
    if (isOk(r)) {
      expect(r.value.length).toBeGreaterThan(0)
      expect(r.value[0].tournamentName).toContain('MPL')
    }
  })

  it('reports freshness from the fallback timestamp', async () => {
    const source = createLocalDataSource({ snapshotDir: '/nonexistent' })
    expect(await source.getFreshness()).toBeGreaterThan(1_600_000_000)
  })

  it('filters teams by region slug', async () => {
    const source = createLocalDataSource({ snapshotDir: '/nonexistent' })
    const r = await source.getTeamsByRegion('indonesia')

    expect(isOk(r)).toBe(true)
  })

  it('returns an empty standings list when no snapshot exists', async () => {
    const source = createLocalDataSource({ snapshotDir: '/nonexistent' })
    const r = await source.getStandings('philippines')

    expect(isOk(r)).toBe(true)
    if (isOk(r)) expect(r.value).toEqual([])
  })
})
