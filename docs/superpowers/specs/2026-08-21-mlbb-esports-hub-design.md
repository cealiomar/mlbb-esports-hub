# MLBB Esports Hub — Design

**Date:** 2026-08-21
**Status:** Approved for planning

## Purpose

An Awwwards-calibre web experience for **Mobile Legends: Bang Bang esports only**.
An interactive 3D globe is the entry point: it rotates, highlights every MLBB
competitive region, and on selection reveals that region's league, teams and
rosters. Alongside it the site surfaces today's matches, upcoming fixtures,
results and news, refreshed automatically.

**Content priority, highest first:** the schedule and who plays whom → results →
news. Results may lag by up to an hour; that is an accepted trade. What is not
negotiable is that pages paint instantly — every route is statically generated
from committed data, so the user never sees a spinner or a skeleton.

Visual reference: `esportsnationscup.com` — bold uppercase display type, dark
cinematic hero, large background imagery, card-based news, globe-driven region
navigation.

Non-goal: any game other than MLBB. There is no multi-title abstraction.

## Scope of v1

Full multi-page site, bilingual (Arabic + English, with RTL).

| Route | Contents |
|---|---|
| `/[locale]` | Hero, live match ticker, interactive globe, today's matches, latest news, M8 countdown |
| `/[locale]/regions/[slug]` | Region hero, its league + standings, teams grid, its fixtures |
| `/[locale]/teams/[slug]` | Team profile, roster with roles, recent results |
| `/[locale]/matches` | Tabs: Today / Upcoming / Results, filterable by region |
| `/[locale]/news` | Aggregated MLBB esports news |

## Regions

Static definitions live in `content/regions.json` (name, slug, lat/long, accent
colour, Liquipedia league page, current season). They are **not** fetched.

Indonesia · Philippines · Malaysia · Singapore · Cambodia · MENA · Latin America ·
Myanmar · Thailand · Vietnam · Türkiye · CIS · Brazil

International events tracked separately: MSC, M8 World Championship, EWC,
Asian Games.

## Data sources

### Primary — Liquipedia MediaWiki API

Reached at `https://liquipedia.net/mobilelegends/api.php`. **No API key is
required.** Verified working on 2026-08-21 returning live fixtures.

Their Terms of Use impose hard constraints that shape the whole architecture:

- `action=parse` — **max 1 request per 30 seconds.** This is the action we need.
- All HTTP requests — max 1 per 2 seconds.
- `Content-Encoding: gzip` is **mandatory**; requests without it are rejected
  with HTTP 406.
- A descriptive `User-Agent` including contact information is mandatory.
  Generic agents (`node-fetch`, `Python-requests`) are blocked.
- Results must be cached "as long as possible".
- **Scraping Liquipedia's rendered HTML pages is expressly forbidden.** Only
  `api.php` may be used.
- Content is CC-BY-SA 3.0 — Liquipedia must be visibly attributed with a link.

Endpoints used:
- `action=parse&page=Liquipedia:Matches&prop=text` → all upcoming and completed
  matches across every region, one call.
- `action=parse&page=MPL/<Region>/Season_<N>&prop=wikitext` → per-league infobox,
  format, prize pool, participating teams.
- `action=parse&page=<Team>&prop=wikitext` → roster and player roles.

### Secondary — news

Liquipedia is not a news source. News is aggregated from public RSS/Atom feeds of
MLBB esports outlets, normalised into the same `Article` type. Each item links
out to its original source and is attributed; we store headline, excerpt, image
and link only — never full article bodies.

### Rejected — ph-mpl.com scraping

`ph-mpl.com/schedule` is server-rendered and technically parseable, but
Liquipedia already provides Philippines fixtures through a sanctioned API. Adding
an unsanctioned scraper of an official MOONTON/Mineski property would introduce
legal ambiguity and a fragile selector dependency for data we already hold. Not
included. If PH-specific data unavailable elsewhere is needed later, it gets its
own adapter behind the same interface.

## Architecture

The 30-second `action=parse` ceiling makes per-visitor fetching impossible, and
makes even a single "refresh everything" job impossible — thirteen regions would
need 6.5 minutes of serialised waiting, exceeding serverless duration limits.

Therefore fetching is **fully decoupled from serving**.

```
GitHub Actions (cron, hourly)
    └── harvester: match ticker + 3 rotating league pages,
        fetched via api.php, normalised, written as JSON
            └── commits data/snapshots/*.json
                    └── Vercel redeploys
                            └── Next.js serves static/ISR pages
```

- `Liquipedia:Matches` is fetched **every run** — it is one call and carries all
  fixtures and results. This is the freshness-critical data.
