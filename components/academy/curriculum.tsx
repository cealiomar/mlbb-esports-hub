import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type {
  AcademyLesson,
  AcademyLocale,
  AcademyTrack,
} from '@/lib/content/academy'

export function Curriculum({
  tracks,
  lessons,
  locale,
}: {
  tracks: AcademyTrack[]
  lessons: AcademyLesson[]
  locale: AcademyLocale
}) {
  const t = useTranslations('academy')
  // Lessons are numbered across the whole curriculum, not per track, so the
  // number is also the order to read them in.
  const order = new Map(lessons.map((lesson, index) => [lesson.slug, index + 1]))

  return (
    <div className="ac-tracks">
      {tracks.map((track, trackIndex) => {
        const items = lessons.filter((lesson) => lesson.track === track.id)
        return (
          <section
            key={track.id}
            className="ac-track panel"
            style={{ '--track': trackIndex } as React.CSSProperties}
          >
            <header className="ac-track__head">
              <span className="ac-track__step" aria-hidden>
                {trackIndex + 1}
              </span>
              <div>
                <h3>{track.title[locale]}</h3>
                <p className="ac-track__count">
                  {t('lessonCount', { count: items.length })}
                </p>
              </div>
            </header>
            <p className="ac-track__summary">{track.summary[locale]}</p>

            <ol className="ac-lessons">
              {items.map((lesson) => (
                <li key={lesson.slug}>
                  <Link
                    href={`/${locale}/academy/${lesson.slug}/`}
                    className="ac-lesson"
                    data-testid="academy-lesson-link"
                  >
                    <span className="ac-lesson__num" aria-hidden>
                      {String(order.get(lesson.slug)).padStart(2, '0')}
                    </span>
                    <span className="ac-lesson__body">
                      <strong>{lesson.title[locale]}</strong>
                      <span className="ac-lesson__meta">
                        <span>{t(`roles.${lesson.role}`)}</span>
                        <span>{t('minutes', { count: lesson.minutes })}</span>
                        <span data-kind={lesson.youtubeId ? 'video' : 'guide'}>
                          {lesson.youtubeId ? t('video') : t('guide')}
                        </span>
                      </span>
                    </span>
                    <span className="ac-arrow ac-lesson__go" aria-hidden>
                      ↗
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
