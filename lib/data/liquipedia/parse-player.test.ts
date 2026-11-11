import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePlayerPage, playerPhotoFile } from './parse-player'

interface Fixture {
  query: {
    pages: Record<
      string,
      {
        title: string
        missing?: string
        revisions?: { slots: { main: { '*': string } } }[]
      }
    >
  }
}

// A real `action=query&prop=revisions` response captured for MPL MENA
// handles: one ordinary page, one look-alike from another region, one
// disambiguation page, one page without a portrait and one missing title.
const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '__fixtures__', 'player-pages-mena.json'),
    'utf8',
  ),
) as Fixture

function wikitext(title: string): string {
  const page = Object.values(fixture.query.pages).find(
    (candidate) => candidate.title === title,
  )
  const text = page?.revisions?.[0]?.slots.main['*']
  if (!text) throw new Error(`fixture has no wikitext for ${title}`)
  return text
}

describe('parsePlayerPage', () => {
  it('reads the infobox id, portrait and country', () => {
    expect(parsePlayerPage(wikitext('Shen'))).toEqual({
      id: 'Shen',
      image: 'GK Shen at MSC 2026 Group Stage.jpg',
      country: 'Egypt',
      isDisambiguation: false,
      isRedirect: false,
    })
  })

  it('recognises a disambiguation page', () => {
    expect(parsePlayerPage(wikitext('King')).isDisambiguation).toBe(true)
  })

  it('reports no portrait when the infobox has none', () => {
    expect(parsePlayerPage(wikitext('Heroshi')).image).toBeNull()
  })

  it('recognises a redirect', () => {
    expect(parsePlayerPage('#REDIRECT [[S A N Z]]').isRedirect).toBe(true)
  })
})

describe('playerPhotoFile', () => {
  it('accepts a page whose id is the roster handle', () => {
    expect(
      playerPhotoFile(
        { handle: 'Shen', country: null },
        parsePlayerPage(wikitext('Shen')),
      ),
    ).toBe('GK Shen at MSC 2026 Group Stage.jpg')
  })

  it('accepts a matching country', () => {
    expect(
      playerPhotoFile(
        { handle: 'shen', country: 'eg' },
        parsePlayerPage(wikitext('Shen')),
      ),
    ).toBe('GK Shen at MSC 2026 Group Stage.jpg')
  })

  it('rejects a look-alike handle from another region', () => {
    // "Sanz" redirects to the Indonesian "S A N Z".
    expect(
      playerPhotoFile(
        { handle: 'Sanz', country: 'eg' },
        parsePlayerPage(wikitext('S A N Z')),
      ),
    ).toBeNull()
  })

  it('rejects a page from a different country', () => {
    expect(
      playerPhotoFile(
        { handle: 'Shen', country: 'sa' },
        parsePlayerPage(wikitext('Shen')),
      ),
    ).toBeNull()
  })

  it('rejects disambiguation pages, redirects and pages without a portrait', () => {
    expect(
      playerPhotoFile(
        { handle: 'King', country: null },
        parsePlayerPage(wikitext('King')),
      ),
    ).toBeNull()
    expect(
      playerPhotoFile(
        { handle: 'Sanz', country: null },
        parsePlayerPage('#REDIRECT [[S A N Z]]'),
      ),
    ).toBeNull()
    expect(
      playerPhotoFile(
        { handle: 'Heroshi', country: null },
        parsePlayerPage(wikitext('Heroshi')),
      ),
    ).toBeNull()
  })
})
