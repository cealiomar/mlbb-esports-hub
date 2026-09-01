'use client'

import { useState } from 'react'
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

function DraftGameView({
  game,
  series,
  profileTeam,
  team1Visual,
  team2Visual,
  heroImages,
}: {
  game: DraftGame
  series: TeamDraftProfile['recentSeries'][number]['series']
  profileTeam: TeamDraftProfile['team']
  team1Visual: DraftTeamVisual
  team2Visual: DraftTeamVisual
  heroImages: HeroImageMap
}) {
  const t = useTranslations('drafts')
  const profileIsTeam1 = series.team1.pageSlug === profileTeam.pageSlug
  const [viewingTeam1, setViewingTeam1] = useState(profileIsTeam1)
  const team = viewingTeam1 ? series.team1 : series.team2
  const visual = viewingTeam1 ? team1Visual : team2Visual
  const picks = viewingTeam1 ? game.team1Picks : game.team2Picks
  const bans = viewingTeam1 ? game.team1Bans : game.team2Bans
  const side = viewingTeam1 ? game.team1Side : game.team2Side
  const won = game.winner === null ? null : viewingTeam1 ? game.winner === 1 : game.winner === 2
  const otherTeam = viewingTeam1 ? series.team2 : series.team1
  const viewingProfile = viewingTeam1 === profileIsTeam1

  return (
    <article key={game.number} className="draft-game">
      <header>
        <strong>{t('gameNumber', { number: game.number })}</strong>
        {won !== null && (
          <span className={`draft-game__result ${won ? 'draft-game__result--win' : 'draft-game__result--loss'}`}>
            {won ? t('win') : t('loss')}
          </span>
        )}
        {side && (
          <span className={`draft-game__side draft-game__side--${side}`}>
            {side === 'blue' ? t('blueSide') : t('redSide')}
          </span>
        )}
        {formatDuration(game.durationSeconds) && <small>{formatDuration(game.durationSeconds)}</small>}
        {game.vodUrl && (
          <a href={game.vodUrl} target="_blank" rel="noopener noreferrer" className="watch-link rewatch-link">
            <span className="replay-play" aria-hidden />
            {t('watchGame')}
          </a>
        )}
      </header>

      <div className="draft-game__sides" aria-label={t('sidesLabel')}>
        {([true, false] as const).map((isTeam1) => {
          const optionTeam = isTeam1 ? series.team1 : series.team2
          const optionVisual = isTeam1 ? team1Visual : team2Visual
          const optionSide = isTeam1 ? game.team1Side : game.team2Side
          return (
            <button
              key={optionTeam.pageSlug}
              type="button"
              className={`draft-game__team-side draft-game__team-side--${optionSide ?? 'neutral'}`}
              data-active={viewingTeam1 === isTeam1 || undefined}
              onClick={() => setViewingTeam1(isTeam1)}
            >
              <TeamCrest team={optionVisual} size={26} />
              {optionSide && <small>{optionSide === 'blue' ? t('blueSide') : t('redSide')}</small>}
              <strong>{optionTeam.name}</strong>
            </button>
          )
        })}
      </div>

      <p className="draft-game__viewing">
        {viewingProfile ? t('viewingTeamDraft', { team: team.name }) : t('viewingOpponentDraft', { team: team.name, opponent: otherTeam.name })}
      </p>
      <div className="draft-game__row">
        <b>{t('teamPicks', { team: team.name })}</b>
        <HeroStrip heroes={picks} heroImages={heroImages} />
      </div>
      <div className="draft-game__row draft-game__row--bans">
        <b>{t('teamBans', { team: team.name })}</b>
        <HeroStrip heroes={bans} heroImages={heroImages} />
      </div>
    </article>
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
                {games.map(({ game }) => (
                  <DraftGameView
                    key={game.number}
                    game={game}
                    series={series}
                    profileTeam={profile.team}
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
