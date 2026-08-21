import type { Match } from '@/lib/data/types'

/** Enough items that the strip always overflows the widest viewport. */
const MIN_ITEMS = 10

function Item({ match }: { match: Match }) {
  return (
    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[var(--step--1)] text-[var(--ink-muted)]">
      {match.status === 'live' && (
        <span className="live-dot size-1.5 rounded-full bg-[var(--brand-hot)]" />
      )}
      <span className="font-bold text-[var(--ink)]">
        {match.opponents[0].code}
      </span>
      <span className="text-[var(--ink-muted)]">vs</span>
      <span className="font-bold text-[var(--ink)]">
        {match.opponents[1].code}
      </span>
      <span className="text-[var(--line)]">·</span>
      <span>{match.tournamentName}</span>
    </span>
  )
}

/**
 * A seamless marquee.
 *
 * The track holds two identical groups and slides by exactly -50%. For that
 * to land without a jump, one group must measure exactly half the track — so
 * the spacing between items lives on the items themselves (via the group's
 * own gap plus a trailing gap on the group), never as a gap on the track.
 * A gap on the track would leave one extra gap in the middle and the loop
 * would stutter by half of it on every pass.
 */
export function Ticker({ matches }: { matches: Match[] }) {
  if (matches.length === 0) return null

  // Repeat short lists so the strip is never shorter than the screen.
  const items: Match[] = []
  while (items.length < MIN_ITEMS) items.push(...matches)

  const group = (
    <div className="flex shrink-0 items-center gap-10 pe-10">
      {items.map((match, i) => (
        <Item key={`${match.id}-${i}`} match={match} />
      ))}
    </div>
  )

  return (
    <div className="marquee border-y border-[var(--line)] py-3">
      <div
        className="marquee-track"
        style={{ animationDuration: `${items.length * 3.5}s` }}
      >
        {group}
        <div aria-hidden>{group}</div>
      </div>
    </div>
  )
}
