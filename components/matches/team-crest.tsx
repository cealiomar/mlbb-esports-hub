import Image from 'next/image'
import type { MatchOpponent } from '@/lib/data/types'

/**
 * A crest is never allowed to be a broken image or an empty gap — teams
 * without a Liquipedia logo get a styled monogram of the same footprint.
 */
export function TeamCrest({
  team,
  size = 40,
}: {
  team: Pick<MatchOpponent, 'code' | 'name' | 'logoUrl'>
  size?: number
}) {
  if (!team.logoUrl) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size, fontSize: size * 0.28 }}
        className="grid shrink-0 place-items-center rounded-md border border-[var(--line)] bg-[var(--surface-raised)] font-bold text-[var(--ink-muted)]"
      >
        {team.code.slice(0, 3)}
      </span>
    )
  }

  return (
    <Image
      src={team.logoUrl}
      alt={team.name}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      // Belt and braces: Liquipedia 403s image requests that carry an
      // off-site Referer. Crests are mirrored locally by the harvester, but
      // any that slip through must still load.
      referrerPolicy="no-referrer"
      style={{ width: size, height: size }}
    />
  )
}
