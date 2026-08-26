import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { writeSnapshot, DEFAULT_SNAPSHOT_DIR } from '@/lib/data/snapshots'
import {
  PATCH_META_SOURCE,
  PATCH_META_VERSION,
} from '@/lib/drafts/current-patch-meta'
import { parseLivePatchMeta } from '@/lib/drafts/parse-live-patch-meta'

async function main() {
  try {
    const response = await fetch(PATCH_META_SOURCE, {
      headers: { 'user-agent': 'MLBB Esports Hub metadata updater' },
    })
    if (!response.ok) throw new Error(`Meta source returned ${response.status}`)
    const data = parseLivePatchMeta(
      await response.text(),
      PATCH_META_SOURCE,
      PATCH_META_VERSION,
    )
    writeSnapshot('patch-meta', data)
    console.log(
      `Updated live patch metadata: ${Object.keys(data.heroes).length} heroes (${data.updatedAt})`,
    )
  } catch (error) {
    const snapshotPath = join(DEFAULT_SNAPSHOT_DIR, 'patch-meta.json')
    if (!existsSync(snapshotPath)) throw error
    console.warn(
      `Live patch refresh failed; keeping last valid snapshot: ${String(error)}`,
    )
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
