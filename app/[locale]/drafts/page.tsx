import { getTranslations, setRequestLocale } from 'next-intl/server'
import { DraftExplorer } from '@/components/drafts/draft-explorer'
import { SectionHeader } from '@/components/ui/section-header'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
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
  const result = await createLocalDataSource().getDraftLeagues()
  const leagues = isOk(result) ? result.value : []

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
