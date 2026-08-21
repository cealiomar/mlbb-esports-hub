import { describe, it, expect } from 'vitest'
import { localLogoName, localLogoUrl, isRemote } from './mirror'

const A =
  'https://liquipedia.net/commons/images/thumb/5/59/Team_Liquid_2024_darkmode.png/44px-Team_Liquid_2024_darkmode.png'
const B =
  'https://liquipedia.net/commons/images/thumb/8/83/Team_Falcons_2022_allmode.png/41px-Team_Falcons_2022_allmode.png'

describe('logo mirroring', () => {
  it('keeps a readable stem', () => {
    expect(localLogoName(A)).toContain('Team_Liquid_2024_darkmode')
  })

  it('keeps the file extension', () => {
    expect(localLogoName(A).endsWith('.png')).toBe(true)
  })

  it('is stable for the same url', () => {
    expect(localLogoName(A)).toBe(localLogoName(A))
  })

  it('differs for different urls', () => {
    expect(localLogoName(A)).not.toBe(localLogoName(B))
  })

  it('separates two urls that end in the same filename', () => {
    const one = 'https://liquipedia.net/commons/images/a/aa/X.png/44px-X.png'
    const two = 'https://liquipedia.net/commons/images/b/bb/X.png/44px-X.png'
    expect(localLogoName(one)).not.toBe(localLogoName(two))
  })

  it('produces a root-relative site url', () => {
    expect(localLogoUrl(A)).toMatch(/^\/teams\/.+\.png$/)
  })

  it('never emits a path segment that needs escaping', () => {
    expect(localLogoName(A)).not.toMatch(/[^a-zA-Z0-9._-]/)
  })

  it('recognises remote urls only', () => {
    expect(isRemote(A)).toBe(true)
    expect(isRemote('/teams/x.png')).toBe(false)
    expect(isRemote(null)).toBe(false)
  })
})
