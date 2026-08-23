import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BrandMark } from '@/components/ui/brand-mark'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function Nav({ locale }: { locale: string }) {
  const t = useTranslations('nav')
  const other = locale === 'ar' ? 'en' : 'ar'

  const links = [
    { href: `/${locale}`, label: t('home'), mobileHidden: true },
    { href: `/${locale}/matches`, label: t('matches'), mobileHidden: false },
    { href: `/${locale}/#standings`, label: t('standings'), mobileHidden: false },
  ]

  return (
    <nav className="site-nav sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-3 sm:gap-2 sm:px-6">
        <Link href={`/${locale}`} className="nav-brand flex min-h-[64px] items-center">
          <BrandMark width={126} priority className="w-[82px] min-[360px]:w-[100px] sm:w-[126px]" />
        </Link>

        <div className="ms-auto flex items-center gap-0.5 sm:gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link min-h-[44px] items-center rounded-full px-1.5 text-[11px] font-semibold text-[var(--ink-muted)] sm:px-4 sm:text-sm ${link.mobileHidden ? 'hidden sm:flex' : 'flex'}`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={`/${other}`}
            className="nav-link flex min-h-[44px] items-center rounded-full px-2.5 text-xs font-extrabold text-[var(--brand-strong)] sm:px-3 sm:text-sm"
          >
            {other.toUpperCase()}
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
