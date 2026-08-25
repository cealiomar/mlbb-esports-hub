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

test('only active current-season regions feed the coach', async ({ page }) => {
  await page.goto('/en/draft-coach/')

  const regions = page.locator('.coach-region-rail')
  await expect(regions.getByRole('button', { name: /Indonesia/ })).toBeVisible()
  await expect(regions.getByRole('button', { name: /Philippines/ })).toBeVisible()
  await expect(regions.getByRole('button', { name: /Malaysia/ })).toBeVisible()
  await expect(regions.getByRole('button', { name: /Cambodia/ })).toHaveCount(0)
  await expect(regions.getByRole('button', { name: /MENA/ })).toHaveCount(0)
})

test('an enemy pick opens a five-role current-season Counter Map', async ({
  page,
}) => {
  await page.goto('/en/draft-coach/')
  await page.getByRole('button', { name: 'Start draft' }).click()

  for (let index = 0; index < 9; index += 1) {
    await page.locator('.coach-recommendation').first().click()
  }

  await expect(page.locator('.coach-arena__topbar')).toContainText(
    'PICK · Our move',
  )
  const counterMap = page.locator('.coach-counter-map')
  await expect(counterMap).toBeVisible()
  await expect(counterMap.locator('.coach-counter-targets button')).toHaveCount(2)
  await expect(counterMap.locator('.coach-counter-card')).toHaveCount(5)
  await expect(counterMap.locator('.coach-counter-card > span')).toHaveText([
    'EXP',
    'Jungle',
    'Mid',
    'Gold',
    'Roam',
  ])
})

test('Hero Pool filters never force every coach recommendation into one role', async ({
  page,
}) => {
  await page.goto('/en/draft-coach/')

  await page.getByRole('button', { name: 'Roam', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Roam', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Start draft' }).click()

  for (let index = 0; index < 6; index += 1) {
    await page.locator('.coach-recommendation').first().click()
  }

  await expect(page.locator('.coach-arena__topbar')).toContainText(
    'PICK · Our move',
  )
  const recommendationRoles = await page
    .locator('.coach-recommendation__name small')
    .allTextContents()
  expect(new Set(recommendationRoles).size).toBe(5)
  await expect(page.locator('.coach-role-readout')).toContainText(
    'Best option for every open role',
  )
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
