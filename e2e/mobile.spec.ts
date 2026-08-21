import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['iPhone 13'] })

const ROUTES = [
  '/en/',
  '/en/matches/',
  '/en/regions/philippines/',
  '/ar/',
  '/ar/matches/',
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
})

test('every tap target in the nav is at least 44px tall', async ({ page }) => {
  await page.goto('/en/')
  const links = page.locator('nav a')
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

  const report = await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('article img'))
    await Promise.all(
      imgs.map((i) =>
        i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r }),
      ),
    )
    return {
      total: imgs.length,
      // naturalWidth is 0 for a broken image, however big the element is.
      broken: imgs.filter((i) => i.naturalWidth === 0).map((i) => i.src),
      remote: imgs
        .filter((i) => new URL(i.src).origin !== location.origin)
        .map((i) => i.src),
    }
  })

  expect(report.total).toBeGreaterThan(0)
  expect(report.broken).toEqual([])
  // Crests must be self-hosted; hotlinked ones 403 on a real domain.
  expect(report.remote).toEqual([])
})
