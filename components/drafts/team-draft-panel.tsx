'use client'

import { useTranslations } from 'next-intl'
import type { DraftGame, DraftHero, DraftLeague } from '@/lib/data/types'
import type { TeamDraftProfile, TeamHeroStat } from '@/lib/drafts/analytics'
import {
  resolveHeroImage,
  type HeroImageMap,
} from '@/lib/drafts/hero-images'
import {
  resolveDraftTeamVisual,
  type DraftTeamVisual,
} from '@/lib/drafts/enrich'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TeamCrest } from '@/components/matches/team-crest'
import { resolveTeamPage, teamPageIndex, teamPath } from '@/lib/data/team-slug'
import { HeroIcon } from './hero-icon'

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function formatSeriesDate(
  startsAt: number | null | undefined,
  playedOn: string | null | undefined,
  locale: 'en' | 'ar',
): string | null {
  const date = startsAt
    ? new Date(startsAt * 1000)
    : playedOn
      ? new Date(`${playedOn}T12:00:00Z`)
      : null
  if (!date || Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: locale === 'ar' ? 'Asia/Riyadh' : 'UTC',
  }).format(date)
}

function seriesScore(profile: TeamDraftProfile['recentSeries'][number]): [number, number] {
  return [
    profile.series.team1Score ??
      profile.series.games.filter((game) => game.winner === 1).length,
    profile.series.team2Score ??
      profile.series.games.filter((game) => game.winner === 2).length,
  ]
}

function TeamHeroRanking({
  title,
  stats,
  heroImages,
  showWinRate,
}: {
  title: string
  stats: TeamHeroStat[]
  heroImages: HeroImageMap
  showWinRate: boolean
}) {
  const t = useTranslations('drafts')
  return (
    <article className="team-meta-card panel">
      <h3>{title}</h3>
      <ol>
        {stats.map((stat, index) => (
          <li key={stat.hero.id}>
            <span className="team-meta-card__rank">{index + 1}</span>
            <HeroIcon
              hero={stat.hero}
              imageUrl={resolveHeroImage(heroImages, stat.hero)}
              size={42}
            />
            <strong>{stat.hero.name}</strong>
            <span className="team-meta-card__count">
              {stat.count}×
              {showWinRate && (
                <small>{t('winRateValue', { rate: stat.winRate })}</small>
              )}
            </span>
          </li>
        ))}
      </ol>
    </article>
  )
}

