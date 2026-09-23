'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useMinuteClock } from '@/lib/time/use-clock'

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
  const now = useMinuteClock()
  if (harvestedAt === null) return null

  const ageSeconds = now === null ? 0 : Math.max(0, now - harvestedAt)
  const stale = ageSeconds > STALE_AFTER_SECONDS
  const timestamp = new Date(harvestedAt * 1000)
  const absolute = format.dateTime(timestamp, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC'
  const updated = t('updated', {
    time: now === null ? absolute : format.relativeTime(timestamp, new Date(now * 1000)),
  })

  return (
    <span
      className={`freshness-badge text-[var(--step--1)] ${
        stale ? 'text-[var(--brand-hot)]' : 'text-[var(--ink-muted)]'
      }`}
      // Always say when, so the reader can judge for themselves rather than
      // being told only that something is wrong.
      title={absolute}
      data-harvested-at={harvestedAt}
    >
      {stale ? `${t('delayed')} · ${updated}` : updated}
    </span>
  )
}
