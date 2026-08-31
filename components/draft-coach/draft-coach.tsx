'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getRegions } from '@/lib/content/regions'
import type { DraftLeague } from '@/lib/data/types'
import {
  buildDraftCoachModel,
  compareCompletedDrafts,
  counterPicksByRole,
  DRAFT_LANES,
  DRAFT_PLANS,
  heroKey,
  nextSuggestedLane,
  openDraftLanes,
  proDraftFlow,
  recommendDraftDuos,
  recommendDraftHeroes,
  suggestedLaneForHero,
  type DraftAction,
  type DraftActionSide,
  type DraftActionKind,
  type DraftCoachHeroProfile,
  type DraftCoachModel,
  type DraftCoachState,
  type DraftLane,
  type DraftDuoRecommendation,
  type DraftPlan,
  type DraftRecommendation,
  type HeroCatalogItem,
  type RecommendationReason,
} from '@/lib/drafts/coach'
import { HeroIcon } from '@/components/drafts/hero-icon'

const EMPTY_STATE: DraftCoachState = {
  allyPicks: [],
  enemyPicks: [],
  allyBans: [],
  enemyBans: [],
  allyPickLanes: [],
  enemyPickLanes: [],
}

type DraftValueField = 'allyPicks' | 'enemyPicks' | 'allyBans' | 'enemyBans'

function stateField(action: DraftAction): DraftValueField {
  if (action.side === 'ally') {
    return action.kind === 'pick' ? 'allyPicks' : 'allyBans'
  }
  return action.kind === 'pick' ? 'enemyPicks' : 'enemyBans'
}

function pickLaneField(side: DraftActionSide): 'allyPickLanes' | 'enemyPickLanes' {
  return side === 'ally' ? 'allyPickLanes' : 'enemyPickLanes'
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
    allyPickLanes: state.enemyPickLanes ?? [],
    enemyPickLanes: state.allyPickLanes ?? [],
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
  lane,
  laneLabel,
}: {
  model: DraftCoachModel
  value?: string
  index: number
  kind: 'pick' | 'ban'
  lane?: DraftLane
  laneLabel: (lane: DraftLane | null) => string
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
          <span>
            {profile.hero.name}
            {kind === 'pick' && lane && (
              <small className="coach-slot__lane">{laneLabel(lane)}</small>
            )}
          </span>
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
  pickLanes,
  bans,
  currentAction,
  label,
  laneLabel,
}: {
  model: DraftCoachModel
  side: DraftActionSide
  picks: string[]
  pickLanes: DraftLane[]
  bans: string[]
  currentAction: DraftAction | null
  label: string
  laneLabel: (lane: DraftLane | null) => string
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
            laneLabel={laneLabel}
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
            lane={pickLanes[index]}
            laneLabel={laneLabel}
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
  scoreLabel,
  kind,
  evidenceLabel,
}: {
  recommendation: DraftRecommendation
  rank: number
  onSelect: () => void
  reasonLabel: (reason: RecommendationReason) => string
  confidenceLabel: (confidence: DraftRecommendation['confidence']) => string
  laneLabel: (lane: DraftLane | null) => string
  scoreLabel: string
  kind: DraftActionKind
  evidenceLabel: string
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
          <small>
            {laneLabel(
              recommendation.suggestedLane ?? recommendation.primaryLane,
            )}
          </small>
        </span>
        <span className="coach-recommendation__reasons">
          {recommendation.reasons.slice(0, 3).map((reason) => (
            <small key={reason}>{reasonLabel(reason)}</small>
          ))}
        </span>
        <span className="coach-recommendation__proof">
          <small>{evidenceLabel}</small>
          {kind === 'pick' && recommendation.pickRate === 0 && (
            <small>
              {recommendation.patchMetaTier
                ? `Patch ${recommendation.patchMetaTier}`
                : 'New pick'}
            </small>
          )}
          <small>{recommendation.sampleSize} games</small>
          <small data-confidence={recommendation.confidence}>
            {confidenceLabel(recommendation.confidence)}
          </small>
        </span>
      </span>
      <span className="coach-recommendation__score">
        <strong>{recommendation.score}</strong>
        <small>{scoreLabel}</small>
      </span>
    </button>
  )
}

