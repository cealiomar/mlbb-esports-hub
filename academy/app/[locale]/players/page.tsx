import { PageHead } from '@/components/bits'
import { flag, getRoster } from '@/lib/data'
import { asLocale, dict } from '@/lib/i18n'

export default async function PlayersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = asLocale((await params).locale)
  const t = dict(locale)
  const roster = getRoster()

  return (
    <>
      <PageHead kicker="MPL MENA" title={t.playersTitle} body={t.playersBody} />
      <nav className="chips" aria-label={t.playersTitle}>
        {roster.map((team) => (
          <a key={team.slug} href={`#${team.slug}`} className="chip" dir="ltr">
            {team.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.logo} alt="" width={22} height={22} />
            )}
            {team.name}
          </a>
        ))}
      </nav>
      <div className="stack">
        {roster.map((team) => (
          <section key={team.slug} id={team.slug} className="card team">
            <header className="team__head">
              {team.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="team__crest" src={team.logo} alt="" width={64} height={64} loading="lazy" />
              )}
              <div>
                <h2 dir="ltr">{team.name}</h2>
                {team.wins !== null && (
                  <p dir="ltr">
                    #{team.position} · {team.wins}–{team.losses}
                  </p>
                )}
              </div>
            </header>
            <ul className="roster">
              {team.players.map((player) => {
                const role = player.role as keyof typeof t.lanes | null
                return (
                  <li key={player.handle} className="player">
                    <div className="player__frame">
                      {player.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={player.photo} alt={player.handle} width={360} height={450} loading="lazy" />
                      ) : (
                        <span className="player__mono" dir="ltr" aria-hidden>
                          {player.handle.slice(0, 2)}
                        </span>
                      )}
                      {flag(player.country) && (
                        <span className="player__flag">{flag(player.country)}</span>
                      )}
                    </div>
                    <strong dir="ltr">{player.handle}</strong>
                    {role && t.lanes[role] && <span>{t.lanes[role]}</span>}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
