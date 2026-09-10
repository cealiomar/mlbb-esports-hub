import { test, expect, type Page } from '@playwright/test'

const PHONE = { width: 375, height: 812 }

async function tinyText(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((el) => el.childElementCount === 0 && (el.textContent ?? '').trim().length > 1)
      .filter((el) => !el.closest('.site-intro'))
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'
      })
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 11)
      .map((el) => `${getComputedStyle(el).fontSize} "${(el.textContent ?? '').trim().slice(0, 30)}"`),
  )
}

for (const path of ['/en/', '/ar/', '/en/matches/', '/en/drafts/', '/ar/drafts/', '/en/draft-coach/']) {
  test(`no visible text below 11px on ${path}`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(path)
    expect(await tinyText(page)).toEqual([])
  })
}

test('standings teams open their team page', async ({ page }) => {
  await page.goto('/en/')
  const links = page.getByTestId('standings-rail').locator('a[href*="/teams/"]')
  expect(await links.count()).toBeGreaterThan(0)
  const href = await links.first().getAttribute('href')
  await page.goto(href!)
  await expect(page.locator('h1')).toBeVisible()
})

test('draft series teams open their team page', async ({ page }) => {
  await page.goto('/en/drafts/')
  const links = page
    .getByTestId('team-draft-panel')
    .locator('.draft-series__matchup a[href*="/teams/"]')
  expect(await links.count()).toBeGreaterThan(0)
  const href = await links.first().getAttribute('href')
  const response = await page.goto(href!)
  expect(response?.status()).toBe(200)
  await expect(page.locator('h1')).toBeVisible()
})

test('a team page never links to itself from its own drafts', async ({ page }) => {
  await page.goto('/en/drafts/')
  const href = await page
    .getByTestId('team-draft-panel')
    .locator('.draft-series__matchup a[href*="/teams/"]')
    .first()
    .getAttribute('href')
  await page.goto(href!)
  const self = page.locator(`[data-testid="team-draft-panel"] a[href="${href}"]`)
  await expect(self).toHaveCount(0)
})

test('the opening plays once per session', async ({ page }) => {
  await page.setViewportSize(PHONE)
  await page.goto('/en/')
  await expect(page.getByTestId('site-intro')).toBeVisible()
  // Let it finish; the session is then marked as having seen it.
  await page.waitForTimeout(2600)

  const bar = page.locator('.mobile-nav')
  await bar.getByRole('link', { name: 'Matches' }).click()
  await expect(page).toHaveURL(/\/en\/matches\/?$/)
  await bar.getByRole('link', { name: 'Home' }).click()
  await expect(page).toHaveURL(/\/en\/?$/)
  await expect(page.getByTestId('site-intro')).toBeHidden()

  await page.reload()
  await expect(page.getByTestId('site-intro')).toBeHidden()
})
