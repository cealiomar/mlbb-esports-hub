import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseLeagueTeams } from './parse-league'
import type { Team } from '../types'

let teams: Team[]

beforeAll(() => {
  const wikitext = readFileSync(
    join(__dirname, '__fixtures__', 'league-ph.wikitext'),
    'utf8',
  )
  teams = parseLeagueTeams(wikitext, 'philippines')
})

describe('parseLeagueTeams', () => {
  it('finds the participating teams', () => {
    expect(teams.length).toBeGreaterThanOrEqual(6)
  })

  it('tags every team with the given region', () => {
    for (const t of teams) expect(t.regionSlug).toBe('philippines')
  })

  it('gives every team a page slug and a name', () => {
    for (const t of teams) {
      expect(t.pageSlug.length).toBeGreaterThan(0)
      expect(t.name.length).toBeGreaterThan(0)
    }
  })

  it('turns spaces in team names into underscores for the page slug', () => {
    const aurora = teams.find((t) => t.name.startsWith('Aurora'))
    expect(aurora?.pageSlug).toBe('Aurora_Gaming_PH')
  })

  it('does not duplicate teams', () => {
    const slugs = teams.map((t) => t.pageSlug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('reads the starting five plus substitutes into the roster', () => {
    const bren = teams.find((t) => t.name === 'AP.Bren')
    expect(bren).toBeDefined()
    const handles = bren!.roster.map((p) => p.handle)
    expect(handles).toContain('JMPINKMAN')
    expect(handles).toContain('Escalera')
    // Allen is listed as a substitute — still a player.
    expect(handles).toContain('Allen')
  })

  it('excludes coaching and analyst staff from the roster', () => {
    const bren = teams.find((t) => t.name === 'AP.Bren')
    const handles = bren!.roster.map((p) => p.handle)
    expect(handles).not.toContain('Bitoy')
    expect(handles).not.toContain('Yobabz')
  })

  it('captures each player role', () => {
    const bren = teams.find((t) => t.name === 'AP.Bren')
    const pinkman = bren!.roster.find((p) => p.handle === 'JMPINKMAN')
    expect(pinkman?.role).toBe('exp')
  })

  it('captures a player country when the flag is given', () => {
    const bren = teams.find((t) => t.name === 'AP.Bren')
    const allen = bren!.roster.find((p) => p.handle === 'Allen')
    expect(allen?.country).toBe('ph')
  })

  it('leaves country null when no flag is given', () => {
    const bren = teams.find((t) => t.name === 'AP.Bren')
    const pinkman = bren!.roster.find((p) => p.handle === 'JMPINKMAN')
    expect(pinkman?.country).toBeNull()
  })

  it('never repeats a player within one roster', () => {
    for (const t of teams) {
      const handles = t.roster.map((p) => p.handle)
      expect(new Set(handles).size).toBe(handles.length)
    }
  })

  it('returns an empty array for wikitext with no participants', () => {
    expect(
      parseLeagueTeams('{{Infobox league|name=Nothing}}', 'philippines'),
    ).toEqual([])
  })
})
