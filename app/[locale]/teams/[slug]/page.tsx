import { notFound } from 'next/navigation'
import Link from 'next/link'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import { getRegionBySlug } from '@/lib/content/regions'
import { recentResults } from '@/lib/matches/select'
import { MatchList } from '@/components/matches/match-list'
import { routing } from '@/i18n/routing'
import { SectionHeader } from '@/components/ui/section-header'
import { readSnapshot } from '@/lib/data/snapshots'
import type { Team } from '@/lib/data/types'
import { TeamDraftPanel } from '@/components/drafts/team-draft-panel'
import { draftTeams, teamDraftProfile } from '@/lib/drafts/analytics'
import {
  buildDraftTeamVisuals,
  enrichDraftLeagues,
  resolveDraftTeamVisual,
} from '@/lib/drafts/enrich'

// Fully static: rendered at build time from committed snapshots, so the
// page paints instantly with no fetch and no loading state.
export const dynamic = 'force-static'
export const revalidate = 3600

export function generateStaticParams() {
  const teams = readSnapshot<Team[]>('teams')?.data ?? []
  return routing.locales.flatMap((locale) =>
    teams.map((team) => ({ locale, slug: team.pageSlug })),
  )
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('team')

  const source = createLocalDataSource()
  const result = await source.getTeam(slug)
  if (!isOk(result)) notFound()
  const team = result.value

  const region = team.regionSlug ? getRegionBySlug(team.regionSlug) : undefined
  const localeKey = locale === 'ar' ? 'ar' : 'en'

  const matchResult = await source.getMatches()
  const matches = isOk(matchResult) ? matchResult.value : []
  const played = isOk(matchResult)
    ? recentResults(
        matches.filter((m) =>
          m.opponents.some((o) => o.pageSlug === team.pageSlug),
        ),
        6,
      )
    : []

  const draftResult = team.regionSlug
    ? await source.getDraftLeagues(team.regionSlug)
    : null
  const standingResult = team.regionSlug
    ? await source.getStandings(team.regionSlug)
    : null
  const standings =
    standingResult && isOk(standingResult) ? standingResult.value : []
  const draftLeague =
    draftResult && isOk(draftResult)
      ? enrichDraftLeagues(draftResult.value, matches)[0]
      : undefined
  const teamVisuals = draftLeague
    ? buildDraftTeamVisuals([draftLeague], matches, standings)
    : []
  const draftTeam = draftLeague
    ? draftTeams(draftLeague).find(
        (candidate) => {
          const visual = resolveDraftTeamVisual(
            teamVisuals,
            candidate,
            draftLeague.regionSlug,
          )
          return (
            visual.pageSlug.toLowerCase() === team.pageSlug.toLowerCase() ||
            visual.name.toLowerCase() === team.name.toLowerCase()
          )
        },
      )
    : undefined
  const draftProfile =
    draftLeague && draftTeam
      ? teamDraftProfile(draftLeague, draftTeam.pageSlug)
      : null

  return (
    <main className="section">
      {region && (
        <Link
          href={`/${locale}/regions/${region.slug}`}
          className="mb-3 inline-block text-sm font-semibold tracking-widest uppercase"
          style={{ color: region.accent }}
        >
          {region.name[localeKey]}
        </Link>
      )}
      <div className="mb-16">
        <SectionHeader as="h1" title={team.name} />
      </div>

      <SectionHeader title={t('roster')} />
      <ul className="panel divide-y divide-[var(--line)] p-2">
        {team.roster.map((player, index) => (
          <li
            key={player.handle}
            className="reveal flex min-h-[44px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
            style={{ '--reveal-delay': `${index * 40}ms` } as React.CSSProperties}
          >
            <span className="font-semibold">{player.handle}</span>
            {player.country && (
              <span className="text-[var(--step--1)] tracking-widest text-[var(--ink-muted)] uppercase">
                {player.country}
              </span>
            )}
            {player.role && (
              <span className="ms-auto text-[var(--step--1)] font-semibold tracking-wide text-[var(--brand)] uppercase">
                {player.role}
              </span>
            )}
          </li>
        ))}
      </ul>

      {draftLeague && draftProfile && (
        <div className="mt-20">
          <TeamDraftPanel
            league={draftLeague}
            profile={draftProfile}
            locale={localeKey}
            teamVisuals={teamVisuals}
          />
        </div>
      )}

      {played.length > 0 && (
        <>
          <div className="mt-20">
            <SectionHeader title={t('recentResults')} />
          </div>
          <MatchList matches={played} />
        </>
      )}
    </main>
  )
}
