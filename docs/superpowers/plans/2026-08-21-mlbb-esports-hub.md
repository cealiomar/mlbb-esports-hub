# MLBB Esports Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual (AR/EN) Awwwards-calibre Mobile Legends esports site that shows **fixtures, who plays whom, and the schedule** — with results following behind. A 3D globe drives region navigation. Data is harvested automatically from Liquipedia.

**Architecture:** Fetching is fully decoupled from serving. An **hourly** GitHub Actions cron job runs a harvester that pulls the match ticker plus a few rotating league pages (respecting a hard 1-request-per-30-seconds ceiling on `action=parse`), normalises them to typed JSON, and commits them to `data/snapshots/`. The Next.js app reads only those committed files and never contacts Liquipedia at runtime, so visitor traffic has zero effect on API usage — and every page is fully static, so **nothing ever spins or loads in front of the user**.

**Primary content, in priority order:** schedule and fixtures → who plays whom → results → news. Results lagging by up to an hour is acceptable and expected; the site must never trade instant rendering for freshness.

**Tech Stack:** Next.js 15 (App Router, TypeScript strict), React Three Fiber + drei, GSAP, next-intl, Vitest, Playwright, Vercel, GitHub Actions.

## Global Constraints

These apply to every task. They are not optional and not negotiable.

- **Node 20+**, TypeScript `strict: true`, no `any` in committed code.
- **Liquipedia User-Agent is mandatory** and must be exactly:
  `MLBBHub/1.0 (https://github.com/<owner>/<repo>; cealiomar.work@gmail.com)`
  Generic agents (`node-fetch`, `undici`) are blocked by their edge.
- **`Accept-Encoding: gzip` is mandatory.** Requests without it return HTTP 406, not data.
- **`action=parse` is limited to 1 request per 30 seconds.** All other requests: 1 per 2 seconds.
- **Liquipedia's rendered HTML pages must never be scraped.** Only `api.php`.
- **Liquipedia attribution** (CC-BY-SA 3.0) with a link must appear on every page that displays its data.
- The app makes **zero** network calls to Liquipedia at request time. Ever.
- Design is **dark-only**. Do not write light-theme branches.
- Every user-facing string goes through next-intl. No hardcoded copy in components.
- Base API URL: `https://liquipedia.net/mobilelegends/api.php`
- **No loading states in the main flow.** Every content page is statically
  generated at build time. No skeletons, no spinners, no client-side data
  fetching for schedule content. The only deferred module is the globe, and it
  renders a complete, usable region list until it is ready — never a blank box.
- **Mobile-first.** Every layout is designed at 375px first and enhanced upward.
  No horizontal page scroll at any width. Tap targets ≥44px.
- **Team logos are a required design element**, not decoration. Every fixture
  shows both teams' crests. Missing logos degrade to a styled monogram, never to
  a broken image or an empty gap.

---

### Task 1: Project scaffold and region definitions

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`
- Create: `content/regions.json`
- Create: `lib/content/regions.ts`
- Test: `lib/content/regions.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `RegionDefinition` type and `getRegions(): RegionDefinition[]`, `getRegionBySlug(slug: string): RegionDefinition | undefined` from `lib/content/regions.ts`.

- [ ] **Step 1: Scaffold the app**

```bash
npx create-next-app@latest . --typescript --app --tailwind --eslint --src-dir=false --import-alias="@/*" --no-turbopack
npm install three @react-three/fiber @react-three/drei gsap next-intl
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @playwright/test
```

- [ ] **Step 2: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'e2e'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: Write the failing test**

Create `lib/content/regions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getRegions, getRegionBySlug } from './regions'

describe('regions', () => {
  it('defines all thirteen MLBB competitive regions', () => {
    expect(getRegions()).toHaveLength(13)
  })

  it('gives every region a unique slug', () => {
    const slugs = getRegions().map((r) => r.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('gives every region plottable coordinates', () => {
    for (const r of getRegions()) {
      expect(r.lat).toBeGreaterThanOrEqual(-90)
      expect(r.lat).toBeLessThanOrEqual(90)
      expect(r.lng).toBeGreaterThanOrEqual(-180)
      expect(r.lng).toBeLessThanOrEqual(180)
    }
  })

  it('gives every region a hex accent colour', () => {
    for (const r of getRegions()) {
      expect(r.accent).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('looks a region up by slug', () => {
    expect(getRegionBySlug('indonesia')?.name.en).toBe('Indonesia')
  })

  it('returns undefined for an unknown slug', () => {
    expect(getRegionBySlug('atlantis')).toBeUndefined()
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run lib/content/regions.test.ts`
Expected: FAIL — `Failed to resolve import "./regions"`.

- [ ] **Step 5: Create the region data**

Create `content/regions.json`. `liquipediaLeaguePage` is the exact wiki page title used by the harvester.

```json
[
  { "slug": "indonesia", "name": { "en": "Indonesia", "ar": "إندونيسيا" }, "lat": -6.2, "lng": 106.8, "accent": "#e23b3b", "liquipediaLeaguePage": "MPL/Indonesia/Season_18", "leagueName": "MPL Indonesia" },
  { "slug": "philippines", "name": { "en": "Philippines", "ar": "الفلبين" }, "lat": 14.6, "lng": 121.0, "accent": "#2f6fe0", "liquipediaLeaguePage": "MPL/Philippines/Season_18", "leagueName": "MPL Philippines" },
  { "slug": "malaysia", "name": { "en": "Malaysia", "ar": "ماليزيا" }, "lat": 3.14, "lng": 101.7, "accent": "#f0a828", "liquipediaLeaguePage": "MPL/Malaysia/Season_18", "leagueName": "MPL Malaysia" },
  { "slug": "singapore", "name": { "en": "Singapore", "ar": "سنغافورة" }, "lat": 1.35, "lng": 103.8, "accent": "#d84f7a", "liquipediaLeaguePage": "MPL/Singapore/Season_11", "leagueName": "MPL Singapore" },
  { "slug": "cambodia", "name": { "en": "Cambodia", "ar": "كمبوديا" }, "lat": 11.55, "lng": 104.9, "accent": "#3aa79a", "liquipediaLeaguePage": "MPL/Cambodia/Season_10", "leagueName": "MPL Cambodia" },
  { "slug": "mena", "name": { "en": "MENA", "ar": "الشرق الأوسط" }, "lat": 30.04, "lng": 31.24, "accent": "#c9a227", "liquipediaLeaguePage": "MPL/MENA/Season_10", "leagueName": "MPL MENA" },
  { "slug": "latam", "name": { "en": "Latin America", "ar": "أمريكا اللاتينية" }, "lat": 19.43, "lng": -99.13, "accent": "#6b4fd8", "liquipediaLeaguePage": "MPL/Latin_America/Season_10", "leagueName": "MPL LATAM" },
  { "slug": "myanmar", "name": { "en": "Myanmar", "ar": "ميانمار" }, "lat": 16.87, "lng": 96.2, "accent": "#e0693a", "liquipediaLeaguePage": "MLBB_Super_League/Myanmar/Season_2", "leagueName": "MSL Myanmar" },
  { "slug": "thailand", "name": { "en": "Thailand", "ar": "تايلاند" }, "lat": 13.75, "lng": 100.5, "accent": "#4fb0e0", "liquipediaLeaguePage": "MLBB_Super_League/Thailand/Season_2", "leagueName": "MSL Thailand" },
  { "slug": "vietnam", "name": { "en": "Vietnam", "ar": "فيتنام" }, "lat": 21.03, "lng": 105.85, "accent": "#d0342c", "liquipediaLeaguePage": "MDL/Vietnam/Season_5", "leagueName": "Vietnam Circuit" },
  { "slug": "turkiye", "name": { "en": "Türkiye", "ar": "تركيا" }, "lat": 41.01, "lng": 28.98, "accent": "#e03a3a", "liquipediaLeaguePage": "MPL/Turkey/Season_5", "leagueName": "MPL Türkiye" },
  { "slug": "cis", "name": { "en": "CIS", "ar": "رابطة الدول المستقلة" }, "lat": 55.75, "lng": 37.62, "accent": "#8a9bb0", "liquipediaLeaguePage": "BetBoom_Rise_of_Legends/Season_10", "leagueName": "Rise of Legends" },
  { "slug": "brazil", "name": { "en": "Brazil", "ar": "البرازيل" }, "lat": -23.55, "lng": -46.63, "accent": "#2fa84f", "liquipediaLeaguePage": "MPL/Brazil/Season_4", "leagueName": "MPL Brazil" }
]
```

- [ ] **Step 6: Implement the accessor**

Create `lib/content/regions.ts`:

```typescript
import raw from '@/content/regions.json'

export interface LocalisedName {
  en: string
  ar: string
}

export interface RegionDefinition {
  slug: string
  name: LocalisedName
  lat: number
  lng: number
  accent: string
  liquipediaLeaguePage: string
  leagueName: string
}

const regions = raw as RegionDefinition[]

export function getRegions(): RegionDefinition[] {
  return regions
}

export function getRegionBySlug(slug: string): RegionDefinition | undefined {
  return regions.find((r) => r.slug === slug)
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run lib/content/regions.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app and define MLBB competitive regions"
```

---

### Task 2: Domain types and the DataSource seam

**Files:**
- Create: `lib/data/types.ts`
- Create: `lib/data/source.ts`
- Test: `lib/data/source.test.ts`

**Interfaces:**
- Consumes: `RegionDefinition` from Task 1.
- Produces: types `Match`, `MatchOpponent`, `Team`, `Player`, `Article`, `Snapshot`, `Result<T>`; the `DataSource` interface; helpers `ok<T>(value: T): Result<T>` and `err<T>(message: string): Result<T>`.

This task creates the boundary every other task depends on. Nothing here touches the network.

- [ ] **Step 1: Write the failing test**

Create `lib/data/source.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ok, err, isOk } from './source'

describe('Result', () => {
  it('wraps a success value', () => {
    const r = ok(42)
    expect(isOk(r)).toBe(true)
    if (isOk(r)) expect(r.value).toBe(42)
  })

  it('wraps a failure with a message', () => {
    const r = err<number>('upstream exploded')
    expect(isOk(r)).toBe(false)
    if (!isOk(r)) expect(r.error).toBe('upstream exploded')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/data/source.test.ts`
Expected: FAIL — cannot resolve `./source`.

- [ ] **Step 3: Define the domain types**

Create `lib/data/types.ts`:

