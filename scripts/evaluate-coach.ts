import { readSnapshot } from '@/lib/data/snapshots'
import type { DraftLeague } from '@/lib/data/types'
import type { HeroCatalogItem } from '@/lib/drafts/coach'
import { evaluateDraftComparison } from '@/lib/drafts/evaluation'

const report = evaluateDraftComparison(
  readSnapshot<DraftLeague[]>('drafts')?.data ?? [],
  readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? [],
)
console.log(JSON.stringify(report ?? { note: 'Not enough dated series for a held-out evaluation.' }, null, 2))
