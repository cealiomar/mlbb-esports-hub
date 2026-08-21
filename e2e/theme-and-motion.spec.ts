import { test, expect } from '@playwright/test'

test('opening reveal animates the logo and clears the page quickly', async ({
  page,
}) => {
  await page.goto('/en/')
  const intro = page.getByTestId('site-intro')
  const logo = intro.locator('[data-brand-mark]')

  await expect(intro).toBeVisible()
  await expect
    .poll(() => logo.evaluate((el) => getComputedStyle(el).animationName))
    .toContain('introLogo')
  await expect(intro).toBeHidden({ timeout: 3_500 })
})

test('theme toggle switches and persists the chosen mode', async ({ page }) => {
  await page.goto('/en/')
  const before = await page.locator('html').getAttribute('data-theme')

  await page.getByRole('button', { name: 'Toggle color theme' }).click()
  const after = await page.locator('html').getAttribute('data-theme')
  expect(after).not.toBe(before)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', after!)
})

test('fixture cards react in 3D to pointer position', async ({ page }) => {
  await page.goto('/en/matches/')
  const card = page.locator('.tilt-card').first()
  await card.hover({ position: { x: 25, y: 35 } })

  await expect
    .poll(() => card.evaluate((el) => el.style.getPropertyValue('--tilt-y')))
    .not.toBe('0deg')
})
