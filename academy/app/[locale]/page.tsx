import Link from 'next/link'
import { HeroFace, MatchRow, TierBadge } from '@/components/bits'
import {
  LANES,
  flag,
  getHeroes,
  getLessons,
  getMatches,
  getPatch,
  getRoster,
  getTracks,
} from '@/lib/data'
import { asLocale, dict, fill } from '@/lib/i18n'

export default async function Dashboard({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = asLocale((await params).locale)
  const t = dict(locale)
  const base = `/${locale}`

  const matches = getMatches()
  const live = matches.filter((match) => match.status === 'live')
  const upcoming = matches.filter((match) => match.status === 'upcoming')
  const results = matches.filter((match) => match.status === 'completed').reverse()
  const heroes = getHeroes()
  const patch = getPatch()
  const roster = getRoster()
  const lessons = getLessons()
  const tracks = getTracks()

  const laneBest = LANES.flatMap((lane) => {
    const hero = heroes.find((item) => item.lane === lane)
    return hero ? [{ lane, hero }] : []
  })
  const portraits = roster
    .flatMap((team) => team.players.map((player) => ({ ...player, team })))
    .filter((player) => player.photo)
    .slice(0, 14)
  const best = Math.max(1, ...roster.map((team) => team.wins ?? 0))

  return (
    <div className="bento">
      <section className="card hero-card">
        <div className="hero-card__glow" aria-hidden />
        <div className="hero-card__copy">
          <p className="kicker">{t.heroKicker}</p>
          <h1>
            <span>{t.heroTitleA}</span>
            <em>{t.heroTitleB}</em>
          </h1>
          <p>{t.heroBody}</p>
          <div className="actions">
            <Link href={`${base}/draft/`} className="btn btn--gold">
              {t.startDraft}
            </Link>
            <Link href={`${base}/learn/`} className="btn">
              {t.startLearning}
            </Link>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hero-card__logo"
          src="/brand/mpl-mena.webp"
          alt="MPL MENA"
          width={720}
          height={474}
          fetchPriority="high"
        />
        <dl className="hero-card__stats">
          {[
            [String(lessons.length), t.nav.learn],
            [String(heroes.length), t.nav.meta],
            [String(roster.reduce((n, team) => n + team.players.length, 0)), t.nav.players],
            [patch.version, 'PATCH'],
          ].map(([value, label]) => (
            <div key={label}>
              <dd dir="ltr">{value}</dd>
              <dt>{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="card fixtures">
        <header className="card__head">
          <h2>{live.length > 0 ? t.live : t.upNext}</h2>
          <Link href={`${base}/matches/`}>{t.allMatches}</Link>
        </header>
        {live.length + upcoming.length === 0 ? (
          <p className="empty">{t.noMatches}</p>
        ) : (
          <ul className="matches matches--compact">
            {[...live, ...upcoming].slice(0, 5).map((match) => (
              <MatchRow key={match.id} match={match} locale={locale} />
            ))}
          </ul>
        )}
        <p className="note">{t.cairoTime}</p>
      </section>

      {roster.length > 0 && (
        <section className="card standings">
          <header className="card__head">
            <h2>{t.standings}</h2>
            <Link href={`${base}/players/`}>{t.allPlayers}</Link>
          </header>
          <ol className="table">
            {roster.map((team, index) => (
              <li key={team.slug}>
                <span className="table__pos">{team.position ?? index + 1}</span>
                {team.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="crest" src={team.logo} alt="" width={32} height={32} loading="lazy" />
                ) : (
                  <span className="crest crest--empty" aria-hidden />
                )}
                <strong dir="ltr">{team.name}</strong>
                <span className="table__bar" aria-hidden>
                  <i style={{ width: `${((team.wins ?? 0) / best) * 100}%` }} />
                </span>
                <span className="table__rec" dir="ltr">
                  {team.wins ?? '–'}–{team.losses ?? '–'}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="card meta-now">
        <header className="card__head">
          <div>
            <h2>{fill(t.metaNow, { v: patch.version })}</h2>
            <p>{t.metaBody}</p>
          </div>
          <Link href={`${base}/meta/`}>{t.fullTierList}</Link>
        </header>
        <ul className="lane-best">
          {laneBest.map(({ lane, hero }) => (
            <li key={lane}>
              <HeroFace hero={hero} size={96} />
              <TierBadge tier={hero.tier} />
              <strong dir="ltr">{hero.name}</strong>
              <span>{t.lanes[lane]}</span>
            </li>
          ))}
        </ul>
        <ol className="meta-rest">
          {heroes
            .filter((hero) => !laneBest.some((entry) => entry.hero.id === hero.id))
            .slice(0, 8)
            .map((hero, index) => (
              <li key={hero.id}>
                <b>{index + laneBest.length + 1}</b>
                <HeroFace hero={hero} size={40} />
                <span>
                  <strong dir="ltr">{hero.name}</strong>
                  <small>{t.lanes[hero.lane]}</small>
                </span>
                <TierBadge tier={hero.tier} />
              </li>
            ))}
        </ol>
      </section>

      {portraits.length > 0 && (
        <section className="card spotlight">
          <header className="card__head">
            <div>
              <h2>{t.players}</h2>
              <p>{t.playersBody}</p>
            </div>
            <Link href={`${base}/players/`}>{t.allPlayers}</Link>
          </header>
          <ul className="strip">
            {portraits.map((player) => (
              <li key={`${player.team.slug}-${player.handle}`} className="player">
                <div className="player__frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={player.photo!} alt={player.handle} width={360} height={450} loading="lazy" />
                  {flag(player.country) && <span className="player__flag">{flag(player.country)}</span>}
                </div>
                <strong dir="ltr">{player.handle}</strong>
                <span dir="ltr">{player.team.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card learn-card">
        <header className="card__head">
          <div>
            <h2>{t.learn}</h2>
            <p>{t.learnBody}</p>
          </div>
          <Link href={`${base}/learn/`}>{t.allLessons}</Link>
        </header>
        <ol className="tracks">
          {tracks.map((track, index) => {
            const items = lessons.filter((lesson) => lesson.track === track.id)
            return (
              <li key={track.id}>
                <span className="tracks__n">{index + 1}</span>
                <div>
                  <strong>{track.title[locale]}</strong>
                  <p>{track.summary[locale]}</p>
                </div>
                <Link href={`${base}/learn/${items[0]?.slug}/`} className="btn btn--sm">
                  {fill(t.lessons, { n: items.length })}
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="card results">
        <header className="card__head">
          <h2>{t.results}</h2>
          <Link href={`${base}/matches/`}>{t.allMatches}</Link>
        </header>
        <ul className="matches matches--compact">
          {results.slice(0, 4).map((match) => (
            <MatchRow key={match.id} match={match} locale={locale} />
          ))}
        </ul>
      </section>
    </div>
  )
}
