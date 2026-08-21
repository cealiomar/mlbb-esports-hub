import { routing } from '@/i18n/routing'

const BASE_PATH = process.env.BASE_PATH ?? ''

/**
 * The root redirect has its own tiny root layout. Locale pages use the richer
 * app/[locale]/layout.tsx, keeping both branches fully static.
 */
export default function RedirectLayout({ children }: { children: React.ReactNode }) {
  const fallback = `${BASE_PATH}/${routing.defaultLocale}/`
  const script = `(function () {
  try {
    var supported = ${JSON.stringify(routing.locales)};
    var want = (navigator.language || '').slice(0, 2).toLowerCase();
    var target = supported.indexOf(want) !== -1 ? want : '${routing.defaultLocale}';
    location.replace('${BASE_PATH}/' + target + '/');
  } catch (e) {
    location.replace('${fallback}');
  }
})();`

  return (
    <html lang={routing.defaultLocale}>
      <head>
        <meta httpEquiv="refresh" content={`0; url=${fallback}`} />
        <script dangerouslySetInnerHTML={{ __html: script }} />
      </head>
      <body style={{ margin: 0, background: '#0a0d16', color: '#f7f8fb' }}>
        {children}
      </body>
    </html>
  )
}
