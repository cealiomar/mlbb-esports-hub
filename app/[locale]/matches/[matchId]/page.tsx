import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import { routing } from '@/i18n/routing'
import { getRegionBySlug } from '@/lib/content/regions'
import { MatchCard } from '@/components/matches/match-card'
import { TeamCrest } from '@/components/matches/team-crest'
import { FreshnessBadge } from '@/components/ui/freshness-badge'
import { SectionHeader } from '@/components/ui/section-header'
import { replayUrl } from '@/lib/matches/replay'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function generateStaticParams() {
  const result = await createLocalDataSource().getMatches()
  const matches = isOk(result) ? result.value : []
  return routing.locales.flatMap((locale) =>
    matches.map((match) => ({ locale, matchId: match.id })),
  )
}

export default async function MatchDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; matchId: string }>
}) {
  const { locale, matchId } = await params
  if (!routing.locales.includes(locale as never)) notFound()
  setRequestLocale(locale)

  const source = createLocalDataSource()
  const result = await source.getMatches()
  const match = isOk(result)
    ? result.value.find((item) => item.id === decodeURIComponent(matchId))
    : undefined
  if (!match) notFound()

  const t = await getTranslations('matches')
  const localeKey = locale === 'ar' ? 'ar' : 'en'
  const region = match.regionSlug ? getRegionBySlug(match.regionSlug) : null
  const replay = replayUrl(match)
  const streams = match.streamUrls.filter(Boolean)
  const statusLabel =
    match.status === 'live'
      ? t('live')
      : match.status === 'completed'
        ? t('completed')
        : t('upcoming')

  return (
    <main className="section match-details-page">
      <SectionHeader
        as="h1"
        title={t('matchDetails')}
        description={match.tournamentName}
        meta={<FreshnessBadge harvestedAt={await source.getFreshness()} />}
      />

      <div className="match-details-layout">
        <MatchCard match={match} />

        <section className="panel match-details-info">
          <div className="match-details-info__topline">
            <span className={`match-details-status match-details-status--${match.status}`}>
              {statusLabel}
            </span>
            {region && (
              <Link href={`/${locale}/regions/${region.slug}/`}>
                {region.flag} {region.name[localeKey]}
              </Link>
            )}
          </div>

          <div className="match-details-teams">
            {match.opponents.map((team) => (
              <div key={`${team.code}-${team.pageSlug}`}>
                <TeamCrest team={team} size={46} />
                <span>
                  <strong>{team.name}</strong>
                  <small>{team.code}</small>
                </span>
                {team.pageSlug ? (
                  <Link href={`/${locale}/teams/${encodeURIComponent(team.pageSlug)}/`}>
                    {t('teamPage')}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>

          <div className="match-details-actions">
            {streams.map((url, index) => (
              <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="watch-link">
                {index === 0 ? t('watch') : `${t('watch')} ${index + 1}`}
              </a>
            ))}
            {replay && (
              <a href={replay} target="_blank" rel="noreferrer noopener" className="watch-link rewatch-link">
                {t('rewatch')}
              </a>
            )}
            {match.status === 'completed' && !replay && (
              <span className="replay-unavailable">{t('replayUnavailable')}</span>
            )}
          </div>

          <p className="match-details-note">
            {t('detailsAccuracyNote')}
          </p>
        </section>
      </div>
    </main>
  )
}
