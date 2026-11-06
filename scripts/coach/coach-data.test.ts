import { describe, expect, it } from 'vitest'
import type { DraftLeague, DraftSeries } from '@/lib/data/types'
import { assignPatch, buildLeagues, buildManifest, buildTeams, emptyState, seedFromSnapshot, type Family } from './build'
import { baseVersion, mergePatches, parseReleaseDate, patchForDate } from './patches'

const hero = (id: string) => ({ id, name: id, pageSlug: id })
const game = (number: number, winner: 1 | 2) => ({
  number,
  winner,
  durationSeconds: 900,
  mapName: null,
  vodUrl: null,
  team1Side: 'blue' as const,
  team2Side: 'red' as const,
  team1Picks: ['a', 'b', 'c', 'd', 'e'].map(hero),
  team2Picks: ['f', 'g', 'h', 'i', 'j'].map(hero),
  team1Bans: ['k', 'l', 'm'].map(hero),
  team2Bans: ['n', 'o', 'p'].map(hero),
})
const series = (id: string, page: string, playedOn: string, team1 = 'Titan_Esports_Club_AR', team2 = 'Twisted_Minds'): DraftSeries => ({
  id,
  regionSlug: 'mena',
  leagueName: 'MPL MENA',
  tournamentPageSlug: page,
  playedOn,
  startsAt: null,
  roundLabel: null,
  stageName: null,
  team1: { name: team1.replaceAll('_', ' '), pageSlug: team1 },
  team2: { name: team2.replaceAll('_', ' '), pageSlug: team2 },
  mvp: null,
  games: [game(1, 1), game(2, 2)],
})

const patches = mergePatches([
  { version: '2.1.90', page: 'Patch 2.1.90', releasedAt: '2026-06-01' },
  { version: '2.1.95', page: 'Patch 2.1.95a', releasedAt: '2026-08-10' },
  { version: '2.1.95', page: 'Patch 2.1.95', releasedAt: '2026-08-04' },
  { version: '2.2.16', page: 'Patch 2.2.16', releasedAt: '2026-10-20' },
])

const families: Family[] = [
  { slug: 'mena', kind: 'mpl', label: 'MPL MENA', root: 'MPL/MENA/Season_10', regionSlug: 'mena' },
  { slug: 'm7', kind: 'international', label: 'M7 World Championship', root: 'M7_World_Championship', regionSlug: 'international' },
]

describe('patch calendar', () => {
  it('reads the infobox release date and the base version', () => {
    expect(parseReleaseDate('{{Infobox patch\n|name=Patch 2.1.95\n|release=2026-08-04\n}}')).toBe('2026-08-04')
    expect(parseReleaseDate('no infobox')).toBeNull()
    expect(baseVersion('Patch 2.1.95a')).toBe('2.1.95')
    expect(baseVersion('Patches')).toBeNull()
  })

  it('merges hotfixes into their base patch and assigns by date', () => {
    expect(patches.map((p) => `${p.version}@${p.releasedAt}`)).toEqual(['2.1.90@2026-06-01', '2.1.95@2026-08-04', '2.2.16@2026-10-20'])
    expect(patchForDate(patches, '2026-08-03')).toBe('2.1.90')
    expect(patchForDate(patches, '2026-08-04')).toBe('2.1.95')
    expect(patchForDate(patches, '2026-11-06')).toBe('2.2.16')
    expect(patchForDate(patches, '2026-01-01')).toBeNull()
    expect(patchForDate(patches, null)).toBeNull()
  })
})

