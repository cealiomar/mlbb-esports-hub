import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import localFont from 'next/font/local'
import { routing, isRtl } from '@/i18n/routing'
import { Attribution } from '@/components/ui/attribution'
import { Nav } from '@/components/layout/nav'
import '../globals.css'

// WOFF2 rather than TTF: same faces, 68% less to download. `swap` keeps
// text readable in a fallback face instead of hiding it until the font lands.
const display = localFont({
  src: '../fonts/Anton-Regular.woff2',
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})

const arabic = localFont({
  src: [
    { path: '../fonts/IBMPlexSansArabic-Regular.woff2', weight: '400' },
    { path: '../fonts/IBMPlexSansArabic-SemiBold.woff2', weight: '600' },
    { path: '../fonts/IBMPlexSansArabic-Bold.woff2', weight: '700' },
  ],
  variable: '--font-arabic',
  display: 'swap',
  // Only the regular weight is needed for the first paint; the heavier
  // faces load on demand rather than competing with it.
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  title: {
    default: 'MLBB Esports Hub',
    template: '%s · MLBB Esports Hub',
  },
  description:
    'Live Mobile Legends: Bang Bang fixtures, schedules, results and teams across every competitive region.',
}

const themeScript = `(function(){try{var saved=localStorage.getItem('mlbb-theme');var theme=saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch(e){document.documentElement.dataset.theme='dark'}})();`

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as never)) notFound()

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
      className={`${display.variable} ${arabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="grain flex min-h-screen flex-col">
        <NextIntlClientProvider messages={messages}>
          <Nav locale={locale} />
          <div className="flex-1">{children}</div>
          <Attribution />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
