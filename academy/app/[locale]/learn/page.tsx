import Link from 'next/link'
import { PageHead } from '@/components/bits'
import { getLessons, getTracks } from '@/lib/data'
import { asLocale, dict, fill } from '@/lib/i18n'

export default async function LearnPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = asLocale((await params).locale)
  const t = dict(locale)
  const lessons = getLessons()

  return (
    <>
      <PageHead kicker={fill(t.lessons, { n: lessons.length })} title={t.learn} body={t.learnBody} />
      <div className="track-grid">
        {getTracks().map((track, index) => (
          <section key={track.id} className="card track">
            <header>
              <span className="tracks__n">{index + 1}</span>
              <div>
                <h2>{track.title[locale]}</h2>
                <p>{track.summary[locale]}</p>
              </div>
            </header>
            <ol>
              {lessons
                .filter((lesson) => lesson.track === track.id)
                .map((lesson) => (
                  <li key={lesson.slug}>
                    <Link href={`/${locale}/learn/${lesson.slug}/`} className="lesson">
                      <b>{String(lessons.indexOf(lesson) + 1).padStart(2, '0')}</b>
                      <span>
                        <strong>{lesson.title[locale]}</strong>
                        <small>
                          {t.lanes[lesson.role]} · {fill(t.minutes, { n: lesson.minutes })}
                        </small>
                      </span>
                    </Link>
                  </li>
                ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  )
}
