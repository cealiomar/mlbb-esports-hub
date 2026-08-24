import { getTranslations, setRequestLocale } from 'next-intl/server'
import { DraftCoach } from '@/components/draft-coach/draft-coach'
import { SectionHeader } from '@/components/ui/section-header'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import { readSnapshot } from '@/lib/data/snapshots'
import type { DraftLeague } from '@/lib/data/types'
import {
  buildDraftHistoryPriors,
  type HeroCatalogItem,
} from '@/lib/drafts/coach'
import { routing } from '@/i18n/routing'

export const dynamic = 'force-static'
export const revalidate = 3600

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function DraftCoachPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('draftCoach')
  const result = await createLocalDataSource().getDraftLeagues()
  const leagues = isOk(result) ? result.value : []
  const harvestedAt =
    readSnapshot<DraftLeague[]>('drafts')?.harvestedAt ?? null
  const historyLeagues =
    readSnapshot<DraftLeague[]>('draft-history')?.data ?? []
  const historyPriors = buildDraftHistoryPriors(historyLeagues)
  const heroCatalog =
    readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []

  return (
    <main className="section draft-coach-page">
      <SectionHeader
        as="h1"
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />

      {leagues.length > 0 ? (
        <DraftCoach
          leagues={leagues}
          locale={locale === 'ar' ? 'ar' : 'en'}
          harvestedAt={harvestedAt}
          historyPriors={historyPriors}
          heroCatalog={heroCatalog}
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
