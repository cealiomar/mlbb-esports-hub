import { PageHead } from '@/components/bits'
import { TierList } from '@/components/tier-list'
import { getHeroes, getPatch } from '@/lib/data'
import { asLocale, dict, fill } from '@/lib/i18n'

export default async function MetaPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = asLocale((await params).locale)
  const t = dict(locale)
  const patch = getPatch()

  return (
    <>
      <PageHead
        kicker={`PATCH ${patch.version}`}
        title={t.tierTitle}
        body={fill(t.tierBody, { v: patch.version })}
      />
      <TierList heroes={getHeroes()} t={t} />
    </>
  )
}
