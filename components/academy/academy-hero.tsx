import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { withBasePath } from '@/lib/assets'

const reveal = (ms: number) =>
  ({ '--reveal-delay': `${ms}ms` }) as React.CSSProperties

export function AcademyHero({
  locale,
  stats,
}: {
  locale: string
  stats: { value: string; label: string }[]
}) {
  const t = useTranslations('academy')

  return (
    <section className="ac-hero relative isolate overflow-hidden">
      <div className="ac-hero__rays" aria-hidden />
      <div className="ac-hero__grid" aria-hidden />
      {/* Oversized outline word: decoration only, clipped by the section. */}
      <div className="ac-hero__ghost" aria-hidden dir="ltr">
        ACADEMY
      </div>

      <div className="ac-hero__inner">
        <div className="ac-hero__copy">
          <p className="ac-kicker reveal" style={reveal(20)}>
            <span className="ac-kicker__bar" aria-hidden />
            {t('eyebrow')}
          </p>

          <h1 className="ac-hero__title reveal" style={reveal(120)}>
            <span>{t('titleLead')}</span>
            <span className="ac-hero__accent">{t('titleAccent')}</span>
          </h1>

          <p className="ac-hero__lede reveal" style={reveal(210)}>
            {t('description')}
          </p>

          <div className="ac-hero__actions reveal" style={reveal(290)}>
            <a href="#curriculum" className="button-primary">
              {t('startLearning')}
              <span aria-hidden>↓</span>
            </a>
            <Link
              href={`/${locale}/draft-coach`}
              className="live-pill ac-button-ghost"
            >
              {t('openCoach')}
              <span aria-hidden className="ac-arrow">
                ↗
              </span>
            </Link>
          </div>
        </div>

        <div className="ac-hero__stage reveal" style={reveal(160)}>
          <div className="ac-hero__ring" aria-hidden />
          <div className="ac-hero__ring ac-hero__ring--inner" aria-hidden />
          <div className="ac-hero__halo" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={withBasePath('/brand/mpl-mena.webp')}
            alt={t('logoAlt')}
            width={720}
            height={474}
            fetchPriority="high"
            className="ac-hero__logo"
          />
        </div>
      </div>

      <dl className="ac-stats reveal" style={reveal(360)}>
        {stats.map((stat) => (
          <div key={stat.label} className="ac-stat">
            <dd dir="ltr">{stat.value}</dd>
            <dt>{stat.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}
