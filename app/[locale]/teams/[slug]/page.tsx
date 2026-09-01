import Link from 'next/link'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import { getRegionBySlug } from '@/lib/content/regions'
import { recentResults, upcomingMatches } from '@/lib/matches/select'
import { MatchList } from '@/components/matches/match-list'
import { routing } from '@/i18n/routing'
import { SectionHeader } from '@/components/ui/section-header'
import { readSnapshot } from '@/lib/data/snapshots'
import type { Match, Team } from '@/lib/data/types'
import { TeamDraftPanel } from '@/components/drafts/team-draft-panel'
import { draftTeams, teamDraftProfile } from '@/lib/drafts/analytics'
import {
  buildDraftTeamVisuals,
  enrichDraftLeagues,
  resolveDraftTeamVisual,
} from '@/lib/drafts/enrich'
import {
  buildHeroImageMap,
  type HeroCatalogItem,
} from '@/lib/drafts/hero-images'
import { currentSeasonDraftLeagues } from '@/lib/drafts/coach'

// Fully static: rendered at build time from committed snapshots, so the
// page paints instantly with no fetch and no loading state.
export const dynamic = 'force-static'
export const revalidate = 3600

export function generateStaticParams() {
  const teams = readSnapshot<Team[]>('teams')?.data ?? []
  const matches = readSnapshot<Match[]>('matches')?.data ?? []
  const slugs = new Set([
    ...teams.map((team) => team.pageSlug),
    ...matches.flatMap((match) =>
      match.opponents.map((opponent) => opponent.pageSlug),
    ),
  ])
  return routing.locales.flatMap((locale) =>
    [...slugs]
      .filter(Boolean)
      .map((slug) => ({ locale, slug })),
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
  const matchResult = await source.getMatches()
  const matches = isOk(matchResult) ? matchResult.value : []
  const result = await source.getTeam(slug)
  const linkedOpponent = matches
    .flatMap((match) =>
      match.opponents.map((opponent) => ({ opponent, regionSlug: match.regionSlug })),
    )
    .find(({ opponent }) => opponent.pageSlug.toLowerCase() === slug.toLowerCase())
  const team: Team = isOk(result)
    ? result.value
    : linkedOpponent
      ? {
          pageSlug: linkedOpponent.opponent.pageSlug,
          name: linkedOpponent.opponent.name,
          code: linkedOpponent.opponent.code,
          logoUrl: linkedOpponent.opponent.logoUrl,
          regionSlug: linkedOpponent.regionSlug,
          roster: [],
        }
      : {
          pageSlug: slug,
          name: slug.replaceAll('_', ' '),
          code: 'TBD',
          logoUrl: null,
          regionSlug: null,
          roster: [],
        }

  const region = team.regionSlug ? getRegionBySlug(team.regionSlug) : undefined
  const localeKey = locale === 'ar' ? 'ar' : 'en'

  const played = isOk(matchResult)
    ? recentResults(
        matches.filter((m) =>
          m.opponents.some((o) => o.pageSlug === team.pageSlug),
        ),
        6,
      )
    : []
  const upcoming = isOk(matchResult)
    ? upcomingMatches(
        matches.filter((m) =>
          m.opponents.some((o) => o.pageSlug === team.pageSlug),
        ),
        Math.floor(Date.now() / 1000),
      ).slice(0, 3)
    : []

  const draftResult = team.regionSlug
    ? await source.getDraftLeagues(team.regionSlug)
    : null
  const standingResult = team.regionSlug
    ? await source.getStandings(team.regionSlug)
    : null
  const standings =
    standingResult && isOk(standingResult) ? standingResult.value : []
  const standing = standings
    .flatMap((table) => table.rows)
    .find((row) => row.team.pageSlug === team.pageSlug)
  const draftLeague =
    draftResult && isOk(draftResult)
      ? enrichDraftLeagues(
          currentSeasonDraftLeagues(draftResult.value),
          matches,
        )[0]
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
  const heroCatalog =
    readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []
  const heroImages = buildHeroImageMap([
    ...(draftLeague?.heroStats ?? []),
    ...heroCatalog,
  ])

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

      {standing && (
        <section className="team-standing panel mb-10 p-5">
          <span>{t('standing')}</span>
          <strong>
            {t('standingValue', {
              position: standing.position,
              points: standing.points ?? 0,
            })}
          </strong>
        </section>
      )}

      <SectionHeader title={t('roster')} />
      {team.roster.length > 0 ? (
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
      ) : (
        <p className="panel team-empty-state p-5 text-[var(--ink-muted)]">
          {t('rosterPending')}
        </p>
      )}

      {upcoming.length > 0 && (
        <>
          <div className="mt-16">
            <SectionHeader title={t('upcomingMatches')} />
          </div>
          <MatchList matches={upcoming} density="compact" />
        </>
      )}

      {draftLeague && draftProfile && (
        <div className="mt-20">
          <TeamDraftPanel
            league={draftLeague}
            profile={draftProfile}
            locale={localeKey}
            teamVisuals={teamVisuals}
            heroImages={heroImages}
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
