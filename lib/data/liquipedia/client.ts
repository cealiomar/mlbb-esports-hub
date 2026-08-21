import { err, ok } from '../source'
import type { Result } from '../types'

export const API_BASE = 'https://liquipedia.net/mobilelegends/api.php'

/** Liquipedia's terms: action=parse is capped at 1 request per 30 seconds. */
export const PARSE_MIN_INTERVAL_MS = 30_000

export const USER_AGENT =
  'MLBBHub/1.0 (https://github.com/mlbb-hub/mlbb-hub; cealiomar.work@gmail.com)'

export interface ClientDeps {
  fetch: typeof fetch
  now: () => number
  sleep: (ms: number) => Promise<void>
}

export interface LiquipediaClient {
  parsePage(page: string, prop: 'text' | 'wikitext'): Promise<Result<string>>
}

interface ParseResponse {
  error?: { info?: string }
  parse?: {
    text?: { '*'?: string }
    wikitext?: { '*'?: string }
  }
}

export function createLiquipediaClient(deps: ClientDeps): LiquipediaClient {
  let lastParseAt: number | null = null

  async function parsePage(
    page: string,
    prop: 'text' | 'wikitext',
  ): Promise<Result<string>> {
    if (lastParseAt !== null) {
      const elapsed = deps.now() - lastParseAt
      const remaining = PARSE_MIN_INTERVAL_MS - elapsed
      if (remaining > 0) await deps.sleep(remaining)
    }
    lastParseAt = deps.now()

    const url = new URL(API_BASE)
    url.searchParams.set('action', 'parse')
    url.searchParams.set('page', page)
    url.searchParams.set('format', 'json')
    url.searchParams.set('prop', prop)

    let response: Response
    try {
      response = await deps.fetch(url.toString(), {
        headers: {
          'User-Agent': USER_AGENT,
          // Mandatory. Liquipedia answers 406 without it.
          'Accept-Encoding': 'gzip',
        },
      })
    } catch (cause) {
      return err(`network failure fetching ${page}: ${String(cause)}`)
    }

    if (!response.ok) {
      return err(`liquipedia returned HTTP ${response.status} for ${page}`)
    }

    const body = (await response.json()) as ParseResponse
    if (body.error) {
      return err(body.error.info ?? `unknown api error for ${page}`)
    }

    const content =
      prop === 'text' ? body.parse?.text?.['*'] : body.parse?.wikitext?.['*']
    if (!content) return err(`empty ${prop} payload for ${page}`)

    return ok(content)
  }

  return { parsePage }
}
