# MLBB Esports Hub

Fixtures, results and rosters for **Mobile Legends: Bang Bang** esports across
every region that runs a league — in English and Arabic.

> **[PROJECT.md](PROJECT.md)** is the full reference: architecture, data
> sources, parsers, design decisions, test coverage and known gaps.
> **[DEPLOY.md](DEPLOY.md)** covers hosting. **[AGENTS.md](AGENTS.md)** is the
> working brief for anyone — human or agent — picking the code up.

## How it works

Fetching is completely decoupled from serving.

```
GitHub Actions (hourly)
  └── npm run harvest
        ├── Liquipedia:Matches      → data/snapshots/matches.json
        └── 3 rotating league pages → data/snapshots/teams.json
        └── commits snapshots and new crests → host redeploys
```

The site reads **only** those committed snapshots. It never calls Liquipedia at
request time, so visitor traffic has no effect on API usage, and every page is
statically generated — nothing spins or loads in front of the reader.

### Why hourly

Liquipedia's terms cap `action=parse` at **one request per 30 seconds**. A run
makes four calls, spaced by the client itself, taking about 90 seconds. Results
can therefore trail live play by up to an hour. That is deliberate: this is a
schedule site, and instant rendering matters more here than live scores.

## Deploying

The site builds to plain static files in `out/` — no server, no database, no
secrets. See **[DEPLOY.md](DEPLOY.md)** for step-by-step instructions for
Cloudflare Pages, Netlify, GitHub Pages and Vercel, plus how to get a free
custom domain.

## Commands

```bash
npm run dev          # development server
npm run build        # static export into out/ — every route must be ○ or ●
npm test             # unit tests (no network)
npx playwright test  # smoke and mobile tests
npm run harvest      # fetch matches + a batch of league rosters
```

`LEAGUES_PER_RUN=11 npm run harvest` sweeps every region in one go — useful for
a first-run backfill. It takes roughly six minutes because of the rate limit.

## Data sources

**Liquipedia** (`liquipedia.net/mobilelegends/api.php`) — fixtures, results,
teams and rosters. No API key required, but three things are mandatory and the
request fails without them:

- `Accept-Encoding: gzip` (otherwise HTTP 406, not data)
- a descriptive `User-Agent` with contact details — generic agents are blocked
- one `action=parse` request per 30 seconds

Their content is CC-BY-SA 3.0, so Liquipedia is credited with a link in the
footer of every page. Scraping their rendered HTML pages is forbidden by their
terms; only `api.php` is used.

## Regions

Defined in [`content/regions.json`](content/regions.json). A region is listed
only if it currently runs a league on Liquipedia — MPL Türkiye and MPL Brazil
were dropped because theirs are inactive, and an entry with no fixtures behind
it is worse than none.

`matchPrefixes` maps tournament pages to a region and can hold more than one
entry, since a region may run both a pro and a development league (Indonesia
runs MPL and MDL).

Region page titles drift between seasons. To check what exists:

```bash
curl -sS --compressed -A 'MLBBHub/1.0 (contact: you@example.com)' \
  -G 'https://liquipedia.net/mobilelegends/api.php' \
  --data-urlencode 'action=query' --data-urlencode 'list=allpages' \
  --data-urlencode 'apprefix=MPL/MENA/' --data-urlencode 'format=json'
```

Note that Liquipedia lists pages **alphabetically**, so `Season 10` sorts
between `Season 1` and `Season 2` — the last entry is not the newest season.

## Branding

`public/brand/mlbb-logo.svg` is the official Mobile Legends lockup, with its
gradient stops retargeted to the orange-gold variant. The untouched champagne
version sits beside it as `mlbb-logo-champagne.svg`. Both are referenced
through [`lib/content/brand.ts`](lib/content/brand.ts) — change the one `src`
there to swap them.

## Motion

Animation is plain CSS keyframes driven by an IntersectionObserver
(`components/ui/reveal.tsx`), not an animation library. Everything is disabled
under `prefers-reduced-motion`.

## Adding a region

1. Add an entry to `content/regions.json` with coordinates, an accent colour,
   the league page to harvest, and its `matchPrefixes`.
2. Update the region count in `lib/content/regions.test.ts`.
3. Run `npm run harvest` and confirm teams are written for the new slug.
