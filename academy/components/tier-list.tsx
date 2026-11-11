'use client'

import { useState } from 'react'
import { LANES, TIERS, type Hero, type Lane } from '@/lib/data-types'
import { fill, type Dict } from '@/lib/i18n'
import { HeroFace, TierBadge } from './faces'

export function TierList({ heroes, t }: { heroes: Hero[]; t: Dict }) {
  const [lane, setLane] = useState<Lane | 'all'>('all')
  const shown = lane === 'all' ? heroes : heroes.filter((hero) => hero.lane === lane)

  return (
    <div className="stack">
      <div className="chips" role="group" aria-label={t.allLanes}>
        {(['all', ...LANES] as const).map((id) => (
          <button
            key={id}
            type="button"
            className="chip"
            aria-pressed={lane === id}
            onClick={() => setLane(id)}
          >
            {id === 'all' ? t.allLanes : t.lanes[id]}
          </button>
        ))}
        <span className="count">{fill(t.heroesCount, { n: shown.length })}</span>
      </div>

      <div className="card tiers">
        {TIERS.map((tier) => {
          const row = shown.filter((hero) => hero.tier === tier)
          if (row.length === 0) return null
          return (
            <section key={tier} className="tiers__row" data-tier={tier}>
              <TierBadge tier={tier} />
              <ul>
                {row.map((hero) => (
                  <li key={hero.id} data-testid="tier-hero">
                    <HeroFace hero={hero} size={56} />
                    <strong dir="ltr">{hero.name}</strong>
                    <span>{t.lanes[hero.lane]}</span>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
