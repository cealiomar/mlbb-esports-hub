import { test, expect } from '@playwright/test'

test('Draft Coach recalculates after every real draft action', async ({ page }) => {
  await page.goto('/en/draft-coach/')

  await expect(page.getByRole('heading', { name: 'Draft Coach' })).toBeVisible()
  await expect(page.locator('.coach-hero-grid button')).toHaveCount(133)
  await expect(page.locator('.coach-recommendation')).toHaveCount(0)

  await page.getByRole('button', { name: 'Start draft' }).click()
  await expect(page.locator('.coach-recommendation')).toHaveCount(5)
  await expect(page.locator('.coach-arena__topbar')).toContainText('BAN · Our move')

  const firstRecommendation = page.locator('.coach-recommendation').first()
  const selectedHero = (await firstRecommendation.locator('strong').first().textContent())?.trim()
  expect(selectedHero).toBeTruthy()
  await firstRecommendation.click()

  await expect(page.locator('.coach-team--ally .coach-ban-row [data-filled]')).toHaveCount(1)
  await expect(page.locator('.coach-team--ally .coach-ban-row')).toContainText(
    selectedHero ?? '',
  )
  await expect(page.locator('.coach-arena__topbar')).toContainText('BAN · Enemy move')
})

test('hero portraits are local and Draft Coach fits a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/ar/draft-coach/')
  await page.waitForLoadState('networkidle')

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'مدرب الدرافت' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'المدرب' }).first()).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  const images = page.locator('.coach-hero-grid img')
  expect(await images.count()).toBe(133)
  for (let index = 0; index < await images.count(); index += 1) {
    const image = images.nth(index)
    await image.scrollIntoViewIfNeeded()
    await expect
      .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
  }
  expect(
    await images.evaluateAll((nodes) =>
      (nodes as HTMLImageElement[]).every(
        (image) => new URL(image.src).origin === location.origin,
      ),
    ),
  ).toBe(true)
})