```typescript
export type MatchStatus = 'upcoming' | 'live' | 'completed'

export interface MatchOpponent {
  /** Short display code, e.g. "TLID". */
  code: string
  /** Full team name, e.g. "Team Liquid ID". */
  name: string
  /** Liquipedia page slug, e.g. "Team_Liquid_ID". Empty when the opponent is TBD. */
  pageSlug: string
  /** Absolute logo URL, or null when Liquipedia has no logo for the team. */
  logoUrl: string | null
  /** Maps won. Null for matches that have not been played. */
  score: number | null
  isWinner: boolean
}

export interface Match {
  /** Stable id derived from timestamp and both opponent codes. */
  id: string
  /** Unix seconds, UTC. */
  startsAt: number
  status: MatchStatus
  /** Best-of length parsed from "(Bo3)". Null when absent. */
  bestOf: number | null
  opponents: [MatchOpponent, MatchOpponent]
  tournamentName: string
  tournamentPageSlug: string
  /** Region slug from content/regions.json, or null for international events. */
  regionSlug: string | null
  streamUrls: string[]
}

export interface Player {
  handle: string
  realName: string | null
  role: string | null
  country: string | null
}

export interface Team {
  pageSlug: string
  name: string
  code: string
  logoUrl: string | null
  regionSlug: string | null
  roster: Player[]
}

export interface Article {
  id: string
  title: string
  excerpt: string
  url: string
  imageUrl: string | null
  publishedAt: number
  sourceName: string
}

export interface Snapshot<T> {
  /** Unix seconds when this snapshot was harvested. */
  harvestedAt: number
  data: T
}

export type Result<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'err'; readonly error: string }
```

- [ ] **Step 4: Define the seam**

Create `lib/data/source.ts`:

```typescript
import type { Article, Match, Result, Team } from './types'

export function ok<T>(value: T): Result<T> {
  return { kind: 'ok', value }
}

export function err<T>(error: string): Result<T> {
  return { kind: 'err', error }
}

export function isOk<T>(r: Result<T>): r is { kind: 'ok'; value: T } {
  return r.kind === 'ok'
}

/**
 * The only data contract the UI knows about. Swapping providers means
 * writing one new implementation of this interface and nothing else.
 */
export interface DataSource {
  getMatches(): Promise<Result<Match[]>>
  getTeamsByRegion(regionSlug: string): Promise<Result<Team[]>>
  getTeam(pageSlug: string): Promise<Result<Team>>
  getNews(): Promise<Result<Article[]>>
  /** Unix seconds of the newest data this source can serve, or null if unknown. */
  getFreshness(): Promise<number | null>
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/data/source.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: define domain types and DataSource interface"
```

---

### Task 3: Liquipedia HTTP client with rate limiting

**Files:**
- Create: `lib/data/liquipedia/client.ts`
- Test: `lib/data/liquipedia/client.test.ts`

**Interfaces:**
- Consumes: `Result`, `ok`, `err` from Task 2.
- Produces: `createLiquipediaClient(deps: ClientDeps): LiquipediaClient` where `LiquipediaClient` has `parsePage(page: string, prop: 'text' | 'wikitext'): Promise<Result<string>>`. `ClientDeps` is `{ fetch: typeof fetch; now: () => number; sleep: (ms: number) => Promise<void> }` — all injected so tests never touch the network or real time.

The 30-second spacing is enforced *inside* the client. No caller can accidentally violate it.

- [ ] **Step 1: Write the failing test**

Create `lib/data/liquipedia/client.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/data/liquipedia/client.test.ts`
Expected: FAIL — cannot resolve `./client`.

- [ ] **Step 3: Implement the client**

Create `lib/data/liquipedia/client.ts`:

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/data/liquipedia/client.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add rate-limited Liquipedia API client"
```

---

### Task 4: Match parser

**Files:**
- Create: `lib/data/liquipedia/parse-matches.ts`
- Create: `lib/data/liquipedia/__fixtures__/matches.html`
- Test: `lib/data/liquipedia/parse-matches.test.ts`

**Interfaces:**
- Consumes: `Match`, `MatchOpponent` from Task 2; `getRegions` from Task 1.
- Produces: `parseMatches(html: string): Match[]`.

The markup shape below was captured from the live API on 2026-08-21 and is exact. Do not guess at selectors.

Structure to parse:
- `[data-toggle-area-content="1"]` wraps upcoming matches, `[data-toggle-area-content="2"]` wraps completed ones.
- Each match is `div.match-info`.
- `span.timer-object[data-timestamp]` holds **unix seconds** — use it, never the human-readable text.
- Two `div.match-info-header-opponent` per match; the winner also carries `match-info-header-winner`.
- Inside each opponent, `span.name > a` gives the short code (link text) and `title` gives the full name; `href` is `/mobilelegends/<PageSlug>`.
- Logos appear twice, wrapped in `.team-template-lightmode` and `.team-template-darkmode`. Prefer the darkmode variant; fall back to any `img`.
- `span.match-info-header-scoreholder-upper` contains the literal text `vs` when unplayed, or two `span.match-info-header-scoreholder-score` children when played.
- `span.match-info-header-scoreholder-lower` contains `(Bo3)` / `(Bo5)`.
- `span.match-info-tournament-name > a` gives the tournament name and its `href`.

- [ ] **Step 1: Capture the fixture**

```bash
mkdir -p lib/data/liquipedia/__fixtures__
curl -sS --compressed \
  -A 'MLBBHub/1.0 (https://github.com/mlbb-hub/mlbb-hub; cealiomar.work@gmail.com)' \
  'https://liquipedia.net/mobilelegends/api.php?action=parse&page=Liquipedia:Matches&format=json&prop=text' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).parse.text["*"]))' \
  > lib/data/liquipedia/__fixtures__/matches.html
wc -c lib/data/liquipedia/__fixtures__/matches.html
```

Expected: roughly 380,000 bytes. This file is committed so tests never hit the network.

- [ ] **Step 2: Install the parser dependency**

```bash
npm install node-html-parser
```

- [ ] **Step 3: Write the failing test**

Create `lib/data/liquipedia/parse-matches.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMatches } from './parse-matches'
import type { Match } from '../types'

let matches: Match[]

beforeAll(() => {
  const html = readFileSync(
    join(__dirname, '__fixtures__', 'matches.html'),
    'utf8',
  )
  matches = parseMatches(html)
})

