import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Snapshot } from './types'

export const DEFAULT_SNAPSHOT_DIR = join(process.cwd(), 'data', 'snapshots')

export function readSnapshot<T>(
  name: string,
  dir: string = DEFAULT_SNAPSHOT_DIR,
): Snapshot<T> | null {
  const path = join(dir, `${name}.json`)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Snapshot<T>
  } catch {
    // A corrupt snapshot must degrade to the fallback, never crash a page.
    return null
  }
}

export function writeSnapshot<T>(
  name: string,
  data: T,
  dir: string = DEFAULT_SNAPSHOT_DIR,
): void {
  mkdirSync(dir, { recursive: true })
  const snapshot: Snapshot<T> = {
    harvestedAt: Math.floor(Date.now() / 1000),
    data,
  }
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(snapshot, null, 2))
}
