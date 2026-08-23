import { setRequestLocale, getTranslations } from 'next-intl/server'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import {
  liveMatches,
  upcomingMatches,
  recentResults,
} from '@/lib/matches/select'
import { getRegions } from '@/lib/content/regions'
import {
  MatchExplorer,
  type MatchExplorerGroup,
} from '@/components/matches/match-explorer'
import { FreshnessBadge } from '@/components/ui/freshness-badge'
import { SectionHeader } from '@/components/ui/section-header'
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

  const live = liveMatches(all, now)

  const tabs: MatchExplorerGroup[] = [
    ...(live.length > 0
      ? [
          {
            id: 'live' as const,
            label: t('live'),
            matches: live,
          },
        ]
      : []),
    {
      id: 'upcoming' as const,
      label: t('upcoming'),
      matches: upcomingMatches(all, now),
    },
    {
      id: 'results' as const,
      label: t('completed'),
      matches: recentResults(all, 60),
    },
  ]

  return (
    <main className="section matches-page">
      <SectionHeader
        as="h1"
        title={tn('matches')}
        description={t('pageDescription')}
        meta={<FreshnessBadge harvestedAt={await source.getFreshness()} />}
      />
      <MatchExplorer groups={tabs} regions={getRegions()} />
    </main>
  )
}
