/**
 * The patch calendar: every `Patch 2.x.y` page on Liquipedia carries
 * `|release=YYYY-MM-DD` in its infobox. Hotfix pages ("2.1.95a") count as
 * their base patch so a game three days after a hotfix still belongs to the
 * patch the tier list describes.
 */
export interface PatchRelease {
  /** Base version, e.g. "2.1.95". */
  version: string
  /** The page title the date came from. */
  page: string
  /** ISO calendar date. */
  releasedAt: string
}

export function parseReleaseDate(wikitext: string): string | null {
  const match = wikitext.match(/\|\s*release\s*=\s*(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

export function baseVersion(title: string): string | null {
  const match = title.match(/Patch\s+(\d+\.\d+\.\d+)/)
  return match ? match[1] : null
}

/** Earliest release per base version, sorted by date. */
export function mergePatches(entries: PatchRelease[]): PatchRelease[] {
  const byVersion = new Map<string, PatchRelease>()
  for (const entry of entries) {
    const existing = byVersion.get(entry.version)
    if (!existing || entry.releasedAt < existing.releasedAt) byVersion.set(entry.version, entry)
  }
  return [...byVersion.values()].sort((a, b) => a.releasedAt.localeCompare(b.releasedAt))
}

/** The newest patch released on or before `date` (YYYY-MM-DD). */
export function patchForDate(patches: PatchRelease[], date: string | null | undefined): string | null {
  if (!date) return null
  let current: string | null = null
  for (const patch of patches) {
    if (patch.releasedAt <= date) current = patch.version
    else break
  }
  return current
}
