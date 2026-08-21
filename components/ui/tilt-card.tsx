'use client'

import { useRef } from 'react'

export function TiltCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  function reset() {
    const card = cardRef.current
    if (!card) return
    card.style.setProperty('--tilt-x', '0deg')
    card.style.setProperty('--tilt-y', '0deg')
    card.style.setProperty('--glare-x', '50%')
    card.style.setProperty('--glare-y', '50%')
  }

  return (
    <div
      className={`tilt-shell ${className}`}
      onPointerMove={(event) => {
        if (event.pointerType === 'touch') return
        const card = cardRef.current
        if (!card) return
        const rect = card.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width
        const y = (event.clientY - rect.top) / rect.height
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 7}deg`)
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 9}deg`)
        card.style.setProperty('--glare-x', `${x * 100}%`)
        card.style.setProperty('--glare-y', `${y * 100}%`)
      }}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      <div ref={cardRef} className="tilt-card">
        <span className="tilt-glare" aria-hidden />
        {children}
      </div>
    </div>
  )
}
