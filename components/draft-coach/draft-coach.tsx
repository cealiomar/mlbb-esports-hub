'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getRegions } from '@/lib/content/regions'
import type { DraftLeague } from '@/lib/data/types'
import {
  buildDraftCoachModel,
  DRAFT_LANES,
  DRAFT_PLANS,
  heroKey,
  nextSuggestedLane,
  proDraftFlow,
  recommendDraftHeroes,
  type DraftAction,
  type DraftActionSide,
  type DraftCoachHeroProfile,
  type DraftCoachModel,
  type DraftCoachState,
  type DraftLane,
  type DraftPlan,
  type DraftRecommendation,
  type DraftHistoryPrior,
  type HeroCatalogItem,
  type RecommendationReason,
} from '@/lib/drafts/coach'
import { HeroIcon } from '@/components/drafts/hero-icon'

const EMPTY_STATE: DraftCoachState = {
  allyPicks: [],
  enemyPicks: [],
  allyBans: [],
  enemyBans: [],
}

function stateField(action: DraftAction): keyof DraftCoachState {
  if (action.side === 'ally') {
    return action.kind === 'pick' ? 'allyPicks' : 'allyBans'
  }
  return action.kind === 'pick' ? 'enemyPicks' : 'enemyBans'
}

function perspectiveState(
  state: DraftCoachState,
  side: DraftActionSide,
): DraftCoachState {
  if (side === 'ally') return state
  return {
    allyPicks: state.enemyPicks,
    enemyPicks: state.allyPicks,
    allyBans: state.enemyBans,
    enemyBans: state.allyBans,
  }
}

function heroFromModel(
  model: DraftCoachModel,
  value: string,
): DraftCoachHeroProfile | null {
  return model.heroByKey[heroKey(value)] ?? null
}

function DraftSlot({
  model,
  value,
  index,
  kind,
}: {
  model: DraftCoachModel
  value?: string
  index: number
  kind: 'pick' | 'ban'
}) {
  const profile = value ? heroFromModel(model, value) : null
  return (
    <li className="coach-slot" data-filled={profile ? '' : undefined}>
      {profile ? (
        <>
          <HeroIcon
            hero={profile.hero}
            imageUrl={profile.imageUrl}
            size={kind === 'pick' ? 54 : 36}
          />
          <span>{profile.hero.name}</span>
        </>
      ) : (
        <>
          <b>{index + 1}</b>
          <span aria-hidden>—</span>
        </>
      )}
    </li>
  )
}

function TeamBoard({
  model,
  side,
  picks,
  bans,
  currentAction,
  label,
}: {
  model: DraftCoachModel
  side: DraftActionSide
  picks: string[]
  bans: string[]
  currentAction: DraftAction | null
  label: string
}) {
  const active = currentAction?.side === side
  return (
    <section
      className={`coach-team coach-team--${side}`}
      data-active={active || undefined}
    >
      <header>
        <span className="coach-team__signal" aria-hidden />
        <h2>{label}</h2>
        {active && <b>{currentAction.kind.toUpperCase()}</b>}
      </header>
      <ol className="coach-ban-row" aria-label={`${label} bans`}>
        {Array.from({ length: 5 }, (_, index) => (
          <DraftSlot
            key={index}
            model={model}
            value={bans[index]}
            index={index}
            kind="ban"
          />
        ))}
      </ol>
      <ol className="coach-pick-list" aria-label={`${label} picks`}>
        {Array.from({ length: 5 }, (_, index) => (
          <DraftSlot
            key={index}
            model={model}
            value={picks[index]}
            index={index}
            kind="pick"
          />
        ))}
      </ol>
    </section>
  )
}