export function DraftCoach({
  leagues,
  locale,
  harvestedAt,
  heroCatalog,
}: {
  leagues: DraftLeague[]
  locale: 'ar' | 'en'
  harvestedAt: number | null
  heroCatalog: HeroCatalogItem[]
}) {
  const t = useTranslations('draftCoach')
  const [regionSlug, setRegionSlug] = useState('all')
  const [mapName, setMapName] = useState<string | null>(null)
  const [plan, setPlan] = useState<DraftPlan>('balanced')
  const [allyFirstPick, setAllyFirstPick] = useState(true)
  const [allyTeam, setAllyTeam] = useState('')
  const [enemyTeam, setEnemyTeam] = useState('')
  const [poolLane, setPoolLane] = useState<DraftLane | 'all'>('all')
  const [started, setStarted] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState<DraftCoachState>(EMPTY_STATE)
  const [counterTarget, setCounterTarget] = useState('')

  const regionalModel = useMemo(
    () =>
      buildDraftCoachModel(
        leagues,
        regionSlug,
        null,
        heroCatalog,
      ),
    [heroCatalog, leagues, regionSlug],
  )
  const model = useMemo(
    () =>
      buildDraftCoachModel(
        leagues,
        regionSlug,
        mapName,
        heroCatalog,
      ),
    [heroCatalog, leagues, mapName, regionSlug],
  )
  const flow = useMemo(() => proDraftFlow(allyFirstPick), [allyFirstPick])
  const currentAction = started && stepIndex < flow.length ? flow[stepIndex] : null
  const activePerspective = currentAction
    ? perspectiveState(draft, currentAction.side)
    : draft
  const automaticLane = currentAction?.kind === 'pick'
    ? nextSuggestedLane(
        model,
        activePerspective.allyPicks,
        activePerspective.allyPickLanes,
      )
    : null
  const openLanes = currentAction?.kind === 'pick'
    ? openDraftLanes(
        model,
        activePerspective.allyPicks,
        activePerspective.allyPickLanes,
      )
    : []
  const activeAllyTeam =
    currentAction?.side === 'ally' ? allyTeam : enemyTeam
  const activeEnemyTeam =
    currentAction?.side === 'ally' ? enemyTeam : allyTeam
  const priorityPicks =
    currentAction?.kind === 'ban' &&
    currentAction.side === 'ally' &&
    allyFirstPick
      ? recommendDraftHeroes(model, {
          kind: 'pick',
          state: activePerspective,
          plan,
          allyTeamPageSlug: activeAllyTeam,
          enemyTeamPageSlug: activeEnemyTeam,
          limit: 3,
        })
      : []
  const recommendations = currentAction
    ? recommendDraftHeroes(model, {
        kind: currentAction.kind,
        state: activePerspective,
        plan,
        targetLane: currentAction.kind === 'pick' ? automaticLane : null,
        allyTeamPageSlug: activeAllyTeam,
        enemyTeamPageSlug: activeEnemyTeam,
        excludeHeroes:
          currentAction.kind === 'ban' && currentAction.side === 'ally'
            ? priorityPicks.map((item) => item.hero.id)
            : [],
        phase: currentAction?.phase,
        limit: 5,
      })
    : []
  const nextAction = flow[stepIndex + 1] ?? null
  const canLockDuo =
    currentAction?.side === 'ally' &&
    currentAction.kind === 'pick' &&
    nextAction?.side === 'ally' &&
    nextAction.kind === 'pick'
  const duoRecommendations = canLockDuo
    ? recommendDraftDuos(model, {
        state: activePerspective,
        plan,
        allyTeamPageSlug: allyTeam,
        enemyTeamPageSlug: enemyTeam,
        phase: currentAction.phase,
        limit: 3,
      })
    : []
  const counterTargetProfiles = activePerspective.enemyPicks
    .map((value) => heroFromModel(model, value))
    .filter((profile): profile is DraftCoachHeroProfile => Boolean(profile))
  const counterTargetProfile =
    counterTargetProfiles.find((profile) => profile.key === heroKey(counterTarget)) ??
    counterTargetProfiles.at(-1) ??
    null
  const roleCounters =
    currentAction?.kind === 'pick' && counterTargetProfile
      ? counterPicksByRole(model, {
          state: activePerspective,
          targetHero: counterTargetProfile.key,
          allyTeamPageSlug:
            currentAction.side === 'ally' ? allyTeam : enemyTeam,
          enemyTeamPageSlug:
            currentAction.side === 'ally' ? enemyTeam : allyTeam,
        })
      : []
  const draftComparison =
    stepIndex >= flow.length ? compareCompletedDrafts(model, draft) : null
  const used = new Set(
    [
      ...draft.allyPicks,
      ...draft.enemyPicks,
      ...draft.allyBans,
      ...draft.enemyBans,
    ].map(heroKey),
  )
  const filteredHeroes = model.heroes
    .filter((hero) => {
      if (poolLane === 'all') return true
      return hero.primaryLane === poolLane || hero.flexLanes.includes(poolLane)
    })
    .sort((first, second) => {
      const metric = (profile: DraftCoachHeroProfile) =>
        currentAction?.kind === 'pick'
          ? profile.pickRate
          : currentAction?.kind === 'ban'
            ? currentAction.phase === 1
              ? profile.earlyBanRate
              : profile.banRate
            : profile.presenceRate
      return (
        metric(second) - metric(first) ||
        second.exactGames - first.exactGames ||
        first.hero.name.localeCompare(second.hero.name)
      )
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
    setCounterTarget('')
  }

  function selectHero(
    value: string,
    lane?: DraftLane | null,
    allowAnyRole = false,
  ) {
    if (!currentAction || used.has(heroKey(value))) return
    const field = stateField(currentAction)
    if (currentAction.kind === 'pick') {
      const profile = heroFromModel(model, value)
      const recommendedLane = suggestedLaneForHero(
        model,
        value,
        activePerspective.allyPicks,
        activePerspective.allyPickLanes,
      )
      // Recommendation cards always obey composition coverage. The hero pool
      // intentionally permits free-form practice, including off-role tests.
      const selectedLane = allowAnyRole
        ? lane ?? profile?.primaryLane ?? recommendedLane ?? openLanes[0] ?? 'exp'
        : lane ?? recommendedLane
      if (!selectedLane || (!allowAnyRole && !openLanes.includes(selectedLane))) return
      const laneField = pickLaneField(currentAction.side)
      setDraft((current) => ({
        ...current,
        [field]: [...current[field], value],
        [laneField]: [...(current[laneField] ?? []), selectedLane],
      }))
    } else {
      setDraft((current) => ({
        ...current,
        [field]: [...current[field], value],
      }))
    }
    setStepIndex((current) => current + 1)
  }

  function undo() {
    if (stepIndex === 0) return
    const previous = flow[stepIndex - 1]
    const field = stateField(previous)
    setDraft((current) => {
      if (previous.kind !== 'pick') {
        return { ...current, [field]: current[field].slice(0, -1) }
      }
      const laneField = pickLaneField(previous.side)
      return {
        ...current,
        [field]: current[field].slice(0, -1),
        [laneField]: (current[laneField] ?? []).slice(0, -1),
      }
    })
    setStepIndex((current) => current - 1)
  }

  function selectDuo(duo: DraftDuoRecommendation) {
    if (!canLockDuo || !currentAction) return
    const firstLane = duo.first.suggestedLane
    const secondLane = duo.second.suggestedLane
    if (
      !firstLane ||
      !secondLane ||
      firstLane === secondLane ||
      !openLanes.includes(firstLane) ||
      !openLanes.includes(secondLane) ||
      used.has(heroKey(duo.first.hero.id)) ||
      used.has(heroKey(duo.second.hero.id))
    ) {
      return
    }
    const field = stateField(currentAction)
    const laneField = pickLaneField(currentAction.side)
    setDraft((current) => ({
      ...current,
      [field]: [
        ...current[field],
        duo.first.hero.id,
        duo.second.hero.id,
      ],
      [laneField]: [
        ...(current[laneField] ?? []),
        firstLane,
        secondLane,
      ],
    }))
    setStepIndex((current) => current + 2)
  }

  function laneLabel(value: DraftLane | null): string {
    return value ? t(`lanes.${value}`) : t('lanes.flex')
  }

  function reasonLabel(reason: RecommendationReason): string {
    if (reason === 'lane' && currentAction?.side === 'enemy') {
      return t('reasons.enemyLane')
    }
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
            pickLanes={draft.allyPickLanes ?? []}
            bans={draft.allyBans}
            currentAction={currentAction}
            label={t('ourDraft')}
            laneLabel={laneLabel}
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
                    : draftComparison
                      ? t('comparisonTitle')
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
                {currentAction.kind === 'pick' && openLanes.length > 0 && (
                  <div className="coach-role-readout">
                    <strong>
                      {automaticLane
                        ? currentAction.side === 'ally'
                          ? t('requiredRole')
                          : t('enemyRequiredRole')
                        : t('openRoles')}
                    </strong>
                    <span>
                      {(automaticLane ? [automaticLane] : openLanes).map(
                        (value) => (
                          <b key={value}>{laneLabel(value)}</b>
                        ),
                      )}
                    </span>
                  </div>
                )}
                {priorityPicks.length > 0 && (
                  <section className="coach-priority-picks">
                    <header>
                      <strong>{t('priorityPickTitle')}</strong>
                      <small>{t('priorityPickHint')}</small>
                    </header>
                    <div>
                      {priorityPicks.map((recommendation) => (
                        <span key={recommendation.hero.id}>
                          <HeroIcon
                            hero={recommendation.hero}
                            imageUrl={recommendation.imageUrl}
                            size={38}
                          />
                          <b>{recommendation.hero.name}</b>
                          <small>{laneLabel(recommendation.suggestedLane)}</small>
                        </span>
                      ))}
                    </div>
                  </section>
                )}
                {duoRecommendations.length > 0 && (
                  <section className="coach-duos">
                    <header>
                      <strong>{t('duoTitle')}</strong>
                      <small>{t('duoHint')}</small>
                    </header>
                    <div>
                      {duoRecommendations.map((duo) => (
                        <button
                          key={`${duo.first.hero.id}-${duo.second.hero.id}`}
                          type="button"
                          onClick={() => selectDuo(duo)}
                        >
                          <span>
                            <HeroIcon
                              hero={duo.first.hero}
                              imageUrl={duo.first.imageUrl}
                              size={38}
                            />
                            <b>{duo.first.hero.name}</b>
                            <small>{laneLabel(duo.first.suggestedLane)}</small>
                          </span>
                          <i aria-hidden>+</i>
                          <span>
                            <HeroIcon
                              hero={duo.second.hero}
                              imageUrl={duo.second.imageUrl}
                              size={38}
                            />
                            <b>{duo.second.hero.name}</b>
                            <small>{laneLabel(duo.second.suggestedLane)}</small>
                          </span>
                          <em>
                            {t('duoProof', {
                              games: Math.round(duo.games),
                              rate: Math.round(duo.winRate * 100),
                            })}
                          </em>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                <div className="coach-recommendations">
                  {recommendations.map((recommendation, index) => (
                    <RecommendationCard
                      key={recommendation.hero.id}
                      recommendation={recommendation}
                      rank={index + 1}
                      onSelect={() =>
                        selectHero(
                          recommendation.hero.id,
                          recommendation.suggestedLane,
                        )
                      }
                      reasonLabel={reasonLabel}
                      confidenceLabel={confidenceLabel}
                      laneLabel={laneLabel}
                      scoreLabel={t('fitScore')}
                      kind={currentAction.kind}
                      evidenceLabel={
                        currentAction.kind === 'ban'
                          ? t('earlyBanRate', {
                              rate: Math.round(
                                recommendation.earlyBanRate * 100,
                              ),
                            })
                          : t('pickRate', {
                              rate: Math.round(recommendation.pickRate * 100),
                            })
                      }
                    />
                  ))}
                </div>
                {counterTargetProfile && roleCounters.length > 0 && (
                  <section
                    className="coach-counter-map"
                    aria-label={t('counterMapTitle', {
                      hero: counterTargetProfile.hero.name,
                    })}
                  >
                    <header>
                      <span>
                        <small>{t('counterMapEyebrow')}</small>
                        <strong>
                          {t('counterMapTitle', {
                            hero: counterTargetProfile.hero.name,
                          })}
                        </strong>
                      </span>
                      <div
                        className="coach-counter-targets"
                        aria-label={t('chooseCounterTarget')}
                      >
                        {counterTargetProfiles.map((profile) => (
                          <button
                            key={profile.key}
                            type="button"
                            aria-pressed={profile.key === counterTargetProfile.key}
                            onClick={() => setCounterTarget(profile.key)}
                            title={profile.hero.name}
                          >
                            <HeroIcon
                              hero={profile.hero}
                              imageUrl={profile.imageUrl}
                              size={32}
                            />
                            <span>{profile.hero.name}</span>
                          </button>
                        ))}
                      </div>
                    </header>
                    <div className="coach-counter-grid">
                      {roleCounters.map(({ lane, recommendation, observed }) => {
                        const roleAvailable = openLanes.includes(lane)
                        return (
                          <button
                            key={lane}
                            type="button"
                            className="coach-counter-card"
                            data-observed={observed || undefined}
                            data-available={roleAvailable || undefined}
                            disabled={!roleAvailable}
                            onClick={() =>
                              selectHero(recommendation.hero.id, lane)
                            }
                          >
                            <span>{laneLabel(lane)}</span>
                            <HeroIcon
                              hero={recommendation.hero}
                              imageUrl={recommendation.imageUrl}
                              size={44}
                            />
                            <strong>{recommendation.hero.name}</strong>
                            <small>
                              {!roleAvailable
                                ? t('roleComplete')
                                : observed && recommendation.matchupRate !== null
                                  ? t('observedCounter', {
                                      games: Math.round(recommendation.matchupGames),
                                      rate: Math.round(recommendation.matchupRate * 100),
                                    })
                                  : t('metaFallback')}
                            </small>
                          </button>
                        )
                      })}
                    </div>
                    <p>{t('counterMapHint')}</p>
                  </section>
                )}
              </>
            ) : draftComparison ? (
              <section className="coach-draft-result" aria-label={t('comparisonTitle')}>
                <header>
                  <small>{t('comparisonEyebrow')}</small>
                  <strong>{t('comparisonTitle')}</strong>
                  <p>{t('comparisonDescription')}</p>
                </header>
                <div className="coach-draft-result__scores">
                  <span>
                    <small>{t('ourDraft')}</small>
                    <b>{Math.round(draftComparison.allyWinProbability * 100)}%</b>
                  </span>
                  <em>{t('winEstimate')}</em>
                  <span>
                    <small>{t('enemyDraft')}</small>
                    <b>{Math.round(draftComparison.enemyWinProbability * 100)}%</b>
                  </span>
                </div>
                <div className="coach-draft-result__bar" aria-hidden>
                  <span
                    style={{
                      width: `${Math.round(
                        draftComparison.allyWinProbability * 100,
                      )}%`,
                    }}
                  />
                </div>
                <div className="coach-draft-result__metrics">
                  {[
                    [
                      'proFormMetric',
                      draftComparison.allyProForm,
                      draftComparison.enemyProForm,
                    ],
                    [
                      'synergyMetric',
                      draftComparison.allySynergy,
                      draftComparison.enemySynergy,
                    ],
                    [
                      'compositionMetric',
                      draftComparison.allyCompositionFit,
                      draftComparison.enemyCompositionFit,
                    ],
                    [
                      'matchupMetric',
                      draftComparison.allyMatchupEdge,
                      draftComparison.enemyMatchupEdge,
                    ],
                  ].map(([label, allyValue, enemyValue]) => (
                    <span key={String(label)}>
                      <b>{Math.round(Number(allyValue) * 100)}%</b>
                      <small>{t(String(label))}</small>
                      <b>{Math.round(Number(enemyValue) * 100)}%</b>
                    </span>
                  ))}
                </div>
                <p>
                  {t('comparisonEvidence', {
                    games: draftComparison.gamesAnalyzed,
                    confidence: confidenceLabel(draftComparison.confidence),
                  })}
                </p>
                <small>{t('comparisonDisclaimer')}</small>
              </section>
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
            pickLanes={draft.enemyPickLanes ?? []}
            bans={draft.enemyBans}
            currentAction={currentAction}
            label={t('enemyDraft')}
            laneLabel={laneLabel}
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
          <button
            type="button"
            aria-pressed={poolLane === 'all'}
            onClick={() => setPoolLane('all')}
          >
            {t('lanes.all')}
          </button>
          {DRAFT_LANES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={poolLane === value}
              onClick={() => setPoolLane(value)}
            >
              {t(`lanes.${value}`)}
            </button>
          ))}
        </div>
        <div className="coach-hero-grid">
          {filteredHeroes.map((profile) => {
            const poolMetric =
              currentAction?.kind === 'pick'
                ? profile.pickRate
                : currentAction?.kind === 'ban'
                  ? currentAction.phase === 1
                    ? profile.earlyBanRate
                    : profile.banRate
                  : profile.presenceRate
            const poolEvidence =
              currentAction?.kind === 'pick'
                ? poolMetric > 0
                  ? t('poolPickRate', {
                      rate: Math.round(poolMetric * 100),
                    })
                  : t('noProPick')
                : currentAction?.kind === 'ban'
                  ? t('poolBanRate', {
                      rate: Math.round(poolMetric * 100),
                    })
                  : poolMetric > 0
                    ? `${Math.round(poolMetric * 100)}%`
                    : profile.patchMetaTier ?? '—'
            const filteredLane = poolLane !== 'all' ? poolLane : null
            const manualLane = currentAction?.kind === 'pick'
              ? filteredLane ??
                profile.primaryLane ??
                suggestedLaneForHero(
                  model,
                  profile.key,
                  activePerspective.allyPicks,
                  activePerspective.allyPickLanes,
                )
              : null
            const disabled =
              used.has(profile.key) ||
              !currentAction
            return (
              <button
                key={profile.key}
                type="button"
                disabled={disabled}
                data-used={used.has(profile.key) || undefined}
                onClick={() => selectHero(profile.key, manualLane, true)}
                title={`${profile.hero.name} · ${laneLabel(profile.primaryLane)}`}
              >
                <HeroIcon hero={profile.hero} imageUrl={profile.imageUrl} size={52} />
                <span>
                  <strong>{profile.hero.name}</strong>
                  <small>{laneLabel(profile.primaryLane)}</small>
                </span>
                <b>{poolEvidence}</b>
              </button>
            )
          })}
        </div>
      </section>

      <p className="coach-method-note">{t('methodNote')}</p>
    </div>
  )
}
