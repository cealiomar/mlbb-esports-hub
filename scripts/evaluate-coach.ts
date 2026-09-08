import { readSnapshot } from '@/lib/data/snapshots'
import type { DraftLeague } from '@/lib/data/types'
import type { HeroCatalogItem } from '@/lib/drafts/coach'
import { evaluateDraftComparison } from '@/lib/drafts/evaluation'
import { getRegions } from '@/lib/content/regions'
import { walkForwardDraftEvaluation } from '@/lib/drafts/walk-forward'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const snapshot = readSnapshot<DraftLeague[]>('drafts')
const catalog = readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []
const seasonPages = Object.fromEntries(getRegions().map((region) => [region.slug, region.liquipediaLeaguePage]))
const report = {
  snapshotAt: snapshot?.harvestedAt ?? null,
  heldOut: evaluateDraftComparison(snapshot?.data ?? [], catalog, { now: snapshot?.harvestedAt, trainingWindow: 14, seasonPages }),
  walkForward: walkForwardDraftEvaluation(snapshot?.data ?? [], catalog, { now: snapshot?.harvestedAt ?? 0, window: 14, seasonPages }),
}
const outputIndex = process.argv.indexOf('--output')
if (outputIndex >= 0) {
  const outputPath = process.argv[outputIndex + 1]
  if (!outputPath) throw new Error('--output requires a destination path')
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n')
}
// The artifact retains every audited prediction; keep workflow logs compact.
console.log(JSON.stringify({ ...report, walkForward: { ...report.walkForward, predictions: `${report.walkForward.predictions.length} recorded in the optional JSON artifact` } }, null, 2))
