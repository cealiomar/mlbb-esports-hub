import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { getRegions } from '@/lib/content/regions'

/**
 * Every region, always readable and one tap away.
 */
export function RegionList({
  locale,
  liveRegions = [],
}: {
  locale: 'en' | 'ar'
  liveRegions?: string[]
}) {
  const t = useTranslations('region')

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {getRegions().map((region, index) => {
        const live = liveRegions.includes(region.slug)

        return (
          <li
            key={region.slug}
            className="reveal"
            style={{ '--reveal-delay': `${index * 45}ms` } as React.CSSProperties}
          >
            <Link
              href={`/${locale}/regions/${region.slug}`}
              className="region-card panel group flex min-h-[132px] items-center gap-4 overflow-hidden p-5"
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
  )
}
