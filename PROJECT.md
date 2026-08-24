# MLBB Esports Hub — Project Reference

Complete reference for the project: what it does, how it is built, why it is
built that way, and everything needed to run, extend or hand it over.

> **Current product override (2026-08-24):** News has been removed. Regional
> standings and the current-season Draft Lab are now part of the primary flow. The visual
> system now supports persisted light and dark glass themes, region flags and
> pointer-driven 3D fixture cards. Any older news or dark-only notes below are
> retained as historical implementation context and are no longer requirements.

**Status:** feature-complete, tested and deployed on GitHub Pages.
**Author:** cealiomar — [Instagram](https://www.instagram.com/cealiomar.design/) · cealiomar@gmail.com
**Repo layout:** single Next.js app, no monorepo, no services.

---

## 1. What it is

A bilingual (English / Arabic) website for **Mobile Legends: Bang Bang**
esports. It answers one question well: *who is playing, when, and what
happened?*

Scope is MLBB only. There is no multi-game abstraction and none should be
added.

### Priority of content

1. **Fixtures and the schedule** — who plays whom, and when
2. **Live matches** — in progress right now, with running score
3. **Regional standings** — records, points and qualification zones
4. **Results** — completed matches with the winner marked
5. **Draft scouting** — league Top Picks/Bans and available team game sheets
6. **Teams and rosters** — per region

### Live data, right now

| | |
|---|---|
| Matches tracked | 100 — 50 upcoming, 50 completed |
| Teams | 100 |
| Players | 662 |
| Regions | 11, all with rosters |
| Crests self-hosted | 77 images, 436 KB |
| Draft coverage | 3 leagues · 181 hero rows · 89 exact game drafts |

Teams per region: Indonesia 9 · Philippines 8 · Malaysia 8 · Singapore 10 ·
Cambodia 10 · MENA 8 · LATAM 8 · Myanmar 9 · Thailand 10 · Vietnam 3 · CIS 16

---

## 2. Pages

| Route | What it shows |
|---|---|
| `/` | Prerendered redirect to the visitor's locale |
| `/{locale}` | Hero, live cards, standings rail, ticker, regions and schedule |
| `/{locale}/matches` | All fixtures — Live / Today / Upcoming / Results |
| `/{locale}/drafts` | Current league Top Picks/Bans and team draft sheets |
| `/{locale}/regions/{slug}` | One region: full standings, fixtures and teams |
| `/{locale}/teams/{slug}` | Roster, available draft profile and recent results |

`{locale}` is `en` or `ar`. Arabic is full RTL: layout mirrors, fixture order
reverses so the first team reads first, and the ticker travels the other way.

### Interface behaviour

- **Tabs** — a gold pill slides between labels, each carrying a live count.
  The indicator position is measured from the DOM, not calculated, so it is
  correct in RTL and at any label width.
- **Ticker** — a seamless marquee of the day's fixtures, pausing on hover,
  with a live dot on matches in progress.
- **Cards** — both crests, both team codes and full names, the tournament and
  round, kickoff time or a pulsing LIVE badge, and a winner-weighted score.
- **Motion** — CSS keyframes plus one IntersectionObserver for scroll reveals.
  No animation library. All of it disabled under `prefers-reduced-motion`.
- **Freshness** — a badge shows when data was last harvested, and turns amber
  past an hour.

---

## 3. Architecture

The one decision everything else follows from: **fetching is completely
decoupled from serving.**

```
GitHub Actions, hourly
   │
   ├─ npm run harvest
   │    ├─ Liquipedia:Matches ............. 100 fixtures + results, 1 call
   │    ├─ all active league pages ......... standings
   │    ├─ 3 rotating league pages ......... rosters + full hero statistics
   │    ├─ latest played stage pages ........ exact game drafts
   │    └─ mirrors team + hero images ....... public/teams/ + public/heroes/
   │
   └─ commits data/snapshots/*.json
          │
          └─ push triggers a rebuild on the host
                 │
                 └─ next build → out/ → static files
```

The site reads **only** the committed JSON. It never contacts Liquipedia while
serving a visitor.

### Why

Liquipedia caps `action=parse` at **one request per 30 seconds**. Fetching
per visitor is impossible at any traffic level. Decoupling means visitor
volume has zero effect on API usage, and every page is a plain file that
paints instantly.

The cost is that results can trail live play by up to an hour. That is an
accepted trade for a schedule site.

### Data flow in the app

```
page.tsx
  └─ createLocalDataSource()          lib/data/local.ts
       ├─ readSnapshot()              data/snapshots/*.json
       └─ falls back to               content/fallback/matches.json
            └─ returns Result<T>      never throws
                 └─ lib/matches/select.ts   today / live / upcoming / results
                      └─ components render
```

`lib/data/source.ts` defines `DataSource` — the only data contract the UI
knows. Swapping providers means writing one new implementation of that
interface and changing nothing else.

### Error handling

`DataSource` methods return an explicit success/failure `Result`, never throw.
Resolution order: committed snapshot → bundled fallback → empty. The UI shows
a "data delayed" badge rather than an empty page, and can never hang on a
spinner because there is nothing to wait for.

The harvester fails loudly instead: if it parses zero matches it exits non-zero
and leaves the previous snapshot alone, so the site goes stale rather than
blank.

---

## 4. Data sources

### Liquipedia — fixtures, results, standings, teams, rosters

`https://liquipedia.net/mobilelegends/api.php`. **No API key is required.**

Four things are mandatory, and the request fails without them:

| Requirement | Consequence if missed |
|---|---|
| `Accept-Encoding: gzip` | **HTTP 406** — looks like an auth error, is not |
| Descriptive `User-Agent` with contact info | Blocked; `node-fetch`/`undici` rejected by name |
| ≤ 1 `action=parse` per 30 s | Rate limited |
| ≤ 1 request per 2 s otherwise | Rate limited |

Content is CC-BY-SA 3.0, so Liquipedia is credited with a link in the footer
of every page. **Scraping their rendered HTML pages is forbidden by their
terms** — only `api.php`. Parsing the HTML that `action=parse&prop=text`
*returns* is fine; that is the API.

Endpoints used:
- `action=parse&page=Liquipedia:Matches&prop=text` — every fixture and result
  across all regions in one call
- `action=parse&page=<league>&prop=text` — current regional standings
- `action=parse&page=<league>&prop=wikitext` — participants and rosters
- `action=parse&page=<league>/Statistics&prop=text` — complete hero table
- `action=parse&page=<played stage>&prop=wikitext` — exact Picks/Bans per game
- `action=query&list=allpages&apprefix=…` — checking which season pages exist
  (cheap: 1 req / 2 s)

### Team crests and hero portraits — self-hosted, never hotlinked

Liquipedia returns **403** to image requests carrying an off-site `Referer`.
Hotlinked crests work in local development and break on a real domain.

The harvester downloads each crest to `public/teams/`, each hero portrait to
`public/heroes/`, and rewrites snapshots to local paths. Playwright asserts
that neither surface is remote and that every image has `naturalWidth > 0`.

### News

Removed by product request. Do not restore a route or feed unless explicitly
requested again.

### Rejected: scraping ph-mpl.com

Server-rendered and parseable, but Liquipedia already provides Philippines
fixtures through a sanctioned API. An unsanctioned scraper of an official
MOONTON property would add legal ambiguity and a fragile selector dependency
for data already held.

---

## 5. Regions

Defined in `content/regions.json`. A region is listed **only if it currently
runs a league on Liquipedia**. Türkiye and Brazil were removed — their leagues
are inactive, and an entry with no fixtures behind it is worse than none.

Each region carries two distinct fields:

- `liquipediaLeaguePage` — the single page harvested for rosters
- `matchPrefixes` — an **array** of tournament page prefixes belonging to this
  region, because a region can run several competitions (Indonesia runs both
  MPL and MDL)

Plus `slug`, bilingual `name`, `accent` colour, and `leagueName`.

### Adding a region

1. Add the entry to `content/regions.json`
2. Update the count in `lib/content/regions.test.ts`
3. `npm run harvest` and confirm teams appear for the new slug

### Finding the right page title

Season pages move between splits. To list what exists:

```bash
curl -sS --compressed -A 'MLBBHub/1.0 (contact: cealiomar@gmail.com)' \
  -G 'https://liquipedia.net/mobilelegends/api.php' \
  --data-urlencode 'action=query' --data-urlencode 'list=allpages' \
  --data-urlencode 'apprefix=MPL/MENA/' --data-urlencode 'format=json'
```

**The listing is alphabetical, not numeric.** `Season 10` sorts between
`Season 1` and `Season 2`, so the last entry is *not* the newest season. This
caused a misreading twice during the build.

---

## 6. File layout

```
app/
  page.tsx                  root: prerendered locale redirect
  globals.css               design tokens, motion, component classes
  [locale]/
    layout.tsx              fonts, direction, nav, footer
    page.tsx                home
    matches/page.tsx
    drafts/page.tsx
    regions/[slug]/page.tsx
    teams/[slug]/page.tsx

components/
  drafts/    Draft Lab rankings · team profile · hero portrait fallback
  layout/nav.tsx
  home/hero.tsx
  matches/  match-card · match-list · team-crest · ticker
  standings/ standings-overview · standings-table
  regions/region-list.tsx
  ui/       tabs · section-header · reveal · freshness-badge · attribution · brand-mark

lib/
  content/  regions.ts · brand.ts · author.ts
  matches/select.ts         today / live / upcoming / results / by region
  data/
    types.ts                Match · Team · Player · StandingTable · Result
    source.ts               the DataSource interface — the seam
    local.ts                reads snapshots, falls back
    snapshots.ts            read/write committed JSON
    liquipedia/
      client.ts             rate limiting, headers, errors
      parse-matches.ts      match ticker HTML → Match[]
      parse-standings.ts    league table HTML → StandingTable[]
      parse-league.ts       league wikitext → Team[]
      parse-drafts.ts       hero statistics + exact game drafts
      mirror.ts             local crest / hero filename derivation
      queue.ts              which league pages this run fetches
      __fixtures__/         real captured API responses
  drafts/analytics.ts       league rankings + team-perspective analysis

scripts/
  harvest.ts                fixtures + standings + rosters + drafts + mirrors

content/
  regions.json              static region definitions
  fallback/matches.json     seed data so the site is never blank

data/snapshots/             the database — committed on purpose
public/teams/               mirrored crests — committed on purpose
public/heroes/              mirrored hero portraits — committed on purpose
public/brand/               the logo lockup

i18n/                       routing and request config
messages/                   en.json · ar.json — all UI copy
e2e/                        Playwright specs
.github/workflows/          harvest.yml · deploy.yml
```

**`data/snapshots/`, `public/teams/` and `public/heroes/` are committed
deliberately.** They are the database and the image store; without them the
build has nothing to render.

---

## 7. Parsers

### Match ticker

`lib/data/liquipedia/parse-matches.ts`, written against real captured markup.

- `[data-toggle-area-content="1"]` holds upcoming, `="2"` holds completed
- Each match is `div.match-info`
- `span.timer-object[data-timestamp]` gives **unix seconds** — use it, never
  the human-readable text, which carries a timezone abbreviation
- Two `div.match-info-header-opponent`; the winner also carries
  `match-info-header-winner`
- Crests appear twice (light/dark mode variants); the dark one is preferred
- A fixture in the *upcoming* area that already carries a score is **live**,
  not pending — that is how live matches are detected
- Identical `TBD vs TBD` bracket placeholders get a numeric suffix so ids stay
  unique and stable

### League rosters

`lib/data/liquipedia/parse-league.ts`. The structure is **not** `{{TeamCard}}`
— that was an assumption that proved wrong. It is:

```
{{TeamParticipants
  |{{Opponent|AP.Bren
     |players={{Persons
        |{{Person|JMPINKMAN|role=exp}}
        |{{Person|Bitoy|role=Head Coach|type=staff}}
```

The parser scans balanced braces rather than using a regex, because regexes
cannot match nesting.

**Trap:** a naive search for `{{Person` also matches `{{Persons`. The parser
checks the character following the template name. Without that check it
produced a player named `s`.

`type=staff` entries (coaches, analysts) are excluded from rosters.
Substitutes are players and are included.

---

## 8. Design

Dark only — no light-theme branches. Tokens are at the top of
`app/globals.css`; brand is orange-gold `#f5a623`, taken from the logo.

- **Mobile first**, designed at 375px upward. No horizontal page scroll at any
  width; tap targets ≥ 44px. Both asserted in tests.
- **No loading states.** Everything is prerendered; there is nothing to wait
  for. No skeletons, no spinners.
- **Headings are centred** — use the `SectionHeader` component rather than
  styling headings inline.
- **Type scale** is fluid (`clamp`) via `--step-*` tokens. Arabic gets a
  looser line-height (1.45 vs 1.04) because its diacritics need the room.

### The marquee trap

The ticker duplicates its content and slides `-50%`. For that to wrap without
a jump, **one group must measure exactly half the track**. So spacing lives
inside each group (its own `gap` plus a trailing `pe-10`), never as a `gap` on
the track — a gap on the track leaves one extra gap in the middle and the loop
stutters by half of it. It did, by a measured 20px. `e2e/ticker.spec.ts`
guards this with a geometry assertion.

### Logo

`public/brand/mlbb-logo.svg` is the official lockup with its gradient stops
retargeted to the orange-gold variant; the untouched champagne original sits
beside it as `mlbb-logo-champagne.svg`. Referenced once, from
`lib/content/brand.ts` — change the single `src` there to swap them.

Use is authorised: the project owner works at MOONTON Games.

---

## 9. Testing

```bash
npm test              # 81 unit tests — pure logic, zero network
npx playwright test   # 24 end-to-end tests against the built static export
```

**Playwright runs against `npx serve out`, not the dev server.** This is
deliberate: both the crest 403 and the marquee jump were invisible in
development and only appeared in the real export.

Parsers are tested against **real captured responses** in `__fixtures__/`. If
Liquipedia restructures its templates the fixtures go stale and tests catch
it — recapture the fixture, watch the test fail, then fix the parser.
**Never hand-edit a fixture to make a test pass.**

What the suite actually guards:

- Liquipedia client: mandatory headers, the 30-second spacing, error paths
- Match parsing: live detection, winner marking, region mapping, id stability
- League parsing: staff exclusion, the `{{Persons}}` collision, roles, flags
- Selection logic: day boundaries, ordering, limits, region filters
- Harvest queue: batch rotation, full coverage, wrap-around
- Crest mirroring: stable filenames, collision resistance
- RSS: RSS and Atom, publisher attribution, malformed input
- Tabs: one selected at a time, panel actually changes, indicator tracks in
  both LTR and RTL
- Ticker: group is exactly half the track, in both directions; pause on hover
- Mobile (real WebKit, iPhone 13): no horizontal scroll on seven routes, tap
  target sizes, crests load their pixels, no loading placeholder
- Footer: developer credit links resolve

Mobile tests need WebKit: `npx playwright install webkit`.

---

## 10. Commands

```bash
npm run dev                  # development server
npm run build                # static export into out/
npm test                     # unit tests
npx playwright test          # end-to-end
npx serve out                # preview the real export

npm run harvest              # fixtures + a batch of rosters + crests
npm run harvest:news         # headlines
```

| Variable | Effect |
|---|---|
| `LEAGUES_PER_RUN=11` | sweep every region in one pass (~6 min, rate limited) |
| `LEAGUES_PER_RUN=0` | fixtures and crests only, no rosters |
| `RUN_INDEX=n` | which batch of league pages to rotate to |
| `BASE_PATH=/repo` | for GitHub project pages |

---

## 11. Deployment

Builds to plain static files in `out/` — no server, no database, no
environment variables, **no secrets of any kind**. Runs on any static host.

Full step-by-step instructions for Cloudflare Pages, Netlify, GitHub Pages and
Vercel, plus free custom domains, are in **[DEPLOY.md](DEPLOY.md)**.

Shortest path:

```bash
git remote add origin https://github.com/<username>/mlbb-esports-hub.git
git push -u origin main
```

then connect the repo at <https://dash.cloudflare.com> → Workers & Pages,
build command `npm run build`, output directory `out`.

`.github/workflows/harvest.yml` then keeps it current on its own: it runs
hourly, commits fresh data, and that commit triggers a rebuild. It needs
**Settings → Actions → General → Workflow permissions → Read and write.**

### Before shipping

```bash
npm test && npx playwright test && npm run build
```

Every content route in the build output must print `○ (Static)` or `● (SSG)`.
A `ƒ (Dynamic)` route means something is being computed per request, which a
static host cannot do — fix the route rather than changing the host.

---

## 12. Numbers

| | |
|---|---|
| Runtime dependencies | 6 |
| Source | ~2,320 lines |
| Unit tests | 81, in ~690 lines |
| End-to-end tests | 24, in ~247 lines |
| Static output | 1,295 files, 23 MB |
| Mirrored crests | 77 images, 436 KB |
| Tracked files | 169 |

Dependencies: `next`, `react`, `react-dom`, `next-intl`, `node-html-parser`,
`fast-xml-parser`.

---

## 13. Known gaps and next steps

- **No match-detail route.** Exact Picks, Bans, side, duration, MVP and VOD are
  available in Draft Lab for the matches where Liquipedia publishes them.
- **News is removed**, by choice.
- Vietnam's roster page (`Vietnam_MLBB_Championship/2026/Fall`) may 404
  between splits. The harvester warns and moves on; fixtures still map to the
  region through `matchPrefixes`.
- **No search or filtering** across teams and players.
- **No timezone picker** — by product choice, every fixture and the “Today”
  grouping are fixed to Egypt time (`Africa/Cairo`) and labelled accordingly.
- **Some completed matches have no direct replay** — only verified, match-level
  VOD URLs are linked; cards say when the source has not published one.

---

## 14. History

The build originally centred on a WebGL globe (three.js + react-three-fiber,
with real coastlines sampled from Natural Earth land data and a polygon cage).
It worked, but was removed at the owner's request in favour of animated tabs:
the site is a schedule, and the sphere was weight without payoff. Removing it
also dropped four dependencies. **Do not reintroduce it without being asked.**

Two other reversals worth knowing about, because both looked settled and were
not:

- A Liquipedia **API key** was assumed necessary. It is not — the failures
  were the missing gzip header returning 406.
- **Locale middleware** was the original routing approach. It requires a Node
  server, which ruled out every free static host; it was replaced by a
  prerendered root redirect.

Design and planning documents live in `docs/superpowers/`. Working notes for
agents are in [AGENTS.md](AGENTS.md).
