'use client'

import { useMemo, useState } from 'react'
import { LANES, type Hero, type Lane } from '@/lib/data-types'
import {
  DRAFT_ORDER,
  assignLanes,
  metaScore,
  openLanes,
  readDraft,
  suggest,
  type Side,
} from '@/lib/draft'
import { fill, type Dict } from '@/lib/i18n'
import { HeroFace, TierBadge } from './faces'

function SidePanel({
  side,
  bans,
  picks,
  active,
  t,
}: {
  side: Side
  bans: Hero[]
  picks: Hero[]
  active: 'ban' | 'pick' | null
  t: Dict
}) {
  const lanes = assignLanes(picks)

  return (
    <section className="draft-side card" data-side={side} data-active={active ?? undefined}>
      <h2>{side === 'blue' ? t.blue : t.red}</h2>

      <p className="draft-side__label">{t.bans}</p>
      <ul className="draft-bans">
        {Array.from({ length: 5 }, (_, index) => {
          const hero = bans[index]
          return (
            <li key={index} data-next={active === 'ban' && index === bans.length ? true : undefined}>
              {hero && <HeroFace hero={hero} size={40} />}
            </li>
          )
        })}
      </ul>

      <p className="draft-side__label">{t.picks}</p>
      <ol className="draft-picks">
        {Array.from({ length: 5 }, (_, index) => {
          const hero = picks[index]
          const lane = lanes[index]
          return (
            <li key={index} data-next={active === 'pick' && index === picks.length ? true : undefined}>
              {hero ? (
                <>
                  <HeroFace hero={hero} size={44} />
                  <strong dir="ltr">{hero.name}</strong>
                  <span>{lane ? t.lanes[lane] : t.lanes.flex}</span>
                </>
              ) : (
                <span className="draft-picks__empty">{index + 1}</span>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function DraftBoard({ heroes, t }: { heroes: Hero[]; t: Dict }) {
  const [actions, setActions] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [lane, setLane] = useState<Lane | 'all'>('all')

  const state = useMemo(() => readDraft(actions, heroes), [actions, heroes])
  const suggestions = useMemo(() => suggest(state, heroes, 6), [state, heroes])
  const step = state.current

  const visible = heroes
    .filter((hero) => lane === 'all' || hero.lanes.includes(lane))
    .filter((hero) => hero.name.toLowerCase().includes(query.trim().toLowerCase()))

  const choose = (id: string) => {
    if (!step || state.taken.has(id)) return
    setActions((list) => [...list, id])
  }

  const sideName = step ? (step.side === 'blue' ? t.blue : t.red) : ''
  const blueScore = metaScore(state.picks.blue)
  const redScore = metaScore(state.picks.red)

  return (
    <div className="draft">
      <div className="draft-status card" data-side={step?.side} aria-live="polite">
        <div>
          <strong data-testid="draft-turn">
            {step
              ? fill(step.kind === 'ban' ? t.turnBan : t.turnPick, { side: sideName })
              : t.done}
          </strong>
          <span dir="ltr">
            {Math.min(actions.length + 1, DRAFT_ORDER.length)} / {DRAFT_ORDER.length}
          </span>
        </div>
        <div className="draft-status__bar" aria-hidden>
          <i style={{ width: `${(actions.length / DRAFT_ORDER.length) * 100}%` }} />
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn--sm"
            disabled={actions.length === 0}
            onClick={() => setActions((list) => list.slice(0, -1))}
          >
            {t.undo}
          </button>
          <button
            type="button"
            className="btn btn--sm"
            disabled={actions.length === 0}
            onClick={() => setActions([])}
          >
            {t.reset}
          </button>
        </div>
      </div>

      <div className="draft-grid">
        <SidePanel
          side="blue"
          bans={state.bans.blue}
          picks={state.picks.blue}
          active={step?.side === 'blue' ? step.kind : null}
          t={t}
        />

        <section className="draft-pool card">
          {step ? (
            <>
              <h2>{t.suggested}</h2>
              <ul className="draft-suggest">
                {suggestions.map((hero) => (
                  <li key={hero.id}>
                    <button
                      type="button"
                      onClick={() => choose(hero.id)}
                      data-testid="draft-suggestion"
                    >
                      <HeroFace hero={hero} size={52} />
                      <strong dir="ltr">{hero.name}</strong>
                      <span>{t.lanes[hero.lane]}</span>
                      <TierBadge tier={hero.tier} />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="draft-filter">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.search}
                  aria-label={t.search}
                />
                <div className="chips">
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
                </div>
              </div>

              <ul className="draft-heroes">
                {visible.map((hero) => (
                  <li key={hero.id}>
                    <button
                      type="button"
                      disabled={state.taken.has(hero.id)}
                      onClick={() => choose(hero.id)}
                      title={hero.name}
                      aria-label={hero.name}
                    >
                      <HeroFace hero={hero} size={52} />
                      <span dir="ltr">{hero.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="draft-result" data-testid="draft-result">
              <h2>{t.done}</h2>
              <p>
                {Math.abs(blueScore - redScore) < 2
                  ? t.verdictEven
                  : blueScore > redScore
                    ? t.verdictBlue
                    : t.verdictRed}
              </p>
              <dl>
                {(
                  [
                    ['blue', blueScore],
                    ['red', redScore],
                  ] as const
                ).map(([side, score]) => (
                  <div key={side} data-side={side}>
                    <dt>{side === 'blue' ? t.blue : t.red}</dt>
                    <dd>
                      <b dir="ltr">{score}</b>
                      <span>{t.metaScore}</span>
                    </dd>
                    <dd>
                      <b dir="ltr">{5 - openLanes(state.picks[side]).length}/5</b>
                      <span>{t.lanesCovered}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>

        <SidePanel
          side="red"
          bans={state.bans.red}
          picks={state.picks.red}
          active={step?.side === 'red' ? step.kind : null}
          t={t}
        />
      </div>
    </div>
  )
}
