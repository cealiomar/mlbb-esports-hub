import type { Locale, Match } from '@/lib/data'
import { formatWhen } from '@/lib/data'
import { dict, fill } from '@/lib/i18n'

export { HeroFace, TierBadge } from './faces'

function Crest({ src, name }: { src: string | null; name: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="crest" src={src} alt="" width={32} height={32} loading="lazy" />
  ) : (
    <span className="crest crest--empty" aria-hidden>
      {name.slice(0, 1)}
    </span>
  )
}

export function MatchRow({ match, locale }: { match: Match; locale: Locale }) {
  const t = dict(locale)
  const when = formatWhen(match.startsAt, locale)
  const [a, b] = match.opponents
  const played = match.status !== 'upcoming' && a.score !== null && b.score !== null

  return (
    <li className="match" data-status={match.status}>
      <div className="match__when">
        {match.status === 'live' ? (
          <span className="live">{t.live}</span>
        ) : (
          <>
            <strong dir="ltr">{when.time}</strong>
            <span>{when.day}</span>
          </>
        )}
      </div>
      <div className="match__teams">
        {[a, b].map((side, index) => (
          <div key={index} className="match__side" data-winner={side.isWinner || undefined}>
            <Crest src={side.logoUrl} name={side.name} />
            <span dir="ltr">{side.name}</span>
            {played && <b>{side.score}</b>}
          </div>
        ))}
      </div>
      <div className="match__meta">
        <span dir="ltr">{match.tournamentName}</span>
        {match.bestOf && <span dir="ltr">{fill(t.bestOf, { n: match.bestOf })}</span>}
      </div>
    </li>
  )
}

export function PageHead({
  kicker,
  title,
  body,
}: {
  kicker?: string
  title: string
  body?: string
}) {
  return (
    <header className="page-head">
      {kicker && <p className="kicker">{kicker}</p>}
      <h1>{title}</h1>
      {body && <p>{body}</p>}
    </header>
  )
}
