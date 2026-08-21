import { describe, it, expect, vi } from 'vitest'
import { createLiquipediaClient, PARSE_MIN_INTERVAL_MS } from './client'
import { isOk } from '../source'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function deps(fetchImpl: typeof fetch) {
  let clock = 0
  return {
    fetch: fetchImpl,
    now: () => clock,
    sleep: vi.fn(async (ms: number) => {
      clock += ms
    }),
  }
}

describe('liquipedia client', () => {
  it('sends the mandatory User-Agent and gzip header', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ parse: { text: { '*': '<p>hi</p>' } } }),
    ) as unknown as typeof fetch
    const d = deps(fetchMock)
    const client = createLiquipediaClient(d)

    await client.parsePage('Liquipedia:Matches', 'text')

    const [, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    const headers = init.headers as Record<string, string>
    expect(headers['User-Agent']).toMatch(/^MLBBHub\/1\.0 \(.+;.+\)$/)
    expect(headers['Accept-Encoding']).toBe('gzip')
  })

  it('returns the parsed html on success', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ parse: { text: { '*': '<div class="match-info"></div>' } } }),
    ) as unknown as typeof fetch
    const client = createLiquipediaClient(deps(fetchMock))

    const r = await client.parsePage('Liquipedia:Matches', 'text')

    expect(isOk(r)).toBe(true)
    if (isOk(r)) expect(r.value).toContain('match-info')
  })

  it('waits at least 30 seconds between consecutive parse requests', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ parse: { text: { '*': 'x' } } }),
    ) as unknown as typeof fetch
    const d = deps(fetchMock)
    const client = createLiquipediaClient(d)

    await client.parsePage('A', 'text')
    await client.parsePage('B', 'text')

    expect(d.sleep).toHaveBeenCalledTimes(1)
    expect(d.sleep.mock.calls[0][0]).toBeGreaterThanOrEqual(PARSE_MIN_INTERVAL_MS)
  })

  it('does not sleep before the very first request', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ parse: { text: { '*': 'x' } } }),
    ) as unknown as typeof fetch
    const d = deps(fetchMock)

    await createLiquipediaClient(d).parsePage('A', 'text')

    expect(d.sleep).not.toHaveBeenCalled()
  })

  it('reports an error for a non-200 response', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('nope', { status: 406 }),
    ) as unknown as typeof fetch
    const client = createLiquipediaClient(deps(fetchMock))

    const r = await client.parsePage('A', 'text')

    expect(isOk(r)).toBe(false)
    if (!isOk(r)) expect(r.error).toContain('406')
  })

  it('reports an error when the wiki returns an api error', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { info: 'The page you specified does not exist.' } }),
    ) as unknown as typeof fetch
    const client = createLiquipediaClient(deps(fetchMock))

    const r = await client.parsePage('Nope', 'text')

    expect(isOk(r)).toBe(false)
    if (!isOk(r)) expect(r.error).toContain('does not exist')
  })
})
