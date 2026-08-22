'use client'

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { Match } from '@/lib/data/types'
import type { RegionDefinition } from '@/lib/content/regions'
import { replayUrl } from '@/lib/matches/replay'
import { MatchList } from './match-list'

export interface MatchExplorerGroup {
  id: 'live' | 'today' | 'upcoming' | 'results'
  label: string
  matches: Match[]
}

function searchable(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
}

function hasVideo(match: Match): boolean {
  return match.status === 'completed'
    ? Boolean(replayUrl(match))
    : match.streamUrls.length > 0
}

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
  const initialGroup = groups[0]?.id ?? 'today'
  const [active, setActive] = useState(initialGroup)
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('all')
  const [videoOnly, setVideoOnly] = useState(false)
  const [density, setDensity] = useState<'compact' | 'cards'>('compact')
  const listRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    function measure() {
      const currentList = listRef.current
      if (!currentList) return
      const current = currentList.querySelector<HTMLButtonElement>('[data-active="true"]')
      if (!current) return
      setPill({ left: current.offsetLeft, width: current.offsetWidth })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [active, groups])

  const activeGroup = groups.find((group) => group.id === active) ?? groups[0]
  const normalizedQuery = searchable(query)

  const visibleMatches = useMemo(() => {
    return (activeGroup?.matches ?? []).filter((match) => {
      if (region !== 'all' && match.regionSlug !== region) return false
      if (videoOnly && !hasVideo(match)) return false
      if (!normalizedQuery) return true

      const regionName = match.regionSlug
        ? regions.find((item) => item.slug === match.regionSlug)?.name[localeKey] ?? ''
        : ''
      const haystack = searchable(
        [
          match.tournamentName,
          regionName,
          ...match.opponents.flatMap((team) => [team.code, team.name]),
        ].join(' '),
      )
      return haystack.includes(normalizedQuery)
    })
  }, [activeGroup, localeKey, normalizedQuery, region, regions, videoOnly])

  const availableRegions = useMemo(() => {
    const slugs = new Set(
      groups.flatMap((group) => group.matches.map((match) => match.regionSlug)),
    )
    return regions.filter((item) => slugs.has(item.slug))
  }, [groups, regions])

  const hasFilters = Boolean(query || region !== 'all' || videoOnly)

  function setView(next: 'compact' | 'cards') {
    setDensity(next)
  }

  function resetFilters() {
    setQuery('')
    setRegion('all')
    setVideoOnly(false)
  }

  return (
    <div className="match-explorer">
      <section className="pro-command panel" aria-label={t('commandLabel')}>
        <div className="pro-command__intro">
          <div>
            <p className="pro-command__eyebrow">
              <span className="live-dot size-1.5 rounded-full bg-[var(--brand-hot)]" />
              {t('commandEyebrow')}
            </p>
            <p className="pro-command__hint">{t('timezoneHint')}</p>
          </div>
          <span className="pro-command__count" aria-live="polite">
            {t('showing', { count: visibleMatches.length })}
          </span>
        </div>

        <div className="tabs-scroll pro-tabs-scroll">
          <div
            ref={listRef}
            role="tablist"
            className="pro-tabs relative inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-[var(--line)] bg-[var(--surface)] p-1.5"
          >
            {pill && (
              <span
                aria-hidden
                className="absolute top-1.5 bottom-1.5 rounded-full bg-[var(--brand)] transition-[transform,width] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: pill.width,
                  transform: `translateX(${pill.left}px)`,
                  left: 0,
                }}
              />
            )}
            {groups.map((group) => {
              const selected = group.id === active
              return (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-active={selected}
                  onClick={() => setActive(group.id)}
                  className={`relative z-10 flex min-h-[40px] shrink-0 items-center gap-2 rounded-full px-4 text-xs font-bold tracking-wide whitespace-nowrap uppercase transition-colors duration-300 sm:px-5 sm:text-sm ${
                    selected
                      ? 'text-[#0a0a0c]'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {group.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                      selected
                        ? 'bg-[rgba(0,0,0,0.18)]'
                        : 'bg-[var(--surface-raised)]'
                    }`}
                  >
                    {group.matches.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="pro-filters">
          <label className="pro-search">
            <span className="sr-only">{t('searchLabel')}</span>
            <svg aria-hidden viewBox="0 0 24 24" width="18" height="18">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m16.3 16.3 4.2 4.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
            />
          </label>

          <label className="pro-select-wrap">
            <span className="sr-only">{t('regionFilter')}</span>
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              aria-label={t('regionFilter')}
            >
              <option value="all">{t('allRegions')}</option>
              {availableRegions.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.flag} {item.name[localeKey]}
                </option>
              ))}
            </select>
            <span aria-hidden>⌄</span>
          </label>

          <button
            type="button"
            className="pro-filter-toggle"
            aria-pressed={videoOnly}
            onClick={() => setVideoOnly((value) => !value)}
          >
            <span className="replay-play" aria-hidden />
            {t('videoOnly')}
          </button>

          <div className="density-toggle" role="group" aria-label={t('viewMode')}>
            <button
              type="button"
              aria-label={t('compactView')}
              aria-pressed={density === 'compact'}
              onClick={() => setView('compact')}
            >
              <span aria-hidden>☷</span>
            </button>
            <button
              type="button"
              aria-label={t('cardView')}
              aria-pressed={density === 'cards'}
              onClick={() => setView('cards')}
            >
              <span aria-hidden>▦</span>
            </button>
          </div>
        </div>

        {hasFilters && (
          <div className="pro-filter-state">
            <span>{t('filteredHint')}</span>
            <button type="button" onClick={resetFilters}>{t('clearFilters')}</button>
          </div>
        )}
      </section>

      <div key={`${active}-${density}`} className="tab-panel pro-results" role="tabpanel">
        {visibleMatches.length > 0 ? (
          <MatchList matches={visibleMatches} density={density} />
        ) : (
          <div className="empty-filter panel">
            <span aria-hidden>⌕</span>
            <p>{t('noFilterMatches')}</p>
            {hasFilters && (
              <button type="button" onClick={resetFilters}>{t('clearFilters')}</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
