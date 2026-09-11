# Deploying

The site builds to plain static files in `out/` — no server, no database, no
environment variables, no secrets. Any static host runs it.

> **Best zero-cost setup for hourly match updates:** use a **public GitHub
> repository + GitHub Pages** (Option 3). Standard GitHub-hosted Actions are
> free for public repositories, so the hourly data refresh does not consume a
> private-repository minutes allowance. Cloudflare Pages is an excellent CDN,
> but its Free plan currently limits Git-integrated builds to 500 per month;
> an always-hourly rebuild can exceed that ceiling.

```bash
npm ci
npm run build      # writes out/
```

You can open `out/` locally to check it before uploading:

```bash
npx serve out
```

---

## Option 1 — Cloudflare Pages (best CDN, with a build-quota note)

Free, serves from the root (no path juggling), free custom domains, and a free
`*.pages.dev` subdomain you can use straight away.

1. Push this repo to GitHub (see **Pushing to GitHub** below).
2. Go to <https://dash.cloudflare.com> → **Workers & Pages** → **Create** →
   **Pages** → **Connect to Git**.
3. Pick the repo, then set:
   - **Framework preset:** `Next.js (Static HTML Export)`
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
   - **Node version:** `20` (add an env var `NODE_VERSION` = `20`)
4. **Save and Deploy.**

You get `https://<project>.pages.dev`. Every push rebuilds automatically — and
because the hourly harvester commits fresh fixtures, the live site updates on
its own.

The Free plan currently allows 500 builds per month. For a guaranteed
zero-cost Git-integrated setup, either use GitHub Pages below or change the
harvest cron to every two hours (`0 */2 * * *`), which stays below that limit.

## Option 2 — Netlify

`netlify.toml` is already in the repo, so there is nothing to configure.

1. Push to GitHub.
2. <https://app.netlify.com> → **Add new site** → **Import an existing project**
   → pick the repo → **Deploy**.

You get `https://<name>.netlify.app`, renameable in site settings.

## Option 3 — GitHub Pages (recommended for hourly free updates)

`.github/workflows/deploy.yml` handles this end to end, including the
`/<repo>` base path that project pages need.

1. Push to GitHub.
2. Repo → **Settings** → **Pages** → **Source: GitHub Actions**.
3. Repo → **Settings** → **Actions** → **General** → **Workflow permissions** →
   **Read and write permissions** (the harvester needs this to commit data).

You get `https://<user>.github.io/<repo>/`.

> If you later name the repo `<user>.github.io`, the workflow detects it and
> drops the base path automatically.

## Option 4 — Vercel (free `*.vercel.app` name, no domain needed)

The Hobby plan is free and covers personal, non-commercial projects — this site
qualifies: it is a free tool for players, and the PayPal link is an optional
donation, not a sale.

1. Sign in at <https://vercel.com> with GitHub.
2. **Add New → Project → Import** `mlbb-esports-hub`. Vercel detects Next.js
   and the static export on its own; leave every setting at its default and
   **do not** set `BASE_PATH` — the site belongs at the root of its own name.
3. **Deploy.**

The project name becomes the address, so name it before deploying:
`https://<project-name>.vercel.app`. This project uses **`mplhub`**, giving
`https://mplhub.vercel.app` (`mpl-hub` is already taken by an unrelated site). If a
name is taken Vercel appends a suffix; it can be renamed later under
**Settings → General**, or given an extra free `*.vercel.app` alias under
**Settings → Domains**.

**Updates are automatic.** The hourly harvester commits fresh data to `main`,
and every push to `main` is a new production deployment — roughly 24 a day,
with nothing to do by hand.

**Caching.** `vercel.json` gives hashed build assets a one-year immutable cache
and mirrored images a one-day cache. HTML is left on Vercel's default, which
revalidates every request, so each hourly refresh is visible immediately.
(`public/_headers` is for Cloudflare and Netlify; Vercel ignores it.)

**One build is enough.** Once the Vercel address works, the GitHub Pages
deploy is a duplicate. Either keep it as a backup, or disable
**Deploy to GitHub Pages** under the repo's **Actions** tab. Leave
**Harvest Liquipedia** enabled — it is what keeps both sites current.

---

## Pushing to GitHub

```bash
git remote add origin https://github.com/<your-username>/mlbb-esports-hub.git
git push -u origin main
```

Create the empty repo first at <https://github.com/new> — do not let it add a
README, licence, or `.gitignore`, or the first push will be rejected.

---

## A free custom domain

The `*.pages.dev`, `*.netlify.app` and `*.github.io` subdomains above are free
and permanent, and are enough for most uses.

For a free *custom* name, [is-a.dev](https://github.com/is-a-dev/register) and
[js.org](https://github.com/js-org/js.org) both hand out subdomains
(`yourname.is-a.dev`) by pull request. Point the record at whichever host you
picked, then add the domain in that host's dashboard.

Genuinely free top-level domains (`.tk`, `.ml`) are no longer reliable and
routinely get reclaimed — not worth building on.

---

## Keeping the data fresh

`.github/workflows/harvest.yml` runs hourly on GitHub Actions. It fetches
fixtures from Liquipedia, commits the JSON into `data/snapshots/`, and that
commit triggers a rebuild on whichever host you chose.

For this to work the workflow needs write access:
**Settings → Actions → General → Workflow permissions → Read and write.**

Trigger the first run by hand from the **Actions** tab (**Harvest Liquipedia**
→ **Run workflow**) rather than waiting for the hour.

If you deploy somewhere with no Git integration, run `npm run harvest` locally
and re-upload `out/`.

---

## Checks before you ship

```bash
npm test              # unit tests, no network
npx playwright test   # end-to-end tests against the real static export
npm run build         # every route must print ○ or ●, never ƒ
```

A route printed as `ƒ (Dynamic)` means something is being computed per request,
which a static host cannot do — fix it rather than deploying around it.
