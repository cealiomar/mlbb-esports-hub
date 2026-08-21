const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

function cleanBasePath(basePath: string) {
  if (!basePath || basePath === '/') return ''
  return `/${basePath.replace(/^\/+|\/+$/g, '')}`
}

/**
 * Prefix a root-relative public asset with the GitHub project-page path.
 * Absolute URLs, data URLs and already-prefixed paths pass through unchanged.
 */
export function withBasePath(src: string, basePath = PUBLIC_BASE_PATH) {
  if (!src || !src.startsWith('/') || src.startsWith('//')) return src

  const prefix = cleanBasePath(basePath)
  if (!prefix || src === prefix || src.startsWith(`${prefix}/`)) return src

  return `${prefix}${src}`
}
