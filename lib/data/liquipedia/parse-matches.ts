import { parse, type HTMLElement } from 'node-html-parser'
import { getRegions } from '@/lib/content/regions'
import type { Match, MatchOpponent, MatchStatus } from '../types'

const WIKI_ORIGIN = 'https://liquipedia.net'
const PAGE_PREFIX = '/mobilelegends/'

/** Longest prefixes first so more specific rules win. */
function regionIndex(): Array<{ prefix: string; slug: string }> {
  return getRegions()
    .flatMap((r) => r.matchPrefixes.map((prefix) => ({ prefix, slug: r.slug })))
    .sort((a, b) => b.prefix.length - a.prefix.length)
}

function resolveRegion(tournamentPageSlug: string): string | null {
  for (const { prefix, slug } of regionIndex()) {
    if (tournamentPageSlug.startsWith(prefix)) return slug
  }
  return null
}

function pageSlugFromHref(href: string | undefined): string {
  if (!href || !href.startsWith(PAGE_PREFIX)) return ''
  return decodeURIComponent(href.slice(PAGE_PREFIX.length).split('#')[0])
}

function absoluteUrl(src: string | undefined): string | null {
  if (!src) return null
  return src.startsWith('http') ? src : `${WIKI_ORIGIN}${src}`
}

function readOpponent(el: HTMLElement, score: number | null): MatchOpponent {
  const link = el.querySelector('span.name a')
  const dark = el.querySelector('.team-template-darkmode img')
  const img = dark ?? el.querySelector('img')

  return {
    code: link?.text.trim() ?? 'TBD',
    name: link?.getAttribute('title')?.trim() ?? link?.text.trim() ?? 'TBD',
    pageSlug: pageSlugFromHref(link?.getAttribute('href')),
    logoUrl: absoluteUrl(img?.getAttribute('src')),
    score,
    isWinner: el.classList.contains('match-info-header-winner'),
  }
}

function readScores(matchEl: HTMLElement): [number | null, number | null] {
  const upper = matchEl.querySelector('.match-info-header-scoreholder-upper')
  if (!upper) return [null, null]

  const cells = upper.querySelectorAll('.match-info-header-scoreholder-score')
  if (cells.length !== 2) return [null, null]

  const nums = cells.map((c) => Number.parseInt(c.text.trim(), 10))
  if (nums.some(Number.isNaN)) return [null, null]
  return [nums[0], nums[1]]
}

function readBestOf(matchEl: HTMLElement): number | null {
  const lower = matchEl.querySelector('.match-info-header-scoreholder-lower')
  const m = lower?.text.match(/Bo(\d+)/i)
  return m ? Number.parseInt(m[1], 10) : null
}

function buildId(
  startsAt: number,
  tournamentPageSlug: string,
  a: MatchOpponent,
  b: MatchOpponent,
): string {
  return `${startsAt}-${tournamentPageSlug}-${a.code}-${b.code}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function readMatch(matchEl: HTMLElement, area: MatchStatus): Match | null {
  const timer = matchEl.querySelector('.timer-object')
  const ts = Number.parseInt(timer?.getAttribute('data-timestamp') ?? '', 10)
  if (Number.isNaN(ts)) return null

  const opponentEls = matchEl.querySelectorAll('.match-info-header-opponent')
  if (opponentEls.length !== 2) return null

  const [scoreA, scoreB] = readScores(matchEl)
  const a = readOpponent(opponentEls[0], scoreA)
  const b = readOpponent(opponentEls[1], scoreB)

  const tournamentLink = matchEl.querySelector('.match-info-tournament-name a')
  const tournamentPageSlug = pageSlugFromHref(
    tournamentLink?.getAttribute('href'),
  )

  const streamUrls = matchEl
    .querySelectorAll('.match-info-links a')
    .map((el) => absoluteUrl(el.getAttribute('href')))
    .filter((u): u is string => u !== null)

  // Liquipedia lists a match in the "upcoming" area until it is decided, so a
  // fixture there that already carries a score is in progress, not pending.
  const status: MatchStatus =
    area === 'upcoming' && scoreA !== null ? 'live' : area

  return {
    id: buildId(ts, tournamentPageSlug, a, b),
    startsAt: ts,
    status,
    bestOf: readBestOf(matchEl),
    opponents: [a, b],
    tournamentName: tournamentLink?.text.trim() ?? '',
    tournamentPageSlug,
    regionSlug: resolveRegion(tournamentPageSlug),
    streamUrls,
  }
}

function collect(root: HTMLElement, area: '1' | '2', status: MatchStatus) {
  const section = root.querySelector(`[data-toggle-area-content="${area}"]`)
  if (!section) return []
  return section
    .querySelectorAll('.match-info')
    .map((el) => readMatch(el, status))
    .filter((m): m is Match => m !== null)
}

/**
 * Bracket placeholders ("TBD vs TBD" at the same time in the same playoff)
 * are genuinely indistinguishable by content, so identical ids get a suffix
 * to keep them stable and unique across parses.
 */
function disambiguate(matches: Match[]): Match[] {
  const seen = new Map<string, number>()
  return matches.map((match) => {
    const count = seen.get(match.id) ?? 0
    seen.set(match.id, count + 1)
    return count === 0 ? match : { ...match, id: `${match.id}-${count + 1}` }
  })
}

export function parseMatches(html: string): Match[] {
  const root = parse(html)
  return disambiguate([
    ...collect(root, '1', 'upcoming'),
    ...collect(root, '2', 'completed'),
  ])
}
