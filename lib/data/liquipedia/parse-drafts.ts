import { parse, type HTMLElement } from 'node-html-parser'
import type {
  DraftGame,
  DraftHero,
  DraftLeague,
  DraftSeries,
  DraftTeam,
  HeroDraftStat,
} from '@/lib/data/types'

const WIKI_ORIGIN = 'https://liquipedia.net'

export interface DraftContext {
  regionSlug: string
  leagueName: string
  leaguePageSlug: string
}

function isTemplateBoundary(char: string | undefined): boolean {
  return char === undefined || char === '|' || char === '}' || /\s/.test(char)
}

/** Extract balanced templates so nested Map and TeamOpponent data stays intact. */
function extractTemplates(source: string, name: string): string[] {
  const opener = `{{${name}`
  const blocks: string[] = []
  let cursor = source.indexOf(opener)

  while (cursor !== -1) {
    if (!isTemplateBoundary(source[cursor + opener.length])) {
      cursor = source.indexOf(opener, cursor + opener.length)
      continue
    }

    let depth = 0
    let index = cursor
    while (index < source.length) {
      if (source.startsWith('{{', index)) {
        depth += 1
        index += 2
      } else if (source.startsWith('}}', index)) {
        depth -= 1
        index += 2
        if (depth === 0) break
      } else {
        index += 1
      }
    }

    if (depth !== 0) break
    blocks.push(source.slice(cursor + opener.length, index - 2))
    cursor = source.indexOf(opener, index)
  }

  return blocks
}

function splitParams(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let linkDepth = 0
  let current = ''

  for (let index = 0; index < body.length; index += 1) {
    if (body.startsWith('{{', index)) {
      depth += 1
      current += '{{'
      index += 1
    } else if (body.startsWith('}}', index)) {
      depth -= 1
      current += '}}'
      index += 1
    } else if (body.startsWith('[[', index)) {
      linkDepth += 1
      current += '[['
      index += 1
    } else if (body.startsWith(']]', index)) {
      linkDepth = Math.max(0, linkDepth - 1)
      current += ']]'
      index += 1
    } else if (body[index] === '|' && depth === 0 && linkDepth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += body[index]
    }
  }
  parts.push(current)
  return parts
}

function clean(value: string): string {
  return value.replace(/<!--[\s\S]*?-->/g, '').trim()
}

function namedParam(params: string[], key: string): string | null {
  const prefix = `${key.toLowerCase()}=`
  for (const raw of params) {
    const param = clean(raw)
    if (!param.toLowerCase().startsWith(prefix)) continue
    const value = clean(param.slice(prefix.length))
    return value || null
  }
  return null
}

function firstPositional(params: string[]): string | null {
  for (const raw of params) {
    const value = clean(raw)
    if (value && !value.includes('=')) return value
  }
  return null
}

