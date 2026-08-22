import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { BrandMark } from '@/components/ui/brand-mark'

export function Hero({
  liveCount,
  matchCount,
  regionCount,
  resultCount,
}: {
  liveCount: number
  matchCount: number
  regionCount: number
  resultCount: number
}) {
  const t = useTranslations('home')
  const locale = useLocale()

  const stats = [
    { value: matchCount, label: t('trackedMatches') },
    { value: regionCount, label: t('activeRegions') },
    { value: resultCount, label: t('recordedResults') },
  ]

  return (
    <section className="hero aurora relative isolate overflow-hidden px-5 pb-14 pt-16 text-center sm:pb-20 sm:pt-24">
      <div className="hero-cross hero-cross--one" aria-hidden />
      <div className="hero-cross hero-cross--two" aria-hidden />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center">
        <div
          className="hero-kicker reveal"
          style={{ '--reveal-delay': '20ms' } as React.CSSProperties}
        >
          <span className="hero-kicker__dot" />
          {t('eyebrow')}
        </div>

        <div
          className="hero-logo-stage reveal mt-7"
          style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
        >
          <BrandMark width={430} priority className="hero-logo max-w-[72vw]" />
        </div>

        <h1
          className="display reveal mt-8 max-w-[17ch]"
          style={{ '--reveal-delay': '150ms' } as React.CSSProperties}
        >
          {t('tagline')}
        </h1>

        <p
          className="reveal mt-5 max-w-2xl text-balance text-[var(--ink-muted)]"
          style={{ '--reveal-delay': '220ms' } as React.CSSProperties}
        >
          {t('description')}
        </p>

        <div
          className="reveal mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ '--reveal-delay': '290ms' } as React.CSSProperties}
        >
          <Link href={`/${locale}/matches`} className="button-primary">
            {t('explore')}
            <span aria-hidden>↗</span>
          </Link>
          {liveCount > 0 && (
            <span className="live-pill">
              <span className="live-dot size-2 rounded-full bg-[var(--brand-hot)]" />
              {t('liveNow', { count: liveCount })}
            </span>
          )}
        </div>

        <dl
          className="hero-stats panel reveal mt-12 grid w-full max-w-3xl grid-cols-3 overflow-hidden"
          style={{ '--reveal-delay': '360ms' } as React.CSSProperties}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="hero-stat px-2 py-4 sm:px-6 sm:py-5">
              <dd className="text-xl font-black tabular-nums sm:text-3xl">{stat.value}</dd>
              <dt className="mt-1 text-[10px] font-semibold tracking-wide text-[var(--ink-muted)] uppercase sm:text-xs">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
