import type { Player, Team } from '../types'

/**
 * League pages nest participants three deep:
 *
 *   {{TeamParticipants
 *     |{{Opponent|AP.Bren
 *        |players={{Persons
 *           |{{Person|JMPINKMAN|role=exp}}
 *   ...
 *
 * Regexes cannot match balanced braces, so templates are extracted by
 * scanning for `{{` / `}}` pairs.
 */
/** `{{Persons` must not match a search for `{{Person`. */
function isTemplateBoundary(char: string | undefined): boolean {
  return char === undefined || char === '|' || char === '}' || /\s/.test(char)
}

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
    let i = cursor

    while (i < source.length) {
      if (source.startsWith('{{', i)) {
        depth++
        i += 2
      } else if (source.startsWith('}}', i)) {
        depth--
        i += 2
        if (depth === 0) break
      } else {
        i++
      }
    }

    if (depth !== 0) break // unbalanced source; stop rather than misparse
    blocks.push(source.slice(cursor + opener.length, i - 2))
    cursor = source.indexOf(opener, i)
  }

  return blocks
}

/** Splits a template body on top-level pipes only, ignoring nested templates. */
function splitParams(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''

  for (let i = 0; i < body.length; i++) {
    if (body.startsWith('{{', i)) {
      depth++
      current += '{{'
      i++
    } else if (body.startsWith('}}', i)) {
      depth--
      current += '}}'
      i++
    } else if (body[i] === '|' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += body[i]
    }
  }
  parts.push(current)
  return parts
}

function stripComments(value: string): string {
  return value.replace(/<!--[\s\S]*?-->/g, '')
}

function namedParam(params: string[], key: string): string | null {
  const prefix = `${key}=`
  for (const raw of params) {
    const param = raw.trim()
    if (param.toLowerCase().startsWith(prefix)) {
      const value = param.slice(prefix.length).trim()
      return value.length > 0 ? value : null
    }
  }
  return null
}

function firstPositional(params: string[]): string | null {
  for (const raw of params) {
    const param = stripComments(raw).trim()
    if (param.length === 0 || param.includes('=')) continue
    return param
  }
  return null
}

function readPlayers(opponentBody: string): Player[] {
  const seen = new Set<string>()
  const players: Player[] = []

  for (const personBody of extractTemplates(opponentBody, 'Person')) {
    const params = splitParams(personBody)

    // Coaches, analysts and managers are staff, not roster.
    if (namedParam(params, 'type') === 'staff') continue

    const handle = firstPositional(params)
    if (!handle || seen.has(handle)) continue
    seen.add(handle)

    players.push({
      handle,
      realName: namedParam(params, 'name'),
      role: namedParam(params, 'role'),
      country: namedParam(params, 'flag'),
    })
  }

  return players
}

export function parseLeagueTeams(
  wikitext: string,
  regionSlug: string,
): Team[] {
  const bySlug = new Map<string, Team>()

  for (const participantsBody of extractTemplates(
    wikitext,
    'TeamParticipants',
  )) {
    for (const opponentBody of extractTemplates(participantsBody, 'Opponent')) {
      const name = firstPositional(splitParams(opponentBody))
      if (!name) continue

      const pageSlug = name.replace(/\s+/g, '_')
      if (bySlug.has(pageSlug)) continue

      bySlug.set(pageSlug, {
        pageSlug,
        name,
        code: name,
        logoUrl: null,
        regionSlug,
        roster: readPlayers(opponentBody),
      })
    }
  }

  return [...bySlug.values()]
}
