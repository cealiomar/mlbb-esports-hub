'use client'

import { useLayoutEffect, useRef, useState } from 'react'

export interface TabItem {
  id: string
  label: string
  count?: number
  content: React.ReactNode
}

/**
 * Tabs with a pill that slides between labels and content that swaps with a
 * short rise-and-fade. The indicator is measured from the live DOM rather
 * than assumed, so it stays correct in RTL and at any label width.
 */
export function Tabs({ items }: { items: TabItem[] }) {
  const [active, setActive] = useState(items[0]?.id)
  const listRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    function measure() {
      const list = listRef.current
      if (!list) return
      const current = list.querySelector<HTMLButtonElement>(
        '[data-active="true"]',
      )
      if (!current) return
      setPill({
        left: current.offsetLeft,
        width: current.offsetWidth,
      })
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [active, items])

  const activeItem = items.find((i) => i.id === active) ?? items[0]

  return (
    <div>
      <div className="tabs-scroll mb-10 flex justify-center">
        <div
          ref={listRef}
          role="tablist"
          className="relative inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-[var(--line)] bg-[var(--surface)] p-1.5"
        >
          {pill && (
            <span
              aria-hidden
              className="absolute top-1.5 bottom-1.5 rounded-full bg-[var(--brand)] transition-[transform,width] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                width: pill.width,
                transform: `translateX(${pill.left}px)`,
                left: 0,
              }}
            />
          )}

          {items.map((item) => {
            const isActive = item.id === active
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-active={isActive}
                onClick={() => setActive(item.id)}
                className={`relative z-10 flex min-h-[40px] shrink-0 items-center gap-2 rounded-full px-5 text-sm font-bold tracking-wide whitespace-nowrap uppercase transition-colors duration-300 ${
                  isActive
                    ? 'text-[#0a0a0c]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {item.label}
                {item.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                      isActive
                        ? 'bg-[rgba(0,0,0,0.18)]'
                        : 'bg-[var(--surface-raised)]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Keying on the active id restarts the entry animation on every swap. */}
      <div key={activeItem?.id} className="tab-panel" role="tabpanel">
        {activeItem?.content}
      </div>
    </div>
  )
}
