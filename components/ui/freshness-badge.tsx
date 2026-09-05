import { useFormatter, useTranslations } from 'next-intl'
import { BUILD_UNIX_TIME } from '@/lib/time/build'

/**
 * The harvester runs hourly and the site still has to build and deploy after
 * it commits, so data an hour or so old is the normal steady state — not a
 * fault. Only a gap wide enough to mean runs are actually being missed is
 * worth flagging.
 */
const STALE_AFTER_SECONDS = 3 * 3600

export function FreshnessBadge({ harvestedAt }: { harvestedAt: number | null }) {
  const t = useTranslations('data')
  const format = useFormatter()
  if (harvestedAt === null) return null

  const ageSeconds = BUILD_UNIX_TIME - harvestedAt
  const stale = ageSeconds > STALE_AFTER_SECONDS
  const updated = t('updated', {
    time: format.relativeTime(new Date(harvestedAt * 1000)),
  })

  return (
    <span
      className={`freshness-badge text-[var(--step--1)] ${
        stale ? 'text-[var(--brand-hot)]' : 'text-[var(--ink-muted)]'
      }`}
      // Always say when, so the reader can judge for themselves rather than
      // being told only that something is wrong.
      title={stale ? `${t('delayed')} · ${updated}` : undefined}
    >
      {stale ? `${t('delayed')} · ${updated}` : updated}
    </span>
  )
}
