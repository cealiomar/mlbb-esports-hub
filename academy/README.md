# MPL MENA Academy

A separate site from the hub in the repository root: its own design, its own
build, the same data.

- **Dashboard** — live and upcoming fixtures, MPL MENA standings, the patch
  meta, players and the curriculum on one screen.
- **Matches** — live, upcoming and finished series.
- **Meta** — the full tier list, filterable by lane.
- **Draft** — a draft simulator that suggests the strongest available heroes
  of the patch for the lanes a side still needs.
- **Players** — every MPL MENA roster, with mirrored portraits.
- **Learn** — the curriculum and its lessons.

Arabic is the default language; English lives under `/en/`.

## Run it

Dependencies are the ones already installed in the repository root.

```bash
cd academy
npm run dev        # http://localhost:3200
npm run build      # static export into academy/out
npm run preview    # serve the export on http://localhost:3200
```

## Where the data comes from

Nothing is fetched while the site is served. Every page is prerendered from
JSON committed in the repository root:

| Shown here | Read from | Written by |
|---|---|---|
| Fixtures and results | `data/snapshots/matches.json` | `npm run harvest` |
| Standings | `data/snapshots/standings.json` | `npm run harvest` |
| Rosters | `data/snapshots/teams.json` | `npm run harvest` |
| Player portraits | `data/snapshots/player-photos.json` | `npm run harvest:players` |
| Tiers and lanes | `data/snapshots/patch-meta.json` | `npm run harvest:meta` |
| Hero names and portraits | `data/snapshots/hero-catalog.json` | `npm run sync:hero-catalog` |
| Lessons | `content/academy.json` | edited by hand |

Images are mirrored in the root `public/` folder. `scripts/sync-assets.mjs`
copies the ones this site needs into `academy/public/` before every build, so
those folders are ignored by git.

## Adding a lesson video

In `content/academy.json`, add the 11-character YouTube id to a lesson:

```json
"youtubeId": "dQw4w9WgXcQ"
```

Public and unlisted videos both embed. The lesson page shows the player above
its key points.

## Deploying to Vercel

Create a new Vercel project from this repository and set **Root Directory**
to `academy`. Leave "Include files outside the root directory" enabled: the
build reads `../data` and `../public`. The framework preset is Next.js; the
build command is `npm run build`.
