import academy from '@/content/academy.json'

export type AcademyLocale = 'en' | 'ar'
export type Localized = Record<AcademyLocale, string>
export type LessonRole = 'all' | 'exp' | 'jungle' | 'mid' | 'gold' | 'roam'

export interface AcademyTrack {
  id: string
  title: Localized
  summary: Localized
}

export interface AcademyLesson {
  slug: string
  track: string
  role: LessonRole
  minutes: number
  title: Localized
  summary: Localized
  points: Record<AcademyLocale, string[]>
  /** An 11-character YouTube id. Public and unlisted videos both embed. */
  youtubeId?: string
  /** Slug of an entry in `creators`. */
  creator?: string
}

export interface AcademyCreator {
  slug: string
  name: string
  url: string
}

export interface AcademyEvent {
  slug: string
  title: Localized
  /** ISO date, `YYYY-MM-DD`. */
  date: string
  organizer: string
  url: string
}

interface AcademyContent {
  tracks: AcademyTrack[]
  lessons: AcademyLesson[]
  creators: AcademyCreator[]
  events: AcademyEvent[]
}

const content = academy as AcademyContent

export const LESSON_ROLES: readonly LessonRole[] = [
  'all',
  'exp',
  'jungle',
  'mid',
  'gold',
  'roam',
]

export function getTracks(): AcademyTrack[] {
  return content.tracks
}

export function getLessons(): AcademyLesson[] {
  return content.lessons
}

export function getLesson(slug: string): AcademyLesson | undefined {
  return content.lessons.find((lesson) => lesson.slug === slug)
}

export function getCreators(): AcademyCreator[] {
  return content.creators
}

/** Events dated today or later, soonest first. */
export function upcomingEvents(todayIso: string): AcademyEvent[] {
  return content.events
    .filter((event) => event.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** The lessons before and after one, in curriculum order. */
export function lessonNeighbours(slug: string): {
  previous: AcademyLesson | null
  next: AcademyLesson | null
} {
  const index = content.lessons.findIndex((lesson) => lesson.slug === slug)
  return {
    previous: index > 0 ? content.lessons[index - 1] : null,
    next:
      index >= 0 && index < content.lessons.length - 1
        ? content.lessons[index + 1]
        : null,
  }
}
