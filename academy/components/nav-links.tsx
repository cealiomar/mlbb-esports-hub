'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />,
  matches: <path d="M4 5h16v15H4zM4 10h16M8 3v4M16 3v4" />,
  meta: <path d="M5 20V11M12 20V4M19 20v-7" />,
  draft: <path d="M4 5h7v14H4zM13 5h7v14h-7zM7.5 9v6M16.5 9v6" />,
  players: <path d="M8.5 11a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6ZM2.5 20a6 6 0 0 1 12 0M16 4.6a3.3 3.3 0 0 1 0 6.3M17.5 14.3a6 6 0 0 1 4 5.7" />,
  learn: <path d="M2.5 9.5 12 5l9.5 4.5L12 14zM6.5 11.6V16c1.6 1.4 3.4 2 5.5 2s3.9-.6 5.5-2v-4.4" />,
}

export interface NavItem {
  id: string
  href: string
  label: string
}

export function NavLinks({
  items,
  className,
}: {
  items: NavItem[]
  className: string
}) {
  const path = (usePathname() ?? '').replace(/\/$/, '')

  return (
    <nav className={className} aria-label="Primary">
      {items.map((item) => {
        const target = item.href.replace(/\/$/, '')
        // The dashboard is a prefix of every route, so it matches exactly.
        const current =
          item.id === 'home' ? path === target : path.startsWith(target)
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={current ? 'page' : undefined}
            className="nav__item"
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              {ICONS[item.id]}
            </svg>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/** The same page in the other language. */
export function LocaleSwitch({ locale, label }: { locale: string; label: string }) {
  const path = usePathname() ?? `/${locale}/`
  const other = locale === 'ar' ? 'en' : 'ar'
  const href = path.replace(/^\/(ar|en)(?=\/|$)/, `/${other}`)
  return (
    <Link href={href} className="locale-switch" lang={other}>
      {label}
    </Link>
  )
}