function RecommendationCard({
  recommendation,
  rank,
  onSelect,
  reasonLabel,
  confidenceLabel,
  laneLabel,
}: {
  recommendation: DraftRecommendation
  rank: number
  onSelect: () => void
  reasonLabel: (reason: RecommendationReason) => string
  confidenceLabel: (confidence: DraftRecommendation['confidence']) => string
  laneLabel: (lane: DraftLane | null) => string
}) {
  return (
    <button
      type="button"
      className="coach-recommendation"
      data-rank={rank}
      onClick={onSelect}
    >
      <span className="coach-recommendation__rank">0{rank}</span>
      <HeroIcon
        hero={recommendation.hero}
        imageUrl={recommendation.imageUrl}
        size={58}
      />
      <span className="coach-recommendation__body">
        <span className="coach-recommendation__name">
          <strong>{recommendation.hero.name}</strong>
          <small>{laneLabel(recommendation.primaryLane)}</small>
        </span>
        <span className="coach-recommendation__reasons">
          {recommendation.reasons.slice(0, 3).map((reason) => (
            <small key={reason}>{reasonLabel(reason)}</small>
          ))}
        </span>
        <span className="coach-recommendation__proof">
          <small>{Math.round(recommendation.presenceRate * 100)}% meta</small>
          <small>{recommendation.sampleSize} games</small>
          <small data-confidence={recommendation.confidence}>
            {confidenceLabel(recommendation.confidence)}
          </small>
        </span>
      </span>
      <span className="coach-recommendation__score">
        <strong>{recommendation.score}</strong>
        <small>/100</small>
      </span>
    </button>
  )
}

