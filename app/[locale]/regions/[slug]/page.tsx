import { notFound } from 'next/navigation'
import Link from 'next/link'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getRegions, getRegionBySlug } from '@/lib/content/regions'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import {
  byRegion,
  liveMatches,
  upcomingMatches,
  recentResults,
} from '@/lib/matches/select'
import { MatchList } from '@/components/matches/match-list'
import { SectionHeader } from '@/components/ui/section-header'
import { Tabs } from '@/components/ui/tabs'
import { Reveal } from '@/components/ui/reveal'
import { routing } from '@/i18n/routing'
import { BUILD_UNIX_TIME } from '@/lib/time/build'

// Fully static: rendered at build time from committed snapshots, so the
// page paints instantly with no fetch and no loading state.
export const dynamic = 'force-static'
export const revalidate = 3600

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getRegions().map((r) => ({ locale, slug: r.slug })),
  )
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const region = getRegionBySlug(slug)
  if (!region) notFound()

  const t = await getTranslations('region')
  const tm = await getTranslations('matches')
  const source = createLocalDataSource()

  const matchResult = await source.getMatches()
  const all = isOk(matchResult) ? byRegion(matchResult.value, slug) : []
  const now = BUILD_UNIX_TIME

  const teamResult = await source.getTeamsByRegion(slug)
  const teams = isOk(teamResult) ? teamResult.value : []

  const localeKey = locale === 'ar' ? 'ar' : 'en'
  const live = liveMatches(all, now)

  const tabs = [
    ...(live.length > 0
      ? [
          {
            id: 'live',
            label: tm('live'),
            count: live.length,
            content: <MatchList matches={live} />,
          },
        ]
      : []),
    {
      id: 'fixtures',
      label: t('fixtures'),
      count: upcomingMatches(all, now).length,
      content: <MatchList matches={upcomingMatches(all, now)} />,
    },
    {
      id: 'results',
      label: tm('completed'),
      count: recentResults(all, 12).length,
      content: <MatchList matches={recentResults(all, 12)} />,
    },
  ]

  return (
    <main className="section">
      <SectionHeader
        as="h1"
        eyebrow={`${region.flag}  ${region.leagueName}`}
        eyebrowColor={region.accent}
        title={region.name[localeKey]}
      />

      <Tabs items={tabs} />

      <div className="mt-20">
        <Reveal>
          <SectionHeader title={t('teams')} />
        </Reveal>
      </div>

      {teams.length > 0 ? (
        <ul className="flex flex-wrap justify-center gap-3">
          {teams.map((team, index) => (
            <li
              key={team.pageSlug}
              className="reveal w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
              style={
                {
                  '--reveal-delay': `${Math.min(index, 9) * 45}ms`,
                } as React.CSSProperties
              }
            >
              <Link
                href={`/${locale}/teams/${team.pageSlug}`}
                className="panel team-link flex min-h-[76px] items-center justify-between gap-3 p-4"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="team-monogram" aria-hidden>{team.code.slice(0, 2).toUpperCase()}</span>
                  <span className="truncate font-bold">{team.name}</span>
                </span>
                <span className="glass-badge shrink-0 px-2.5 py-1 text-[11px] font-semibold text-[var(--ink-muted)] tabular-nums">
                  {team.roster.length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-[var(--ink-muted)]">{tm('noMatches')}</p>
      )}
    </main>
  )
}
