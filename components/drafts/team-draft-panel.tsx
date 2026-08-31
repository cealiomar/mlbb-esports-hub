'use client'

import { useTranslations } from 'next-intl'
import type { DraftHero, DraftLeague } from '@/lib/data/types'
import type { TeamDraftProfile, TeamHeroStat } from '@/lib/drafts/analytics'
import {
  resolveHeroImage,
  type HeroImageMap,
} from '@/lib/drafts/hero-images'
import {
  resolveDraftTeamVisual,
  type DraftTeamVisual,
} from '@/lib/drafts/enrich'
import { TeamCrest } from '@/components/matches/team-crest'
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
}: {
  heroes: DraftHero[]
  heroImages: HeroImageMap
}) {
  return (
    <ul className="draft-game__heroes">
      {heroes.map((hero, index) => (
        <li key={`${hero.id}-${index}`} title={hero.name}>
          <HeroIcon
            hero={hero}
            imageUrl={resolveHeroImage(heroImages, hero)}
            size={38}
          />
          <span>{hero.name}</span>
        </li>
      ))}
    </ul>
  )
}

export function TeamDraftPanel({
  league,
  profile,
  locale,
  teamVisuals,
  heroImages,
}: {
  league: DraftLeague
  profile: TeamDraftProfile
  locale: 'en' | 'ar'
  teamVisuals: DraftTeamVisual[]
  heroImages: HeroImageMap
}) {
  const t = useTranslations('drafts')
  const profileVisual = resolveDraftTeamVisual(
    teamVisuals,
    profile.team,
    league.regionSlug,
  )

  return (
    <section className="team-draft-panel" data-testid="team-draft-panel">
      <header className="team-draft-panel__header">
        <div className="team-draft-panel__identity">
          <TeamCrest team={profileVisual} size={52} />
          <span>
            <small>{t('teamAnalysis')}</small>
            <h2>{profile.team.name}</h2>
          </span>
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
                      <TeamCrest team={team1Visual} size={46} />
                      <span>
                        <strong>{series.team1.name}</strong>
                        {winningSide === 1 && <small>{t('winner')}</small>}
                      </span>
                      <b>{team1Score}</b>
                    </div>
                    <span className="draft-series__score-separator">:</span>
                    <div
                      className="draft-series__team draft-series__team--second"
                      data-winner={winningSide === 2 || undefined}
                    >
                      <b>{team2Score}</b>
                      <TeamCrest team={team2Visual} size={46} />
                      <span>
                        <strong>{series.team2.name}</strong>
                        {winningSide === 2 && <small>{t('winner')}</small>}
                      </span>
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
                {games.map(({ game, side, won, picks, bans }) => {
                  const blueIsTeam1 = game.team1Side === 'blue'
                  const redIsTeam1 = game.team1Side === 'red'
                  const blueTeam = blueIsTeam1 ? series.team1 : series.team2
                  const redTeam = redIsTeam1 ? series.team1 : series.team2
                  const blueVisual = blueIsTeam1 ? team1Visual : team2Visual
                  const redVisual = redIsTeam1 ? team1Visual : team2Visual

                  return (
                <article key={game.number} className="draft-game">
                  <header>
                    <strong>{t('gameNumber', { number: game.number })}</strong>
                    <span
                      className={`draft-game__result ${won ? 'draft-game__result--win' : 'draft-game__result--loss'}`}
                    >
                      {won ? t('win') : t('loss')}
                    </span>
                    {side && (
                      <span className={`draft-game__side draft-game__side--${side}`}>
                        {side === 'blue' ? t('blueSide') : t('redSide')}
                      </span>
                    )}
                    {formatDuration(game.durationSeconds) && (
                      <small>{formatDuration(game.durationSeconds)}</small>
                    )}
                    {game.vodUrl && (
                      <a
                        href={game.vodUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="watch-link rewatch-link"
                      >
                        <span className="replay-play" aria-hidden />
                        {t('watchGame')}
                      </a>
                    )}
                  </header>

                  {game.team1Side && game.team2Side && (
                    <div className="draft-game__sides" aria-label={t('sidesLabel')}>
                      <span className="draft-game__team-side draft-game__team-side--blue">
                        <TeamCrest team={blueVisual} size={26} />
                        <small>{t('blueSide')}</small>
                        <strong>{blueTeam.name}</strong>
                      </span>
                      <span className="draft-game__team-side draft-game__team-side--red">
                        <TeamCrest team={redVisual} size={26} />
                        <small>{t('redSide')}</small>
                        <strong>{redTeam.name}</strong>
                      </span>
                    </div>
                  )}

                  <div className="draft-game__row">
                    <b>{t('teamPicks', { team: profile.team.name })}</b>
                    <HeroStrip heroes={picks} heroImages={heroImages} />
                  </div>
                  <div className="draft-game__row draft-game__row--bans">
                    <b>{t('teamBans', { team: profile.team.name })}</b>
                    <HeroStrip heroes={bans} heroImages={heroImages} />
                  </div>
                </article>
                  )
                })}
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}
