import { useTranslations } from 'next-intl'
import type { Match } from '@/lib/data/types'
import { MatchCard } from './match-card'

export function MatchList({ matches }: { matches: Match[] }) {
  const t = useTranslations('matches')

  if (matches.length === 0) {
    return (
      <p className="py-8 text-center text-[var(--ink-muted)]">
        {t('noMatches')}
      </p>
    )
  }

  // Keep one- and two-card states centred instead of hugging the first column.
  const gridClass =
    matches.length === 1
      ? 'mx-auto w-full max-w-[420px] grid-cols-1'
      : matches.length === 2
        ? 'mx-auto w-full max-w-[850px] grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className={`grid gap-5 ${gridClass}`}>
      {matches.map((m, index) => (
        <div
          key={m.id}
          className="reveal min-w-0"
          style={{ '--reveal-delay': `${Math.min(index, 9) * 55}ms` } as React.CSSProperties}
        >
          <MatchCard match={m} />
        </div>
      ))}
    </div>
  )
}
