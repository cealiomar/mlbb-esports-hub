import { test, expect } from '@playwright/test'

const PHONE = { width: 375, height: 812 }

for (const locale of ['en', 'ar'] as const) {
  test(`the academy fits a phone without sideways scroll (${locale})`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(`/${locale}/academy/`)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute(
      'dir',
      locale === 'ar' ? 'rtl' : 'ltr',
    )
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
}

test('academy images are mirrored locally and actually decode', async ({ page }) => {
  await page.goto('/en/academy/')
  const images = page.locator('main.academy img')
  const count = await images.count()
  expect(count).toBeGreaterThan(10)

  for (let index = 0; index < count; index += 1) {
    const image = images.nth(index)
    // Portraits are lazy; bring each one into view before judging it. Done
    // in the page because the crest floats forever, and Playwright's own
    // scroll waits for an element to stop moving.
    await image.evaluate((node) => node.scrollIntoView({ block: 'center' }))
    const src = (await image.getAttribute('src')) ?? ''
    // Liquipedia answers 403 to hotlinked images on a real domain.
    expect(src.startsWith('http'), src).toBe(false)
    await expect
      .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth), {
        message: src,
      })
      .toBeGreaterThan(0)
  }
})

test('the roster shows MPL MENA players, some with a portrait', async ({ page }) => {
  await page.goto('/en/academy/')
  const players = page.getByTestId('academy-player')
  expect(await players.count()).toBeGreaterThan(3)
  expect(await players.locator('img').count()).toBeGreaterThan(0)
})

test('the meta board switches lane', async ({ page }) => {
  await page.goto('/en/academy/')
  const board = page.locator('#meta')
  const first = await board.getByTestId('academy-meta-hero').first().innerText()
  await board.getByRole('tab', { name: 'Jungle' }).click()
  await expect(board.getByTestId('academy-meta-hero').first()).not.toHaveText(first)
})

test('a lesson opens from the curriculum and links onward', async ({ page }) => {
  await page.goto('/en/academy/')
  const link = page.getByTestId('academy-lesson-link').first()
  const title = await link.locator('strong').innerText()
  await link.click()
  await expect(page).toHaveURL(/\/en\/academy\/[a-z0-9-]+\/?$/)
  await expect(page.locator('h1')).toHaveText(title)
  await page.getByRole('link', { name: /Next lesson/ }).click()
  await expect(page.locator('h1')).not.toHaveText(title)
})

test('the draft lesson and the academy both lead to the Draft Coach', async ({ page }) => {
  await page.goto('/en/academy/draft-basics/')
  await page.getByRole('link', { name: /Draft Coach/ }).first().click()
  await expect(page).toHaveURL(/\/en\/draft-coach\/?$/)
})