- Three league pages rotate through the queue per run, completing a full
  13-region rotation in under five hours. Rosters change rarely; this is ample.
- Spacing between calls in a single run is ≥30s, enforced in code.
- The site itself makes **zero** requests to Liquipedia at runtime. Traffic
  volume has no effect on our API usage.

Hourly refresh is a deliberate product decision: the site's purpose is fixtures
and schedule, where an hour of lag on results costs nothing, and static pages
that paint instantly matter more than live scores.

Upgrade path if freshness ever needs to be near-real-time: swap the commit step
for a write to Upstash Redis and have the app read from KV. The harvester and
adapters do not change.

### Directory layout

```
app/[locale]/          route groups per page above
app/api/               revalidate hook
lib/data/
  source.ts            DataSource interface — the seam
  liquipedia.ts        parse + normalise
  local.ts             JSON fallback adapter
  types.ts             Region, League, Team, Player, Match, Article
scripts/harvest.ts     the GitHub Actions entrypoint
content/regions.json   static region definitions
data/snapshots/        harvested output, committed
components/globe/      R3F canvas, markers, camera controller
components/ui/         cards, ticker, tables
messages/{ar,en}.json  UI copy
```

`source.ts` is the only thing pages import. Swapping Liquipedia for another
provider means writing one new file.

## The globe

- React Three Fiber + drei.
- Continents rendered as a **point cloud** generated from GeoJSON, not a
  photographic texture. Lighter, and matches the graphic-design direction better.
- One marker per region at its lat/long, tinted with the region accent colour.
- A region with a live match pulses.
- Idle: slow auto-rotation. Hover: marker scales, label appears. Click: GSAP
  tweens the camera to face that region and a side panel slides in with its teams.
- **Required fallback:** when WebGL is unavailable or the user prefers reduced
  motion, a flat SVG region selector renders instead. Every piece of information
  reachable through the globe is reachable without it.

## Visual direction

Near-black ground, MLBB orange/gold as the primary accent (taken from the
supplied logo), a per-region secondary accent. Oversized condensed uppercase
display type for Latin text, a heavy Arabic display face for RTL. Scroll-driven
GSAP reveals, a marquee fixture ticker, fine grain overlay, large regional
background imagery.

Full light and dark handling is not needed — the design commits to dark.

**Team crests are a required design element**, not decoration: every fixture
shows both teams' logos, sourced from Liquipedia and served through the Next.js
image optimiser. A team with no logo upstream renders a styled monogram of the
same footprint — never a broken image or a gap.

**Mobile-first is a hard requirement.** Every layout is designed at 375px and
enhanced upward, with no horizontal page scroll at any width and tap targets of
at least 44px. On compact viewports the globe runs at reduced point density and
is always accompanied by a text region list, so nothing is reachable only by
dragging a sphere.

## Error handling

`DataSource` methods return an explicit success/failure result rather than
throwing. Resolution order on failure:

1. Most recent committed snapshot.
2. `content/fallback/*.json`, seeded with real 2026 season data.

The UI renders a small "data delayed" badge with the snapshot timestamp. It never
shows an empty state caused by an upstream failure, and never shows a spinner
that can hang.

Harvester failures are loud: the Actions run fails and the previous snapshot
stays in place, so the site degrades to stale rather than broken.

## Testing

- **Vitest** — wikitext/HTML → typed model normalisation, driven by committed
  fixtures captured from real API responses. The fallback resolution chain. The
  harvester queue rotation and its 30-second spacing. No test performs a network
  call.
- **Playwright** — smoke only: home renders, globe canvas mounts, clicking a
  region opens its panel, locale switch flips direction to RTL, `/matches` lists
  fixtures.

## Assets and attribution

- The MLBB logo and brand palette are used with authorisation — the project owner
  works at MOONTON Games and this is internal work. No unaffiliated-fan-project
  disclaimer is required. Logo file lives at `public/brand/mlbb-logo.png`.
- Liquipedia attribution with a link is required on every page displaying its
  data, per CC-BY-SA 3.0.
- News items link to and credit their original publisher.

## Build order

1. Scaffold, types, `DataSource` interface, local JSON adapter seeded with real
   2026 data, plus its tests.
2. Design system and static home page.
3. Globe, with its non-WebGL fallback.
4. Region, team, matches and news pages.
5. Liquipedia adapter, harvester script, GitHub Actions workflow.
6. Arabic/English localisation and RTL polish.

Phases 1–4 are fully functional on local data. The site is never blocked on the
upstream API.

## Open questions

None. No credentials or third-party accounts are required to build or run this.
