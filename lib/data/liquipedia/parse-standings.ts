import { parse, type HTMLElement } from 'node-html-parser'
import type {
  StandingRow,
  StandingTable,
  StandingZone,
} from '@/lib/data/types'

const WIKI_ORIGIN = 'https://liquipedia.net'
const PAGE_PREFIX = '/mobilelegends/'

export interface StandingsContext {
  regionSlug: string
  leagueName: string
  leaguePageSlug: string
}

function pageSlugFromHref(href: string | undefined): string {
  if (!href || !href.startsWith(PAGE_PREFIX)) return ''
  return decodeURIComponent(href.slice(PAGE_PREFIX.length).split('#')[0])
}

function absoluteUrl(src: string | undefined): string | null {
  if (!src) return null
  return src.startsWith('http') ? src : `${WIKI_ORIGIN}${src}`
}

function codeFor(name: string): string {
  const parts = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase()
  return parts
    .slice(0, 3)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function parseRecord(value: string): [number | null, number | null] {
  const match = value.match(/(-?\d+)\s*[-–]\s*(-?\d+)/)
  if (!match) return [null, null]
  return [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10)]
}

function parseInteger(value: string): number | null {
  const match = value.match(/[+-]?\d+/)
  return match ? Number.parseInt(match[0], 10) : null
}

function zoneFor(positionCell: HTMLElement | null): StandingZone {
  if (!positionCell) return 'neutral'
  if (positionCell.classList.contains('bg-up')) return 'advance'
  if (positionCell.classList.contains('bg-stayup')) return 'playoff'
  if (
    positionCell.classList.contains('bg-down') ||
    positionCell.classList.contains('bg-staydown')
  ) {
    return 'eliminated'
  }
  return 'neutral'
}

function normaliseHeader(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function cleanTeamName(value: string): string {
  return value.replace(/\s*\(page does not exist\)\s*$/i, '').trim()
}

function headerIndex(headers: string[], names: string[]): number {
  return headers.findIndex((header) => names.includes(header))
}

function dataCell(
  cells: HTMLElement[],
  headerPosition: number,
): HTMLElement | null {
  // The first heading is the rank and is rendered as <th>; data cells start
  // at Team, so every remaining heading is offset by one.
  return headerPosition > 0 ? (cells[headerPosition - 1] ?? null) : null
}

function readRow(
  row: HTMLElement,
  headers: string[],
): StandingRow | null {
  const teamCell = row.querySelector('td.grouptableslot')
  if (!teamCell) return null

  const positionCell = row.querySelector('th')
  const position = parseInteger(positionCell?.text ?? '')
  const link = teamCell.querySelector('.team-template-text a')
  const name = cleanTeamName(
    link?.getAttribute('title')?.trim() ?? link?.text.trim() ?? '',
  )
  if (position === null || !name) return null

  const darkLogo = teamCell.querySelector('.team-template-darkmode img')
  const logo = darkLogo ?? teamCell.querySelector('img')
  const cells = row.querySelectorAll('td')
  const matchAt = headerIndex(headers, ['match', 'matches', 'series'])
  const gameAt = headerIndex(headers, ['game', 'games', 'map', 'maps'])
  const diffAt = headerIndex(headers, ['diff', 'difference', '+/-'])
  const pointsAt = headerIndex(headers, ['pts', 'points', 'point'])
  const [matchWins, matchLosses] = parseRecord(
    dataCell(cells, matchAt)?.text ?? '',
  )
  const [gameWins, gameLosses] = parseRecord(
    dataCell(cells, gameAt)?.text ?? '',
  )

  return {
    position,
    team: {
      code: codeFor(name),
      name,
      pageSlug: pageSlugFromHref(link?.getAttribute('href')),
      logoUrl: absoluteUrl(logo?.getAttribute('src')),
    },
    matchWins,
    matchLosses,
    gameWins,
    gameLosses,
    gameDiff: parseInteger(dataCell(cells, diffAt)?.text ?? ''),
    points: parseInteger(dataCell(cells, pointsAt)?.text ?? ''),
    zone: zoneFor(positionCell),
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseStandings(
  html: string,
  context: StandingsContext,
): StandingTable[] {
  const root = parse(html)

  return root
    .querySelectorAll('table')
    .map((table, index): StandingTable | null => {
      if (!table.querySelector('.grouptableslot')) return null

      const headerRow = table.querySelectorAll('tr').find((row) => {
        const labels = row.querySelectorAll('th').map((cell) =>
          normaliseHeader(cell.text),
        )
        return labels.includes('team') &&
          labels.some((label) => ['match', 'matches', 'series'].includes(label))
      })
      if (!headerRow) return null

      const headers = headerRow
        .querySelectorAll('th')
        .map((cell) => normaliseHeader(cell.text))
      const allRows = table.querySelectorAll('tr')
      const currentRows = allRows.filter(
        (row) => row.getAttribute('data-toggle-area-content') === '1',
      )
      const rows = (currentRows.length > 0 ? currentRows : allRows)
        .map((row) => readRow(row, headers))
        .filter((row): row is StandingRow => row !== null)
      if (rows.length < 2) return null

      const stageName =
        table.querySelector('th[colspan] > span')?.text.trim() ||
        context.leagueName
      const tableSlug = slug(stageName) || `table-${index + 1}`

      return {
        id: `${context.regionSlug}-${tableSlug}-${index + 1}`,
        regionSlug: context.regionSlug,
        leagueName: context.leagueName,
        leaguePageSlug: context.leaguePageSlug,
        stageName,
        rows,
      }
    })
    .filter((table): table is StandingTable => table !== null)
}
