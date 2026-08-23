import { setRequestLocale, getTranslations } from 'next-intl/server'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import { liveMatches, todayMatches, upcomingMatches, recentResults } from '@/lib/matches/select'
import { Hero } from '@/components/home/hero'
import { LiveNow } from '@/components/home/live-now'
import { Ticker } from '@/components/matches/ticker'
import { MatchList } from '@/components/matches/match-list'
import { RegionList } from '@/components/regions/region-list'
import { FreshnessBadge } from '@/components/ui/freshness-badge'
import { SectionHeader } from '@/components/ui/section-header'
import { Reveal } from '@/components/ui/reveal'
import { Tabs } from '@/components/ui/tabs'
import { routing } from '@/i18n/routing'
import { getRegions } from '@/lib/content/regions'
import { BUILD_UNIX_TIME } from '@/lib/time/build'

// Fully static: rendered at build time from committed snapshots, so the
// page paints instantly with no fetch and no loading state.
export const dynamic = 'force-static'
export const revalidate = 3600

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')
  const tm = await getTranslations('matches')

  const source = createLocalDataSource()
  const result = await source.getMatches()
  const all = isOk(result) ? result.value : []
  const now = BUILD_UNIX_TIME

  const live = liveMatches(all, now)
  const today = todayMatches(all, now)
  const upcoming = upcomingMatches(all, now)
  const results = recentResults(all, 9)

  const liveRegions = [
    ...new Set(
      live.map((m) => m.regionSlug).filter((s): s is string => s !== null),
    ),
  ]

  const tabs = [
    {
      id: 'today',
      label: tm('today'),
      count: today.length,
      content: <MatchList matches={today} />,
    },
    {
      id: 'upcoming',
      label: tm('upcoming'),
      count: upcoming.length,
      content: <MatchList matches={upcoming.slice(0, 9)} />,
    },
    {
      id: 'results',
      label: tm('completed'),
      count: results.length,
      content: <MatchList matches={results} />,
    },
  ]

  return (
    <main>
      <Hero
        liveCount={live.length}
        matchCount={all.length}
        regionCount={getRegions().length}
        resultCount={all.filter((match) => match.status === 'completed').length}
      />
      <LiveNow matches={live} locale={locale === 'ar' ? 'ar' : 'en'} />
      <Ticker matches={today.length > 0 ? today : upcoming.slice(0, 12)} />

      <section className="section">
        <Reveal>
          <SectionHeader title={t('regions')} description={t('regionsDescription')} />
        </Reveal>
        <RegionList
          locale={locale === 'ar' ? 'ar' : 'en'}
          liveRegions={liveRegions}
        />
      </section>

      <section className="section pt-0">
        <Reveal>
          <SectionHeader
            title={t('schedule')}
            description={t('scheduleDescription')}
            meta={<FreshnessBadge harvestedAt={await source.getFreshness()} />}
          />
        </Reveal>
        <Tabs items={tabs} />
      </section>
    </main>
  )
}
