import { test, expect } from '@playwright/test'

for (const locale of ['en', 'ar']) {
  test(`compact match navigation works on a phone (${locale})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/${locale}/matches/`)
    const firstCard = page.getByRole('tabpanel').locator('article').first()
    await expect(firstCard).toBeVisible()
    expect((await firstCard.boundingBox())!.y).toBeLessThan(620)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
    const region = page.locator('[data-region="philippines"]')
    await region.click()
    const selectedTab = page.getByRole('tab', { selected: true })
    await selectedTab.focus()
    await selectedTab.press(locale === 'ar' ? 'ArrowLeft' : 'ArrowRight')
    await expect(page.getByRole('tab').last()).toHaveAttribute('aria-selected', 'true')
    await expect(region).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('tabpanel').locator('.region-match-group')).toHaveCount(1)
    await page.screenshot({ path: `test-results/matches-${locale}-mobile.png`, fullPage: false })
  })
}

test('recommendation evidence can be inspected without making a pick or ban', async ({ page }) => {
  await page.goto('/en/draft-coach/')
  await page.getByRole('button', { name: 'Start draft' }).click()
  const before = await page.locator('.coach-arena__topbar').innerText()
  const evidence = page.locator('.coach-evidence').first()
  await evidence.locator('summary').click()
  await expect(evidence).toContainText('completed games')
  await expect(evidence).toContainText('not a prediction')
  expect(await page.locator('.coach-arena__topbar').innerText()).toBe(before)
  await page.locator('.coach-recommendation').first().click()
  await expect(page.locator('.coach-team--ally .coach-ban-row [data-filled]')).toHaveCount(1)
})
