import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMatches } from './parse-matches'
import type { Match } from '../types'

let matches: Match[]

beforeAll(() => {
  const html = readFileSync(
    join(__dirname, '__fixtures__', 'matches.html'),
    'utf8',
  )
  matches = parseMatches(html)
})

describe('parseMatches', () => {
  it('extracts every match block in the document', () => {
    expect(matches.length).toBeGreaterThan(50)
  })

  it('splits upcoming from completed by toggle area', () => {
    expect(matches.some((m) => m.status === 'upcoming')).toBe(true)
    expect(matches.some((m) => m.status === 'completed')).toBe(true)
  })

  it('reads start time from the unix timestamp attribute', () => {
    for (const m of matches) {
      expect(m.startsAt).toBeGreaterThan(1_600_000_000)
      expect(Number.isInteger(m.startsAt)).toBe(true)
    }
  })

  it('gives every match exactly two opponents', () => {
    for (const m of matches) {
      expect(m.opponents).toHaveLength(2)
    }
  })

  it('leaves scores null on upcoming matches', () => {
    const upcoming = matches.filter((m) => m.status === 'upcoming')
    for (const m of upcoming) {
      expect(m.opponents[0].score).toBeNull()
      expect(m.opponents[1].score).toBeNull()
    }
  })

  it('classifies a scored fixture in the upcoming area as live', () => {
    const live = matches.filter((m) => m.status === 'live')
    for (const m of live) {
      expect(m.opponents[0].score).not.toBeNull()
      expect(m.opponents[1].score).not.toBeNull()
    }
  })

  it('reads numeric scores on completed matches', () => {
    const completed = matches.filter((m) => m.status === 'completed')
    expect(completed.length).toBeGreaterThan(0)
    for (const m of completed) {
      expect(typeof m.opponents[0].score).toBe('number')
      expect(typeof m.opponents[1].score).toBe('number')
    }
  })

  it('marks exactly one winner on a decided match', () => {
    const decided = matches.filter(
      (m) =>
        m.status === 'completed' &&
        m.opponents[0].score !== m.opponents[1].score,
    )
    expect(decided.length).toBeGreaterThan(0)
    for (const m of decided) {
      const winners = m.opponents.filter((o) => o.isWinner)
      expect(winners).toHaveLength(1)
      const [a, b] = m.opponents
      const expected = (a.score ?? 0) > (b.score ?? 0) ? a : b
      expect(expected.isWinner).toBe(true)
    }
  })

  it('parses the best-of length', () => {
    const withBo = matches.filter((m) => m.bestOf !== null)
    expect(withBo.length).toBeGreaterThan(0)
    for (const m of withBo) {
      expect([1, 2, 3, 5, 7]).toContain(m.bestOf)
    }
  })

  it('captures tournament name and page slug', () => {
    for (const m of matches) {
      expect(m.tournamentName.length).toBeGreaterThan(0)
      expect(m.tournamentPageSlug.length).toBeGreaterThan(0)
    }
  })

  it('maps MPL Indonesia fixtures to the indonesia region', () => {
    const id = matches.filter((m) =>
      m.tournamentPageSlug.startsWith('MPL/Indonesia'),
    )
    expect(id.length).toBeGreaterThan(0)
    for (const m of id) expect(m.regionSlug).toBe('indonesia')
  })

  it('leaves regionSlug null for events outside the defined regions', () => {
    expect(matches.some((m) => m.regionSlug === null)).toBe(true)
  })

  it('builds absolute logo urls', () => {
    const withLogo = matches.flatMap((m) => m.opponents).filter((o) => o.logoUrl)
    expect(withLogo.length).toBeGreaterThan(0)
    for (const o of withLogo) {
      expect(o.logoUrl).toMatch(/^https:\/\/liquipedia\.net\//)
    }
  })

  it('does not present Liquipedia generic marks as team crests', () => {
    const genericFallback = matches
      .flatMap((m) => m.opponents)
      .find((opponent) => opponent.code === 'VGZ')

    expect(genericFallback).toMatchObject({
      name: 'Vie Gangz',
      pageSlug: '',
      logoUrl: null,
    })
  })

  it('keeps a real crest even when the team page is still a redlink', () => {
    const fantasticWarriors = matches
      .flatMap((m) => m.opponents)
      .find((opponent) => opponent.code === 'FW' && opponent.logoUrl)

    expect(fantasticWarriors?.name).toBe('Fantastic Warriors')
    expect(fantasticWarriors?.logoUrl).toContain('FW_allmode')
  })

  it('captures direct replay links for completed matches', () => {
    const withReplay = matches.filter((m) => (m.vodUrls?.length ?? 0) > 0)
    expect(withReplay.length).toBeGreaterThan(0)
    for (const match of withReplay) {
      expect(match.status).toBe('completed')
      for (const url of match.vodUrls ?? []) {
        expect(url).toMatch(/^https:\/\//)
      }
    }
  })

  it('gives every match a unique stable id', () => {
    const ids = matches.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is deterministic across repeated parses', () => {
    const html = readFileSync(
      join(__dirname, '__fixtures__', 'matches.html'),
      'utf8',
    )
    expect(parseMatches(html).map((m) => m.id)).toEqual(matches.map((m) => m.id))
  })
})
