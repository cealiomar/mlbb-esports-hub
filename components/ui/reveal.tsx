'use client'

import { useEffect, useRef } from 'react'

/**
 * Reveals its children once they scroll into view, then stops observing.
 * Pure CSS animation — no library, and it self-disables under
 * prefers-reduced-motion via the stylesheet.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        node.dataset.inView = 'true'
        observer.disconnect()
      },
      // A small inset only. At -12% anything in the lowest eighth of the
      // screen stayed invisible until scrolled, and on a phone — where the
      // bottom bar already covers that band — the page looked as if it ended.
      { rootMargin: '0px 0px -2% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
