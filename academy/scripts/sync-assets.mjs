// Copies the mirrored images this site shows out of the repository root.
// They are harvested once, there; this keeps a single source of truth.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const from = join(here, '..', '..', 'public')
const to = join(here, '..', 'public')

for (const dir of ['heroes/catalog', 'teams', 'players']) {
  const source = join(from, dir)
  if (!existsSync(source)) continue
  rmSync(join(to, dir), { recursive: true, force: true })
  mkdirSync(dirname(join(to, dir)), { recursive: true })
  cpSync(source, join(to, dir), { recursive: true })
}

mkdirSync(join(to, 'brand'), { recursive: true })
cpSync(join(from, 'brand', 'mpl-mena.webp'), join(to, 'brand', 'mpl-mena.webp'))
console.log('assets synced')
