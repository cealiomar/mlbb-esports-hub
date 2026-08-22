import type { Match, MatchOpponent } from './types'

const MISSING_PAGE_SUFFIX = /\s*\(page does not exist\)\s*$/i
const REDLINK_PREFIX = 'index.php?title='

/**
 * Liquipedia uses the generic MLBB mark when a team has no crest. Showing it
 * as the team's identity is misleading, so these URLs deliberately fall back
 * to the team's own monogram instead.
 */
export function isGenericTeamLogo(url: string | null): boolean {
  return Boolean(url && /Mobile_Legends_(?:\d{4}_)?allmode/i.test(url))
}

export function normalizeOpponent(opponent: MatchOpponent): MatchOpponent {
  return {
    ...opponent,
    name: opponent.name.replace(MISSING_PAGE_SUFFIX, '').trim(),
    pageSlug: opponent.pageSlug.startsWith(REDLINK_PREFIX)
      ? ''
      : opponent.pageSlug,
    logoUrl: isGenericTeamLogo(opponent.logoUrl) ? null : opponent.logoUrl,
  }
}

/** Keeps committed legacy snapshots compatible with the latest parser. */
export function normalizeMatch(match: Match): Match {
  return {
    ...match,
    opponents: match.opponents.map(normalizeOpponent) as Match['opponents'],
    vodUrls: match.vodUrls ?? [],
  }
}
