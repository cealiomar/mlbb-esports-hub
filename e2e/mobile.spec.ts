import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['iPhone 13'] })

const ROUTES = [
  '/en/',
  '/en/matches/',
  '/en/drafts/',
  '/en/regions/philippines/',
  '/ar/',
  '/ar/matches/',
  '/ar/drafts/',
  '/ar/regions/mena/',
]

for (const route of ROUTES) {
  test(`${route} never scrolls horizontally on mobile`, async ({ page }) => {
    await page.goto(route)
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      return doc.scrollWidth - doc.clientWidth
    })
    expect(overflow).toBeLessThanOrEqual(1)
  })
}

test('primary navigation is reachable on mobile', async ({ page }) => {
  await page.goto('/en/')
  await expect(page.getByRole('link', { name: /matches/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /standings/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /drafts/i }).first()).toBeVisible()
})

test('standings are one tap away from every page', async ({ page }) => {
  await page.goto('/en/matches/')
  const standingsLink = page.getByRole('link', { name: 'Standings' }).first()
  await expect(standingsLink).toHaveAttribute('href', '/en/#standings')
  await standingsLink.click()
  await expect(page.locator('#standings')).toBeVisible()
})

test('every tap target in the nav is at least 44px tall', async ({ page }) => {
  await page.goto('/en/')
  const links = page.locator('nav a:visible')
  const count = await links.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const box = await links.nth(i).boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
})

test('matches page paints fixtures without any loading placeholder', async ({
  page,
}) => {
  await page.goto('/en/matches', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('text=/loading/i')).toHaveCount(0)
  await expect(page.locator('article').first()).toBeVisible()
})

test('every team crest actually loads its pixels', async ({ page }) => {
  await page.goto('/en/matches/')
  await page.waitForLoadState('networkidle')

  const imgs = page.locator('article img')
  const total = await imgs.count()
  expect(total).toBeGreaterThan(0)

  // Crests are intentionally lazy-loaded. Visit every card so the browser
  // requests each real image before we inspect its decoded pixel width.
  for (let index = 0; index < total; index++) {
    const img = imgs.nth(index)
    await img.scrollIntoViewIfNeeded()
    await expect
      .poll(() => img.evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
  }

  const report = await imgs.evaluateAll((nodes) => {
    const images = nodes as HTMLImageElement[]
    return {
      broken: images
        .filter((node) => node.naturalWidth === 0)
        .map((node) => node.src),
      remote: images
        .filter((node) => new URL(node.src).origin !== location.origin)
        .map((node) => node.src),
    }
  })

  expect(report.broken).toEqual([])
  // Crests must be self-hosted; hotlinked ones 403 on a real domain.
  expect(report.remote).toEqual([])
})

test('layout stays contained across phone, tablet and desktop widths', async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 })
    await page.goto('/en/matches/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1)
    await expect(page.locator('article').first()).toBeVisible()
  }
})
