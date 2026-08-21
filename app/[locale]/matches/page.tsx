import { setRequestLocale, getTranslations } from 'next-intl/server'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import {
  liveMatches,
  todayMatches,
  upcomingMatches,
  recentResults,
} from '@/lib/matches/select'
import { MatchList } from '@/components/matches/match-list'
import { FreshnessBadge } from '@/components/ui/freshness-badge'
import { SectionHeader } from '@/components/ui/section-header'
import { Tabs } from '@/components/ui/tabs'
import { routing } from '@/i18n/routing'
import { BUILD_UNIX_TIME } from '@/lib/time/build'

// Fully static: rendered at build time from committed snapshots, so the
// page paints instantly with no fetch and no loading state.
export const dynamic = 'force-static'
export const revalidate = 3600

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('matches')
  const tn = await getTranslations('nav')

  const source = createLocalDataSource()
  const result = await source.getMatches()
  const all = isOk(result) ? result.value : []
  const now = BUILD_UNIX_TIME

  const live = liveMatches(all)

  const tabs = [
    ...(live.length > 0
      ? [
          {
            id: 'live',
            label: t('live'),
            count: live.length,
            content: <MatchList matches={live} />,
          },
        ]
      : []),
    {
      id: 'today',
      label: t('today'),
      count: todayMatches(all, now).length,
      content: <MatchList matches={todayMatches(all, now)} />,
    },
    {
      id: 'upcoming',
      label: t('upcoming'),
      count: upcomingMatches(all, now).length,
      content: <MatchList matches={upcomingMatches(all, now)} />,
    },
    {
      id: 'results',
      label: t('completed'),
      count: recentResults(all, 24).length,
      content: <MatchList matches={recentResults(all, 24)} />,
    },
  ]

  return (
    <main className="section">
      <SectionHeader
        as="h1"
        title={tn('matches')}
        meta={<FreshnessBadge harvestedAt={await source.getFreshness()} />}
      />
      <Tabs items={tabs} />
    </main>
  )
}
