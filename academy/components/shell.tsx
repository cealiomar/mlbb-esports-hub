import Link from 'next/link'
import type { Locale } from '@/lib/data'
import { dict } from '@/lib/i18n'
import { LocaleSwitch, NavLinks } from './nav-links'

export function Shell({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const t = dict(locale)
  const items = (
    ['home', 'matches', 'meta', 'draft', 'players', 'learn'] as const
  ).map((id) => ({
    id,
    href: id === 'home' ? `/${locale}/` : `/${locale}/${id}/`,
    label: t.nav[id],
  }))

  return (
    <div className="shell">
      <aside className="side">
        <Link href={`/${locale}/`} className="side__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mpl-mena.webp" alt="MPL MENA" width={720} height={474} />
          <span>ACADEMY</span>
        </Link>
        <NavLinks items={items} className="nav nav--side" />
        <div className="side__foot">
          <LocaleSwitch locale={locale} label={t.switchTo} />
          <p>{t.footer}</p>
        </div>
      </aside>

      <header className="top">
        <Link href={`/${locale}/`} className="top__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mpl-mena.webp" alt="MPL MENA" width={720} height={474} />
          <span>ACADEMY</span>
        </Link>
        <LocaleSwitch locale={locale} label={t.switchTo} />
      </header>

      <main className="main">
        {children}
        <footer className="foot">
          <p>{t.source}</p>
          <p>{t.footer}</p>
        </footer>
      </main>

      <NavLinks items={items} className="nav nav--bar" />
    </div>
  )
}
