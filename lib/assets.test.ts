import { describe, expect, it } from 'vitest'
import { withBasePath } from './assets'

describe('withBasePath', () => {
  it('prefixes root-relative assets on GitHub project pages', () => {
    expect(withBasePath('/teams/logo.png', '/mlbb-esports-hub')).toBe(
      '/mlbb-esports-hub/teams/logo.png',
    )
  })

  it('does not double-prefix assets', () => {
    expect(
      withBasePath('/mlbb-esports-hub/brand/logo.svg', '/mlbb-esports-hub/'),
    ).toBe('/mlbb-esports-hub/brand/logo.svg')
  })

  it('leaves external, data and root-hosted URLs alone', () => {
    expect(withBasePath('https://example.com/logo.png', '/repo')).toBe(
      'https://example.com/logo.png',
    )
    expect(withBasePath('data:image/svg+xml,test', '/repo')).toBe(
      'data:image/svg+xml,test',
    )
    expect(withBasePath('/brand/logo.svg', '')).toBe('/brand/logo.svg')
  })
})
