import { AUTHOR } from './author'

/**
 * The site's mark. The Mobile Legends lockup was removed at the owner's
 * request; the signature lockup stands in its place.
 *
 * The artwork is dark on transparency, so `BrandMark` sets a light plate
 * behind it — without one it disappears on the dark theme.
 */
export const BRAND_LOGO = {
  src: AUTHOR.logo.src,
  alt: `@${AUTHOR.handle} — ${AUTHOR.tagline}`,
  width: AUTHOR.logo.width,
  height: AUTHOR.logo.height,
  aspect: AUTHOR.logo.aspect,
} as const
