'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { DraftLeague } from '@/lib/data/types'
import { HeroIcon } from '@/components/drafts/hero-icon'
import { buildDraftCoachModel, counterPicksByRole, currentSeasonDraftLeagues, type HeroCatalogItem, type DraftCoachState } from '@/lib/drafts/coach'

const EMPTY_STATE: DraftCoachState = { allyPicks: [], enemyPicks: [], allyBans: [], enemyBans: [], allyPickLanes: [], enemyPickLanes: [] }

export function MetaExplorer({ leagues, heroCatalog }: { leagues: DraftLeague[]; heroCatalog: HeroCatalogItem[] }) {
  const t = useTranslations('meta')
  const model = useMemo(() => buildDraftCoachModel(currentSeasonDraftLeagues(leagues), 'all', null, heroCatalog), [heroCatalog, leagues])
  const [selectedKey, setSelectedKey] = useState(model.heroes[0]?.key ?? '')
  const selected = model.heroByKey[selectedKey]
  const counters = selected ? counterPicksByRole(model, { state: { ...EMPTY_STATE, enemyPicks: [selected.hero.id], enemyPickLanes: [selected.primaryLane ?? 'mid'] }, targetHero: selected.key }) : []
  const ranked = (metric: 'pickRate' | 'banRate') => [...model.heroes].sort((a, b) => b[metric] - a[metric] || b.exactGames - a.exactGames).slice(0, 5)
  return <div className="meta-explorer"><section className="meta-rankings">{(['pickRate', 'banRate'] as const).map((metric) => <article className="panel meta-list" key={metric}><h2>{metric === 'pickRate' ? t('topPicks') : t('topBans')}</h2>{ranked(metric).map((hero, index) => <div key={hero.key}><b>{index + 1}</b><HeroIcon hero={hero.hero} imageUrl={hero.imageUrl} size={42} /><span><strong>{hero.hero.name}</strong><small>{t(metric, { rate: Math.round(hero[metric] * 100) })}</small></span></div>)}</article>)}</section><section className="panel meta-counter"><header><div><small>{t('counterEyebrow')}</small><h2>{t('counterTitle')}</h2><p>{t('counterDescription')}</p></div><label><span>{t('chooseHero')}</span><select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>{model.heroes.map((hero) => <option key={hero.key} value={hero.key}>{hero.hero.name}</option>)}</select></label></header>{selected && <div className="meta-selected"><HeroIcon hero={selected.hero} imageUrl={selected.imageUrl} size={58} /><strong>{selected.hero.name}</strong></div>}<div className="meta-counter-grid">{counters.map(({ lane, recommendation, observed }) => <article key={lane}><small>{t(`lanes.${lane}`)}</small><HeroIcon hero={recommendation.hero} imageUrl={recommendation.imageUrl} size={46} /><strong>{recommendation.hero.name}</strong><span>{observed ? t('observed', { rate: Math.round((recommendation.matchupRate ?? 0) * 100) }) : t('metaFallback')}</span></article>)}</div><p className="meta-disclaimer">{t('buildNote')}</p></section></div>
}
