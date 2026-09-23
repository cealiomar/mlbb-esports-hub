/**
 * Season pages move (`MPL/MENA/Season_9` -> `Season_10`) and nothing tells us.
 * The harvester only notices that the configured season has ended, so given
 * `list=allpages` titles under the league prefix, report a newer numbered
 * season page if one exists. The listing is alphabetical — `Season 10` sorts
 * before `Season 2` — so compare numbers, never list position.
 */
export function newerSeasonPage(
  configuredPage: string,
  titles: readonly string[],
): string | null {
  const configured = configuredPage.replaceAll(' ', '_')
  const match = configured.match(/^(.*\/Season_)(\d+)$/)
  if (!match) return null
  const [, stem, current] = match

  let best: number | null = null
  for (const title of titles) {
    const normalized = title.replaceAll(' ', '_')
    if (!normalized.startsWith(stem)) continue
    const rest = normalized.slice(stem.length)
    if (!/^\d+$/.test(rest)) continue // skip `Season_10/Playoffs` etc.
    const season = Number(rest)
    if (season > Number(current) && (best === null || season > best)) {
      best = season
    }
  }
  return best === null ? null : `${stem}${best}`
}
