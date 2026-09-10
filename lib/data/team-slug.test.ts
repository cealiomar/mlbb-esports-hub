import { describe, it, expect } from 'vitest'
import { isTeamPageSlug, resolveTeamPage, teamPageIndex, teamPath } from './team-slug'

describe('isTeamPageSlug', () => {
  it('accepts ordinary Liquipedia page titles', () => {
    expect(isTeamPageSlug('AP.Bren')).toBe(true)
    expect(isTeamPageSlug('Team_Liquid_ID')).toBe(true)
  })

  it('rejects the edit link Liquipedia uses for teams without a page', () => {
    expect(
      isTeamPageSlug('index.php?title=D_Family&action=edit&redlink=1'),
    ).toBe(false)
  })

  it('rejects empty values', () => {
    expect(isTeamPageSlug('')).toBe(false)
    expect(isTeamPageSlug(null)).toBe(false)
    expect(isTeamPageSlug(undefined)).toBe(false)
  })
})

describe('resolveTeamPage', () => {
  const index = teamPageIndex(['Burmese_Ghouls', 'D_Family', 'AP.Bren', 'Team_Liquid_ID'])

  it('returns an exact slug unchanged', () => {
    expect(resolveTeamPage(index, 'AP.Bren')).toBe('AP.Bren')
  })

  it('matches a slug that differs only in case and separators', () => {
    expect(resolveTeamPage(index, 'burmese_ghouls')).toBe('Burmese_Ghouls')
  })

  it('falls back to the display name', () => {
    expect(resolveTeamPage(index, 'some_draft_code', 'Burmese Ghouls')).toBe('Burmese_Ghouls')
  })

  it('reads the page title out of an edit link', () => {
    expect(
      resolveTeamPage(index, 'index.php?title=D_Family&action=edit&redlink=1'),
    ).toBe('D_Family')
  })

  it('returns null for a team with no built page', () => {
    expect(resolveTeamPage(index, 'Nobody_Esports', 'Nobody Esports')).toBeNull()
  })

  it('refuses to guess between two pages that spell alike', () => {
    const ambiguous = teamPageIndex(['Team_X', 'Team-X'])
    expect(resolveTeamPage(ambiguous, 'team x')).toBeNull()
  })
})

describe('teamPath', () => {
  it('encodes a dot so the trailing slash survives', () => {
    // Next strips the slash from a last segment that looks like a file.
    expect(teamPath('en', 'AP.Bren')).toBe('/en/teams/AP%2EBren/')
  })

  it('always ends with a slash', () => {
    expect(teamPath('ar', 'Team_Liquid_ID')).toBe('/ar/teams/Team_Liquid_ID/')
  })

  it('encodes spaces and other reserved characters', () => {
    expect(teamPath('en', 'Team Rey')).toBe('/en/teams/Team%20Rey/')
  })
})
