import { useTranslations } from 'next-intl'
import { withBasePath } from '@/lib/assets'
import type { MetaHero, MetaLane } from '@/lib/academy/meta'
import { Tabs } from '@/components/ui/tabs'

function HeroPortrait({ hero, size }: { hero: MetaHero; size: number }) {
  if (!hero.imageUrl) {
    return (
      <span
        aria-hidden
        className="ac-portrait ac-portrait--empty"
        style={{ width: size, height: size }}
      >
        {hero.name.slice(0, 2)}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={withBasePath(hero.imageUrl)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className="ac-portrait"
      style={{ width: size, height: size }}
    />
  )
}

function LaneRanking({ heroes }: { heroes: MetaHero[] }) {
  const t = useTranslations('academy')
  const best = heroes[0]?.score ?? 1

  return (
    <ol className="ac-meta-grid">
      {heroes.map((hero, index) => (
        <li
          key={hero.id}
          className="ac-meta-card panel"
          data-tier={hero.tier}
          data-testid="academy-meta-hero"
        >
          <span className="ac-meta-card__rank" aria-hidden>
            {String(index + 1).padStart(2, '0')}
          </span>
          <HeroPortrait hero={hero} size={56} />
          <span className="ac-meta-card__body">
            <strong dir="ltr">{hero.name}</strong>
            <span className="ac-meta-card__bar" aria-hidden>
              <i style={{ width: `${Math.round((hero.score / best) * 100)}%` }} />
            </span>
          </span>
          <span className="ac-tier" aria-label={t('metaTier', { tier: hero.tier })}>
            {hero.tier}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function MetaBoard({
  lanes,
}: {
  lanes: { lane: MetaLane; heroes: MetaHero[] }[]
}) {
  const t = useTranslations('academy')

  return (
    <Tabs
      items={lanes.map(({ lane, heroes }) => ({
        id: lane,
        label: t(`roles.${lane}`),
        content: <LaneRanking heroes={heroes} />,
      }))}
    />
  )
}

export function MetaFive({
  picks,
}: {
  picks: { lane: MetaLane; hero: MetaHero }[]
}) {
  const t = useTranslations('academy')

  return (
    <ul className="ac-five" aria-label={t('draftBoard')}>
      {picks.map(({ lane, hero }, index) => (
        <li
          key={lane}
          className="ac-five__slot"
          style={{ '--slot': index } as React.CSSProperties}
        >
          <HeroPortrait hero={hero} size={72} />
          <strong dir="ltr">{hero.name}</strong>
          <span>{t(`roles.${lane}`)}</span>
        </li>
      ))}
    </ul>
  )
}
