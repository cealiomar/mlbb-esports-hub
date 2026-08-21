# MLBB Esports Hub — working notes

Read this before changing anything. It records the decisions that are not
obvious from the code and the traps that have already bitten once.

For the full project reference — scope, data sources, parsers, test coverage,
numbers, roadmap — see **[PROJECT.md](PROJECT.md)**.

---

## What this is

A bilingual (English / Arabic) site showing **Mobile Legends: Bang Bang**
esports fixtures, live matches, results and team rosters. It covers only
MLBB — there is no multi-game abstraction anywhere, and none should be added.

**Content priority, highest first:** the schedule and who plays whom → results.

Live: not deployed yet. See [DEPLOY.md](DEPLOY.md).

## Stack

Next.js 16 (App Router, **static export**), TypeScript strict, Tailwind v4,
next-intl, Vitest, Playwright. No animation library — motion is CSS keyframes
plus one IntersectionObserver.

---

## The two rules that shape everything

### 1. Nothing is fetched at request time

The app reads **only** committed JSON in `data/snapshots/`. It never calls
Liquipedia while serving. A GitHub Action harvests hourly, commits the JSON,
and that commit triggers a rebuild.

This exists because Liquipedia caps `action=parse` at **one request per 30
seconds**. Per-visitor fetching is impossible at any traffic level.

> If you find yourself adding `fetch()` to a page, route handler or client
> component to get match data, stop — that is the thing this architecture
> exists to prevent.

### 2. Every route is static

`output: 'export'`. `npm run build` writes `out/`, which is plain files.

After any change, check the build output: every content route must print
`○ (Static)` or `● (SSG)`. A `ƒ (Dynamic)` route means something is being
computed per request, which a static host cannot do. Fix the route rather than
changing the host.

There is **no middleware** — a static host cannot run it. Locale routing
happens through `app/page.tsx`, a prerendered root page that redirects.

---

## Liquipedia: the non-negotiables

Base URL: `https://liquipedia.net/mobilelegends/api.php`. **No API key is
needed** — that was a false start; the failures were something else.

| Requirement | What happens without it |
|---|---|
| `Accept-Encoding: gzip` | **HTTP 406**, not data. This looks like an auth failure and is not. |
| Descriptive `User-Agent` with contact info | Blocked. `node-fetch`, `undici` etc. are rejected by name. |
| ≤ 1 `action=parse` per 30 s | Rate limited. Enforced inside `lib/data/liquipedia/client.ts`, not by callers. |
| ≤ 1 request per 2 s for anything else | Same. |
| Attribution with a link | CC-BY-SA 3.0 obligation. It is in the footer; do not remove it. |

**Scraping their rendered HTML pages is expressly forbidden by their terms.**
Only `api.php`. (Parsing the HTML that `action=parse&prop=text` *returns* is
fine — that is the API.)

### Team crests are mirrored, never hotlinked

Liquipedia returns **403** to image requests carrying an off-site `Referer`.
Hotlinked crests work locally and break on a real domain — which is exactly
what happened here once.

`scripts/harvest.ts` downloads each crest into `public/teams/` and rewrites
the snapshot to a local `/teams/…` path. `e2e/mobile.spec.ts` asserts that no
crest is remote and that every one has `naturalWidth > 0`.

Do not "simplify" this back to remote URLs.

### Page titles drift, and the listing is alphabetical

Season pages move (`MPL/MENA/Season_9` today, `Season_10` when it exists). To
check what exists:

```bash
curl -sS --compressed -A 'MLBBHub/1.0 (contact: you@example.com)' \
  -G 'https://liquipedia.net/mobilelegends/api.php' \
  --data-urlencode 'action=query' --data-urlencode 'list=allpages' \
  --data-urlencode 'apprefix=MPL/MENA/' --data-urlencode 'format=json'
```

`list=allpages` is cheap (1 req / 2 s), unlike `parse`. **It sorts
alphabetically**, so `Season 10` lands between `Season 1` and `Season 2` and
the last entry is *not* the newest season. This has caused a wrong reading
twice.

### Roster wikitext structure

Not `{{TeamCard}}` — that was an assumption that turned out wrong. The real
shape is:

```
{{TeamParticipants
  |{{Opponent|AP.Bren
     |players={{Persons
        |{{Person|JMPINKMAN|role=exp}}
        |{{Person|Bitoy|role=Head Coach|type=staff}}
```

`lib/data/liquipedia/parse-league.ts` scans balanced braces rather than using
a regex, because regexes cannot match nesting. Note that a naive search for
`{{Person` also matches `{{Persons` — the parser checks the character after
the template name. That bug produced a player called `s`.

`type=staff` entries are coaches and analysts; they are excluded from rosters.
Substitutes are players and are included.

---

## Layout

