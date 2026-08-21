import { createHash } from 'node:crypto'

/** Where mirrored crests live inside the build. */
export const LOGO_PUBLIC_DIR = 'public/teams'
export const LOGO_URL_PREFIX = '/teams'

/**
 * A stable local filename for a remote crest.
 *
 * Liquipedia serves several teams' art from similarly named thumbnails, so
 * the readable stem is paired with a short digest of the full URL — readable
 * in a file listing, still collision-free.
 */
export function localLogoName(remoteUrl: string): string {
  const stem =
    remoteUrl.split('/').pop()?.replace(/[^a-zA-Z0-9.-]/g, '_') ?? 'logo.png'
  const digest = createHash('sha1').update(remoteUrl).digest('hex').slice(0, 8)
  const dot = stem.lastIndexOf('.')
  const base = dot > 0 ? stem.slice(0, dot) : stem
  const ext = dot > 0 ? stem.slice(dot) : '.png'
  return `${base}-${digest}${ext}`
}

/** The path the site should reference for a mirrored crest. */
export function localLogoUrl(remoteUrl: string): string {
  return `${LOGO_URL_PREFIX}/${localLogoName(remoteUrl)}`
}

/** True for URLs we still need to pull down. */
export function isRemote(url: string | null): url is string {
  return typeof url === 'string' && url.startsWith('http')
}
