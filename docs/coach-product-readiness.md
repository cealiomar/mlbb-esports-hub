# Draft Coach: evidence-first beta

Review date: 2026-09-08. This is a product/engineering assessment, not a claim
that a commercially reliable prediction model has been delivered.

## Implemented

- Compact setup, immediate start, collapsible advanced team scouting; starting
  a draft focuses the current decision rather than leaving the user above it.
- One consistent evidence scope for picks, bans, combinations and matchups:
  selected region, map, and 14 days (default), 28 days or current configured
  season. Windows are anchored to the committed snapshot timestamp.
- Complete, dated, resolved games only; invalid, conflicting and duplicate
  records cannot enter the workspace. Filtered views do not reuse season-wide
  hero summary percentages. No silent fallback to other regions/old games.
- Ranked tier-list scores removed from automatic pick/ban ranking. Role
  priors and local hero portraits remain available for free manual practice.
- Three-hero cores retrieved from at least three actual games, with source
  pages, teams, dates, exact W/L and the original five-slot role assignment.
  Choosing a core adds a bounded four-point preference, not an automatic pick.
  Enemy picks/bans suspend a blocked core. No recommendation bypasses roles.
- Observed proportions include a Wilson 95% sampling interval; same-team
  games may be correlated, so these are not future-match probability bounds.
- Experimental final win-edge numbers are collapsed behind a warning.
- Scheduled refresh validates draft tests as well as parsers/match selection.
  New snapshots rebuild the statistics and observed cores automatically;
  no autonomous parameter tuning or continuous neural training is claimed.

## Reproducible data check

Snapshot: `data/snapshots/drafts.json`, harvested 2026-09-08 18:55:04 UTC.
The unit is a game, not a series or a sum of hero-pair relationships.

- 223 source games across Indonesia, Philippines, Malaysia and Myanmar.
- 206 dated/resolved games; 17 games have no confirmed date.
- 119 eligible games in the default 14-day window: ID 37, PH 17, MY 21, MM 44.
- No malformed, conflicting or duplicate games detected in this snapshot.
- Source game patch identifiers are absent. A date window must **not** be
  advertised as a verified exact-patch dataset.

Run `npm run test:coach-evidence` to reproduce the chronological holdout.
It excludes full-season summaries, keeps series together and restricts the
training window to the 14 days before the held-out cutoff.

Current result: 107 training games, 73 held-out games, cutoff 2026-08-30.
Accuracy 47.95%; approximate game-level 95% interval 36.88–59.22%.
Brier loss 0.24932 versus neutral 0.25 and training-base-rate 0.24067
(lower is better). It does **not** beat the stronger simple baseline.
This is not evidence of competitive drafting advantage. The older full-season
training evaluation and the rolling-window evaluation are different protocols;
their accuracies must not be compared as if only model quality changed.

The score range is compressed near 50%, and current role-catalog knowledge is
not historically versioned. A single holdout cannot establish calibration,
robustness across regions, causal counter strength or game-winning draft quality.
The [scikit-learn calibration guide](https://scikit-learn.org/stable/modules/calibration.html)
explains why probability calibration needs independent validation and why
Brier loss alone does not isolate calibration quality.

### Season replay and learned challenger

The same command also runs a region-specific next-day walk-forward test.
Each update fits only earlier calendar days in the last 14 days of that
region's configured current season. Whole test days are held back together.
At least 20 prior regional games are required. Fixed model parameters are
not adjusted to these test scores. Pass `-- --output test-results/coach-evidence.json`
to retain the per-game prediction audit. Full scheduled harvests retain this
report as a 14-day Actions artifact after deployment of this code.

This snapshot produces 20 training updates and 117 evaluated games; 89
cold-start games are skipped, not scored as successes. Results:

| Method | Correct / tested | Accuracy | Brier loss |
| --- | --- | --- | --- |
| Existing draft comparison | 56 / 117 | 47.86% | 0.24993 |
| Offline learned challenger | 55 / 117 | 47.01% | 0.25808 |
| Prior regional team-position base rate | — | 55.98% (ties half-credit) | 0.24060 |

The challenger is an L2-regularized logistic model of signed hero picks and
same-team hero pairs seen in at least three training games. It fits actual
outcomes with no tier-list scores or team identities; fixed regularization
and optimization settings are documented in code. Swapping teams complements
its prediction. It is **not enabled in the website**: this exploratory model
did not beat the simple baseline and is worse on probability error.

The existing model's approximate 95% game-level accuracy interval is
39.02–56.84%. Per-region evidence is small: Indonesia 55 games, Malaysia 32,
Myanmar 20, Philippines 10. Do not cherry-pick the Philippines' 60% from ten
games or advertise a 90% success rate. These checks predict the result from
the recorded final drafts; they cannot validate the unseen outcome of an
alternative recommended draft or recover missing pick/ban sequence data.
Repeated teams, unknown historical patch versions and unknown publication
delays limit retrospective independence. A fresh, prospectively logged test
with coaches is still required before commercial performance claims.

## Before a paid coaching product

1. Obtain verified game-level patch IDs, roster/player-to-hero assignments,
   actual pick/ban order, and source coverage/version metadata. Review source
   terms and attribution obligations for the proposed commercial service.
2. Collect forward-looking coach evaluations: show choices without outcomes,
   record reasons/rejections, compare against a simple pick-rate baseline.
   Do not tune on the final evaluation set. Measure decision quality and time,
   not just whether the eventual winning team happened to share a hero.
3. Evaluate on multiple later time windows/regions and control for team
   strength, side and patch; quantify uncertainty by series/team clusters.
   Keep explicit abstention when a new patch has insufficient evidence.
4. Define product value as auditable scouting and workflow assistance until
   predictive/strategic gains are demonstrated prospectively.
5. Move the paid service to an appropriate application host with server-side
   entitlement checks, private coach workspaces, authenticated storage and
   appropriate data protection. The current static app exposes its model and
   snapshots publicly; client-side hiding is not paid access control.

[GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
exclude using Pages as hosting for a commercial SaaS. This work has not migrated
hosting, created accounts, enabled billing or charged anyone.

## QA

Verified on 2026-09-08: 185 unit tests in 27 files; 71 browser tests against
the production static export. TypeScript, targeted ESLint and diff whitespace
checks passed. Desktop and Arabic phone captures were reviewed visually.
These are engineering checks, not a 100% drafting-success claim.

Run `npm test`, `npx tsc --noEmit`, and `npx playwright test --workers=3`.
Regression coverage includes both pick orders, all five plans, all current
regions and three evidence windows; explicit filled-role/banned-hero guards;
core provenance and suspension; RTL, mobile, theme switching, source coverage,
and keyboard-safe disclosures. Thin samples may abstain; they must not invent
old-meta recommendations to fill five cards.

Local computation probe (100 warmed runs, not browser/network latency):
recommendations plus core retrieval p50 1.19 ms / p95 1.55 ms for the 119-game
sample. Re-measure as the dataset grows; this is not a universal performance SLA.
