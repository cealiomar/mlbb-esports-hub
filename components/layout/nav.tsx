import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BrandMark } from '@/components/ui/brand-mark'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { MobileNav, type MobileNavItem } from './mobile-nav'

export function Nav({ locale }: { locale: string }) {
  const t = useTranslations('nav')
  const other = locale === 'ar' ? 'en' : 'ar'

  const items: MobileNavItem[] = [
    { href: `/${locale}`, label: t('home'), icon: 'home' },
    { href: `/${locale}/matches`, label: t('matches'), icon: 'matches' },
    { href: `/${locale}/#standings`, label: t('standings'), icon: 'standings' },
    { href: `/${locale}/drafts`, label: t('drafts'), icon: 'drafts' },
    { href: `/${locale}/draft-coach`, label: t('coach'), icon: 'coach' },
  ]

  return (
    <>
      <nav className="site-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 sm:px-6">
          <Link
            href={`/${locale}`}
            className="nav-brand flex min-h-[60px] items-center sm:min-h-[64px]"
          >
            {/* The phone bar carries only the logo, language and theme, so the
                lockup no longer has to shrink to make room for five links. */}
            <BrandMark
              width={126}
              priority
              className="w-[104px] min-[420px]:w-[118px] sm:w-[126px]"
            />
          </Link>

          {/* Destinations sit in the top bar from the small breakpoint up, and
              in the thumb-reachable bottom bar below it. */}
          <div className="ms-auto hidden items-center gap-1 sm:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-[var(--ink-muted)]"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="ms-auto flex items-center gap-1 sm:ms-0">
            <Link
              href={`/${other}`}
              className="nav-link flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-3 text-sm font-extrabold text-[var(--brand-strong)]"
            >
              {other.toUpperCase()}
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <MobileNav items={items} />
    </>
  )
}
