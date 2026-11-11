import type { Player } from '../types'

/**
 * What a player's own Liquipedia page says about them — only the fields
 * needed to decide whether its portrait may be shown beside a roster entry.
 */
export interface PlayerPage {
  id: string | null
  /** File name from the infobox, without the `File:` prefix. */
  image: string | null
  country: string | null
  isDisambiguation: boolean
  isRedirect: boolean
}

function infoboxField(wikitext: string, key: string): string | null {
  const match = wikitext.match(
    new RegExp(`\\|\\s*${key}\\s*=[ \\t]*([^\\n|}]*)`, 'i'),
  )
  const value = match?.[1]?.replace(/<!--.*?-->/g, '').trim()
  return value ? value : null
}

export function parsePlayerPage(wikitext: string): PlayerPage {
  const head = wikitext.trimStart().slice(0, 200).toLowerCase()
  return {
    id: infoboxField(wikitext, 'id'),
    image: infoboxField(wikitext, 'image'),
    country: infoboxField(wikitext, 'country'),
    isDisambiguation: /\{\{\s*disambig/.test(head),
    isRedirect: head.startsWith('#redirect'),
  }
}

/** Roster entries carry ISO-style codes; infoboxes carry country names. */
const COUNTRY_NAMES: Record<string, string> = {
  ae: 'united arab emirates',
  bh: 'bahrain',
  dz: 'algeria',
  eg: 'egypt',
  id: 'indonesia',
  iq: 'iraq',
  jo: 'jordan',
  kh: 'cambodia',
  kw: 'kuwait',
  lb: 'lebanon',
  ly: 'libya',
  ma: 'morocco',
  mm: 'myanmar',
  my: 'malaysia',
  om: 'oman',
  ph: 'philippines',
  ps: 'palestine',
  qa: 'qatar',
  sa: 'saudi arabia',
  sd: 'sudan',
  sg: 'singapore',
  sy: 'syria',
  tn: 'tunisia',
  tr: 'turkey',
  uk: 'united kingdom',
  ye: 'yemen',
}

function sameHandle(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * The portrait file for a roster entry, or null when the page cannot be
 * tied to that person.
 *
 * Handles collide across regions: "Sanz" at a MENA club redirects to the
 * Indonesian "S A N Z", and "King" is a disambiguation page. Showing the
 * wrong face beside a name is worse than showing none, so every doubt
 * resolves to null:
 *
 *  - a redirect or disambiguation page is never this player;
 *  - the infobox id must be the handle itself, not a look-alike;
 *  - when both sides state a country, they must agree.
 */
export function playerPhotoFile(
  player: Pick<Player, 'handle' | 'country'>,
  page: PlayerPage,
): string | null {
  if (page.isRedirect || page.isDisambiguation) return null
  if (!page.image || !page.id) return null
  if (!sameHandle(page.id, player.handle)) return null

  const rosterCountry = player.country
    ? COUNTRY_NAMES[player.country.toLowerCase()]
    : undefined
  if (rosterCountry && page.country) {
    if (rosterCountry !== page.country.trim().toLowerCase()) return null
  }

  return page.image
}
