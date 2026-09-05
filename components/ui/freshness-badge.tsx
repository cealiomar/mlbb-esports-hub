'use client'

import { useSyncExternalStore } from 'react'
import { useFormatter, useTranslations } from 'next-intl'

// One clock for all badges. No data requests, no frozen build-time "2 minutes
// ago", and a deterministic server snapshot for hydration.
let currentMinute = Math.floor(Date.now() / 60_000) * 60
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined
function tick() {
  currentMinute = Math.floor(Date.now() / 60_000) * 60
  listeners.forEach((listener) => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    tick()
    timer = setInterval(tick, 60_000)
    window.addEventListener('focus', tick)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearInterval(timer)
      timer = undefined
      window.removeEventListener('focus', tick)
    }
  }
}

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
  const now = useSyncExternalStore(subscribe, () => currentMinute, () => null)
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
