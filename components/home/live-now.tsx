import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { Match } from '@/lib/data/types'
import { MatchList } from '@/components/matches/match-list'
import { Reveal } from '@/components/ui/reveal'

export function LiveNow({
  matches,
  locale,
}: {
  matches: Match[]
  locale: 'en' | 'ar'
}) {
  const t = useTranslations('home')
  if (matches.length === 0) return null

  return (
    <section
      id="live"
      data-home-live
      className="section home-live-section scroll-mt-24"
    >
      <Reveal>
        <header className="home-live-header mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="live-eyebrow mb-3 inline-flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em] uppercase">
              <span className="live-dot size-2 rounded-full bg-[var(--brand-hot)]" />
              {t('liveFeed')}
            </p>
            <h2 className="heading">{t('liveTitle')}</h2>
            <p className="mt-3 text-sm text-[var(--ink-muted)] sm:text-base">
              {t('liveDescription', { count: matches.length })}
            </p>
          </div>

          <Link href={`/${locale}/matches`} className="section-link shrink-0">
            {t('allMatches')}
            <span aria-hidden>↗</span>
          </Link>
        </header>
      </Reveal>

      <MatchList matches={matches.slice(0, 3)} />
    </section>
  )
}
