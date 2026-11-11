import { MatchRow, PageHead } from '@/components/bits'
import { getMatches } from '@/lib/data'
import { asLocale, dict } from '@/lib/i18n'

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = asLocale((await params).locale)
  const t = dict(locale)
  const matches = getMatches()
  const groups = [
    [t.live, matches.filter((match) => match.status === 'live')],
    [t.upcoming, matches.filter((match) => match.status === 'upcoming')],
    [t.finished, matches.filter((match) => match.status === 'completed').reverse()],
  ] as const

  return (
    <>
      <PageHead kicker={t.cairoTime} title={t.matchesTitle} body={t.matchesBody} />
      <div className="stack">
        {groups
          .filter(([, items]) => items.length > 0)
          .map(([title, items]) => (
            <section key={title} className="card">
              <header className="card__head">
                <h2>{title}</h2>
                <span className="count">{items.length}</span>
              </header>
              <ul className="matches">
                {items.map((match) => (
                  <MatchRow key={match.id} match={match} locale={locale} />
                ))}
              </ul>
            </section>
          ))}
      </div>
    </>
  )
}