describe('parseMatches', () => {
  it('extracts every match block in the document', () => {
    expect(matches.length).toBeGreaterThan(50)
  })

  it('splits upcoming from completed by toggle area', () => {
    expect(matches.some((m) => m.status === 'upcoming')).toBe(true)
    expect(matches.some((m) => m.status === 'completed')).toBe(true)
  })

  it('reads start time from the unix timestamp attribute', () => {
    for (const m of matches) {
      expect(m.startsAt).toBeGreaterThan(1_600_000_000)
      expect(Number.isInteger(m.startsAt)).toBe(true)
    }
  })

  it('gives every match exactly two opponents', () => {
    for (const m of matches) {
      expect(m.opponents).toHaveLength(2)
    }
  })

  it('leaves scores null on upcoming matches', () => {
    const upcoming = matches.filter((m) => m.status === 'upcoming')
    for (const m of upcoming) {
      expect(m.opponents[0].score).toBeNull()
      expect(m.opponents[1].score).toBeNull()
    }
  })

  it('reads numeric scores on completed matches', () => {
    const completed = matches.filter((m) => m.status === 'completed')
    expect(completed.length).toBeGreaterThan(0)
    for (const m of completed) {
      expect(typeof m.opponents[0].score).toBe('number')
      expect(typeof m.opponents[1].score).toBe('number')
    }
  })

  it('marks exactly one winner on a decided match', () => {
    const decided = matches.filter(
      (m) =>
        m.status === 'completed' &&
        m.opponents[0].score !== m.opponents[1].score,
    )
    expect(decided.length).toBeGreaterThan(0)
    for (const m of decided) {
      const winners = m.opponents.filter((o) => o.isWinner)
      expect(winners).toHaveLength(1)
      const [a, b] = m.opponents
      const expected = (a.score ?? 0) > (b.score ?? 0) ? a : b
      expect(expected.isWinner).toBe(true)
    }
  })

  it('parses the best-of length', () => {
    const withBo = matches.filter((m) => m.bestOf !== null)
    expect(withBo.length).toBeGreaterThan(0)
    for (const m of withBo) {
      expect([1, 2, 3, 5, 7]).toContain(m.bestOf)
    }
  })

  it('captures tournament name and page slug', () => {
    for (const m of matches) {
      expect(m.tournamentName.length).toBeGreaterThan(0)
      expect(m.tournamentPageSlug.length).toBeGreaterThan(0)
    }
  })

  it('maps MPL Indonesia fixtures to the indonesia region', () => {
    const id = matches.filter((m) =>
      m.tournamentPageSlug.startsWith('MPL/Indonesia'),
    )
    expect(id.length).toBeGreaterThan(0)
    for (const m of id) expect(m.regionSlug).toBe('indonesia')
  })

  it('leaves regionSlug null for events outside the defined regions', () => {
    expect(matches.some((m) => m.regionSlug === null)).toBe(true)
  })

  it('builds absolute logo urls', () => {
    const withLogo = matches.flatMap((m) => m.opponents).filter((o) => o.logoUrl)
    expect(withLogo.length).toBeGreaterThan(0)
    for (const o of withLogo) {
      expect(o.logoUrl).toMatch(/^https:\/\/liquipedia\.net\//)
    }
  })

  it('gives every match a unique stable id', () => {
    const ids = matches.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is deterministic across repeated parses', () => {
    const html = readFileSync(
      join(__dirname, '__fixtures__', 'matches.html'),
      'utf8',
    )
    expect(parseMatches(html).map((m) => m.id)).toEqual(matches.map((m) => m.id))
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run lib/data/liquipedia/parse-matches.test.ts`
Expected: FAIL — cannot resolve `./parse-matches`.

- [ ] **Step 5: Implement the parser**

Create `lib/data/liquipedia/parse-matches.ts`:

```typescript
import { parse, type HTMLElement } from 'node-html-parser'
import { getRegions } from '@/lib/content/regions'
import type { Match, MatchOpponent, MatchStatus } from '../types'

const WIKI_ORIGIN = 'https://liquipedia.net'
const PAGE_PREFIX = '/mobilelegends/'

/** Longest league-page prefixes first so more specific rules win. */
function regionIndex(): Array<{ prefix: string; slug: string }> {
  return getRegions()
    .map((r) => ({
      // "MPL/Indonesia/Season_18" -> "MPL/Indonesia"
      prefix: r.liquipediaLeaguePage.split('/').slice(0, 2).join('/'),
      slug: r.slug,
    }))
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

function buildId(startsAt: number, a: MatchOpponent, b: MatchOpponent): string {
  return `${startsAt}-${a.code}-${b.code}`.toLowerCase().replace(/\s+/g, '')
}

function readMatch(matchEl: HTMLElement, status: MatchStatus): Match | null {
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

  return {
    id: buildId(ts, a, b),
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

export function parseMatches(html: string): Match[] {
  const root = parse(html)
  return [...collect(root, '1', 'upcoming'), ...collect(root, '2', 'completed')]
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run lib/data/liquipedia/parse-matches.test.ts`
Expected: PASS — 14 tests.

If `it('leaves regionSlug null…')` fails because every fixture match happens to map to a region, widen the fixture by re-capturing it on a day with international events, or assert on a hand-written minimal HTML string instead. Do not weaken the region mapping to make the test pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: parse Liquipedia match ticker into typed matches"
```

---

### Task 5: Snapshot store and the local DataSource

**Files:**
- Create: `lib/data/snapshots.ts`
- Create: `lib/data/local.ts`
- Create: `data/snapshots/.gitkeep`
- Create: `content/fallback/matches.json`
- Test: `lib/data/local.test.ts`

**Interfaces:**
- Consumes: `DataSource`, `Result`, `Snapshot`, `Match`, `Team`, `Article` from Task 2.
- Produces: `readSnapshot<T>(name: string): Snapshot<T> | null`, `writeSnapshot<T>(name: string, data: T): void` from `lib/data/snapshots.ts`; `createLocalDataSource(): DataSource` from `lib/data/local.ts`.

This is the source the app actually reads from. It resolves in order: committed snapshot, then bundled fallback.

- [ ] **Step 1: Seed the fallback data**

Create `content/fallback/matches.json` with real 2026 season fixtures so the site is never blank:

```json
{
  "harvestedAt": 1787289600,
  "data": [
    {
      "id": "1787295600-tlid-navi",
      "startsAt": 1787295600,
      "status": "upcoming",
      "bestOf": 3,
      "opponents": [
        { "code": "TLID", "name": "Team Liquid ID", "pageSlug": "Team_Liquid_ID", "logoUrl": null, "score": null, "isWinner": false },
        { "code": "NAVI", "name": "Natus Vincere", "pageSlug": "Natus_Vincere", "logoUrl": null, "score": null, "isWinner": false }
      ],
      "tournamentName": "MPL Indonesia Season 18 - RS: Week 2",
      "tournamentPageSlug": "MPL/Indonesia/Season_18/Regular_Season",
      "regionSlug": "indonesia",
      "streamUrls": []
    },
    {
      "id": "1787302800-rora-onph",
      "startsAt": 1787302800,
      "status": "upcoming",
      "bestOf": 3,
      "opponents": [
        { "code": "RORA", "name": "Aurora", "pageSlug": "Aurora", "logoUrl": null, "score": null, "isWinner": false },
        { "code": "ONPH", "name": "ONIC Philippines", "pageSlug": "ONIC_Philippines", "logoUrl": null, "score": null, "isWinner": false }
      ],
      "tournamentName": "MPL Philippines Season 18 - RS: Week 1",
      "tournamentPageSlug": "MPL/Philippines/Season_18/Regular_Season",
      "regionSlug": "philippines",
      "streamUrls": []
    }
  ]
}
```

- [ ] **Step 2: Write the failing test**

Create `lib/data/local.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createLocalDataSource } from './local'
import { isOk } from './source'

describe('local data source', () => {
  it('serves matches from the fallback when no snapshot exists', async () => {
    const source = createLocalDataSource({ snapshotDir: '/nonexistent' })
    const r = await source.getMatches()

    expect(isOk(r)).toBe(true)
    if (isOk(r)) {
      expect(r.value.length).toBeGreaterThan(0)
      expect(r.value[0].tournamentName).toContain('MPL')
    }
  })

  it('reports freshness from the fallback timestamp', async () => {
    const source = createLocalDataSource({ snapshotDir: '/nonexistent' })
    expect(await source.getFreshness()).toBeGreaterThan(1_600_000_000)
  })

  it('returns an empty list rather than failing when news is absent', async () => {
    const source = createLocalDataSource({ snapshotDir: '/nonexistent' })
    const r = await source.getNews()

    expect(isOk(r)).toBe(true)
    if (isOk(r)) expect(r.value).toEqual([])
  })

  it('filters teams by region slug', async () => {
    const source = createLocalDataSource({ snapshotDir: '/nonexistent' })
    const r = await source.getTeamsByRegion('indonesia')

    expect(isOk(r)).toBe(true)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run lib/data/local.test.ts`
Expected: FAIL — cannot resolve `./local`.

- [ ] **Step 4: Implement the snapshot store**

Create `lib/data/snapshots.ts`:

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Snapshot } from './types'

export const DEFAULT_SNAPSHOT_DIR = join(process.cwd(), 'data', 'snapshots')

export function readSnapshot<T>(
  name: string,
  dir: string = DEFAULT_SNAPSHOT_DIR,
): Snapshot<T> | null {
  const path = join(dir, `${name}.json`)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Snapshot<T>
  } catch {
    // A corrupt snapshot must degrade to the fallback, never crash a page.
    return null
  }
}

export function writeSnapshot<T>(
  name: string,
  data: T,
  dir: string = DEFAULT_SNAPSHOT_DIR,
): void {
  mkdirSync(dir, { recursive: true })
  const snapshot: Snapshot<T> = {
    harvestedAt: Math.floor(Date.now() / 1000),
    data,
  }
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(snapshot, null, 2))
}
```

- [ ] **Step 5: Implement the local DataSource**

Create `lib/data/local.ts`:

```typescript
import fallbackMatches from '@/content/fallback/matches.json'
import { readSnapshot, DEFAULT_SNAPSHOT_DIR } from './snapshots'
import { ok } from './source'
import type { DataSource } from './source'
import type { Article, Match, Result, Snapshot, Team } from './types'

export interface LocalOptions {
  snapshotDir?: string
}

function resolve<T>(name: string, dir: string, fallback: Snapshot<T> | null) {
  return readSnapshot<T>(name, dir) ?? fallback
}

export function createLocalDataSource(
  options: LocalOptions = {},
): DataSource {
  const dir = options.snapshotDir ?? DEFAULT_SNAPSHOT_DIR
  const matchFallback = fallbackMatches as unknown as Snapshot<Match[]>

  async function matches(): Promise<Snapshot<Match[]>> {
    return resolve<Match[]>('matches', dir, matchFallback) ?? {
      harvestedAt: 0,
      data: [],
    }
  }

  return {
    async getMatches(): Promise<Result<Match[]>> {
      return ok((await matches()).data)
    },

    async getTeamsByRegion(regionSlug: string): Promise<Result<Team[]>> {
      const snap = resolve<Team[]>('teams', dir, null)
      const all = snap?.data ?? []
      return ok(all.filter((t) => t.regionSlug === regionSlug))
    },

    async getTeam(pageSlug: string): Promise<Result<Team>> {
      const snap = resolve<Team[]>('teams', dir, null)
      const found = snap?.data.find((t) => t.pageSlug === pageSlug)
      if (!found) {
        return { kind: 'err', error: `no team snapshot for ${pageSlug}` }
      }
      return ok(found)
    },

    async getNews(): Promise<Result<Article[]>> {
      const snap = resolve<Article[]>('news', dir, null)
      return ok(snap?.data ?? [])
    },

    async getFreshness(): Promise<number | null> {
      return (await matches()).harvestedAt || null
    },
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run lib/data/local.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS — all tests from Tasks 1–5.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add snapshot store and local data source with fallback"
```

---

### Task 6: Harvester and scheduled workflow

**Files:**
- Create: `lib/data/liquipedia/queue.ts`
- Create: `scripts/harvest.ts`
- Create: `.github/workflows/harvest.yml`
- Test: `lib/data/liquipedia/queue.test.ts`

**Interfaces:**
- Consumes: `createLiquipediaClient` (Task 3), `parseMatches` (Task 4), `writeSnapshot` (Task 5), `getRegions` (Task 1).
- Produces: `LEAGUES_PER_RUN` and `queueEntriesForRun(regions: RegionDefinition[], runIndex: number, count?: number): QueueEntry[]` where `QueueEntry` is `{ kind: 'league'; page: string; regionSlug: string }`.

The job runs **hourly**. Each run fetches the matches page (always) plus `LEAGUES_PER_RUN = 3` rotating league pages — four `action=parse` calls, spaced 30s apart by the client, so about 90 seconds of waiting per run. That is trivial for a GitHub Actions runner and completes a full 13-region rotation in under five hours. Rosters change far slower than that.

- [ ] **Step 1: Write the failing test**

Create `lib/data/liquipedia/queue.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { queueEntriesForRun, LEAGUES_PER_RUN } from './queue'
import { getRegions } from '@/lib/content/regions'

describe('harvest queue', () => {
  it('returns LEAGUES_PER_RUN entries by default', () => {
    expect(queueEntriesForRun(getRegions(), 0)).toHaveLength(LEAGUES_PER_RUN)
  })

  it('starts at the first region on run zero', () => {
    const regions = getRegions()
    const [first] = queueEntriesForRun(regions, 0)
    expect(first.kind).toBe('league')
    expect(first.page).toBe(regions[0].liquipediaLeaguePage)
    expect(first.regionSlug).toBe(regions[0].slug)
  })

  it('advances by a whole batch each run', () => {
    const regions = getRegions()
    const [first] = queueEntriesForRun(regions, 1)
    expect(first.regionSlug).toBe(regions[LEAGUES_PER_RUN % regions.length].slug)
  })

  it('never repeats a region within one run', () => {
    const entries = queueEntriesForRun(getRegions(), 3)
    const slugs = entries.map((e) => e.regionSlug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('covers every region within a full rotation', () => {
    const regions = getRegions()
    const runs = Math.ceil(regions.length / LEAGUES_PER_RUN)
    const seen = new Set<string>()
    for (let i = 0; i < runs; i++) {
      for (const e of queueEntriesForRun(regions, i)) seen.add(e.regionSlug)
    }
    expect(seen.size).toBe(regions.length)
  })

  it('handles a run index far in the future', () => {
    const regions = getRegions()
    const entries = queueEntriesForRun(regions, 10_000)
    expect(entries).toHaveLength(LEAGUES_PER_RUN)
    for (const e of entries) {
      expect(regions.some((r) => r.slug === e.regionSlug)).toBe(true)
    }
  })

  it('caps the batch when fewer regions exist than the batch size', () => {
    const two = getRegions().slice(0, 2)
    expect(queueEntriesForRun(two, 0)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/data/liquipedia/queue.test.ts`
Expected: FAIL — cannot resolve `./queue`.

- [ ] **Step 3: Implement the queue**

Create `lib/data/liquipedia/queue.ts`:

```typescript
import type { RegionDefinition } from '@/lib/content/regions'

export interface QueueEntry {
  kind: 'league'
  page: string
  regionSlug: string
}

/** League pages fetched per hourly run, on top of the match ticker. */
export const LEAGUES_PER_RUN = 3

/**
 * Round-robins league pages in batches so every region refreshes within a few
 * hours at an hourly cadence. Rosters change far slower than that.
 */
export function queueEntriesForRun(
  regions: RegionDefinition[],
  runIndex: number,
  count: number = LEAGUES_PER_RUN,
): QueueEntry[] {
  const size = Math.min(count, regions.length)
  const start = (runIndex * size) % regions.length

  return Array.from({ length: size }, (_, offset) => {
    const region = regions[(start + offset) % regions.length]
    return {
      kind: 'league' as const,
      page: region.liquipediaLeaguePage,
      regionSlug: region.slug,
    }
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/data/liquipedia/queue.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Write the harvester script**

Create `scripts/harvest.ts`:

```typescript
import { setTimeout as delay } from 'node:timers/promises'
import { createLiquipediaClient } from '@/lib/data/liquipedia/client'
import { parseMatches } from '@/lib/data/liquipedia/parse-matches'
import { queueEntriesForRun } from '@/lib/data/liquipedia/queue'
import { writeSnapshot } from '@/lib/data/snapshots'
import { getRegions } from '@/lib/content/regions'
import { isOk } from '@/lib/data/source'

async function main(): Promise<void> {
  const runIndex = Number.parseInt(process.env.RUN_INDEX ?? '0', 10)

  const client = createLiquipediaClient({
    fetch: globalThis.fetch,
    now: () => Date.now(),
    sleep: (ms) => delay(ms),
  })

  // Always refresh the ticker: one call, every region's fixtures and results.
  const ticker = await client.parsePage('Liquipedia:Matches', 'text')
  if (!isOk(ticker)) {
    console.error(`matches harvest failed: ${ticker.error}`)
    process.exit(1)
  }

  const matches = parseMatches(ticker.value)
  if (matches.length === 0) {
    console.error('parsed zero matches — refusing to overwrite the snapshot')
    process.exit(1)
  }
  writeSnapshot('matches', matches)
  console.log(`wrote ${matches.length} matches`)

  // Then a batch of rotating league pages. The client enforces the 30s gap.
  for (const entry of queueEntriesForRun(getRegions(), runIndex)) {
    const league = await client.parsePage(entry.page, 'wikitext')
    if (!isOk(league)) {
      // A missing league page is not fatal — seasons start and end.
      console.warn(`league harvest skipped for ${entry.page}: ${league.error}`)
      continue
    }
    console.log(
      `fetched league page ${entry.page} (${league.value.length} chars)`,
    )
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
```

Note: this task writes the matches snapshot only. Team-roster extraction from the league wikitext is Task 10, which extends this script once the team pages exist to render.

- [ ] **Step 6: Add the run script**

```bash
npm install -D tsx
```

Add to `package.json` scripts: `"harvest": "tsx scripts/harvest.ts"`.

- [ ] **Step 7: Run the harvester once for real**

Run: `npm run harvest`
Expected: `wrote NNN matches` where NNN is greater than 50, then a league-page line. Confirm `data/snapshots/matches.json` now exists and contains today's fixtures.

- [ ] **Step 8: Create the workflow**

Create `.github/workflows/harvest.yml`:

```yaml
name: Harvest Liquipedia

on:
  schedule:
    # Hourly. Four action=parse calls per run, 30s apart — far inside
    # Liquipedia's 1-per-30s ceiling, and fresh enough for a schedule site.
    - cron: '0 * * * *'
  workflow_dispatch:

concurrency:
  group: harvest
  cancel-in-progress: false

jobs:
  harvest:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - run: npm ci

      - name: Harvest
        env:
          RUN_INDEX: ${{ github.run_number }}
        run: npm run harvest

      - name: Commit snapshots
        run: |
          git config user.name  "mlbb-hub-bot"
          git config user.email "bot@users.noreply.github.com"
          git add data/snapshots
          if git diff --staged --quiet; then
            echo "no data change"
          else
            git commit -m "chore: refresh Liquipedia snapshots [skip ci]"
            git push
          fi
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Liquipedia harvester and scheduled workflow"
```

---

### Task 7: Design system, localisation and app shell

**Files:**
- Create: `app/globals.css`, `app/layout.tsx`, `app/[locale]/layout.tsx`
- Create: `i18n/routing.ts`, `i18n/request.ts`, `middleware.ts`
- Create: `messages/en.json`, `messages/ar.json`
- Create: `components/ui/attribution.tsx`, `components/ui/freshness-badge.tsx`
- Test: `e2e/shell.spec.ts`

**Interfaces:**
- Consumes: `getFreshness` from the DataSource (Task 5).
- Produces: locale-aware layout at `/[locale]`, `<Attribution />`, `<FreshnessBadge harvestedAt={number | null} />`.

- [ ] **Step 1: Configure routing and messages**

Create `i18n/routing.ts`:

```typescript
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
})

export type Locale = (typeof routing.locales)[number]

export function isRtl(locale: string): boolean {
  return locale === 'ar'
}
```

Create `i18n/request.ts`:

```typescript
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = routing.locales.includes(requested as never)
    ? (requested as string)
    : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

Create `middleware.ts`:

```typescript
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/', '/(ar|en)/:path*'],
}
```

- [ ] **Step 2: Write the messages**

Create `messages/en.json`:

```json
{
  "nav": { "home": "Home", "regions": "Regions", "matches": "Matches", "news": "News" },
  "home": { "tagline": "Every region. Every match. One world.", "todayMatches": "Today's Matches", "latestNews": "Latest News", "exploreGlobe": "Explore the globe" },
  "matches": { "upcoming": "Upcoming", "completed": "Results", "today": "Today", "noMatches": "No matches scheduled", "versus": "vs", "bestOf": "Bo{count}" },
  "region": { "teams": "Teams", "fixtures": "Fixtures", "league": "League" },
  "team": { "roster": "Roster", "recentResults": "Recent Results", "role": "Role" },
  "data": { "attribution": "Match data from Liquipedia, licensed CC-BY-SA 3.0", "delayed": "Data delayed", "updated": "Updated {time}" }
}
```

Create `messages/ar.json`:

```json
{
  "nav": { "home": "الرئيسية", "regions": "الريجونز", "matches": "الماتشات", "news": "الأخبار" },
  "home": { "tagline": "كل ريجون. كل ماتش. عالم واحد.", "todayMatches": "ماتشات النهاردة", "latestNews": "آخر الأخبار", "exploreGlobe": "استكشف الكرة الأرضية" },
  "matches": { "upcoming": "قادمة", "completed": "النتائج", "today": "النهاردة", "noMatches": "مفيش ماتشات مجدولة", "versus": "ضد", "bestOf": "أفضل من {count}" },
  "region": { "teams": "الفرق", "fixtures": "المواعيد", "league": "الدوري" },
  "team": { "roster": "التشكيلة", "recentResults": "آخر النتائج", "role": "المركز" },
  "data": { "attribution": "بيانات الماتشات من Liquipedia برخصة CC-BY-SA 3.0", "delayed": "البيانات متأخرة", "updated": "آخر تحديث {time}" }
}
```

- [ ] **Step 3: Define design tokens**

Create `app/globals.css`:

```css
@import 'tailwindcss';

:root {
  --ground: #08080a;
  --surface: #121216;
  --surface-raised: #1b1b21;
  --ink: #f4f4f5;
  --ink-muted: #9a9aa4;
  --line: #2a2a32;

  /* Pulled from the MLBB logo. */
  --brand: #f5a623;
  --brand-hot: #ea6a1e;

  --step--1: clamp(0.82rem, 0.79rem + 0.15vw, 0.9rem);
  --step-0: clamp(1rem, 0.95rem + 0.25vw, 1.15rem);
  --step-3: clamp(2.2rem, 1.6rem + 3vw, 4rem);
  --step-5: clamp(3.4rem, 2rem + 7vw, 8.5rem);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-size: var(--step-0);
  -webkit-font-smoothing: antialiased;
}

.display {
  font-size: var(--step-5);
  line-height: 0.86;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  font-weight: 800;
}

[dir='rtl'] .display {
  letter-spacing: 0;
  text-transform: none;
}

.grain::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.035;
  z-index: 100;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Build the locale layout**

Create `app/[locale]/layout.tsx`:

```tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Anton, IBM_Plex_Sans_Arabic } from 'next/font/google'
import { routing, isRtl } from '@/i18n/routing'
import { Attribution } from '@/components/ui/attribution'
import '../globals.css'

const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-display' })
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600', '700'],
  variable: '--font-arabic',
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as never)) notFound()

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
      className={`${display.variable} ${arabic.variable}`}
    >
      <body className="grain">
        <NextIntlClientProvider messages={messages}>
          {children}
          <Attribution />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Build the attribution and freshness components**

Create `components/ui/attribution.tsx`:

```tsx
import { useTranslations } from 'next-intl'

export function Attribution() {
  const t = useTranslations('data')
  return (
    <footer className="border-t border-[var(--line)] px-6 py-8 text-[var(--ink-muted)]">
      <a
        href="https://liquipedia.net/mobilelegends"
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-4 hover:text-[var(--ink)]"
      >
        {t('attribution')}
      </a>
    </footer>
  )
}
```

Create `components/ui/freshness-badge.tsx`:

```tsx
import { useFormatter, useTranslations } from 'next-intl'

const STALE_AFTER_SECONDS = 3600

export function FreshnessBadge({ harvestedAt }: { harvestedAt: number | null }) {
  const t = useTranslations('data')
  const format = useFormatter()
  if (harvestedAt === null) return null

  const ageSeconds = Math.floor(Date.now() / 1000) - harvestedAt
  const stale = ageSeconds > STALE_AFTER_SECONDS

  return (
    <span
      className={`text-[var(--step--1)] ${stale ? 'text-[var(--brand-hot)]' : 'text-[var(--ink-muted)]'}`}
    >
      {stale
        ? t('delayed')
        : t('updated', {
            time: format.relativeTime(new Date(harvestedAt * 1000)),
          })}
    </span>
  )
}
```

- [ ] **Step 6: Write the smoke test**

Create `e2e/shell.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('english home renders left-to-right', async ({ page }) => {
  await page.goto('/en')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})

test('arabic home renders right-to-left', async ({ page }) => {
  await page.goto('/ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})

test('liquipedia attribution is present and links out', async ({ page }) => {
  await page.goto('/en')
  const link = page.getByRole('link', { name: /Liquipedia/i })
  await expect(link).toHaveAttribute(
    'href',
    'https://liquipedia.net/mobilelegends',
  )
})
```

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
```

- [ ] **Step 7: Run the smoke test**

Run: `npx playwright test e2e/shell.spec.ts`
Expected: PASS — 3 tests. A minimal `app/[locale]/page.tsx` returning a heading is enough for this to pass; Task 8 replaces it.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add design tokens, AR/EN localisation and app shell"
```

---

### Task 8: Match components and the matches page

**Files:**
- Create: `lib/matches/select.ts`
- Create: `components/matches/team-crest.tsx`, `components/matches/match-card.tsx`, `components/matches/match-list.tsx`
- Create: `app/[locale]/matches/page.tsx`
- Modify: `next.config.ts`
- Test: `lib/matches/select.test.ts`

**Interfaces:**
- Consumes: `Match`, `MatchOpponent` (Task 2), `createLocalDataSource` (Task 5).
- Produces: `todayMatches(all: Match[], now: number): Match[]`, `upcomingMatches(all, now)`, `recentResults(all, limit)`, `byRegion(all, slug)` from `lib/matches/select.ts`; `<TeamCrest team size />`, `<MatchCard match />`, `<MatchList matches />`.

Selection logic is pure and unit-tested. Components stay presentational.

- [ ] **Step 1: Write the failing test**

Create `lib/matches/select.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { todayMatches, upcomingMatches, recentResults, byRegion } from './select'
import type { Match } from '@/lib/data/types'

const HOUR = 3600
const NOW = 1_787_300_000

function make(over: Partial<Match>): Match {
  return {
    id: over.id ?? 'x',
    startsAt: over.startsAt ?? NOW,
    status: over.status ?? 'upcoming',
    bestOf: 3,
    opponents: [
      { code: 'A', name: 'A', pageSlug: 'A', logoUrl: null, score: null, isWinner: false },
      { code: 'B', name: 'B', pageSlug: 'B', logoUrl: null, score: null, isWinner: false },
    ],
    tournamentName: 'T',
    tournamentPageSlug: 'T',
    regionSlug: over.regionSlug ?? 'indonesia',
    streamUrls: [],
    ...over,
  } as Match
}

describe('match selection', () => {
  it('includes matches within the same UTC day', () => {
    const result = todayMatches([make({ id: 'a', startsAt: NOW + HOUR })], NOW)
    expect(result).toHaveLength(1)
  })

  it('excludes matches on a different day', () => {
    const result = todayMatches(
      [make({ id: 'b', startsAt: NOW + 72 * HOUR })],
      NOW,
    )
    expect(result).toHaveLength(0)
  })

  it('sorts today by start time ascending', () => {
    const result = todayMatches(
      [
        make({ id: 'late', startsAt: NOW + 5 * HOUR }),
        make({ id: 'early', startsAt: NOW + HOUR }),
      ],
      NOW,
    )
    expect(result.map((m) => m.id)).toEqual(['early', 'late'])
  })

  it('upcoming excludes anything already started', () => {
    const result = upcomingMatches(
      [
        make({ id: 'past', startsAt: NOW - HOUR }),
        make({ id: 'future', startsAt: NOW + HOUR }),
      ],
      NOW,
    )
    expect(result.map((m) => m.id)).toEqual(['future'])
  })

  it('recent results returns completed matches newest first', () => {
    const result = recentResults(
      [
        make({ id: 'old', status: 'completed', startsAt: NOW - 10 * HOUR }),
        make({ id: 'new', status: 'completed', startsAt: NOW - HOUR }),
        make({ id: 'pending', status: 'upcoming', startsAt: NOW + HOUR }),
      ],
      10,
    )
    expect(result.map((m) => m.id)).toEqual(['new', 'old'])
  })

  it('recent results respects the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      make({ id: `m${i}`, status: 'completed', startsAt: NOW - i * HOUR }),
    )
    expect(recentResults(many, 5)).toHaveLength(5)
  })

  it('filters by region slug', () => {
    const result = byRegion(
      [
        make({ id: 'id', regionSlug: 'indonesia' }),
        make({ id: 'ph', regionSlug: 'philippines' }),
      ],
      'philippines',
    )
    expect(result.map((m) => m.id)).toEqual(['ph'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/matches/select.test.ts`
Expected: FAIL — cannot resolve `./select`.

- [ ] **Step 3: Implement selection**

Create `lib/matches/select.ts`:

```typescript
import type { Match } from '@/lib/data/types'

const DAY = 86_400

function utcDayIndex(unixSeconds: number): number {
  return Math.floor(unixSeconds / DAY)
}

export function todayMatches(all: Match[], now: number): Match[] {
  const today = utcDayIndex(now)
  return all
    .filter((m) => utcDayIndex(m.startsAt) === today)
    .sort((a, b) => a.startsAt - b.startsAt)
}

export function upcomingMatches(all: Match[], now: number): Match[] {
  return all
    .filter((m) => m.status !== 'completed' && m.startsAt > now)
    .sort((a, b) => a.startsAt - b.startsAt)
}

export function recentResults(all: Match[], limit: number): Match[] {
  return all
    .filter((m) => m.status === 'completed')
    .sort((a, b) => b.startsAt - a.startsAt)
    .slice(0, limit)
}

export function byRegion(all: Match[], regionSlug: string): Match[] {
  return all.filter((m) => m.regionSlug === regionSlug)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/matches/select.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Allow Liquipedia crests through the image optimiser**

Team crests are a required design element, so they go through `next/image` for
sizing and lazy decoding rather than raw `<img>`.

Edit `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'liquipedia.net', pathname: '/commons/**' },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 6: Build the team crest component**

Create `components/matches/team-crest.tsx`:

```tsx
import Image from 'next/image'
import type { MatchOpponent } from '@/lib/data/types'

/**
 * A crest is never allowed to be a broken image or an empty gap — teams
 * without a Liquipedia logo get a styled monogram of the same footprint.
 */
export function TeamCrest({
  team,
  size = 40,
}: {
  team: Pick<MatchOpponent, 'code' | 'name' | 'logoUrl'>
  size?: number
}) {
  if (!team.logoUrl) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="grid shrink-0 place-items-center rounded-md border border-[var(--line)] bg-[var(--surface-raised)] text-[0.7em] font-bold text-[var(--ink-muted)]"
      >
        {team.code.slice(0, 3)}
      </span>
    )
  }

  return (
    <Image
      src={team.logoUrl}
      alt={team.name}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  )
}
```

- [ ] **Step 7: Build the match card**

Create `components/matches/match-card.tsx`:

```tsx
import { useFormatter, useTranslations } from 'next-intl'
import type { Match, MatchOpponent } from '@/lib/data/types'
import { TeamCrest } from './team-crest'

function Side({ side, showScore }: { side: MatchOpponent; showScore: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      <TeamCrest team={side} />
      <span
        className={`truncate text-sm sm:text-base ${side.isWinner ? 'text-[var(--brand)]' : ''}`}
      >
        {side.code}
      </span>
      {showScore && (
        <span className="ms-auto text-lg font-bold tabular-nums">
          {side.score}
        </span>
      )}
    </div>
  )
}

export function MatchCard({ match }: { match: Match }) {
  const t = useTranslations('matches')
  const format = useFormatter()
  const played = match.status === 'completed'

  return (
    <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between text-[var(--step--1)] text-[var(--ink-muted)]">
        <span className="truncate">{match.tournamentName}</span>
        <time dateTime={new Date(match.startsAt * 1000).toISOString()}>
          {format.dateTime(new Date(match.startsAt * 1000), {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>

      <div className="flex items-center gap-4">
        <Side side={match.opponents[0]} showScore={played} />
        <span className="shrink-0 text-[var(--ink-muted)]">
          {played ? ':' : t('versus')}
        </span>
        <Side side={match.opponents[1]} showScore={played} />
      </div>

      {match.bestOf !== null && (
        <p className="mt-3 text-[var(--step--1)] text-[var(--ink-muted)]">
          {t('bestOf', { count: match.bestOf })}
        </p>
      )}
    </article>
  )
}
```

- [ ] **Step 8: Build the list and the page**

Create `components/matches/match-list.tsx`:

```tsx
import { useTranslations } from 'next-intl'
import type { Match } from '@/lib/data/types'
import { MatchCard } from './match-card'

export function MatchList({ matches }: { matches: Match[] }) {
  const t = useTranslations('matches')
  if (matches.length === 0) {
    return <p className="text-[var(--ink-muted)]">{t('noMatches')}</p>
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((m) => (
        <MatchCard key={m.id} match={m} />
      ))}
    </div>
  )
}
```

Create `app/[locale]/matches/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import { upcomingMatches, recentResults } from '@/lib/matches/select'
import { MatchList } from '@/components/matches/match-list'
import { FreshnessBadge } from '@/components/ui/freshness-badge'

// Fully static: rendered at build time from committed snapshots, so the
// page paints instantly with no fetch and no loading state.
export const dynamic = 'force-static'
export const revalidate = 3600

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('matches')

  const source = createLocalDataSource()
  const result = await source.getMatches()
  const all = isOk(result) ? result.value : []
  const now = Math.floor(Date.now() / 1000)

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 flex items-baseline justify-between">
        <h1 className="display">{t('upcoming')}</h1>
        <FreshnessBadge harvestedAt={await source.getFreshness()} />
      </div>
      <MatchList matches={upcomingMatches(all, now)} />

      <h2 className="display mt-20 mb-10">{t('completed')}</h2>
      <MatchList matches={recentResults(all, 12)} />
    </main>
  )
}
```

- [ ] **Step 9: Verify in the browser at both widths**

Run `npm run dev`, then check `http://localhost:3000/en/matches` and
`http://localhost:3000/ar/matches` at 375px and 1440px.
Expected: real fixtures from the harvested snapshot, both crests visible on every
card, Arabic mirrored RTL with scores still reading correctly, and **no
horizontal page scroll at 375px**.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add match selection, crests, cards and matches page"
```

---

### Task 9: The globe with its non-WebGL fallback

**Files:**
- Create: `lib/globe/projection.ts`
- Create: `components/globe/globe.tsx`, `components/globe/region-marker.tsx`, `components/globe/globe-fallback.tsx`, `components/globe/globe-section.tsx`
- Test: `lib/globe/projection.test.ts`

**Interfaces:**
- Consumes: `RegionDefinition` (Task 1), `Match` (Task 2), `byRegion` (Task 8).
- Produces: `latLngToVector3(lat, lng, radius): [number, number, number]` from `lib/globe/projection.ts`; `<GlobeSection regions matches />` which internally chooses between `<Globe />` and `<GlobeFallback />`.

The maths is pure and tested. The rendering is not unit-tested — Playwright covers that the canvas mounts.

- [ ] **Step 1: Write the failing test**

Create `lib/globe/projection.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { latLngToVector3 } from './projection'

function length([x, y, z]: [number, number, number]): number {
  return Math.sqrt(x * x + y * y + z * z)
}

describe('latLngToVector3', () => {
  it('places every point on the sphere surface', () => {
    const points: Array<[number, number]> = [
      [0, 0],
      [-6.2, 106.8],
      [90, 0],
      [-90, 0],
      [30.04, 31.24],
    ]
    for (const [lat, lng] of points) {
      expect(length(latLngToVector3(lat, lng, 2))).toBeCloseTo(2, 5)
    }
  })

  it('puts the north pole at positive y', () => {
    const [, y] = latLngToVector3(90, 0, 1)
    expect(y).toBeCloseTo(1, 5)
  })

  it('puts the south pole at negative y', () => {
    const [, y] = latLngToVector3(-90, 0, 1)
    expect(y).toBeCloseTo(-1, 5)
  })

  it('separates points on opposite meridians', () => {
    const a = latLngToVector3(0, 0, 1)
    const b = latLngToVector3(0, 180, 1)
    expect(a[0]).toBeCloseTo(-b[0], 5)
    expect(a[2]).toBeCloseTo(-b[2], 5)
  })

  it('scales linearly with radius', () => {
    const small = latLngToVector3(45, 45, 1)
    const large = latLngToVector3(45, 45, 3)
    expect(large[0]).toBeCloseTo(small[0] * 3, 5)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/globe/projection.test.ts`
Expected: FAIL — cannot resolve `./projection`.

- [ ] **Step 3: Implement the projection**

Create `lib/globe/projection.ts`:

```typescript
/**
 * Converts geographic coordinates to a point on a sphere of the given radius.
 * Y is up, matching Three.js convention.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/globe/projection.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Build the marker**

Create `components/globe/region-marker.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Mesh } from 'three'
import { latLngToVector3 } from '@/lib/globe/projection'
import type { RegionDefinition } from '@/lib/content/regions'

export function RegionMarker({
  region,
  radius,
  locale,
  isLive,
  onSelect,
}: {
  region: RegionDefinition
  radius: number
  locale: 'en' | 'ar'
  isLive: boolean
  onSelect: (slug: string) => void
}) {
  const mesh = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const position = latLngToVector3(region.lat, region.lng, radius)

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const pulse = isLive ? 1 + Math.sin(clock.elapsedTime * 4) * 0.25 : 1
    const target = (hovered ? 1.6 : 1) * pulse
    mesh.current.scale.setScalar(target)
  })

  return (
    <group position={position}>
      <mesh
        ref={mesh}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(region.slug)
        }}
      >
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshBasicMaterial color={region.accent} />
      </mesh>

      {hovered && (
        <Html distanceFactor={8} center>
          <span className="whitespace-nowrap rounded bg-[var(--surface-raised)] px-2 py-1 text-xs text-[var(--ink)]">
            {region.name[locale]}
          </span>
        </Html>
      )}
    </group>
  )
}
```

- [ ] **Step 6: Build the globe and the fallback**

Create `components/globe/globe.tsx`:

```tsx
'use client'

import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Points, PointMaterial } from '@react-three/drei'
import { getRegions } from '@/lib/content/regions'
import { latLngToVector3 } from '@/lib/globe/projection'
import { RegionMarker } from './region-marker'

const RADIUS = 2

/** Fibonacci sphere — an even point distribution without a texture. */
function useSpherePoints(count: number): Float32Array {
  return useMemo(() => {
    const positions = new Float32Array(count * 3)
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const theta = golden * i
      positions[i * 3] = Math.cos(theta) * r * RADIUS
      positions[i * 3 + 1] = y * RADIUS
      positions[i * 3 + 2] = Math.sin(theta) * r * RADIUS
    }
    return positions
  }, [count])
}

function Shell() {
  const points = useSpherePoints(6000)
  return (
    <Points positions={points} stride={3}>
      <PointMaterial size={0.012} color="#3a3a46" sizeAttenuation depthWrite={false} />
    </Points>
  )
}

export function Globe({
  locale,
  liveRegions,
  onSelect,
}: {
  locale: 'en' | 'ar'
  liveRegions: string[]
  onSelect: (slug: string) => void
}) {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
      <Suspense fallback={null}>
        <Shell />
        {getRegions().map((region) => (
          <RegionMarker
            key={region.slug}
            region={region}
            radius={RADIUS}
            locale={locale}
            isLive={liveRegions.includes(region.slug)}
            onSelect={onSelect}
          />
        ))}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.4}
        />
      </Suspense>
    </Canvas>
  )
}

export { latLngToVector3 }
```

Create `components/globe/globe-fallback.tsx`:

```tsx
import Link from 'next/link'
import { getRegions } from '@/lib/content/regions'

export function GlobeFallback({ locale }: { locale: 'en' | 'ar' }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {getRegions().map((region) => (
        <li key={region.slug}>
          <Link
            href={`/${locale}/regions/${region.slug}`}
            className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 hover:border-[var(--brand)]"
          >
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ background: region.accent }}
            />
            {region.name[locale]}
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 7: Wire the capability check**

Create `components/globe/globe-section.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { GlobeFallback } from './globe-fallback'

const Globe = dynamic(() => import('./globe').then((m) => m.Globe), {
  ssr: false,
})

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function GlobeSection({
  locale,
  liveRegions,
}: {
  locale: 'en' | 'ar'
  liveRegions: string[]
}) {
  const router = useRouter()
  const [interactive, setInteractive] = useState<boolean | null>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setInteractive(supportsWebGL() && !reduced)
  }, [])

  // Render the accessible list until we know the globe is safe to show.
  if (interactive !== true) return <GlobeFallback locale={locale} />

  return (
    <div className="h-[70vh] w-full">
      <Globe
        locale={locale}
        liveRegions={liveRegions}
        onSelect={(slug) => router.push(`/${locale}/regions/${slug}`)}
      />
    </div>
  )
}
```

- [ ] **Step 8: Add the Playwright check**

Append to `e2e/shell.spec.ts`:

```typescript
test('globe section offers reachable region navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/en')
  await expect(page.getByRole('link', { name: 'Indonesia' })).toBeVisible()
})
```

Run: `npx playwright test`
Expected: PASS — every region reachable without WebGL.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add interactive globe with accessible fallback"
```

---

### Task 10: Region and team pages, roster harvesting

**Files:**
- Create: `lib/data/liquipedia/parse-league.ts`
- Create: `app/[locale]/regions/[slug]/page.tsx`, `app/[locale]/teams/[slug]/page.tsx`
- Modify: `scripts/harvest.ts`
- Test: `lib/data/liquipedia/parse-league.test.ts`

**Interfaces:**
- Consumes: `Team`, `Player` (Task 2); `client.parsePage(page, 'wikitext')` (Task 3).
- Produces: `parseLeagueTeams(wikitext: string, regionSlug: string): Team[]`.

League wikitext lists participants via `{{TeamCard}}` / `{{ParticipantTable}}` templates. Extract team page names and player handles from those blocks.

- [ ] **Step 1: Capture a league fixture**

```bash
curl -sS --compressed \
  -A 'MLBBHub/1.0 (https://github.com/mlbb-hub/mlbb-hub; cealiomar.work@gmail.com)' \
  'https://liquipedia.net/mobilelegends/api.php?action=parse&page=MPL/Philippines/Season_18&format=json&prop=wikitext' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).parse.wikitext["*"]))' \
  > lib/data/liquipedia/__fixtures__/league-ph.wikitext
```

Inspect it before writing the parser:

```bash
grep -oE '\{\{(TeamCard|ParticipantTable|Team)[^}]{0,200}' lib/data/liquipedia/__fixtures__/league-ph.wikitext | head -20
```

Write the parser against the template names that actually appear. Do not assume.

- [ ] **Step 2: Write the failing test**

Create `lib/data/liquipedia/parse-league.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseLeagueTeams } from './parse-league'
import type { Team } from '../types'

let teams: Team[]

beforeAll(() => {
  const wikitext = readFileSync(
    join(__dirname, '__fixtures__', 'league-ph.wikitext'),
    'utf8',
  )
  teams = parseLeagueTeams(wikitext, 'philippines')
})

describe('parseLeagueTeams', () => {
  it('finds the participating teams', () => {
    expect(teams.length).toBeGreaterThanOrEqual(6)
  })

  it('tags every team with the given region', () => {
    for (const t of teams) expect(t.regionSlug).toBe('philippines')
  })

  it('gives every team a page slug and a name', () => {
    for (const t of teams) {
      expect(t.pageSlug.length).toBeGreaterThan(0)
      expect(t.name.length).toBeGreaterThan(0)
    }
  })

  it('does not duplicate teams', () => {
    const slugs = teams.map((t) => t.pageSlug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('returns an empty array for wikitext with no participants', () => {
    expect(parseLeagueTeams('{{Infobox league|name=Nothing}}', 'philippines'))
      .toEqual([])
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run lib/data/liquipedia/parse-league.test.ts`
Expected: FAIL — cannot resolve `./parse-league`.

- [ ] **Step 4: Implement the league parser**

Create `lib/data/liquipedia/parse-league.ts`:

```typescript
import type { Player, Team } from '../types'

/** Matches `{{TeamCard|team=Team Name|p1=handle|p1flag=ph|...}}` blocks. */
const TEAM_CARD = /\{\{TeamCard\b([\s\S]*?)\}\}/g

function readParam(block: string, key: string): string | null {
  const re = new RegExp(`\\|\\s*${key}\\s*=\\s*([^|\\n}]+)`, 'i')
  const m = block.match(re)
  const value = m?.[1]?.trim()
  return value && value.length > 0 ? value : null
}

function readRoster(block: string): Player[] {
  const players: Player[] = []
  for (let i = 1; i <= 10; i++) {
    const handle = readParam(block, `p${i}`)
    if (!handle) continue
    players.push({
      handle,
      realName: readParam(block, `p${i}name`),
      role: readParam(block, `p${i}role`),
      country: readParam(block, `p${i}flag`),
    })
  }
  return players
}

export function parseLeagueTeams(
  wikitext: string,
  regionSlug: string,
): Team[] {
  const bySlug = new Map<string, Team>()

  for (const match of wikitext.matchAll(TEAM_CARD)) {
    const block = match[1]
    const name = readParam(block, 'team')
    if (!name) continue

    const pageSlug = name.replace(/\s+/g, '_')
    if (bySlug.has(pageSlug)) continue

    bySlug.set(pageSlug, {
      pageSlug,
      name,
      code: readParam(block, 'short') ?? name,
      logoUrl: null,
      regionSlug,
      roster: readRoster(block),
    })
  }

  return [...bySlug.values()]
}
```

If Step 1's inspection showed a different template name, change `TEAM_CARD` to match it and adjust `readRoster` parameter keys accordingly. The tests define the contract; the regex serves them.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/data/liquipedia/parse-league.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 6: Extend the harvester to persist teams**

In `scripts/harvest.ts`, replace the `console.log` inside the league loop with:

```typescript
    const teams = parseLeagueTeams(league.value, entry.regionSlug)
    if (teams.length === 0) {
      console.warn(`no teams parsed from ${entry.page}; snapshot unchanged`)
      continue
    }

    const existing = readSnapshot<Team[]>('teams')?.data ?? []
    const merged = [
      ...existing.filter((t) => t.regionSlug !== entry.regionSlug),
      ...teams,
    ]
    writeSnapshot('teams', merged)
    console.log(`wrote ${teams.length} teams for ${entry.regionSlug}`)
```

Add these imports at the top of the file:

```typescript
import { parseLeagueTeams } from '@/lib/data/liquipedia/parse-league'
import { readSnapshot, writeSnapshot } from '@/lib/data/snapshots'
import type { Team } from '@/lib/data/types'
```

Remove the now-duplicated `writeSnapshot` import if one already exists.

- [ ] **Step 7: Build the region page**

Create `app/[locale]/regions/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getRegions, getRegionBySlug } from '@/lib/content/regions'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import { byRegion, upcomingMatches } from '@/lib/matches/select'
import { MatchList } from '@/components/matches/match-list'
import { routing } from '@/i18n/routing'

// Fully static: rendered at build time from committed snapshots, so the
// page paints instantly with no fetch and no loading state.
export const dynamic = 'force-static'
export const revalidate = 3600

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getRegions().map((r) => ({ locale, slug: r.slug })),
  )
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const region = getRegionBySlug(slug)
  if (!region) notFound()

  const t = await getTranslations('region')
  const source = createLocalDataSource()

  const matchResult = await source.getMatches()
  const all = isOk(matchResult) ? matchResult.value : []
  const now = Math.floor(Date.now() / 1000)

  const teamResult = await source.getTeamsByRegion(slug)
  const teams = isOk(teamResult) ? teamResult.value : []

  const localeKey = locale === 'ar' ? 'ar' : 'en'

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p style={{ color: region.accent }}>{region.leagueName}</p>
      <h1 className="display mb-16">{region.name[localeKey]}</h1>

      <h2 className="mb-6 text-2xl font-bold">{t('teams')}</h2>
      <ul className="mb-20 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <li key={team.pageSlug}>
            <Link
              href={`/${locale}/teams/${team.pageSlug}`}
              className="block rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 hover:border-[var(--brand)]"
            >
              {team.name}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mb-6 text-2xl font-bold">{t('fixtures')}</h2>
      <MatchList matches={upcomingMatches(byRegion(all, slug), now)} />
    </main>
  )
}
```

- [ ] **Step 8: Build the team page**

Create `app/[locale]/teams/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'

// Fully static: rendered at build time from committed snapshots, so the
// page paints instantly with no fetch and no loading state.
export const dynamic = 'force-static'
export const revalidate = 3600

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('team')

  const result = await createLocalDataSource().getTeam(slug)
  if (!isOk(result)) notFound()
  const team = result.value

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="display mb-16">{team.name}</h1>

      <h2 className="mb-6 text-2xl font-bold">{t('roster')}</h2>
      <ul className="divide-y divide-[var(--line)]">
        {team.roster.map((player) => (
          <li
            key={player.handle}
            className="flex items-center justify-between py-4"
          >
            <span className="font-semibold">{player.handle}</span>
            <span className="text-[var(--ink-muted)]">
              {player.realName ?? ''}
            </span>
            <span className="text-[var(--brand)]">{player.role ?? ''}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 9: Harvest and verify**

Run: `npm run harvest && npm run dev`
Open `http://localhost:3000/en/regions/philippines`.
Expected: the harvested PH teams listed, each linking to a roster page.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add region and team pages with roster harvesting"
```

---

### Task 11: Home page

**Files:**
- Create: `app/[locale]/page.tsx`
- Create: `components/home/hero.tsx`, `components/matches/ticker.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `GlobeSection` (Task 9), `todayMatches` (Task 8), `TeamCrest` (Task 8), `createLocalDataSource` (Task 5).
- Produces: `<Hero />`, `<Ticker matches />`, and the `/[locale]` route.

- [ ] **Step 1: Build the ticker**

Create `components/matches/ticker.tsx`:

```tsx
import type { Match } from '@/lib/data/types'

export function Ticker({ matches }: { matches: Match[] }) {
  if (matches.length === 0) return null
  const items = [...matches, ...matches]

  return (
    <div className="overflow-hidden border-y border-[var(--line)] py-3">
      <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-10">
        {items.map((m, i) => (
          <span
            key={`${m.id}-${i}`}
            className="whitespace-nowrap text-[var(--step--1)] text-[var(--ink-muted)]"
          >
            <span className="text-[var(--ink)]">{m.opponents[0].code}</span>
            {' vs '}
            <span className="text-[var(--ink)]">{m.opponents[1].code}</span>
            {' · '}
            {m.tournamentName}
          </span>
        ))}
      </div>
    </div>
  )
}
```

Append the keyframes to `app/globals.css`:

```css
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

[dir='rtl'] .animate-\[marquee_40s_linear_infinite\] {
  animation-direction: reverse;
}
```

- [ ] **Step 2: Build the hero**

Create `components/home/hero.tsx`:

```tsx
import Image from 'next/image'
import { useTranslations } from 'next-intl'

export function Hero() {
  const t = useTranslations('home')
  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6 text-center">
      <Image
        src="/brand/mlbb-logo.png"
        alt="Mobile Legends: Bang Bang"
        width={520}
        height={200}
        priority
        className="h-auto w-[min(70vw,520px)]"
      />
      <p className="display max-w-4xl">{t('tagline')}</p>
    </section>
  )
}
```

- [ ] **Step 3: Add the logo asset**

```bash
mkdir -p public/brand
```

Place the supplied MLBB logo at `public/brand/mlbb-logo.png`. Its use is authorised — the project owner works at MOONTON Games.

- [ ] **Step 4: Build the home page**

Create `app/[locale]/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import { todayMatches } from '@/lib/matches/select'
import { Hero } from '@/components/home/hero'
import { Ticker } from '@/components/matches/ticker'
import { MatchList } from '@/components/matches/match-list'
import { GlobeSection } from '@/components/globe/globe-section'
import { FreshnessBadge } from '@/components/ui/freshness-badge'

// Fully static: rendered at build time from committed snapshots, so the
// page paints instantly with no fetch and no loading state.
export const dynamic = 'force-static'
export const revalidate = 3600

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')

  const source = createLocalDataSource()
  const result = await source.getMatches()
  const all = isOk(result) ? result.value : []
  const now = Math.floor(Date.now() / 1000)
  const today = todayMatches(all, now)

  const liveRegions = [
    ...new Set(
      today
        .filter((m) => m.status !== 'completed')
        .map((m) => m.regionSlug)
        .filter((s): s is string => s !== null),
    ),
  ]

  return (
    <main>
      <Hero />
      <Ticker matches={today} />

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="display mb-12">{t('exploreGlobe')}</h2>
        <GlobeSection
          locale={locale === 'ar' ? 'ar' : 'en'}
          liveRegions={liveRegions}
        />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-10 flex items-baseline justify-between">
          <h2 className="display">{t('todayMatches')}</h2>
          <FreshnessBadge harvestedAt={await source.getFreshness()} />
        </div>
        <MatchList matches={today} />
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Run the full suite**

Run: `npm test && npx playwright test`
Expected: all unit tests pass, all Playwright specs pass.

- [ ] **Step 6: Verify both locales**

Run: `npm run dev`, open `/en` and `/ar`.
Expected: logo hero, ticker scrolling in the correct direction per locale, globe rotating with live regions pulsing, today's fixtures listed, Liquipedia attribution in the footer.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add home page with hero, ticker and globe"
```

---

### Task 12: News aggregation

**Priority: lowest.** The site's job is fixtures, who-plays-whom and the
schedule. News is a supporting section. If time is short, ship Tasks 1–11 and
13 first — the site is complete and valuable without this one.

**Files:**
- Create: `lib/data/news/rss.ts`
- Create: `scripts/harvest-news.ts`
- Create: `app/[locale]/news/page.tsx`
- Modify: `.github/workflows/harvest.yml`
- Test: `lib/data/news/rss.test.ts`

**Interfaces:**
- Consumes: `Article` (Task 2), `writeSnapshot` (Task 5).
- Produces: `parseFeed(xml: string, sourceName: string): Article[]`.

- [ ] **Step 1: Write the failing test**

Create `lib/data/news/rss.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseFeed } from './rss'

const FEED = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>ONIC take the MPL ID week two lead</title>
    <link>https://example.com/onic-week-two</link>
    <description>&lt;p&gt;A clean 2-0 sweep.&lt;/p&gt;</description>
    <pubDate>Thu, 21 Aug 2026 10:00:00 +0000</pubDate>
  </item>
  <item>
    <title>Team Spirit lift the MSC trophy</title>
    <link>https://example.com/spirit-msc</link>
    <description>Seven games.</description>
    <pubDate>Sat, 01 Aug 2026 18:30:00 +0000</pubDate>
  </item>
</channel></rss>`

describe('parseFeed', () => {
  it('extracts every item', () => {
    expect(parseFeed(FEED, 'Example')).toHaveLength(2)
  })

  it('reads titles and links', () => {
    const [first] = parseFeed(FEED, 'Example')
    expect(first.title).toBe('ONIC take the MPL ID week two lead')
    expect(first.url).toBe('https://example.com/onic-week-two')
  })

  it('strips html from the excerpt', () => {
    const [first] = parseFeed(FEED, 'Example')
    expect(first.excerpt).toBe('A clean 2-0 sweep.')
  })

  it('converts pubDate to unix seconds', () => {
    const [first] = parseFeed(FEED, 'Example')
    expect(first.publishedAt).toBe(
      Math.floor(Date.parse('Thu, 21 Aug 2026 10:00:00 +0000') / 1000),
    )
  })

  it('credits the source', () => {
    for (const a of parseFeed(FEED, 'Example')) {
      expect(a.sourceName).toBe('Example')
    }
  })

  it('sorts newest first', () => {
    const [first, second] = parseFeed(FEED, 'Example')
    expect(first.publishedAt).toBeGreaterThan(second.publishedAt)
  })

  it('returns an empty array for malformed xml', () => {
    expect(parseFeed('not xml at all', 'Example')).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/data/news/rss.test.ts`
Expected: FAIL — cannot resolve `./rss`.

- [ ] **Step 3: Implement the feed parser**

Create `lib/data/news/rss.ts`:

```typescript
import { parse } from 'node-html-parser'
import type { Article } from '@/lib/data/types'

function textOf(item: ReturnType<typeof parse>, tag: string): string {
  return item.querySelector(tag)?.text.trim() ?? ''
}

function stripHtml(value: string): string {
  return parse(value).text.trim()
}

function idFrom(url: string): string {
  return url.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
}

/**
 * We store headline, excerpt and link only — never full article bodies.
 * Every item links back to and credits its publisher.
 */
export function parseFeed(xml: string, sourceName: string): Article[] {
  const root = parse(xml)
  const items = root.querySelectorAll('item')

  const articles = items.flatMap((item): Article[] => {
    const url = textOf(item, 'link')
    const title = textOf(item, 'title')
    if (!url || !title) return []

    const published = Date.parse(textOf(item, 'pubDate'))

    return [
      {
        id: idFrom(url),
        title,
        excerpt: stripHtml(textOf(item, 'description')).slice(0, 240),
        url,
        imageUrl:
          item.querySelector('enclosure')?.getAttribute('url') ?? null,
        publishedAt: Number.isNaN(published)
          ? 0
          : Math.floor(published / 1000),
        sourceName,
      },
    ]
  })

  return articles.sort((a, b) => b.publishedAt - a.publishedAt)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/data/news/rss.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Write the news harvester**

Create `scripts/harvest-news.ts`:

```typescript
import { parseFeed } from '@/lib/data/news/rss'
import { writeSnapshot } from '@/lib/data/snapshots'
import { USER_AGENT } from '@/lib/data/liquipedia/client'
import type { Article } from '@/lib/data/types'

const FEEDS: Array<{ url: string; name: string }> = [
  { url: 'https://www.oneesports.gg/mobile-legends/feed/', name: 'ONE Esports' },
]

async function main(): Promise<void> {
  const collected: Article[] = []

  for (const feed of FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!response.ok) {
        console.warn(`${feed.name} returned HTTP ${response.status}`)
        continue
      }
      collected.push(...parseFeed(await response.text(), feed.name))
    } catch (cause) {
      console.warn(`${feed.name} failed: ${String(cause)}`)
    }
  }

  if (collected.length === 0) {
    console.warn('no articles collected — keeping the existing snapshot')
    return
  }

  const sorted = collected.sort((a, b) => b.publishedAt - a.publishedAt)
  writeSnapshot('news', sorted.slice(0, 40))
  console.log(`wrote ${Math.min(sorted.length, 40)} articles`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
```

Add to `package.json` scripts: `"harvest:news": "tsx scripts/harvest-news.ts"`.

Verify the feed URL resolves before relying on it:

```bash
curl -sSI -A 'MLBBHub/1.0' https://www.oneesports.gg/mobile-legends/feed/ | head -1
```

If it does not return `200`, find the outlet's actual feed path and update `FEEDS`. Add further outlets to the same array as you confirm their feeds.

- [ ] **Step 6: Build the news page**

Create `app/[locale]/news/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'

export const dynamic = 'force-static'
export const revalidate = 3600

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')

  const result = await createLocalDataSource().getNews()
  const articles = isOk(result) ? result.value : []

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="display mb-12">{t('latestNews')}</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {articles.map((article) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 hover:border-[var(--brand)]"
          >
            <p className="mb-2 text-[var(--step--1)] text-[var(--brand)]">
              {article.sourceName}
            </p>
            <h2 className="mb-3 text-xl font-bold">{article.title}</h2>
            <p className="text-[var(--ink-muted)]">{article.excerpt}</p>
          </a>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 7: Add news to the workflow**

In `.github/workflows/harvest.yml`, insert this step after the `Harvest` step and before `Commit snapshots`:

```yaml
      - name: Harvest news
        run: npm run harvest:news
        continue-on-error: true
```

- [ ] **Step 8: Run everything**

```bash
npm run harvest && npm run harvest:news && npm test && npx playwright test
```

Expected: snapshots written, all unit tests pass, all Playwright specs pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: aggregate MLBB esports news from publisher feeds"
```

---

---

### Task 13: Premium finish and mobile responsiveness

**Files:**
- Create: `components/layout/nav.tsx`
- Modify: `app/globals.css`, `app/[locale]/layout.tsx`, `components/globe/globe.tsx`, `components/globe/globe-section.tsx`
- Test: `e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: everything built so far.
- Produces: `<Nav locale />`; a `useIsCompact()` hook exported from `components/globe/globe-section.tsx`.

This task is not decoration — "no loading, looks expensive, works on a phone" is
the acceptance bar for the whole project. It gets its own review gate.

- [ ] **Step 1: Write the failing mobile test**

Create `e2e/mobile.spec.ts`:

```typescript
import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['iPhone 13'] })

const ROUTES = ['/en', '/en/matches', '/en/regions/philippines', '/ar', '/ar/matches']

for (const route of ROUTES) {
  test(`${route} never scrolls horizontally on mobile`, async ({ page }) => {
    await page.goto(route)
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      return doc.scrollWidth - doc.clientWidth
    })
    expect(overflow).toBeLessThanOrEqual(1)
  })
}

test('primary navigation is reachable on mobile', async ({ page }) => {
  await page.goto('/en')
  await expect(page.getByRole('link', { name: /matches/i }).first()).toBeVisible()
})

test('every tap target in the nav is at least 44px tall', async ({ page }) => {
  await page.goto('/en')
  const links = page.locator('nav a')
  const count = await links.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const box = await links.nth(i).boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
})

test('home paints its fixtures without any loading placeholder', async ({ page }) => {
  await page.goto('/en', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('text=/loading/i')).toHaveCount(0)
  await expect(page.locator('article').first()).toBeVisible()
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test e2e/mobile.spec.ts`
Expected: FAIL — no `nav` element exists yet.

- [ ] **Step 3: Build the navigation**

Create `components/layout/nav.tsx`:

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

export function Nav({ locale }: { locale: string }) {
  const t = useTranslations('nav')
  const other = locale === 'ar' ? 'en' : 'ar'

  const links = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/matches`, label: t('matches') },
    { href: `/${locale}/news`, label: t('news') },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--ground)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center py-3">
          <Image
            src="/brand/mlbb-logo.png"
            alt="Mobile Legends: Bang Bang"
            width={120}
            height={46}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <div className="ms-auto flex items-center">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-[44px] items-center px-3 text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] sm:px-4 sm:text-base"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={`/${other}`}
            className="flex min-h-[44px] items-center px-3 text-sm font-bold text-[var(--brand)]"
          >
            {other.toUpperCase()}
          </Link>
        </div>
      </div>
    </nav>
  )
}
```

Render it in `app/[locale]/layout.tsx` immediately inside `<NextIntlClientProvider>`, above `{children}`:

```tsx
<Nav locale={locale} />
```

Add the import: `import { Nav } from '@/components/layout/nav'`.

- [ ] **Step 4: Raise the visual finish**

Append to `app/globals.css`:

```css
/* Premium surface treatment: hairline borders, a soft inner light, and a
   brand glow that only appears on hover. Cheap to render, reads expensive. */
.panel {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 14px;
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--surface-raised) 90%, transparent),
      var(--surface));
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 6%, transparent),
    0 1px 2px rgb(0 0 0 / 0.4);
  transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}

@media (hover: hover) {
  .panel:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--brand) 55%, var(--line));
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent),
      0 10px 30px -12px color-mix(in srgb, var(--brand) 45%, transparent);
  }
}

/* Brand wash behind the hero. */
.aurora::before {
  content: '';
  position: absolute;
  inset: -20% -10% auto -10%;
  height: 70vh;
  pointer-events: none;
  z-index: -1;
  background:
    radial-gradient(60% 50% at 50% 0%,
      color-mix(in srgb, var(--brand-hot) 22%, transparent), transparent 70%);
  filter: blur(40px);
}

/* Section rhythm — generous on desktop, tighter on a phone. */
.section {
  padding-inline: 1.25rem;
  padding-block: clamp(3.5rem, 8vw, 7rem);
  margin-inline: auto;
  max-width: 72rem;
}

@media (min-width: 640px) {
  .section { padding-inline: 1.5rem; }
}
```

Apply `.panel` to `MatchCard`'s `<article>` (replacing its `rounded-xl border …` classes), to the region cards in `GlobeFallback`, and to the news cards. Apply `.aurora` to the `<section>` in `components/home/hero.tsx` and add `relative` to it. Replace the `mx-auto max-w-6xl px-6 py-16` / `py-24` wrappers on every page with `className="section"`.

- [ ] **Step 5: Make the globe cheap on phones**

In `components/globe/globe.tsx`, accept a density prop and use it:

```tsx
export function Globe({
  locale,
  liveRegions,
  onSelect,
  pointCount = 6000,
}: {
  locale: 'en' | 'ar'
  liveRegions: string[]
  onSelect: (slug: string) => void
  pointCount?: number
}) {
```

Change `Shell` to take the count:

```tsx
function Shell({ count }: { count: number }) {
  const points = useSpherePoints(count)
  return (
    <Points positions={points} stride={3}>
      <PointMaterial size={0.012} color="#3a3a46" sizeAttenuation depthWrite={false} />
    </Points>
  )
}
```

and render `<Shell count={pointCount} />`. Cap the renderer on phones by changing the canvas props to `dpr={[1, 1.5]}`.

In `components/globe/globe-section.tsx`, add the compact check and pass a lower density:

```tsx
export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setCompact(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return compact
}
```

Then in `GlobeSection`, use it:

```tsx
  const compact = useIsCompact()

  if (interactive !== true) return <GlobeFallback locale={locale} />

  return (
    <div className={compact ? 'h-[52vh] w-full' : 'h-[70vh] w-full'}>
      <Globe
        locale={locale}
        liveRegions={liveRegions}
        onSelect={(slug) => router.push(`/${locale}/regions/${slug}`)}
        pointCount={compact ? 2500 : 6000}
      />
    </div>
  )
```

- [ ] **Step 6: Always give phones a text route to every region**

The globe is a pointer-first interaction. Below it, render the region list on
compact viewports so nothing is reachable only by dragging a sphere. In
`GlobeSection`, wrap the return:

```tsx
  return (
    <>
      <div className={compact ? 'h-[52vh] w-full' : 'h-[70vh] w-full'}>
        <Globe
          locale={locale}
          liveRegions={liveRegions}
          onSelect={(slug) => router.push(`/${locale}/regions/${slug}`)}
          pointCount={compact ? 2500 : 6000}
        />
      </div>
      {compact && (
        <div className="mt-8">
          <GlobeFallback locale={locale} />
        </div>
      )}
    </>
  )
```

- [ ] **Step 7: Run the mobile suite**

Run: `npx playwright test e2e/mobile.spec.ts`
Expected: PASS — all 8 tests, including zero horizontal overflow on all five routes.

- [ ] **Step 8: Run the whole suite**

Run: `npm test && npx playwright test`
Expected: everything green.

- [ ] **Step 9: Check the performance budget**

```bash
npm run build
```

Expected: every route listed as `○ (Static)` or `● (SSG)`. **If any content route
is marked `ƒ (Dynamic)`, stop and fix it** — a dynamic route means the page waits
on something at request time, which violates the no-loading constraint.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: premium visual finish and mobile responsiveness"
```

---

## Deployment

- [ ] Push the repository to GitHub. The harvest workflow needs `contents: write`, which is granted in the workflow file.
- [ ] Import the repository into Vercel. No environment variables are required — there are no secrets in this project.
- [ ] Trigger the harvest workflow once manually (`workflow_dispatch`) and confirm it commits `data/snapshots/matches.json`.
- [ ] Confirm the resulting Vercel deployment shows live fixtures.

## Notes for the implementer

- **Never** add a runtime `fetch` to Liquipedia from a page or route handler. Every byte of their data reaches the app through committed snapshots. This is the single constraint that keeps us inside their terms at any traffic level.
- The parsers are pinned to real markup captured on 2026-08-21. If Liquipedia restructures its templates, the fixtures go stale and tests will catch it — recapture the fixture, watch the tests fail, then fix the parser. Do not edit a fixture by hand to make a test pass.
- `data/snapshots/` is committed deliberately. It is the app's database.
