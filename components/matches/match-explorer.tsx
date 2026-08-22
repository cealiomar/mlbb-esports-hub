'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { Match } from '@/lib/data/types'
import type { RegionDefinition } from '@/lib/content/regions'
import { MatchList } from './match-list'

export interface MatchExplorerGroup {
  id: 'live' | 'upcoming' | 'results'
  label: string
  matches: Match[]
}

interface RegionBucket {
  key: string
  slug: string | null
  flag: string
  label: string
  matches: Match[]
}

const INTERNATIONAL = 'international'

export function MatchExplorer({
  groups,
  regions,
}: {
  groups: MatchExplorerGroup[]
  regions: RegionDefinition[]
}) {
  const t = useTranslations('matches')
  const locale = useLocale()
  const localeKey = locale === 'ar' ? 'ar' : 'en'
  const preferredGroup = groups.find((group) => group.id === 'upcoming') ?? groups[0]
  const [active, setActive] = useState(preferredGroup?.id ?? 'upcoming')
  const [region, setRegion] = useState('all')
  const activeGroup = groups.find((group) => group.id === active) ?? preferredGroup

  const buckets = useMemo(() => {
    const matches = activeGroup?.matches ?? []
    const ordered: RegionBucket[] = regions
      .map((definition) => ({
        key: definition.slug,
        slug: definition.slug,
        flag: definition.flag,
        label: definition.name[localeKey],
        matches: matches.filter((match) => match.regionSlug === definition.slug),
      }))
      .filter((bucket) => bucket.matches.length > 0)

    const international = matches.filter((match) => !match.regionSlug)
    if (international.length > 0) {
      ordered.push({
        key: INTERNATIONAL,
        slug: null,
        flag: '🌍',
        label: t('international'),
        matches: international,
      })
    }
    return ordered
  }, [activeGroup, localeKey, regions, t])

  const visibleBuckets = region === 'all'
    ? buckets
    : buckets.filter((bucket) => bucket.key === region)

  function chooseView(id: MatchExplorerGroup['id']) {
    setActive(id)
    setRegion('all')
  }

  return (
    <div className="simple-match-browser">
      <section className="match-step panel" aria-labelledby="match-view-step">
        <div className="match-step__heading">
          <span aria-hidden>1</span>
          <div>
            <h2 id="match-view-step">{t('chooseView')}</h2>
            <p>{t('chooseViewHint')}</p>
          </div>
        </div>

        <div className="simple-match-tabs" role="tablist">
          {groups.map((group) => {
            const selected = group.id === active
            const icon = group.id === 'live' ? '●' : group.id === 'upcoming' ? '◷' : '✓'
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => chooseView(group.id)}
                className={group.id === 'live' ? 'is-live' : undefined}
              >
                <span className="simple-match-tabs__icon" aria-hidden>{icon}</span>
                <span>{group.label}</span>
                <strong>{group.matches.length}</strong>
              </button>
            )
          })}
        </div>
      </section>

      <section className="match-step panel" aria-labelledby="region-step">
        <div className="match-step__heading">
          <span aria-hidden>2</span>
          <div>
            <h2 id="region-step">{t('chooseRegion')}</h2>
            <p>{t('chooseRegionHint')}</p>
          </div>
        </div>

        <div className="region-choice" role="group" aria-label={t('chooseRegion')}>
          <button
            type="button"
            aria-pressed={region === 'all'}
            onClick={() => setRegion('all')}
          >
            <span aria-hidden>🌐</span>
            {t('allRegions')}
          </button>
          {buckets.map((bucket) => (
            <button
              key={bucket.key}
              type="button"
              aria-pressed={region === bucket.key}
              onClick={() => setRegion(bucket.key)}
            >
              <span aria-hidden>{bucket.flag}</span>
              {bucket.label}
              <small>{bucket.matches.length}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="region-match-results" role="tabpanel">
        {visibleBuckets.length > 0 ? (
          visibleBuckets.map((bucket) => {
            const preview = region === 'all' ? bucket.matches.slice(0, 4) : bucket.matches
            const hidden = bucket.matches.length - preview.length
            return (
              <section key={bucket.key} className="region-match-group reveal">
                <header className="region-match-group__header">
                  <div>
                    <span className="region-match-group__flag" aria-hidden>{bucket.flag}</span>
                    <div>
                      <h2>{bucket.label}</h2>
                      <p>{t('matchesCount', { count: bucket.matches.length })}</p>
                    </div>
                  </div>
                  {hidden > 0 && (
                    <button type="button" onClick={() => setRegion(bucket.key)}>
                      {t('showAllRegion', { count: bucket.matches.length })}
                      <span aria-hidden>→</span>
                    </button>
                  )}
                </header>
                <MatchList matches={preview} density="compact" />
              </section>
            )
          })
        ) : (
          <div className="empty-filter panel">
            <span aria-hidden>⌁</span>
            <p>{t('noMatches')}</p>
            <button type="button" onClick={() => setRegion('all')}>
              {t('allRegions')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
