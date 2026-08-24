import { HeroIcon } from './hero-icon'
import type { HeroDraftStat } from '@/lib/data/types'

export function LeagueHeroRanking({
  title,
  stats,
  mode,
  countLabel,
  rateLabel,
}: {
  title: string
  stats: HeroDraftStat[]
  mode: 'pick' | 'ban'
  countLabel: string
  rateLabel: string
}) {
  const maximum = Math.max(
    1,
    ...stats.map((stat) => (mode === 'pick' ? stat.picks : stat.bans)),
  )

  return (
    <article className={`draft-ranking panel draft-ranking--${mode}`}>
      <header className="draft-ranking__header">
        <span className="draft-ranking__signal" aria-hidden />
        <h2>{title}</h2>
      </header>
      <ol className="draft-ranking__list">
        {stats.map((stat, index) => {
          const count = mode === 'pick' ? stat.picks : stat.bans
          const rate = mode === 'pick' ? stat.pickRate : stat.banRate
          return (
            <li key={stat.hero.id} className="draft-ranking__row">
              <span className="draft-ranking__rank">{index + 1}</span>
              <HeroIcon hero={stat.hero} imageUrl={stat.imageUrl} size={52} />
              <span className="draft-ranking__hero">
                <strong>{stat.hero.name}</strong>
                <span className="draft-ranking__bar" aria-hidden>
                  <span style={{ width: `${(count / maximum) * 100}%` }} />
                </span>
              </span>
              <span className="draft-ranking__metric">
                <strong>{count}</strong>
                <small>{countLabel}</small>
              </span>
              <span className="draft-ranking__metric draft-ranking__metric--rate">
                <strong>{rate.toFixed(1)}%</strong>
                <small>{rateLabel}</small>
              </span>
            </li>
          )
        })}
      </ol>
    </article>
  )
}
