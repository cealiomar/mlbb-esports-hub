'use client'

import { useSyncExternalStore } from 'react'

// One minute-resolution clock shared by every component that needs "now".
// No data requests, no frozen build-time "2 minutes ago", and a deterministic
// server snapshot (null) so static HTML hydrates without a mismatch.
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

/** Unix seconds, floored to the minute; null while prerendering. */
export function useMinuteClock(): number | null {
  return useSyncExternalStore(subscribe, () => currentMinute, () => null)
}

const noSubscription = () => () => {}

/**
 * The visitor's own IANA time zone after hydration. Prerendered HTML uses
 * `fallback` so server and first client render agree.
 */
export function useVisitorTimeZone(fallback: string): string {
  return useSyncExternalStore(
    noSubscription,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || fallback,
    () => fallback,
  )
}
