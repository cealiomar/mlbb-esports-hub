import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/**
 * GitHub project pages serve from `/<repo>`, everything else serves from the
 * root. Set BASE_PATH only for the former.
 */
const basePath = process.env.BASE_PATH ?? ''

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath || undefined,

  // The repo root, so Next does not walk up to a lockfile outside it.
  outputFileTracingRoot: import.meta.dirname,

  /**
   * Static export: the whole site is prerendered to plain files in `out/`,
   * so it runs on any free static host (GitHub Pages, Cloudflare Pages,
   * Netlify, Vercel) with no Node server and no runtime cost.
   */
  output: 'export',

  // Directory-style URLs, which every static host serves correctly.
  trailingSlash: true,

  images: {
    // No image optimiser exists in a static export; ship the originals.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'liquipedia.net', pathname: '/commons/**' },
    ],
  },
}

export default withNextIntl(nextConfig)
