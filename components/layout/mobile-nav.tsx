'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Thumb-reachable navigation for phones.
 *
 * The top bar cannot hold five destinations at a usable size on a 375px
 * screen — squeezing them there produced 36px targets a single pixel apart,
 * and Home disappeared entirely. Down here each destination gets a full
 * target and the whole set stays reachable without stretching.
 */

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="mobile-nav__icon">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  )
}

function IconMatches() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="mobile-nav__icon">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

function IconStandings() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="mobile-nav__icon">
      <path d="M5 20V11M12 20V4M19 20v-6" />
    </svg>
  )
}

function IconDrafts() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="mobile-nav__icon">
      <path d="M4 6h7v12H4zM13 6h7v12h-7z" />
      <path d="M8.5 3v3M15.5 3v3" />
    </svg>
  )
}

function IconCoach() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="mobile-nav__icon">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

export interface MobileNavItem {
  href: string
  label: string
  icon: 'home' | 'matches' | 'standings' | 'drafts' | 'coach'
}

const ICONS = {
  home: IconHome,
  matches: IconMatches,
  standings: IconStandings,
  drafts: IconDrafts,
  coach: IconCoach,
} as const

function isCurrent(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, '')
  const [route, hash] = href.split('#')
  const target = route.replace(/\/$/, '')

  // Standings is a section of the home page rather than a page of its own.
  // Marking it current would light two destinations at once on the home
  // page, so an in-page anchor is never the current destination.
  if (hash !== undefined) return false

  // The locale root is likewise a prefix of everything, so it matches exactly.
  const isLocaleRoot = target.split('/').filter(Boolean).length <= 1
  return isLocaleRoot ? path === target : path.startsWith(target)
}

export function MobileNav({ items }: { items: MobileNavItem[] }) {
  const pathname = usePathname() ?? ''

  return (
    <nav className="mobile-nav sm:hidden" aria-label="Primary">
      {items.map((item) => {
        const Icon = ICONS[item.icon]
        const current = isCurrent(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? 'page' : undefined}
            className="mobile-nav__item"
            data-active={current ? 'true' : undefined}
          >
            <Icon />
            <span className="mobile-nav__label">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
