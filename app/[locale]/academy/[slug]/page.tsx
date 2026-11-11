import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import {
  getCreators,
  getLesson,
  getLessons,
  getTracks,
  lessonNeighbours,
} from '@/lib/content/academy'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getLessons().map((lesson) => ({ locale, slug: lesson.slug })),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const lesson = getLesson(slug)
  if (!lesson) return {}
  const key = locale === 'ar' ? 'ar' : 'en'
  return { title: lesson.title[key], description: lesson.summary[key] }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: rawLocale, slug } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale === 'ar' ? 'ar' : 'en'
  const t = await getTranslations('academy')

  const lesson = getLesson(slug)
  if (!lesson) notFound()

  const lessons = getLessons()
  const number = lessons.findIndex((item) => item.slug === slug) + 1
  const track = getTracks().find((item) => item.id === lesson.track)
  const creator = getCreators().find((item) => item.slug === lesson.creator)
  const { previous, next } = lessonNeighbours(slug)

  return (
    <main className="academy section ac-lesson-page">
      <nav className="ac-crumb">
        <Link href={`/${locale}/academy/#curriculum`}>
          <span aria-hidden className="ac-back">
            ←
          </span>
          {t('backToAcademy')}
        </Link>
        {track && <span>{track.title[locale]}</span>}
      </nav>

      <header className="ac-lesson-head">
        <span className="ac-lesson-head__num" aria-hidden>
          {String(number).padStart(2, '0')}
        </span>
        <h1>{lesson.title[locale]}</h1>
        <p className="ac-lesson-head__summary">{lesson.summary[locale]}</p>
        <p className="ac-lesson__meta">
          <span>{t(`roles.${lesson.role}`)}</span>
          <span>{t('minutes', { count: lesson.minutes })}</span>
          {creator && (
            <a href={creator.url} target="_blank" rel="noopener noreferrer">
              {t('lessonBy', { name: creator.name })}
            </a>
          )}
        </p>
      </header>

      {lesson.youtubeId && (
        <div className="ac-video panel">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${lesson.youtubeId}`}
            title={t('watchLesson')}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}

      <section className="ac-points panel">
        <h2>{t('keyPoints')}</h2>
        <ol>
          {lesson.points[locale].map((point, index) => (
            <li key={point}>
              <span aria-hidden>{index + 1}</span>
              <p>{point}</p>
            </li>
          ))}
        </ol>
      </section>

      {lesson.slug === 'draft-basics' && (
        <Link
          href={`/${locale}/draft-coach`}
          className="button-primary ac-lesson-cta"
        >
          {t('tryCoach')}
          <span aria-hidden className="ac-arrow">
            ↗
          </span>
        </Link>
      )}

      <nav className="ac-pager">
        {previous ? (
          <Link
            href={`/${locale}/academy/${previous.slug}/`}
            className="ac-pager__link panel"
          >
            <span>{t('previousLesson')}</span>
            <strong>{previous.title[locale]}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/${locale}/academy/${next.slug}/`}
            className="ac-pager__link ac-pager__link--next panel"
          >
            <span>{t('nextLesson')}</span>
            <strong>{next.title[locale]}</strong>
          </Link>
        )}
      </nav>
    </main>
  )
}
