import { BRAND_LOGO } from '@/lib/content/brand'
import { withBasePath } from '@/lib/assets'

/**
 * The site mark.
 *
 * The avatar is a pre-cut circular WebP, and the handle is live text in the
 * brand colour — the original artwork baked the name in as dark ink, which
 * needed a white plate to survive the dark theme and could not follow the
 * palette.
 */
export function BrandMark({
  size = 36,
  className = '',
  priority = false,
  showHandle = true,
}: {
  /** Avatar diameter in pixels; the handle scales with it. */
  size?: number
  className?: string
  priority?: boolean
  showHandle?: boolean
}) {
  return (
    // The marker sits on the wrapper because that is what carries the
    // layout class, and therefore the intro animation.
    <span data-brand-mark className={`brand-mark ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={withBasePath(BRAND_LOGO.avatarSrc)}
        alt={BRAND_LOGO.alt}
        width={size}
        height={size}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        className="brand-mark__avatar"
        style={{ width: size, height: size }}
      />
      {showHandle && (
        <span
          className="brand-mark__handle"
          style={{ fontSize: Math.round(size * 0.5) }}
        >
          @{BRAND_LOGO.handle}
        </span>
      )}
    </span>
  )
}
