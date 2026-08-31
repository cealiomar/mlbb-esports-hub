import { getTranslations, setRequestLocale } from 'next-intl/server'
import { MetaExplorer } from '@/components/meta/meta-explorer'
import { SectionHeader } from '@/components/ui/section-header'
import { createLocalDataSource } from '@/lib/data/local'
import { isOk } from '@/lib/data/source'
import { readSnapshot } from '@/lib/data/snapshots'
import { type HeroCatalogItem } from '@/lib/drafts/coach'
import { routing } from '@/i18n/routing'

export const dynamic = 'force-static'
export const revalidate = 3600
export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })) }
export default async function MetaPage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; setRequestLocale(locale); const t = await getTranslations('meta'); const result = await createLocalDataSource().getDraftLeagues(); return <main className="section meta-page"><SectionHeader as="h1" eyebrow={t('eyebrow')} title={t('title')} description={t('description')} /><MetaExplorer leagues={isOk(result) ? result.value : []} heroCatalog={readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []} /></main> }
