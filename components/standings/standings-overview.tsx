'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getRegions } from '@/lib/content/regions'
import type { StandingTable } from '@/lib/data/types'
import { StandingsTable } from './standings-table'

export function StandingsOverview({
  tables,
  locale,
}: {
  tables: StandingTable[]
  locale: 'en' | 'ar'
}) {
  const t = useTranslations('standings')
  const railRef = useRef<HTMLUListElement>(null)
  const [rail, setRail] = useState({ progress: 0, overflow: false })
  const entries = getRegions()
    .map((region) => ({
      region,
      table: tables.find((table) => table.regionSlug === region.slug),
    }))

  useEffect(() => {
    const node = railRef.current
    if (!node) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const max = Math.max(0, node.scrollWidth - node.clientWidth)
        const current = Math.min(max, Math.abs(node.scrollLeft))
        setRail({
          progress: max > 0 ? current / max : 1,
          overflow: max > 2,
        })
      })
    }

    update()
    node.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(node)

    return () => {
      cancelAnimationFrame(frame)
      node.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [])

  if (entries.length === 0) return null

  function slide(forward: boolean) {
    const node = railRef.current
    if (!node) return
    const logicalDirection = locale === 'ar' ? -1 : 1
    const step = Math.max(320, node.clientWidth * 0.78)
    node.scrollBy({
      left: (forward ? 1 : -1) * logicalDirection * step,
      behavior: 'smooth',
    })
  }

  const atStart = rail.progress <= 0.01
  const atEnd = rail.progress >= 0.99

  return (
    <div
      className="standings-slider"
      style={{ '--rail-progress': rail.progress } as React.CSSProperties}
    >
      <div className="standings-slider__toolbar mb-5 flex items-center justify-between gap-4">
        <span className="text-[11px] font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
          {t('slideHint')}
        </span>

        {rail.overflow && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="standings-previous"
              aria-label={t('previous')}
              disabled={atStart}
              onClick={() => slide(false)}
              className="rail-button"
            >
              <span aria-hidden>{locale === 'ar' ? '→' : '←'}</span>
            </button>
            <button
              type="button"
              data-testid="standings-next"
              aria-label={t('next')}
              disabled={atEnd}
              onClick={() => slide(true)}
              className="rail-button"
            >
              <span aria-hidden>{locale === 'ar' ? '←' : '→'}</span>
            </button>
          </div>
        )}
      </div>

      <ul
        ref={railRef}
        data-testid="standings-rail"
        aria-label={t('carouselLabel')}
        className="standings-rail"
      >
        {entries.map(({ region, table }, index) => (
          <li
            key={region.slug}
            className="standings-rail__item"
            style={{ '--rail-delay': `${Math.min(index, 7) * 55}ms` } as React.CSSProperties}
          >
            <article
              className="standings-preview panel overflow-hidden"
              style={{ '--region-accent': region.accent } as React.CSSProperties}
            >
              <header className="standings-preview__header">
                <span className="text-2xl" aria-hidden>{region.flag}</span>
                <span className="min-w-0 flex-1">
                  <strong>{region.name[locale]}</strong>
                  <small>{table?.stageName ?? t('waitingForTable')}</small>
                </span>
                <span className="standings-preview__league">{region.leagueName}</span>
              </header>

              {table ? (
                <StandingsTable
                  table={table}
                  locale={locale}
                  compact
                  limit={4}
                  showStage={false}
                />
              ) : (
                <div className="standings-empty standings-empty--preview">
                  <span aria-hidden>—</span>
                  <strong>{t('empty')}</strong>
                  <small>{t('emptyHint')}</small>
                </div>
              )}

              <Link
                href={`/${locale}/regions/${region.slug}#standings`}
                className="standings-preview__link"
              >
                {table ? t('viewFull') : t('viewRegion')}
                <span aria-hidden>↗</span>
              </Link>
            </article>
          </li>
        ))}
      </ul>

      <span className="standings-slider__track mt-5 block" aria-hidden>
        <span />
      </span>
    </div>
  )
}
