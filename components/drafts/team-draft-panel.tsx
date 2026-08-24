'use client'

import { useTranslations } from 'next-intl'
import type { DraftHero, DraftLeague } from '@/lib/data/types'
import type { TeamDraftProfile, TeamHeroStat } from '@/lib/drafts/analytics'
import { HeroIcon } from './hero-icon'

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function imageFor(league: DraftLeague, hero: DraftHero): string | null {
  return (
    league.heroStats.find((stat) => stat.hero.id === hero.id)?.imageUrl ?? null
  )
}

function TeamHeroRanking({
  title,
  stats,
  league,
  showWinRate,
}: {
  title: string
  stats: TeamHeroStat[]
  league: DraftLeague
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
              imageUrl={imageFor(league, stat.hero)}
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
  league,
}: {
  heroes: DraftHero[]
  league: DraftLeague
}) {
  return (
    <ul className="draft-game__heroes">
      {heroes.map((hero, index) => (
        <li key={`${hero.id}-${index}`} title={hero.name}>
          <HeroIcon hero={hero} imageUrl={imageFor(league, hero)} size={38} />
          <span>{hero.name}</span>
        </li>
      ))}
    </ul>
  )
}

export function TeamDraftPanel({
  league,
  profile,
}: {
  league: DraftLeague
  profile: TeamDraftProfile
}) {
  const t = useTranslations('drafts')

  return (
    <section className="team-draft-panel" data-testid="team-draft-panel">
      <header className="team-draft-panel__header">
        <span>
          <small>{t('teamAnalysis')}</small>
          <h2>{profile.team.name}</h2>
        </span>
        <strong>{t('gamesAnalyzed', { count: profile.gamesAnalyzed })}</strong>
      </header>

      <div className="team-meta-grid">
        <TeamHeroRanking
          title={t('teamTopPicks')}
          stats={profile.topPicks}
          league={league}
          showWinRate
        />
        <TeamHeroRanking
          title={t('teamTopBans')}
          stats={profile.topBans}
          league={league}
          showWinRate={false}
        />
      </div>

      <div className="draft-series-list">
        <h3>{t('recentDrafts')}</h3>
        {profile.recentSeries.map(({ series, opponent, games }, index) => (
          <details
            key={series.id}
            className="draft-series panel"
            open={index === 0}
          >
            <summary>
              <span>
                <small>{t('seriesAgainst')}</small>
                <strong>{opponent.name}</strong>
              </span>
              <span className="draft-series__summary-meta">
                {series.mvp && <small>{t('mvp', { player: series.mvp })}</small>}
                <b>{t('gameCount', { count: games.length })}</b>
              </span>
            </summary>

            <div className="draft-series__games">
              {games.map(({ game, side, won, picks, bans }) => (
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

                  <div className="draft-game__row">
                    <b>{t('picks')}</b>
                    <HeroStrip heroes={picks} league={league} />
                  </div>
                  <div className="draft-game__row draft-game__row--bans">
                    <b>{t('bans')}</b>
                    <HeroStrip heroes={bans} league={league} />
                  </div>
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
