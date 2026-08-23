import type { Match } from '@/lib/data/types'
import { egyptDayKey } from '@/lib/time/egypt'

export const LIVE_ASSUMED_WINDOW_SECONDS = 5 * 60 * 60

export function todayMatches(all: Match[], now: number): Match[] {
  const today = egyptDayKey(now)
  return all
    .filter((m) => egyptDayKey(m.startsAt) === today)
    .sort((a, b) => a.startsAt - b.startsAt)
}

export function upcomingMatches(all: Match[], now: number): Match[] {
  return all
    .filter((m) => m.status === 'upcoming' && m.startsAt > now)
    .sort((a, b) => a.startsAt - b.startsAt)
}

export function liveMatches(all: Match[], now: number): Match[] {
  return all
    .filter(
      (m) =>
        m.status === 'live' ||
        (m.status === 'upcoming' &&
          m.startsAt <= now &&
          m.startsAt >= now - LIVE_ASSUMED_WINDOW_SECONDS),
    )
    .map((m) => (m.status === 'live' ? m : { ...m, status: 'live' as const }))
    .sort((a, b) => a.startsAt - b.startsAt)
}

export function recentResults(all: Match[], limit: number): Match[] {
  return all
    .filter((m) => m.status === 'completed')
    .sort((a, b) => b.startsAt - a.startsAt)
    .slice(0, limit)
}

export function byRegion(all: Match[], regionSlug: string): Match[] {
  return all.filter((m) => m.regionSlug === regionSlug)
}
