import path from 'node:path'
import type { NextConfig } from 'next'

/**
 * Static export, like the hub it shares data with: every page is prerendered
 * from the committed snapshots in `../data/snapshots`, so nothing is fetched
 * while serving and any static host can run it.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // The snapshots live one level up, in the repository root.
  outputFileTracingRoot: path.join(import.meta.dirname, '..'),
}

export default nextConfig
