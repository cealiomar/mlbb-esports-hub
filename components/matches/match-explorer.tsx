'use client'

import { useId, useMemo, useState } from 'react'
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
  const browserId = useId()
  const preferredGroup = groups.find((group) => group.id === 'upcoming') ?? groups[0]
  const [active, setActive] = useState(preferredGroup?.id ?? 'upcoming')
  const [region, setRegion] = useState('all')
  const activeGroup = groups.find((group) => group.id === active) ?? preferredGroup

  const buckets = useMemo(() => {
    const matches = activeGroup?.matches ?? []
    const availableRegions = new Set(groups.flatMap((group) => group.matches.map((match) => match.regionSlug)))
    const ordered: RegionBucket[] = regions
      .filter((definition) => availableRegions.has(definition.slug))
      .map((definition) => ({
        key: definition.slug,
        slug: definition.slug,
        flag: definition.flag,
        label: definition.name[localeKey],
        matches: matches.filter((match) => match.regionSlug === definition.slug),
      }))

    const international = matches.filter((match) => !match.regionSlug)
    if (availableRegions.has(null)) {
      ordered.push({
        key: INTERNATIONAL,
        slug: null,
        flag: '🌍',
        label: t('international'),
        matches: international,
      })
    }
    return ordered
  }, [activeGroup, groups, localeKey, regions, t])

  const visibleBuckets = region === 'all'
    ? buckets.filter((bucket) => bucket.matches.length > 0)
    : buckets.filter((bucket) => bucket.key === region && bucket.matches.length > 0)

  function chooseView(id: MatchExplorerGroup['id']) {
    setActive(id)
  }

  return (
    <div className="simple-match-browser">
      <section className="match-controls panel" aria-label={t('chooseView')}>
        <div className="simple-match-tabs" role="tablist" aria-label={t('chooseView')}>
          {groups.map((group) => {
            const selected = group.id === active
            const icon = group.id === 'live' ? '●' : group.id === 'upcoming' ? '◷' : '✓'
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                id={`${browserId}-${group.id}`}
                aria-controls={`${browserId}-panel`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => chooseView(group.id)}
                onKeyDown={(event) => {
                  const index = groups.indexOf(group)
                  const nextKey = localeKey === 'ar' ? 'ArrowLeft' : 'ArrowRight'
                  const previousKey = localeKey === 'ar' ? 'ArrowRight' : 'ArrowLeft'
                  const next = event.key === 'Home' ? 0 : event.key === 'End' ? groups.length - 1
                    : event.key === nextKey ? (index + 1) % groups.length
                      : event.key === previousKey ? (index - 1 + groups.length) % groups.length : null
                  if (next === null) return
                  event.preventDefault()
                  chooseView(groups[next].id)
                  document.getElementById(`${browserId}-${groups[next].id}`)?.focus()
                }}
                className={group.id === 'live' ? 'is-live' : undefined}
              >
                <span className="simple-match-tabs__icon" aria-hidden>{icon}</span>
                <span>{group.label}</span>
                <strong>{group.matches.length}</strong>
              </button>
            )
          })}
        </div>
        <p className="match-controls__label">{t('chooseRegion')}</p>
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
              data-region={bucket.key}
              onClick={() => setRegion(bucket.key)}
            >
              <span aria-hidden>{bucket.flag}</span>
              {bucket.label}
              <small>{bucket.matches.length}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="region-match-results" role="tabpanel" id={`${browserId}-panel`} aria-labelledby={`${browserId}-${active}`} tabIndex={0}>
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