function HeroStrip({
  heroes,
  heroImages,
  label,
  className,
}: {
  heroes: DraftHero[]
  heroImages: HeroImageMap
  label: string
  className: string
}) {
  return (
    <ul className={`draft-game__heroes ${className}`} aria-label={label}>
      {heroes.map((hero, index) => (
        <li key={`${hero.id}-${index}`} title={hero.name}>
          <HeroIcon
            hero={hero}
            imageUrl={resolveHeroImage(heroImages, hero)}
            size={48}
          />
          <span>{hero.name}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Both drafts of one game, facing each other — blue side first when the
 * source records sides, as on the broadcast. Showing one team at a time
 * behind a toggle hid the comparison the sheet exists for.
 */
function DraftGameView({
  game,
  series,
  team1Visual,
  team2Visual,
  heroImages,
}: {
  game: DraftGame
  series: TeamDraftProfile['recentSeries'][number]['series']
  team1Visual: DraftTeamVisual
  team2Visual: DraftTeamVisual
  heroImages: HeroImageMap
}) {
  const t = useTranslations('drafts')
  const duration = formatDuration(game.durationSeconds)
  const first = {
    team: series.team1,
    visual: team1Visual,
    picks: game.team1Picks,
    bans: game.team1Bans,
    side: game.team1Side,
    won: game.winner === null ? null : game.winner === 1,
  }
  const second = {
    team: series.team2,
    visual: team2Visual,
    picks: game.team2Picks,
    bans: game.team2Bans,
    side: game.team2Side,
    won: game.winner === null ? null : game.winner === 2,
  }
  const blueFirst = game.team1Side === 'red' || game.team2Side === 'blue'
  const columns = blueFirst ? [second, first] : [first, second]

  return (
    <article className="draft-game">
      <header>
        <strong>{t('gameNumber', { number: game.number })}</strong>
        {duration && <small>{duration}</small>}
        {game.vodUrl && (
          <a href={game.vodUrl} target="_blank" rel="noopener noreferrer" className="watch-link rewatch-link">
            <span className="replay-play" aria-hidden />
            {t('watchGame')}
          </a>
        )}
      </header>

      <div className="draft-versus">
        {columns.map(({ team, visual, picks, bans, side, won }, index) => (
          <section
            key={index}
            className={`draft-versus__team draft-versus__team--${side ?? 'neutral'}`}
            data-won={won || undefined}
            aria-label={team.name}
          >
            <div className="draft-versus__head">
              <TeamCrest team={visual} size={28} />
              <strong>{team.name}</strong>
            </div>
            {(side || won !== null) && (
              <div className="draft-versus__chips">
                {side && (
                  <span className={`draft-game__side draft-game__side--${side}`}>
                    {side === 'blue' ? t('blueSide') : t('redSide')}
                  </span>
                )}
                {won !== null && (
                  <span className={`draft-game__result ${won ? 'draft-game__result--win' : 'draft-game__result--loss'}`}>
                    {won ? t('win') : t('loss')}
                  </span>
                )}
              </div>
            )}
            {picks.length > 0 && (
              <>
                <p className="draft-versus__label draft-versus__label--picks">{t('picks')}</p>
                <HeroStrip
                  heroes={picks}
                  heroImages={heroImages}
                  label={t('teamPicks', { team: team.name })}
                  className="draft-versus__picks"
                />
              </>
            )}
            {bans.length > 0 && (
              <>
                <p className="draft-versus__label draft-versus__label--bans">{t('bans')}</p>
                <HeroStrip
                  heroes={bans}
                  heroImages={heroImages}
                  label={t('teamBans', { team: team.name })}
                  className="draft-versus__bans"
                />
              </>
            )}
          </section>
        ))}
      </div>
    </article>
  )
}

/**
 * Opens a team's own page — unless it has none, or it is the page already
 * open. Uses `display: contents` like the fixture cards, so wrapping never
 * changes the surrounding layout.
 */
function TeamProfileLink({
  slug,
  pages,
  locale,
  label,
  children,
}: {
  slug: string
  pages: Map<string, string>
  locale: 'en' | 'ar'
  label: string
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? ''
  const target = resolveTeamPage(pages, slug, label)
  const here = target
    ? decodeURIComponent(pathname).replace(/\/$/, '').endsWith(`/teams/${target}`)
    : false
  if (!target || here) return <>{children}</>
  return (
    <Link
      href={teamPath(locale, target)}
      className="contents"
      aria-label={label}
    >
      {children}
    </Link>
  )
}

export function TeamDraftPanel({
  league,
  profile,
  locale,
  teamVisuals,
  heroImages,
  teamPageSlugs = [],
}: {
  league: DraftLeague
  profile: TeamDraftProfile
  locale: 'en' | 'ar'
  teamVisuals: DraftTeamVisual[]
  heroImages: HeroImageMap
  /** Teams with a built page; only these are linked. */
  teamPageSlugs?: string[]
}) {
  const t = useTranslations('drafts')
  const pages = teamPageIndex(teamPageSlugs)
  const profileVisual = resolveDraftTeamVisual(
    teamVisuals,
    profile.team,
    league.regionSlug,
  )

  return (
    <section className="team-draft-panel" data-testid="team-draft-panel">
      <header className="team-draft-panel__header">
        <div className="team-draft-panel__identity">
          <TeamProfileLink slug={profileVisual.pageSlug} pages={pages} locale={locale} label={profile.team.name}>
            <TeamCrest team={profileVisual} size={52} />
            <span>
              <small>{t('teamAnalysis')}</small>
              <h2>{profile.team.name}</h2>
            </span>
          </TeamProfileLink>
        </div>
        <strong>{t('gamesAnalyzed', { count: profile.gamesAnalyzed })}</strong>
      </header>

      <div className="team-meta-grid">
        <TeamHeroRanking
          title={t('teamTopPicks')}
          stats={profile.topPicks}
          heroImages={heroImages}
          showWinRate
        />
        <TeamHeroRanking
          title={t('teamTopBans')}
          stats={profile.topBans}
          heroImages={heroImages}
          showWinRate={false}
        />
      </div>

      <div className="draft-series-list">
        <h3>{t('recentDrafts')}</h3>
        {profile.recentSeries.map((seriesView, index) => {
          const { series, games } = seriesView
          const [team1Score, team2Score] = seriesScore(seriesView)
          const winningSide =
            series.winner ??
            (team1Score === team2Score ? null : team1Score > team2Score ? 1 : 2)
          const team1Visual = resolveDraftTeamVisual(
            teamVisuals,
            series.team1,
            league.regionSlug,
          )
          const team2Visual = resolveDraftTeamVisual(
            teamVisuals,
            series.team2,
            league.regionSlug,
          )
          const date = formatSeriesDate(series.startsAt, series.playedOn, locale)
          const week = series.roundLabel?.match(/^Week\s+(\d+)$/i)
          const round = series.roundLabel?.match(/^Round\s+(\d+)$/i)
          const roundLabel = week
            ? t('weekNumber', { number: week[1] })
            : round
              ? t('roundNumber', { number: round[1] })
              : series.roundLabel
          const stageLabel =
            series.stageName?.toLowerCase() === 'regular season'
              ? t('regularSeason')
              : series.stageName

          return (
            <details
              key={series.id}
              className="draft-series panel"
              open={index === 0}
            >
              <summary>
                <div className="draft-series__summary-main">
                  <div className="draft-series__context">
                    {date && (
                      <time data-testid="draft-series-date">{date}</time>
                    )}
                    {roundLabel && <span>{roundLabel}</span>}
                    {stageLabel && <span>{stageLabel}</span>}
                  </div>

                  <div className="draft-series__matchup">
                    <div
                      className="draft-series__team"
                      data-winner={winningSide === 1 || undefined}
                    >
                      <TeamProfileLink slug={team1Visual.pageSlug} pages={pages} locale={locale} label={series.team1.name}>
                        <TeamCrest team={team1Visual} size={46} />
                        <span>
                          <strong>{series.team1.name}</strong>
                          {winningSide === 1 && <small>{t('winner')}</small>}
                        </span>
                      </TeamProfileLink>
                      <b>{team1Score}</b>
                    </div>
                    <span className="draft-series__score-separator">:</span>
                    <div
                      className="draft-series__team draft-series__team--second"
                      data-winner={winningSide === 2 || undefined}
                    >
                      <b>{team2Score}</b>
                      <TeamProfileLink slug={team2Visual.pageSlug} pages={pages} locale={locale} label={series.team2.name}>
                        <TeamCrest team={team2Visual} size={46} />
                        <span>
                          <strong>{series.team2.name}</strong>
                          {winningSide === 2 && <small>{t('winner')}</small>}
                        </span>
                      </TeamProfileLink>
                    </div>
                  </div>
                </div>

                <div className="draft-series__summary-meta">
                  {series.mvp && (
                    <span className="draft-series__mvp" data-testid="draft-series-mvp">
                      <i aria-hidden>★</i>
                      {t('mvp', { player: series.mvp })}
                    </span>
                  )}
                  <b>{t('gameCount', { count: games.length })}</b>
                </div>
              </summary>

              <div className="draft-series__games">
                {games.map(({ game }) => (
                  <DraftGameView
                    key={game.number}
                    game={game}
                    series={series}
                    team1Visual={team1Visual}
                    team2Visual={team2Visual}
                    heroImages={heroImages}
                  />
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}