describe('coach data assembly', () => {
  it('builds one league per family with patch-tagged, de-duplicated series', () => {
    const state = emptyState()
    state.patches = patches
    state.pages = {
      'MPL/MENA/Season_10/Regular_Season': { family: 'mena', parsedAt: '2026-11-06T03:30:00Z', series: [series('s1', 'MPL/MENA/Season_10/Regular_Season', '2026-10-25')] },
      'MPL/MENA/Season_10/Playoffs': { family: 'mena', parsedAt: '2026-11-06T03:30:00Z', series: [series('s1', 'MPL/MENA/Season_10/Playoffs', '2026-10-25'), series('s2', 'MPL/MENA/Season_10/Playoffs', '2026-08-05')] },
      'M7_World_Championship/Wildcard': { family: 'm7', parsedAt: '2026-11-06T03:30:00Z', series: [series('w1', 'M7_World_Championship/Wildcard', '2026-11-01', 'Titan_Esports_Club_AR', 'Falcons')] },
      'Orphan/Page': { family: 'nope', parsedAt: '2026-11-06T03:30:00Z', series: [series('x', 'Orphan/Page', '2026-11-01')] },
    }
    const leagues = buildLeagues(state, families)
    expect(leagues.map((l) => l.leagueName)).toEqual(['MPL MENA', 'M7 World Championship'])
    const mena = leagues[0]
    expect(mena.tournamentKind).toBe('mpl')
    expect(mena.series.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(mena.series.map((s) => s.patch)).toEqual(['2.2.16', '2.1.95'])
    expect(mena.gamesAnalyzed).toBe(4)
    expect(leagues[1].regionSlug).toBe('international')
  })

  it('merges differently cased spellings of one team', () => {
    const state = emptyState()
    state.patches = patches
    state.pages = {
      'MPL/MENA/Season_10/Regular_Season': { family: 'mena', parsedAt: '2026-11-06T03:30:00Z', series: [series('s1', 'MPL/MENA/Season_10/Regular_Season', '2026-10-25', 'titan_esports_club_ar', 'Twisted_Minds')] },
      'MPL/MENA/Season_10/Playoffs': { family: 'mena', parsedAt: '2026-11-06T03:30:00Z', series: [series('s2', 'MPL/MENA/Season_10/Playoffs', '2026-10-28', 'Titan_Esports_Club_AR', 'twisted_minds')] },
    }
    const leagues = buildLeagues(state, families)
    const teams = buildTeams(leagues)
    expect(teams.map((t) => `${t.pageSlug}:${t.games}`)).toEqual(['Titan_Esports_Club_AR:4', 'Twisted_Minds:4'])
    expect(leagues[0].series.every((s) => s.team1.pageSlug === 'Titan_Esports_Club_AR' && s.team2.pageSlug === 'Twisted_Minds')).toBe(true)
  })

  it('lists teams with game counts and flags wildcard participants', () => {
    const state = emptyState()
    state.patches = patches
    state.pages = {
      'MPL/MENA/Season_10/Playoffs': { family: 'mena', parsedAt: '2026-11-06T03:30:00Z', series: [series('s2', 'MPL/MENA/Season_10/Playoffs', '2026-08-05')] },
      'M7_World_Championship/Wildcard': { family: 'm7', parsedAt: '2026-11-06T03:30:00Z', series: [series('w1', 'M7_World_Championship/Wildcard', '2026-11-01', 'Titan_Esports_Club_AR', 'Falcons')] },
    }
    const teams = buildTeams(buildLeagues(state, families))
    const titan = teams.find((t) => t.pageSlug === 'Titan_Esports_Club_AR')
    expect(titan).toMatchObject({ games: 4, wildcard: true })
    expect(teams.find((t) => t.pageSlug === 'Twisted_Minds')).toMatchObject({ games: 2, wildcard: false })
  })

  it('writes a manifest whose hashes and counts describe the files', () => {
    const state = emptyState()
    state.patches = patches
    state.pages = { 'MPL/MENA/Season_10/Playoffs': { family: 'mena', parsedAt: '2026-11-06T03:30:00Z', series: [series('s2', 'MPL/MENA/Season_10/Playoffs', '2026-08-05')] } }
    const leagues = buildLeagues(state, families)
    const teams = buildTeams(leagues)
    const files = { 'drafts.json': JSON.stringify(leagues), 'teams.json': JSON.stringify(teams) }
    const manifest = buildManifest(files, leagues, teams, patches, new Date('2026-11-06T03:30:00Z'))
    expect(manifest.currentPatch).toBe('2.2.16')
    expect(manifest.counts).toEqual({ games: 2, tournaments: 1, teams: 2, patches: 3 })
    expect(manifest.files['drafts.json'].bytes).toBe(Buffer.byteLength(files['drafts.json']))
    expect(manifest.files['drafts.json'].sha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('seeds page state from the existing snapshot by tournament page', () => {
    const snapshot: DraftLeague[] = [{
      regionSlug: 'mena', leagueName: 'MPL MENA', leaguePageSlug: 'MPL/MENA/Season_10', gamesAnalyzed: 4, heroStats: [],
      series: [series('s1', 'MPL/MENA/Season_10/Regular_Season', '2026-10-25'), series('s2', 'MPL/MENA/Season_10/Playoffs', '2026-08-05')],
    }]
    const pages = seedFromSnapshot(snapshot, families, new Date('2026-11-06T03:30:00Z'))
    expect(Object.keys(pages).sort()).toEqual(['MPL/MENA/Season_10/Playoffs', 'MPL/MENA/Season_10/Regular_Season'])
    expect(pages['MPL/MENA/Season_10/Playoffs'].family).toBe('mena')
    expect(assignPatch(pages['MPL/MENA/Season_10/Playoffs'].series[0], patches).patch).toBe('2.1.95')
  })
})
