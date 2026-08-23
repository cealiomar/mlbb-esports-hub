import { err, ok } from '../source'
import type { Result } from '../types'

export const API_BASE = 'https://liquipedia.net/mobilelegends/api.php'

/** Liquipedia's terms: action=parse is capped at 1 request per 30 seconds. */
export const PARSE_MIN_INTERVAL_MS = 30_000
export const MAX_PARSE_ATTEMPTS = 3

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

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

  async function waitForParseSlot(): Promise<void> {
    if (lastParseAt !== null) {
      const elapsed = deps.now() - lastParseAt
      const remaining = PARSE_MIN_INTERVAL_MS - elapsed
      if (remaining > 0) await deps.sleep(remaining)
    }
    lastParseAt = deps.now()
  }

  function retryAfterMs(response?: Response): number {
    const value = response?.headers.get('retry-after')
    if (!value) return PARSE_MIN_INTERVAL_MS

    const seconds = Number(value)
    if (Number.isFinite(seconds)) {
      return Math.max(PARSE_MIN_INTERVAL_MS, seconds * 1000)
    }

    const retryAt = Date.parse(value)
    if (!Number.isNaN(retryAt)) {
      return Math.max(PARSE_MIN_INTERVAL_MS, retryAt - deps.now())
    }

    return PARSE_MIN_INTERVAL_MS
  }

  async function waitBeforeRetry(response?: Response): Promise<void> {
    await deps.sleep(retryAfterMs(response))
    // The retry delay already satisfies Liquipedia's parse-request interval.
    lastParseAt = deps.now() - PARSE_MIN_INTERVAL_MS
  }

  async function parsePage(
    page: string,
    prop: 'text' | 'wikitext',
  ): Promise<Result<string>> {
    const url = new URL(API_BASE)
    url.searchParams.set('action', 'parse')
    url.searchParams.set('page', page)
    url.searchParams.set('format', 'json')
    url.searchParams.set('prop', prop)

    for (let attempt = 1; attempt <= MAX_PARSE_ATTEMPTS; attempt += 1) {
      await waitForParseSlot()

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
        if (attempt < MAX_PARSE_ATTEMPTS) {
          await waitBeforeRetry()
          continue
        }
        return err(`network failure fetching ${page}: ${String(cause)}`)
      }

      if (!response.ok) {
        if (
          RETRYABLE_STATUS_CODES.has(response.status) &&
          attempt < MAX_PARSE_ATTEMPTS
        ) {
          await waitBeforeRetry(response)
          continue
        }
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

    return err(`liquipedia request attempts exhausted for ${page}`)
  }

  return { parsePage }
}
