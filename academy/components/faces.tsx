import type { Hero } from '@/lib/data-types'

export function HeroFace({ hero, size = 48 }: { hero: Hero; size?: number }) {
  return hero.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="face"
      src={hero.image}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      style={{ width: size, height: size }}
    />
  ) : (
    <span className="face face--empty" style={{ width: size, height: size }} aria-hidden>
      {hero.name.slice(0, 2)}
    </span>
  )
}

export function TierBadge({ tier }: { tier: string }) {
  return (
    <span className="tier" data-tier={tier}>
      {tier}
    </span>
  )
}
