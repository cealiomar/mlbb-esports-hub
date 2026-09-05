import { AUTHOR } from './author'

/**
 * The site mark: the author's avatar beside their handle set in the brand
 * colour. The Mobile Legends lockup it replaced was removed at the owner's
 * request.
 */
export const BRAND_LOGO = {
  avatarSrc: AUTHOR.avatar.src,
  handle: AUTHOR.handle,
  alt: `@${AUTHOR.handle}`,
} as const
