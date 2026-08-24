'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { getRegions } from '@/lib/content/regions'
import type { DraftLeague } from '@/lib/data/types'
import type { HeroImageMap } from '@/lib/drafts/hero-images'
import {
  draftTeams,
  teamDraftProfile,
  topLeagueBans,
  topLeaguePicks,
} from '@/lib/drafts/analytics'
import {
  resolveDraftTeamVisual,
  type DraftTeamVisual,
} from '@/lib/drafts/enrich'
import { TeamCrest } from '@/components/matches/team-crest'
import { LeagueHeroRanking } from './league-hero-ranking'
import { TeamDraftPanel } from './team-draft-panel'

export function DraftExplorer({
  leagues,
  locale,
  teamVisuals,
  heroImages,
}: {
  leagues: DraftLeague[]
  locale: 'en' | 'ar'
  teamVisuals: DraftTeamVisual[]
  heroImages: HeroImageMap
}) {
  const t = useTranslations('drafts')
  const available = getRegions()
    .map((region) => ({
      region,
      league: leagues.find((league) => league.regionSlug === region.slug),
    }))
    .filter(
      (entry): entry is { region: ReturnType<typeof getRegions>[number]; league: DraftLeague } =>
        Boolean(entry.league),
    )
  const [activeRegion, setActiveRegion] = useState(available[0]?.region.slug ?? '')
  const active = available.find((entry) => entry.region.slug === activeRegion) ?? available[0]
  const teams = active ? draftTeams(active.league) : []
  const [selectedByRegion, setSelectedByRegion] = useState<Record<string, string>>({})
  const selectedTeam = active
    ? (selectedByRegion[active.region.slug] ?? teams[0]?.pageSlug ?? '')
    : ''
  const profile =
    active && selectedTeam
      ? teamDraftProfile(active.league, selectedTeam)
      : null

  if (!active) return null

  return (
    <div className="draft-explorer">
      <nav className="draft-region-rail" aria-label={t('chooseRegion')}>
        {available.map(({ region }) => {
          const selected = region.slug === active.region.slug
          return (
            <button
              key={region.slug}
              type="button"
              aria-pressed={selected}
              className="draft-region-choice"
              data-active={selected || undefined}
              onClick={() => setActiveRegion(region.slug)}
            >
              <span aria-hidden>{region.flag}</span>
              <strong>{region.name[locale]}</strong>
            </button>
          )
        })}
      </nav>

      <section
        className="draft-league-overview"
        data-testid="draft-overview"
        style={{ '--region-accent': active.region.accent } as React.CSSProperties}
      >
        <header className="draft-league-overview__header">
          <span>
            <small>{active.region.name[locale]}</small>
            <h1>{active.league.leagueName}</h1>
          </span>
          <strong>{t('gamesAnalyzed', { count: active.league.gamesAnalyzed })}</strong>
        </header>

        <div className="draft-ranking-grid">
          <LeagueHeroRanking
            title={t('topPicks')}
            stats={topLeaguePicks(active.league)}
            mode="pick"
            countLabel={t('pickCount')}
            rateLabel={t('pickRate')}
          />
          <LeagueHeroRanking
            title={t('topBans')}
            stats={topLeagueBans(active.league)}
            mode="ban"
            countLabel={t('banCount')}
            rateLabel={t('banRate')}
          />
        </div>
      </section>

      {teams.length > 0 ? (
        <section className="draft-team-lab">
          <header className="draft-team-lab__intro">
            <span>
              <small>{t('teamLabEyebrow')}</small>
              <h2>{t('teamDrafts')}</h2>
            </span>
            <p>{t('teamDraftsDescription')}</p>
          </header>

          <div className="draft-team-rail" aria-label={t('chooseTeam')}>
            {teams.map((team) => {
              const visual = resolveDraftTeamVisual(
                teamVisuals,
                team,
                active.region.slug,
              )
              return (
                <button
                  key={team.pageSlug}
                  type="button"
                  aria-pressed={team.pageSlug === selectedTeam}
                  data-active={team.pageSlug === selectedTeam || undefined}
                  onClick={() =>
                    setSelectedByRegion((current) => ({
                      ...current,
                      [active.region.slug]: team.pageSlug,
                    }))
                  }
                >
                  <TeamCrest team={visual} size={38} />
                  <strong>{team.name}</strong>
                </button>
              )
            })}
          </div>

          {profile && (
            <TeamDraftPanel
              league={active.league}
              profile={profile}
              locale={locale}
              teamVisuals={teamVisuals}
              heroImages={heroImages}
            />
          )}
        </section>
      ) : (
        <div className="draft-empty panel">
          <strong>{t('teamDataPending')}</strong>
          <p>{t('teamDataPendingHint')}</p>
        </div>
      )}

      <p className="draft-source-note">{t('sourceNote')}</p>
    </div>
  )
}
