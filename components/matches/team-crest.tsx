'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { MatchOpponent } from '@/lib/data/types'
import { withBasePath } from '@/lib/assets'

function Monogram({
  code,
  size,
}: {
  code: string
  size: number
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.28 }}
      className="team-crest-fallback grid shrink-0 place-items-center rounded-md border border-[var(--line)] bg-[var(--surface-raised)] font-black text-[var(--brand-strong)]"
    >
      {code.slice(0, 3)}
    </span>
  )
}

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
  const src = team.logoUrl ? withBasePath(team.logoUrl) : null
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) return <Monogram code={team.code} size={size} />

  return (
    <Image
      src={src}
      alt={team.name}
      width={size}
      height={size}
      unoptimized
      onError={() => setFailedSrc(src)}
      className="team-crest-image shrink-0 object-contain"
      // Belt and braces: Liquipedia 403s image requests that carry an
      // off-site Referer. Crests are mirrored locally by the harvester, but
      // any that slip through must still load.
      referrerPolicy="no-referrer"
      style={{ width: size, height: size }}
    />
  )
}