export function DraftCoach({
  leagues,
  locale,
  harvestedAt,
  historyPriors,
  heroCatalog,
}: {
  leagues: DraftLeague[]
  locale: 'ar' | 'en'
  harvestedAt: number | null
  historyPriors: DraftHistoryPrior[]
  heroCatalog: HeroCatalogItem[]
}) {
  const t = useTranslations('draftCoach')
  const [regionSlug, setRegionSlug] = useState('all')
  const [mapName, setMapName] = useState<string | null>(null)
  const [plan, setPlan] = useState<DraftPlan>('balanced')
  const [allyFirstPick, setAllyFirstPick] = useState(true)
  const [allyTeam, setAllyTeam] = useState('')
  const [enemyTeam, setEnemyTeam] = useState('')
  const [lane, setLane] = useState<DraftLane | 'all'>('all')
  const [started, setStarted] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState<DraftCoachState>(EMPTY_STATE)

  const regionalModel = useMemo(
    () =>
      buildDraftCoachModel(
        leagues,
        regionSlug,
        null,
        historyPriors,
        heroCatalog,
      ),
    [heroCatalog, historyPriors, leagues, regionSlug],
  )
  const model = useMemo(
    () =>
      buildDraftCoachModel(
        leagues,
        regionSlug,
        mapName,
        historyPriors,
        heroCatalog,
      ),
    [heroCatalog, historyPriors, leagues, mapName, regionSlug],
  )
  const flow = useMemo(() => proDraftFlow(allyFirstPick), [allyFirstPick])
  const currentAction = started && stepIndex < flow.length ? flow[stepIndex] : null
  const activePerspective = currentAction
    ? perspectiveState(draft, currentAction.side)
    : draft
  const automaticLane = currentAction?.kind === 'pick'
    ? nextSuggestedLane(model, activePerspective.allyPicks)
    : null
  const requestedLane = lane === 'all' ? automaticLane : lane
  const recommendations = currentAction
    ? recommendDraftHeroes(model, {
        kind: currentAction.kind,
        state: activePerspective,
        plan,
        targetLane: currentAction.kind === 'pick' ? requestedLane : null,
        allyTeamPageSlug:
          currentAction.side === 'ally' ? allyTeam : enemyTeam,
        enemyTeamPageSlug:
          currentAction.side === 'ally' ? enemyTeam : allyTeam,
        limit: 5,
      })
    : []
  const used = new Set(
    [
      ...draft.allyPicks,
      ...draft.enemyPicks,
      ...draft.allyBans,
      ...draft.enemyBans,
    ].map(heroKey),
  )
  const filteredHeroes = model.heroes.filter((hero) => {
    if (lane === 'all') return true
    return hero.primaryLane === lane || hero.flexLanes.includes(lane)
  })
  const regions = getRegions().filter((region) =>
    leagues.some((league) => league.regionSlug === region.slug),
  )
  const progress = Math.round((stepIndex / flow.length) * 100)
  const updated = harvestedAt
    ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Cairo',
      }).format(harvestedAt * 1_000)
    : null

  function resetDraft() {
    setDraft(EMPTY_STATE)
    setStepIndex(0)
    setStarted(false)
  }

  function selectHero(value: string) {
    if (!currentAction || used.has(heroKey(value))) return
    const field = stateField(currentAction)
    setDraft((current) => ({ ...current, [field]: [...current[field], value] }))
    setStepIndex((current) => current + 1)
  }

  function undo() {
    if (stepIndex === 0) return
    const previous = flow[stepIndex - 1]
    const field = stateField(previous)
    setDraft((current) => ({ ...current, [field]: current[field].slice(0, -1) }))
    setStepIndex((current) => current - 1)
  }

  function laneLabel(value: DraftLane | null): string {
    return value ? t(`lanes.${value}`) : t('lanes.flex')
  }

  function reasonLabel(reason: RecommendationReason): string {
    return t(`reasons.${reason}`)
  }

  function confidenceLabel(value: DraftRecommendation['confidence']): string {
    return t(`confidence.${value}`)
  }

  return (
    <div className="draft-coach">
      <section className="coach-proof panel">
        <span className="coach-proof__live" aria-hidden />
        <span>
          <strong>{t('proofTitle')}</strong>
          <small>{t('proofDescription')}</small>
        </span>
        <span className="coach-proof__stats">
          <b>{model.gamesAnalyzed}</b>
          <small>{t('exactGames')}</small>
        </span>
        {model.historyGamesAnalyzed > 0 && (
          <span className="coach-proof__stats coach-proof__stats--history">
            <b>{model.historyGamesAnalyzed}</b>
            <small>{t('historyGames')}</small>
          </span>
        )}
        {updated && <time>{t('updated', { date: updated })}</time>}
      </section>

      <section className="coach-setup panel">
        <header>
          <span>01</span>
          <div>
            <h2>{t('setupTitle')}</h2>
            <p>{t('setupDescription')}</p>
          </div>
        </header>

        <div className="coach-region-rail" aria-label={t('region')}>
          <button
            type="button"
            aria-pressed={regionSlug === 'all'}
            onClick={() => {
              setRegionSlug('all')
              setMapName(null)
              setAllyTeam('')
              setEnemyTeam('')
            }}
          >
            <span aria-hidden>🌍</span>
            <strong>{t('allRegions')}</strong>
          </button>
          {regions.map((region) => (
            <button
              key={region.slug}
              type="button"
              aria-pressed={regionSlug === region.slug}
              onClick={() => {
                setRegionSlug(region.slug)
                setMapName(null)
                setAllyTeam('')
                setEnemyTeam('')
              }}
            >
              <span aria-hidden>{region.flag}</span>
              <strong>{region.name[locale]}</strong>
            </button>
          ))}
        </div>

        <div className="coach-setup-grid">
          <label>
            <span>{t('map')}</span>
            <select
              value={mapName ?? ''}
              onChange={(event) => setMapName(event.target.value || null)}
            >
              <option value="">{t('allMaps')}</option>
              {regionalModel.maps.map((map) => (
                <option key={map.name} value={map.name}>
                  {map.name} · {map.games}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('ourTeam')}</span>
            <select value={allyTeam} onChange={(event) => setAllyTeam(event.target.value)}>
              <option value="">{t('noTeamProfile')}</option>
              {model.teams.map((team) => (
                <option key={team.team.pageSlug} value={team.team.pageSlug}>
                  {team.team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('enemyTeam')}</span>
            <select value={enemyTeam} onChange={(event) => setEnemyTeam(event.target.value)}>
              <option value="">{t('noTeamProfile')}</option>
              {model.teams.map((team) => (
                <option key={team.team.pageSlug} value={team.team.pageSlug}>
                  {team.team.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="coach-plan-grid" aria-label={t('plan')}>
          {DRAFT_PLANS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={plan === value}
              onClick={() => setPlan(value)}
            >
              <span aria-hidden>{t(`planIcons.${value}`)}</span>
              <strong>{t(`plans.${value}.title`)}</strong>
              <small>{t(`plans.${value}.description`)}</small>
            </button>
          ))}
        </div>

        <div className="coach-first-pick">
          <span>
            <strong>{t('pickOrder')}</strong>
            <small>{t('pickOrderHint')}</small>
          </span>
          <div>
            <button
              type="button"
              aria-pressed={allyFirstPick}
              disabled={started}
              onClick={() => setAllyFirstPick(true)}
            >
              {t('firstPick')}
            </button>
            <button
              type="button"
              aria-pressed={!allyFirstPick}
              disabled={started}
              onClick={() => setAllyFirstPick(false)}
            >
              {t('secondPick')}
            </button>
          </div>
        </div>
      </section>

      <section className="coach-arena">
        <div className="coach-arena__topbar panel">
          <span>
            <small>{t('mplMode')}</small>
            <strong>
              {currentAction
                ? t('currentAction', {
                    side: t(`sides.${currentAction.side}`),
                    action: t(`actions.${currentAction.kind}`),
                  })
                : stepIndex >= flow.length
                  ? t('draftComplete')
                  : t('ready')}
            </strong>
          </span>
          <span className="coach-progress" aria-label={t('progress', { current: stepIndex, total: flow.length })}>
            <i style={{ width: `${progress}%` }} />
          </span>
          <span className="coach-arena__actions">
            {!started ? (
              <button type="button" className="coach-start" onClick={() => setStarted(true)}>
                {t('start')}
              </button>
            ) : (
              <>
                <button type="button" onClick={undo} disabled={stepIndex === 0}>
                  {t('undo')}
                </button>
                <button type="button" onClick={resetDraft}>{t('reset')}</button>
              </>
            )}
          </span>
        </div>

        <div className="coach-board">
          <TeamBoard
            model={model}
            side="ally"
            picks={draft.allyPicks}
            bans={draft.allyBans}
            currentAction={currentAction}
            label={t('ourDraft')}
          />

          <section className="coach-brain panel">
            <header>
              <span className="coach-brain__icon" aria-hidden>✦</span>
              <span>
                <small>{t('brainEyebrow')}</small>
                <h2>
                  {currentAction
                    ? currentAction.side === 'ally'
                      ? t('bestDecision')
                      : t('enemyPrediction')
                    : t('waitingToStart')}
                </h2>
              </span>
              {currentAction && (
                <b>{t('phase', { number: currentAction.phase })}</b>
              )}
            </header>

            {currentAction ? (
              <>
                <p className="coach-brain__brief">
                  {currentAction.side === 'ally'
                    ? t('allyBrief', { plan: t(`plans.${plan}.title`) })
                    : t('enemyBrief')}
                </p>
                <div className="coach-recommendations">
                  {recommendations.map((recommendation, index) => (
                    <RecommendationCard
                      key={recommendation.hero.id}
                      recommendation={recommendation}
                      rank={index + 1}
                      onSelect={() => selectHero(recommendation.hero.id)}
                      reasonLabel={reasonLabel}
                      confidenceLabel={confidenceLabel}
                      laneLabel={laneLabel}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="coach-brain__empty">
                <span aria-hidden>⌁</span>
                <strong>{stepIndex >= flow.length ? t('completeTitle') : t('emptyTitle')}</strong>
                <p>{stepIndex >= flow.length ? t('completeDescription') : t('emptyDescription')}</p>
              </div>
            )}
          </section>

          <TeamBoard
            model={model}
            side="enemy"
            picks={draft.enemyPicks}
            bans={draft.enemyBans}
            currentAction={currentAction}
            label={t('enemyDraft')}
          />
        </div>
      </section>

      <section className="coach-pool panel">
        <header>
          <span>
            <small>02 · {t('heroPoolEyebrow')}</small>
            <h2>{t('heroPool')}</h2>
          </span>
          <p>{t('heroPoolHint')}</p>
        </header>
        <div className="coach-lane-filter" aria-label={t('filterLane')}>
          <button type="button" aria-pressed={lane === 'all'} onClick={() => setLane('all')}>
            {t('lanes.all')}
          </button>
          {DRAFT_LANES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={lane === value}
              onClick={() => setLane(value)}
            >
              {t(`lanes.${value}`)}
            </button>
          ))}
        </div>
        <div className="coach-hero-grid">
          {filteredHeroes.map((profile) => {
            const disabled = used.has(profile.key) || !currentAction
            return (
              <button
                key={profile.key}
                type="button"
                disabled={disabled}
                data-used={used.has(profile.key) || undefined}
                onClick={() => selectHero(profile.key)}
                title={`${profile.hero.name} · ${laneLabel(profile.primaryLane)}`}
              >
                <HeroIcon hero={profile.hero} imageUrl={profile.imageUrl} size={52} />
                <span>
                  <strong>{profile.hero.name}</strong>
                  <small>{laneLabel(profile.primaryLane)}</small>
                </span>
                <b>{Math.round(profile.presenceRate * 100)}%</b>
              </button>
            )
          })}
        </div>
      </section>

      <p className="coach-method-note">{t('methodNote')}</p>
    </div>
  )
}
