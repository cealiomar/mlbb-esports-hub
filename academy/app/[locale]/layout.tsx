import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Shell } from '@/components/shell'
import { asLocale, dict, LOCALES } from '@/lib/i18n'
import '../globals.css'

const display = localFont({
  src: '../fonts/Anton-Regular.woff2',
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})

const body = localFont({
  src: [
    { path: '../fonts/IBMPlexSansArabic-Regular.woff2', weight: '400' },
    { path: '../fonts/IBMPlexSansArabic-SemiBold.woff2', weight: '600' },
    { path: '../fonts/IBMPlexSansArabic-Bold.woff2', weight: '700' },
  ],
  variable: '--font-body',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
})

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const t = dict(asLocale((await params).locale))
  return {
    title: { default: t.brand, template: `%s · ${t.brand}` },
    description: t.heroBody,
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const locale = asLocale((await params).locale)
  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${display.variable} ${body.variable}`}
    >
      <body>
        <Shell locale={locale}>{children}</Shell>
      </body>
    </html>
  )
}
