import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  isTournamentWindowActive,
  parseStandings,
  parseTournamentWindow,
} from './parse-standings'
import type { StandingTable } from '../types'

let tables: StandingTable[]

beforeAll(() => {
  const html = readFileSync(
    join(__dirname, '__fixtures__', 'standings-ph.html'),
    'utf8',
  )
  tables = parseStandings(html, {
    regionSlug: 'philippines',
    leagueName: 'MPL Philippines',
    leaguePageSlug: 'MPL/Philippines/Season_18',
  })
})

describe('parseStandings', () => {
  it('finds the captured regular-season table', () => {
    expect(tables).toHaveLength(1)
    expect(tables[0].stageName).toBe('Regular Season')
    expect(tables[0].rows).toHaveLength(8)
  })

  it('reads team identity and the dark-mode crest', () => {
    const onic = tables[0].rows[0]
    expect(onic.team.name).toBe('ONIC Philippines')
    expect(onic.team.pageSlug).toBe('ONIC_Philippines')
    expect(onic.team.logoUrl).toContain('ONIC_Esports_2019_allmode')
  })

  it('reads match, game, difference and points records', () => {
    const onic = tables[0].rows[0]
    expect(onic).toMatchObject({
      position: 1,
      matchWins: 2,
      matchLosses: 0,
      gameWins: 4,
      gameLosses: 0,
      gameDiff: 4,
      points: 2,
    })
  })

  it('preserves qualification zones from Liquipedia', () => {
    expect(tables[0].rows[0].zone).toBe('advance')
    expect(tables[0].rows[2].zone).toBe('playoff')
    expect(tables[0].rows.at(-1)?.zone).toBe('eliminated')
  })

  it('ignores unrelated tables', () => {
    const result = parseStandings(
      '<table><tr><th>Prize</th></tr><tr><td>$100</td></tr></table>',
      {
        regionSlug: 'mena',
        leagueName: 'MPL MENA',
        leaguePageSlug: 'MPL/MENA/Season_9',
      },
    )
    expect(result).toEqual([])
  })

  it('uses only the current toggle area when older tables are embedded', () => {
    const html = readFileSync(
      join(__dirname, '__fixtures__', 'standings-ph.html'),
      'utf8',
    ).replaceAll('data-toggle-area-content="1"', 'data-toggle-area-content="2"')
    const combined = html.replace(
      '<tbody>',
      `<tbody>${readFileSync(
        join(__dirname, '__fixtures__', 'standings-ph.html'),
        'utf8',
      ).match(/<tbody>([\s\S]*)<\/tbody>/)?.[1] ?? ''}`,
    )

    const result = parseStandings(combined, {
      regionSlug: 'philippines',
      leagueName: 'MPL Philippines',
      leaguePageSlug: 'MPL/Philippines/Season_18',
    })

    expect(result[0].rows).toHaveLength(8)
    expect(new Set(result[0].rows.map((row) => row.team.name)).size).toBe(8)
  })
})

describe('tournament freshness', () => {
  const windowHtml = readFileSync(
    join(__dirname, '__fixtures__', 'tournament-window-mena.html'),
    'utf8',
  )

  it('reads the official start and end dates from the captured infobox', () => {
    expect(parseTournamentWindow(windowHtml)).toEqual({
      startAt: Date.parse('2026-04-10T00:00:00Z') / 1000,
      endAt: Date.parse('2026-05-22T23:59:59Z') / 1000,
    })
  })

  it('rejects a standings table after its tournament has ended', () => {
    const window = parseTournamentWindow(windowHtml)
    expect(
      isTournamentWindowActive(
        window,
        Date.parse('2026-08-23T00:00:00Z') / 1000,
      ),
    ).toBe(false)
  })

  it('falls back to match evidence when the page has no dates', () => {
    expect(isTournamentWindowActive(parseTournamentWindow('<main />'), 1)).toBeNull()
  })
})
