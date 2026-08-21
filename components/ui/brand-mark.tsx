import { BRAND_LOGO } from '@/lib/content/brand'
import { withBasePath } from '@/lib/assets'

/**
 * The brand lockup. Rendered as a plain <img> because the asset is a local
 * SVG that already carries its own gradients — there is nothing for the
 * image optimiser to do, and rasterising it would only cost sharpness.
 */
export function BrandMark({
  width,
  className = '',
  priority = false,
}: {
  width: number
  className?: string
  priority?: boolean
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={withBasePath(BRAND_LOGO.src)}
      alt={BRAND_LOGO.alt}
      width={width}
      height={Math.round(width / BRAND_LOGO.aspect)}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      data-brand-mark
      className={className}
      style={{ width, height: 'auto' }}
    />
  )
}
