import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AcademyHero } from '@/components/academy/academy-hero'
import { Curriculum } from '@/components/academy/curriculum'
import { MetaBoard, MetaFive } from '@/components/academy/meta-board'
import { RosterBoard } from '@/components/academy/roster-board'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeader } from '@/components/ui/section-header'
import { routing } from '@/i18n/routing'
import {
  META_LANES,
  metaFive,
  topHeroesForLane,
  type HeroLookup,
} from '@/lib/academy/meta'
import { buildAcademyRoster } from '@/lib/academy/roster'
import {
  getLessons,
  getTracks,
  upcomingEvents,
} from '@/lib/content/academy'
import { AUTHOR } from '@/lib/content/author'
import { createLocalDataSource } from '@/lib/data/local'
import { readSnapshot } from '@/lib/data/snapshots'
import { isOk } from '@/lib/data/source'
import { teamPageSlugs } from '@/lib/data/team-pages'
import type { PlayerPhoto, Team } from '@/lib/data/types'
import {
  CURRENT_PATCH_META,
  PATCH_META_VERSION,
} from '@/lib/drafts/current-patch-meta'
import { heroKey, type HeroCatalogItem } from '@/lib/drafts/hero-images'
import { BUILD_UNIX_TIME } from '@/lib/time/build'

export const dynamic = 'force-static'
export const revalidate = 3600

const ACADEMY_REGION = 'mena'
const HEROES_PER_LANE = 8

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'academy' })
  return { title: t('eyebrow'), description: t('description') }
}

export default async function AcademyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale === 'ar' ? 'ar' : 'en'
  const t = await getTranslations('academy')

  const source = createLocalDataSource()
  const standingsResult = await source.getStandings()
  const standings = isOk(standingsResult) ? standingsResult.value : []
  const teams = readSnapshot<Team[]>('teams')?.data ?? []
  const photos = readSnapshot<PlayerPhoto[]>('player-photos')?.data ?? []
  const builtPages = new Set(teamPageSlugs())

  const roster = buildAcademyRoster(
    teams,
    standings,
    photos,
    ACADEMY_REGION,
  ).map((team) => ({ ...team, hasPage: builtPages.has(team.pageSlug) }))
  const playerCount = roster.reduce(
    (total, team) =>
      total + team.players.filter((player) => player.role !== 'coach').length,
    0,
  )

  // The patch source and the hero catalogue spell some ids differently
  // ("popolandkupa" / "popol-and-kupa"); heroKey folds both to one key.
  const catalog = readSnapshot<HeroCatalogItem[]>('hero-catalog')?.data ?? []
  const heroes: Record<string, HeroLookup> = {}
  for (const item of catalog) {
    const entry = { name: item.hero.name, imageUrl: item.imageUrl ?? null }
    heroes[heroKey(item.hero.id)] = entry
    heroes[heroKey(item.hero.name)] = entry
  }
  const meta = Object.fromEntries(
    Object.entries(CURRENT_PATCH_META).map(([id, item]) => [heroKey(id), item]),
  )
  const lanes = META_LANES.map((lane) => ({
    lane,
    heroes: topHeroesForLane(meta, heroes, lane, HEROES_PER_LANE),
  })).filter((entry) => entry.heroes.length > 0)
  const five = metaFive(meta, heroes)

  const lessons = getLessons()
  const tracks = getTracks()
  const events = upcomingEvents(
    new Date(BUILD_UNIX_TIME * 1000).toISOString().slice(0, 10),
  )

  const stats = [
    { value: String(lessons.length), label: t('statLessons') },
    ...(roster.length > 0
      ? [
          { value: String(playerCount), label: t('statPlayers') },
          { value: String(roster.length), label: t('statTeams') },
        ]
      : []),
    { value: PATCH_META_VERSION, label: t('statPatch') },
  ]

  return (
    <main className="academy">
      <AcademyHero locale={locale} stats={stats} />

      <section id="curriculum" className="section scroll-mt-24">
        <Reveal>
          <SectionHeader
            eyebrow={t('pathsEyebrow')}
            eyebrowColor="var(--ac-accent)"
            title={t('pathsTitle')}
            description={t('pathsDescription')}
          />
        </Reveal>
        <Curriculum tracks={tracks} lessons={lessons} locale={locale} />
      </section>

      {lanes.length > 0 && (
        <section id="meta" className="section scroll-mt-24 pt-0">
          <Reveal>
            <SectionHeader
              eyebrow={t('metaEyebrow', { version: PATCH_META_VERSION })}
              eyebrowColor="var(--ac-accent)"
              title={t('metaTitle')}
              description={t('metaDescription')}
            />
          </Reveal>
          <MetaBoard lanes={lanes} />
          <p className="ac-source">{t('metaSource')}</p>
        </section>
      )}

      <section id="draft" className="section scroll-mt-24 pt-0">
        <Reveal>
          <div className="ac-draft panel">
            <div className="ac-draft__copy">
              <p className="ac-kicker">
                <span className="ac-kicker__bar" aria-hidden />
                {t('draftEyebrow')}
              </p>
              <h2 className="ac-draft__title">{t('draftTitle')}</h2>
              <p className="ac-draft__lede">{t('draftDescription')}</p>
              <div className="ac-hero__actions">
                <Link
                  href={`/${locale}/draft-coach`}
                  className="button-primary"
                >
                  {t('openCoach')}
                  <span aria-hidden className="ac-arrow">
                    ↗
                  </span>
                </Link>
                <Link
                  href={`/${locale}/drafts`}
                  className="live-pill ac-button-ghost"
                >
                  {t('openLab')}
                </Link>
              </div>
            </div>
            {five.length > 0 && (
              <div className="ac-draft__board">
                <p className="ac-draft__caption">{t('draftBoard')}</p>
                <MetaFive picks={five} />
              </div>
            )}
          </div>
        </Reveal>
      </section>

      {roster.length > 0 && (
        <section id="players" className="section scroll-mt-24 pt-0">
          <Reveal>
            <SectionHeader
              eyebrow={t('playersEyebrow')}
              eyebrowColor="var(--ac-accent)"
              title={t('playersTitle')}
              description={t('playersDescription')}
            />
          </Reveal>
          <RosterBoard teams={roster} locale={locale} />
          <p className="ac-source">{t('photoCredit')}</p>
        </section>
      )}

      {events.length > 0 && (
        <section id="events" className="section scroll-mt-24 pt-0">
          <Reveal>
            <SectionHeader title={t('eventsTitle')} />
          </Reveal>
          <ul className="ac-events">
            {events.map((event) => (
              <li key={event.slug}>
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ac-event panel"
                >
                  <time dateTime={event.date} dir="ltr">
                    {event.date}
                  </time>
                  <strong>{event.title[locale]}</strong>
                  <span>{t('eventsBy', { organizer: event.organizer })}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="join" className="section scroll-mt-24 pt-0">
        <Reveal>
          <SectionHeader title={t('joinTitle')} />
        </Reveal>
        <div className="ac-join">
          {(
            [
              ['creatorsTitle', 'creatorsBody'],
              ['organisersTitle', 'organisersBody'],
            ] as const
          ).map(([title, body]) => (
            <article key={title} className="ac-join__card panel">
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
              <div className="ac-join__actions">
                <a
                  href={AUTHOR.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="live-pill ac-button-ghost"
                >
                  {t('contactInstagram')}
                </a>
                <a
                  href={`mailto:${AUTHOR.email}`}
                  className="live-pill ac-button-ghost"
                >
                  {t('contactEmail')}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
