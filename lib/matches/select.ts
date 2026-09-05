import type { Match } from '@/lib/data/types'
import { egyptDayKey } from '@/lib/time/egypt'

export const PENDING_WINDOW_SECONDS = 24 * 60 * 60

export function todayMatches(all: Match[], now: number): Match[] {
  const today = egyptDayKey(now)
  return all
    .filter((m) => egyptDayKey(m.startsAt) === today)
    .sort((a, b) => a.startsAt - b.startsAt)
}

export function upcomingMatches(all: Match[], now: number): Match[] {
  return all
    .filter((m) => m.status === 'upcoming' && m.startsAt >= now - PENDING_WINDOW_SECONDS)
    .sort((a, b) => a.startsAt - b.startsAt)
}

export function liveMatches(all: Match[], now: number): Match[] {
  // Time passing is not evidence of a live broadcast. Keep unconfirmed
  // fixtures in the schedule rather than inventing LIVE from a start time.
  return all
    .filter((m) => m.status === 'live' && m.startsAt <= now)
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
