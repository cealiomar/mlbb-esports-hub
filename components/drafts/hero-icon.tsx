'use client'

import Image from 'next/image'
import { useState } from 'react'
import { withBasePath } from '@/lib/assets'
import type { DraftHero } from '@/lib/data/types'

export function HeroIcon({
  hero,
  imageUrl,
  size = 48,
}: {
  hero: DraftHero
  imageUrl: string | null
  size?: number
}) {
  const src = imageUrl ? withBasePath(imageUrl) : null
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) {
    return (
      <span
        aria-hidden
        className="draft-hero-fallback"
        style={{ width: size, height: size }}
      >
        {hero.name
          .split(/[\s-]+/)
          .map((word) => word[0])
          .join('')
          .slice(0, 2)}
      </span>
    )
  }

  return (
    <Image
      src={src}
      alt={hero.name}
      width={size}
      height={size}
      unoptimized
      onError={() => setFailedSrc(src)}
      className="draft-hero-image"
      style={{ width: size, height: size }}
    />
  )
}
