import { test, expect } from '@playwright/test'

test('Draft Lab shows complete league pick and ban rankings', async ({ page }) => {
  await page.goto('/en/drafts/')

  await expect(page.getByRole('heading', { name: 'Draft Lab' })).toBeVisible()
  const overview = page.getByTestId('draft-overview')
  await expect(overview).toContainText('MPL Indonesia')
  await expect(overview.getByRole('heading', { name: 'Top Picks' })).toBeVisible()
  await expect(overview.getByRole('heading', { name: 'Top Bans' })).toBeVisible()
  await expect(overview.locator('.draft-ranking__row')).toHaveCount(10)
  await expect(overview).toContainText('38 games analyzed')
})

test('regions switch in place without creating a long page of leagues', async ({
  page,
}) => {
  await page.goto('/en/drafts/')

  await expect(page.getByTestId('draft-overview')).toHaveCount(1)
  await page.getByRole('button', { name: /Philippines/ }).click()
  await expect(page.getByTestId('draft-overview')).toContainText('MPL Philippines')
  await expect(page.getByTestId('draft-overview')).toContainText('17 games analyzed')
})

test('a team opens its real game-by-game drafts', async ({ page }) => {
  await page.goto('/en/drafts/')

  const teamButtons = page.locator('.draft-team-rail button')
  expect(await teamButtons.count()).toBeGreaterThan(1)
  await teamButtons.nth(1).click()

  const panel = page.getByTestId('team-draft-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText('Picks', { exact: true }).first()).toBeVisible()
  await expect(panel.getByText('Bans', { exact: true }).first()).toBeVisible()
  await expect(panel.locator('.draft-game__side').first()).toBeVisible()
  await expect(panel.locator('.draft-game__result').first()).toBeVisible()

  const series = panel.locator('.draft-series').first()
  await expect(series.getByTestId('draft-series-date')).toContainText(
    /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/,
  )
  await expect(series).toContainText(/Week \d+/)
  await expect(series.locator('.draft-series__team[data-winner]')).toHaveCount(1)
  await expect(series.getByText('Winner', { exact: true })).toBeVisible()
  await expect(series.getByTestId('draft-series-mvp')).toContainText('MVP:')

  const crests = series.locator('.draft-series__matchup img')
  await expect(crests).toHaveCount(2)
  expect(
    await crests.evaluateAll((images) =>
      (images as HTMLImageElement[]).every(
        (image) =>
          image.naturalWidth > 0 && new URL(image.src).origin === location.origin,
      ),
    ),
  ).toBe(true)
})

test('hero portraits are decoded locally and never hotlinked', async ({ page }) => {
  await page.goto('/en/drafts/')
  await page.waitForLoadState('networkidle')

  const images = page.locator('.draft-ranking img')
  expect(await images.count()).toBeGreaterThan(0)
  const report = await images.evaluateAll((nodes) =>
    (nodes as HTMLImageElement[]).map((image) => ({
      width: image.naturalWidth,
      origin: new URL(image.src).origin,
      currentOrigin: location.origin,
    })),
  )
  expect(report.every((image) => image.width > 0)).toBe(true)
  expect(report.every((image) => image.origin === image.currentOrigin)).toBe(true)
})

test('Draft Lab is clear in Arabic and contained at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/ar/drafts/')

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'معمل الدرافت' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'أكتر Top Picks' })).toBeVisible()
  const series = page.locator('.draft-series').first()
  await expect(series).toContainText(/الأسبوع \d+/)
  await expect(series.getByText('الفائز', { exact: true })).toBeVisible()
  await expect(series.getByTestId('draft-series-mvp')).toContainText('أفضل لاعب:')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1)
})
