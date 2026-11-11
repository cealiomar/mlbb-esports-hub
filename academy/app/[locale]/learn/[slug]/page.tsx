import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLessons, getTracks } from '@/lib/data'
import { asLocale, dict, fill, LOCALES } from '@/lib/i18n'

export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    getLessons().map((lesson) => ({ locale, slug: lesson.slug })),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const lesson = getLessons().find((item) => item.slug === slug)
  return lesson
    ? { title: lesson.title[asLocale(locale)], description: lesson.summary[asLocale(locale)] }
    : {}
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = asLocale(raw)
  const t = dict(locale)
  const lessons = getLessons()
  const index = lessons.findIndex((item) => item.slug === slug)
  const lesson = lessons[index]
  if (!lesson) notFound()
  const track = getTracks().find((item) => item.id === lesson.track)
  const previous = lessons[index - 1]
  const next = lessons[index + 1]

  return (
    <article className="lesson-page">
      <Link href={`/${locale}/learn/`} className="crumb">
        {t.learn}
        {track && <span> / {track.title[locale]}</span>}
      </Link>
      <header className="page-head">
        <p className="kicker" dir="ltr">
          {String(index + 1).padStart(2, '0')} / {String(lessons.length).padStart(2, '0')}
        </p>
        <h1>{lesson.title[locale]}</h1>
        <p>{lesson.summary[locale]}</p>
        <p className="lesson-page__meta">
          <span>{t.lanes[lesson.role]}</span>
          <span>{fill(t.minutes, { n: lesson.minutes })}</span>
        </p>
      </header>

      {lesson.youtubeId && (
        <div className="card video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${lesson.youtubeId}`}
            title={lesson.title[locale]}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}

      <section className="card points">
        <h2>{t.keyPoints}</h2>
        <ol>
          {lesson.points[locale].map((point, n) => (
            <li key={point}>
              <b>{n + 1}</b>
              <p>{point}</p>
            </li>
          ))}
        </ol>
      </section>

      <nav className="pager">
        {previous ? (
          <Link href={`/${locale}/learn/${previous.slug}/`} className="card">
            <small>{t.previous}</small>
            <strong>{previous.title[locale]}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/${locale}/learn/${next.slug}/`} className="card pager__next">
            <small>{t.next}</small>
            <strong>{next.title[locale]}</strong>
          </Link>
        )}
      </nav>
    </article>
  )
}
