import { getTranslations, setRequestLocale } from 'next-intl/server'
import { DraftExplorer } from '@/components/drafts/draft-explorer'
import { SectionHeader } from '@/components/ui/section-header'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import { readSnapshot } from '@/lib/data/snapshots'
import {
  buildDraftTeamVisuals,
  enrichDraftLeagues,
} from '@/lib/drafts/enrich'
import {
  buildHeroImageMap,
  type HeroCatalogItem,
} from '@/lib/drafts/hero-images'
import { currentSeasonDraftLeagues } from '@/lib/drafts/coach'
import { routing } from '@/i18n/routing'

export const dynamic = 'force-static'
export const revalidate = 3600

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function DraftsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('drafts')
  const source = createLocalDataSource()
  const [draftResult, matchResult, standingsResult] = await Promise.all([
    source.getDraftLeagues(),
    source.getMatches(),
    source.getStandings(),
  ])
  const matches = isOk(matchResult) ? matchResult.value : []
  const standings = isOk(standingsResult) ? standingsResult.value : []
  const leagues = enrichDraftLeagues(
    currentSeasonDraftLeagues(
      isOk(draftResult) ? draftResult.value : [],
    ),
    matches,
  )
  const teamVisuals = buildDraftTeamVisuals(leagues, matches, standings)
  const heroCatalog =
    readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []
  const heroImages = buildHeroImageMap([
    ...leagues.flatMap((league) => league.heroStats),
    ...heroCatalog,
  ])

  return (
    <main className="section drafts-page">
      <SectionHeader
        as="h1"
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />

      {leagues.length > 0 ? (
        <DraftExplorer
          leagues={leagues}
          locale={locale === 'ar' ? 'ar' : 'en'}
          teamVisuals={teamVisuals}
          heroImages={heroImages}
        />
      ) : (
        <div className="draft-empty panel">
          <strong>{t('noData')}</strong>
          <p>{t('noDataHint')}</p>
        </div>
      )}
    </main>
  )
}
