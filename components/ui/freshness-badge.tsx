import { useFormatter, useTranslations } from 'next-intl'
import { BUILD_UNIX_TIME } from '@/lib/time/build'

const STALE_AFTER_SECONDS = 3600

export function FreshnessBadge({ harvestedAt }: { harvestedAt: number | null }) {
  const t = useTranslations('data')
  const format = useFormatter()
  if (harvestedAt === null) return null

  const ageSeconds = BUILD_UNIX_TIME - harvestedAt
  const stale = ageSeconds > STALE_AFTER_SECONDS

  return (
    <span
      className={`freshness-badge text-[var(--step--1)] ${stale ? 'text-[var(--brand-hot)]' : 'text-[var(--ink-muted)]'}`}
    >
      {stale
        ? t('delayed')
        : t('updated', {
            time: format.relativeTime(new Date(harvestedAt * 1000)),
          })}
    </span>
  )
}
