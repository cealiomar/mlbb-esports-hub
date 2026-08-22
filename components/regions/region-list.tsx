'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getRegions } from '@/lib/content/regions'

export function RegionList({
  locale,
  liveRegions = [],
}: {
  locale: 'en' | 'ar'
  liveRegions?: string[]
}) {
  const t = useTranslations('region')
  const railRef = useRef<HTMLUListElement>(null)
  const [rail, setRail] = useState({ progress: 0, overflow: false })

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

  function slide(forward: boolean) {
    const node = railRef.current
    if (!node) return
    const logicalDirection = locale === 'ar' ? -1 : 1
    const step = Math.max(280, node.clientWidth * 0.78)
    node.scrollBy({
      left: (forward ? 1 : -1) * logicalDirection * step,
      behavior: 'smooth',
    })
  }

  const regions = getRegions()
  const atStart = rail.progress <= 0.01
  const atEnd = rail.progress >= 0.99

  return (
    <div
      className="region-slider"
      style={{ '--rail-progress': rail.progress } as React.CSSProperties}
    >
      <div className="region-slider__toolbar mb-5 flex items-center justify-between gap-4">
        <span className="text-[11px] font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
          {t('slideHint')}
        </span>

        {rail.overflow && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="region-previous"
              aria-label={t('previous')}
              disabled={atStart}
              onClick={() => slide(false)}
              className="rail-button"
            >
              <span aria-hidden>{locale === 'ar' ? '→' : '←'}</span>
            </button>
            <button
              type="button"
              data-testid="region-next"
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
        data-testid="region-rail"
        aria-label={t('carouselLabel')}
        className="region-rail"
      >
        {regions.map((region, index) => {
          const live = liveRegions.includes(region.slug)

          return (
            <li
              key={region.slug}
              className="region-rail__item"
              style={{ '--rail-delay': `${Math.min(index, 7) * 55}ms` } as React.CSSProperties}
            >
              <Link
                href={`/${locale}/regions/${region.slug}`}
                className="region-card panel group flex min-h-[142px] items-center gap-4 overflow-hidden p-5"
                style={{ '--region-accent': region.accent } as React.CSSProperties}
              >
                <span className="region-flag" aria-hidden>{region.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-extrabold text-[var(--ink)]">
                    {region.name[locale]}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[var(--ink-muted)]">
                    {region.leagueName}
                  </span>
                  <span className="mt-3 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] text-[var(--brand-strong)] uppercase">
                    {live ? (
                      <>
                        <span className="live-dot size-1.5 rounded-full bg-[var(--brand-hot)]" />
                        {t('live')}
                      </>
                    ) : t('explore')}
                  </span>
                </span>
                <span className="region-arrow" aria-hidden>↗</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <span className="region-slider__track mt-5 block" aria-hidden>
        <span />
      </span>
    </div>
  )
}