function titleCase(value: string): string {
  return value
    .split(/([\s-]+)/)
    .map((part) =>
      /^[\s-]+$/.test(part)
        ? part
        : `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    )
    .join('')
}

function hero(value: string | null): DraftHero | null {
  if (!value) return null
  const id = value
    .replace(/<[^>]+>/g, '')
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  if (!id) return null

  return {
    id,
    name: titleCase(id),
    pageSlug: id.replace(/\s+/g, '_'),
  }
}

function heroList(params: string[], prefix: string): DraftHero[] {
  return Array.from({ length: 5 }, (_, index) =>
    hero(namedParam(params, `${prefix}${index + 1}`)),
  ).filter((item): item is DraftHero => item !== null)
}

function teamFromTemplate(body: string): DraftTeam | null {
  const name = firstPositional(splitParams(body))
  if (!name) return null
  return { name, pageSlug: name.replace(/\s+/g, '_') }
}

function durationSeconds(value: string | null): number | null {
  const match = value?.match(/^(\d{1,2}):(\d{2})$/)
  return match
    ? Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10)
    : null
}

function side(value: string | null): 'blue' | 'red' | null {
  const normalised = value?.toLowerCase()
  return normalised === 'blue' || normalised === 'red' ? normalised : null
}

function winner(value: string | null): 1 | 2 | null {
  return value === '1' ? 1 : value === '2' ? 2 : null
}

function plainText(value: string | null): string | null {
  if (!value) return null
  const text = value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return text || null
}

function draftMapName(value: string | null): string | null {
  const text = plainText(value)
  if (!text) return null
  const match = text.match(
    /\b(Broken Walls|Dangerous Grass|Expanding Rivers|Flying Cloud)\b/i,
  )
  return match ? titleCase(match[1].toLowerCase()) : null
}

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

function calendarDate(value: string | null): string | null {
  const match = value?.match(/\b([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\b/)
  if (!match) return null
  const month = MONTHS[match[1].toLowerCase()]
  if (!month) return null
  return `${match[3]}-${String(month).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}`
}

function stageName(pageSlug: string): string | null {
  const segment = pageSlug.split('/').filter(Boolean).at(-1)
  return segment ? segment.replaceAll('_', ' ') : null
}

interface MatchCandidate {
  body: string
  roundLabel: string | null
}

function matchCandidates(wikitext: string): MatchCandidate[] {
  const grouped = extractTemplates(wikitext, 'Matchlist').flatMap((body) => {
    const params = splitParams(body)
    const roundLabel = plainText(namedParam(params, 'title'))
    return extractTemplates(body, 'Match').map((matchBody) => ({
      body: matchBody,
      roundLabel,
    }))
  })

  if (grouped.length > 0) return grouped
  return extractTemplates(wikitext, 'Match').map((body) => ({
    body,
    roundLabel: null,
  }))
}

function readGame(body: string, number: number): DraftGame | null {
  const params = splitParams(body)
  const team1Picks = heroList(params, 't1h')
  const team2Picks = heroList(params, 't2h')
  const team1Bans = heroList(params, 't1b')
  const team2Bans = heroList(params, 't2b')

  if (
    team1Picks.length === 0 &&
    team2Picks.length === 0 &&
    team1Bans.length === 0 &&
    team2Bans.length === 0
  ) {
    return null
  }

  return {
    number,
    winner: winner(namedParam(params, 'winner')),
    durationSeconds: durationSeconds(namedParam(params, 'length')),
    mapName: draftMapName(namedParam(params, 'comment')),
    vodUrl: namedParam(params, 'vod'),
    team1Side: side(namedParam(params, 'team1side')),
    team2Side: side(namedParam(params, 'team2side')),
    team1Picks,
    team2Picks,
    team1Bans,
    team2Bans,
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseDraftSeries(
  wikitext: string,
  context: DraftContext,
): DraftSeries[] {
  return matchCandidates(wikitext)
    .map(({ body: matchBody, roundLabel }, index): DraftSeries | null => {
      const teams = extractTemplates(matchBody, 'TeamOpponent')
        .slice(0, 2)
        .map(teamFromTemplate)
      if (!teams[0] || !teams[1]) return null

      const games = extractTemplates(matchBody, 'Map')
        .map((mapBody, gameIndex) => readGame(mapBody, gameIndex + 1))
        .filter((game): game is DraftGame => game !== null)
      if (games.length === 0) return null

      const params = splitParams(matchBody)
      const team1Score = games.filter((game) => game.winner === 1).length
      const team2Score = games.filter((game) => game.winner === 2).length
      return {
        id: `${slug(context.leaguePageSlug)}-${slug(teams[0].name)}-${slug(teams[1].name)}-${index + 1}`,
        regionSlug: context.regionSlug,
        leagueName: context.leagueName,
        tournamentPageSlug: context.leaguePageSlug,
        playedOn: calendarDate(namedParam(params, 'date')),
        startsAt: null,
        roundLabel,
        stageName: stageName(context.leaguePageSlug),
        team1: teams[0],
        team2: teams[1],
        team1Score,
        team2Score,
        winner:
          team1Score === team2Score ? null : team1Score > team2Score ? 1 : 2,
        mvp: plainText(namedParam(params, 'mvp')),
        games,
      }
    })
    .filter((series): series is DraftSeries => series !== null)
}

function number(value: string): number {
  const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function pageSlugFromHref(href: string | undefined): string {
  if (!href?.startsWith('/mobilelegends/')) return ''
  return decodeURIComponent(href.slice('/mobilelegends/'.length).split('#')[0])
}

function absoluteUrl(src: string | undefined): string | null {
  if (!src) return null
  return src.startsWith('http') ? src : `${WIKI_ORIGIN}${src}`
}

function bestImageSource(image: HTMLElement | null): string | null {
  if (!image) return null
  const candidates = image
    .getAttribute('srcset')
    ?.split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean)
  return absoluteUrl(candidates?.at(-1) ?? image.getAttribute('src'))
}

function readHeroStat(row: HTMLElement): HeroDraftStat | null {
  const cells = row.querySelectorAll(':scope > td')
  if (cells.length < 19) return null
  const heroLink = cells[1].querySelector('a[title]')
  const name = heroLink?.getAttribute('title')?.trim() ?? ''
  if (!name) return null

  return {
    hero: {
      id: name.toLowerCase(),
      name,
      pageSlug: pageSlugFromHref(heroLink?.getAttribute('href')),
    },
    imageUrl: bestImageSource(cells[1].querySelector('img')),
    picks: number(cells[2].text),
    pickWins: number(cells[3].text),
    pickLosses: number(cells[4].text),
    pickRate: number(cells[6].text),
    bans: number(cells[15].text),
    banRate: number(cells[16].text),
    presence: number(cells[17].text),
    presenceRate: number(cells[18].text),
  }
}

export function parseDraftSummary(
  html: string,
  context: DraftContext,
): DraftLeague {
  const root = parse(html)
  const heroStats = root
    .querySelectorAll('.character-stats-row')
    .map(readHeroStat)
    .filter((stat): stat is HeroDraftStat => stat !== null)
  const gamesText = root
    .querySelectorAll('th')
    .map((heading) => heading.text.replace(/\s+/g, ' ').trim())
    .find((text) => /\d+\s+games?\s+played/i.test(text))
  const gamesAnalyzed = number(gamesText ?? '')

  return {
    regionSlug: context.regionSlug,
    leagueName: context.leagueName,
    leaguePageSlug: context.leaguePageSlug,
    gamesAnalyzed,
    heroStats,
    series: [],
  }
}
