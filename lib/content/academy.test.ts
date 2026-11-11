import { describe, expect, it } from 'vitest'
import {
  LESSON_ROLES,
  getCreators,
  getLessons,
  getTracks,
  lessonNeighbours,
  upcomingEvents,
} from './academy'

describe('academy content', () => {
  const tracks = getTracks()
  const lessons = getLessons()

  it('gives every lesson a unique, URL-safe slug', () => {
    const slugs = lessons.map((lesson) => lesson.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/)
  })

  it('files every lesson under a known track and role', () => {
    const trackIds = new Set(tracks.map((track) => track.id))
    for (const lesson of lessons) {
      expect(trackIds.has(lesson.track)).toBe(true)
      expect(LESSON_ROLES).toContain(lesson.role)
    }
  })

  it('leaves no track empty', () => {
    for (const track of tracks) {
      expect(lessons.some((lesson) => lesson.track === track.id)).toBe(true)
    }
  })

  it('writes every lesson in both languages, point for point', () => {
    for (const lesson of lessons) {
      for (const locale of ['en', 'ar'] as const) {
        expect(lesson.title[locale].trim()).not.toBe('')
        expect(lesson.summary[locale].trim()).not.toBe('')
        expect(lesson.points[locale].length).toBeGreaterThan(0)
      }
      expect(lesson.points.ar).toHaveLength(lesson.points.en.length)
    }
  })

  it('only accepts well-formed video ids and known creators', () => {
    const creators = new Set(getCreators().map((creator) => creator.slug))
    for (const lesson of lessons) {
      if (lesson.youtubeId !== undefined) {
        expect(lesson.youtubeId).toMatch(/^[A-Za-z0-9_-]{11}$/)
      }
      if (lesson.creator !== undefined) {
        expect(creators.has(lesson.creator)).toBe(true)
      }
    }
  })

  it('walks the curriculum in order', () => {
    expect(lessonNeighbours(lessons[0].slug).previous).toBeNull()
    expect(lessonNeighbours(lessons[0].slug).next?.slug).toBe(lessons[1].slug)
    expect(lessonNeighbours(lessons.at(-1)!.slug).next).toBeNull()
  })

  it('never lists an event that has already passed', () => {
    for (const event of upcomingEvents('2999-01-01')) {
      expect(event.date >= '2999-01-01').toBe(true)
    }
  })
})