```
app/
  page.tsx              root: prerendered locale redirect (replaces middleware)
  [locale]/
    layout.tsx          fonts, direction, nav, footer
    page.tsx            home
    matches/            all fixtures, tabbed
    regions/[slug]/     one region: its fixtures and teams
    teams/[slug]/       roster and recent results
lib/
  content/regions.ts    region definitions and lookups
  content/brand.ts      the logo lockup — one place
  content/author.ts     footer credit
  data/
    types.ts            Match, Team, Player, Article, Result
    source.ts           the DataSource interface — the seam
    local.ts            reads snapshots, falls back to content/fallback
    snapshots.ts        read/write the committed JSON
    liquipedia/
      client.ts         rate limiting, headers, error handling
      parse-matches.ts  the match ticker → Match[]
      parse-league.ts   league wikitext → Team[]
      mirror.ts         crest filename derivation
      queue.ts          which league pages this run should fetch
      __fixtures__/     real captured API responses; tests never hit network
  matches/select.ts     today / upcoming / live / results / by region
components/
  matches/              card, list, crest, ticker
  regions/region-list.tsx
  ui/                   tabs, section header, reveal, freshness badge, footer
  layout/nav.tsx
scripts/
  harvest.ts            fixtures + rosters + crest mirroring
content/
  regions.json          static region definitions
  fallback/matches.json seed data so the site is never blank
data/snapshots/         the database — committed on purpose
public/teams/           mirrored crests — committed on purpose
```

`lib/data/source.ts` is the only data contract the UI knows. Swapping
providers means writing one new implementation of `DataSource`, nothing else.

---

## Regions

`content/regions.json`. A region is listed **only if it currently runs a
league on Liquipedia**. Türkiye and Brazil were removed — their leagues are
inactive, and an entry with no fixtures behind it is worse than none.

Two separate fields, deliberately:

- `liquipediaLeaguePage` — the single page harvested for rosters.
- `matchPrefixes` — the tournament page prefixes that belong to this region.
  An array, because a region can run several competitions (Indonesia runs both
  MPL and MDL).

To add a region: add the entry, update the count in
`lib/content/regions.test.ts`, run `npm run harvest`, confirm teams appear.

---

## Design

Light and dark themes are both first-class. The toggle persists the visitor's
choice and falls back to the operating-system preference.

Tokens live at the top of `app/globals.css`. Brand is orange-gold
(`--brand: #f5a623`), taken from the logo.

- **Mobile first.** Designed at 375px up. No horizontal page scroll at any
  width; tap targets ≥ 44px. Both are asserted in `e2e/mobile.spec.ts`.
- **No loading states in the main flow.** Everything is prerendered, so there
  is nothing to wait for. No skeletons, no spinners.
- **Headings are centred** via `.display` / `.heading`; use the
  `SectionHeader` component rather than styling headings inline.
- **Motion** is CSS keyframes (`.reveal`, `.tab-panel`, `.marquee`), all
  disabled under `prefers-reduced-motion`.

### The marquee has a specific trap

The ticker duplicates its content and slides `-50%`. For that to wrap without
a jump, one group must measure **exactly** half the track. So the spacing
lives inside each group (`gap` + a trailing `pe-10`), never as a `gap` on the
track — a gap on the track leaves one extra gap in the middle and the loop
stutters by half of it. It did, by 20px. `e2e/ticker.spec.ts` measures this.

### Logo

`public/brand/mlbb-logo.svg` is the official lockup with its gradient stops
retargeted to the orange-gold variant; the untouched champagne original sits
beside it. Referenced once, from `lib/content/brand.ts`.

Use is authorised — the project owner works at MOONTON Games. No
unaffiliated-fan-project disclaimer is needed.

---

## Testing

```bash
npm test              # Vitest — pure logic, zero network
npx playwright test   # against the built static export, not the dev server
```

Playwright's `webServer` runs `npm run build && npx serve out`, so the tests
exercise exactly what gets deployed. That is deliberate: the crest 403 and the
marquee jump were both invisible in dev.

Parsers are tested against **real captured responses** in `__fixtures__/`. If
Liquipedia restructures its templates, recapture the fixture, watch the tests
fail, then fix the parser. **Never hand-edit a fixture to make a test pass.**

Mobile tests use `devices['iPhone 13']`, which needs WebKit:
`npx playwright install webkit`.

---

## Commands

```bash
npm run dev            # development server
npm run build          # static export into out/
npm test
npx playwright test
npm run harvest        # fixtures + a batch of rosters + crest mirroring
npx serve out          # preview the real export
```

`LEAGUES_PER_RUN=11 npm run harvest` sweeps every region in one pass — about
six minutes, because of the rate limit. `LEAGUES_PER_RUN=0` refreshes fixtures
and crests only.

`BASE_PATH=/repo-name npm run build` for GitHub project pages.

---

## Known gaps

- **News was removed by product request.** Do not add a news route, feed, or
  navigation item unless the owner explicitly asks for it again.
- **No standings table.** Liquipedia has the data; nothing reads it yet.
- Vietnam's roster page (`Vietnam_MLBB_Championship/2026/Fall`) may 404
  between splits. The harvester warns and moves on; fixtures still map to the
  region via `matchPrefixes`.

## History

The build originally centred on a WebGL globe (three.js + react-three-fiber,
with real coastlines sampled from Natural Earth). It was removed at the
owner's request in favour of animated tabs — the site is a schedule, and the
sphere was weight without payoff. Do not reintroduce it without being asked.

Design and implementation notes live in `docs/superpowers/`.
