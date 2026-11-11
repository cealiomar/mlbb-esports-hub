import { PageHead } from '@/components/bits'
import { DraftBoard } from '@/components/draft-board'
import { getHeroes, getPatch } from '@/lib/data'
import { asLocale, dict } from '@/lib/i18n'

export default async function DraftPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = asLocale((await params).locale)
  const t = dict(locale)

  return (
    <>
      <PageHead kicker={`PATCH ${getPatch().version}`} title={t.draftTitle} body={t.draftBody} />
      <DraftBoard heroes={getHeroes()} t={t} />
    </>
  )
}
