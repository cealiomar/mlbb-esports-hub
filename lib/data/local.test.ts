import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

  it('reports each dataset\'s own harvest time, not the fixtures\' time', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'freshness-'))
    writeFileSync(join(dir, 'matches.json'), JSON.stringify({ harvestedAt: 2_000_000_000, data: [] }))
    writeFileSync(join(dir, 'standings.json'), JSON.stringify({ harvestedAt: 1_900_000_000, data: [] }))
    const source = createLocalDataSource({ snapshotDir: dir })

    expect(await source.getFreshness()).toBe(2_000_000_000)
    expect(await source.getFreshness('standings')).toBe(1_900_000_000)
    // Unknown is null — never substituted with the newer fixtures timestamp.
    expect(await source.getFreshness('drafts')).toBeNull()
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

  it('returns an empty draft list when no snapshot exists', async () => {
    const source = createLocalDataSource({ snapshotDir: '/nonexistent' })
    const r = await source.getDraftLeagues('indonesia')

    expect(isOk(r)).toBe(true)
    if (isOk(r)) expect(r.value).toEqual([])
  })
})
