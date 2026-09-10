/**
 * Liquipedia marks a team that has no page yet with an edit link —
 * `index.php?title=D_Family&action=edit&redlink=1` — not a page title.
 * Such a value is never a team slug and must never become a link.
 *
 * Pure and dependency-free so client components can use it too.
 */
export function isTeamPageSlug(
  slug: string | null | undefined,
): slug is string {
  if (!slug) return false
  return !slug.includes('index.php') && !slug.includes('redlink') && !slug.includes('?')
}

export function teamKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * Indexes built team pages by a spelling-insensitive key, so the same team
 * written three ways — `Burmese_Ghouls`, `burmese_ghouls`, `Burmese Ghouls` —
 * resolves to the one page that exists. Two different pages that collapse to
 * the same key are ambiguous, and neither is linked rather than guessed.
 */
export function teamPageIndex(pages: readonly string[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const page of pages) {
    const key = teamKey(page)
    if (!key) continue
    const existing = index.get(key)
    index.set(key, existing === undefined || existing === page ? page : '')
  }
  return index
}

/** The built page a team slug or name refers to, or null when there is none. */
export function resolveTeamPage(
  index: Map<string, string>,
  slug: string | null | undefined,
  name?: string | null,
): string | null {
  const candidates: string[] = []
  if (isTeamPageSlug(slug)) candidates.push(slug)
  // An edit link still carries the page title it would create.
  const title = slug?.match(/[?&]title=([^&]+)/)?.[1]
  if (title) candidates.push(decodeURIComponent(title))
  if (name) candidates.push(name)

  for (const candidate of candidates) {
    const hit = index.get(teamKey(candidate))
    if (hit) return hit
  }
  return null
}
