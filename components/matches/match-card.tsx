import { useFormatter, useLocale, useTranslations } from 'next-intl'
import type { Match, MatchOpponent } from '@/lib/data/types'
import { getRegionBySlug } from '@/lib/content/regions'
import { replayUrl } from '@/lib/matches/replay'
import { TiltCard } from '@/components/ui/tilt-card'
import { TeamCrest } from './team-crest'

function Side({
  side,
  showScore,
  compact,
}: {
  side: MatchOpponent
  showScore: boolean
  compact: boolean
}) {
  const dimmed = showScore && !side.isWinner

  return (
    <div className="match-side depth-layer flex min-w-0 flex-1 flex-col items-center text-center">
      <span className={`crest-stage ${compact ? 'crest-stage--compact' : ''}`}>
        <TeamCrest team={side} size={compact ? 42 : 54} />
      </span>
      <div className={`${compact ? 'mt-2' : 'mt-3'} min-w-0 max-w-full`}>
        <p
          className={`truncate text-base leading-tight font-extrabold transition-colors ${
            dimmed ? 'text-[var(--ink-muted)]' : 'text-[var(--ink)]'
          }`}
        >
          {side.code}
        </p>
        <p className="mt-1 truncate text-[10px] leading-tight text-[var(--ink-muted)] sm:text-[11px]">
          {side.name}
        </p>
      </div>
    </div>
  )
}

function Score({ match }: { match: Match }) {
  const [a, b] = match.opponents
  return (
    <div className="score-display depth-layer flex shrink-0 items-center gap-1.5 text-2xl font-black tabular-nums sm:text-3xl">
      <span className={a.isWinner ? 'text-[var(--brand)]' : 'text-[var(--ink-muted)]'}>
        {a.score}
      </span>
      <span className="text-[var(--ink-muted)]">:</span>
      <span className={b.isWinner ? 'text-[var(--brand)]' : 'text-[var(--ink-muted)]'}>
        {b.score}
      </span>
    </div>
  )
}

export function MatchCard({
  match,
  compact = false,
}: {
  match: Match
  compact?: boolean
}) {
  const t = useTranslations('matches')
  const format = useFormatter()
  const locale = useLocale()
  const scored = match.status !== 'upcoming'
  const startsAt = new Date(match.startsAt * 1000)
  const region = match.regionSlug ? getRegionBySlug(match.regionSlug) : undefined
  const localeKey = locale === 'ar' ? 'ar' : 'en'
  const stream = match.status === 'completed' ? undefined : match.streamUrls[0]
  const replay = replayUrl(match)

  return (
    <TiltCard className="h-full">
      <article className={`panel match-card flex h-full flex-col overflow-hidden p-4 ${
        compact ? 'match-card--compact min-h-[230px]' : 'min-h-[320px] sm:p-5'
      }`}>
        <div className="depth-layer flex items-start justify-between gap-3">
          <div className="min-w-0">
            {region && (
              <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] text-[var(--brand-strong)] uppercase">
                <span className="text-sm leading-none" aria-hidden>{region.flag}</span>
                {region.name[localeKey]}
              </span>
            )}
            <p className="line-clamp-2 text-[11px] leading-snug font-semibold text-[var(--ink-muted)]">
              {match.tournamentName}
            </p>
          </div>

          {match.status === 'live' ? (
            <span className="live-pill shrink-0 px-2.5 py-1 text-[10px]">
              <span className="live-dot size-1.5 rounded-full bg-[var(--brand-hot)]" />
              {t('live')}
            </span>
          ) : (
            <time
              dateTime={startsAt.toISOString()}
              aria-label={t('matchTime')}
              className="match-time shrink-0 rounded-xl px-2.5 py-1.5 text-center text-[10px] font-bold text-[var(--ink-muted)] tabular-nums"
            >
              <span className="block text-[var(--ink)]">
                {format.dateTime(startsAt, { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="block whitespace-nowrap">
                {format.dateTime(startsAt, { month: 'short', day: 'numeric' })}
              </span>
            </time>
          )}
        </div>

        <div className={`my-auto grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 ${compact ? 'py-3' : 'py-6'}`}>
          <Side side={match.opponents[0]} showScore={scored} compact={compact} />

          {scored ? (
            <Score match={match} />
          ) : (
            <span className="versus-badge depth-layer shrink-0 text-[11px] font-black tracking-[0.16em] text-[var(--ink-muted)] uppercase">
              {t('versus')}
            </span>
          )}

          <Side side={match.opponents[1]} showScore={scored} compact={compact} />
        </div>

        <div className="depth-layer mt-auto flex min-h-8 items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
          <span className="text-[10px] font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
            {match.bestOf !== null ? t('bestOf', { count: match.bestOf }) : 'MLBB'}
          </span>
          {stream && (
            <a
              href={stream}
              target="_blank"
              rel="noreferrer noopener"
              className="watch-link"
            >
              <span className="live-dot size-1.5 rounded-full bg-current" />
              {t('watch')}
            </a>
          )}
          {replay && (
            <a
              href={replay}
              target="_blank"
              rel="noreferrer noopener"
              className="watch-link rewatch-link"
            >
              <span className="replay-play" aria-hidden />
              {t('rewatch')}
            </a>
          )}
        </div>
      </article>
    </TiltCard>
  )
}
