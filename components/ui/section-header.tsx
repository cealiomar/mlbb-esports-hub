export function SectionHeader({
  title,
  as = 'h2',
  meta,
  eyebrow,
  eyebrowColor,
  description,
  compact = false,
}: {
  title: string
  as?: 'h1' | 'h2'
  meta?: React.ReactNode
  eyebrow?: string
  eyebrowColor?: string
  description?: string
  compact?: boolean
}) {
  const Tag = as
  return (
    <header className={`${compact ? 'section-header--compact mb-5' : 'mb-10'} flex flex-col items-center gap-2 text-center`}>
      {eyebrow && (
        <p
          className="text-[var(--step--1)] font-semibold tracking-[0.2em] uppercase"
          style={eyebrowColor ? { color: eyebrowColor } : undefined}
        >
          {eyebrow}
        </p>
      )}
      <Tag className={as === 'h1' ? 'display' : 'heading'}>{title}</Tag>
      {description && (
        <p className="mt-2 max-w-2xl text-balance text-sm text-[var(--ink-muted)] sm:text-base">
          {description}
        </p>
      )}
      {meta}
    </header>
  )
}
