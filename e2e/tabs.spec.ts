import { test, expect } from '@playwright/test'

test('tabs switch the visible fixtures', async ({ page }) => {
  await page.goto('/en/matches/')

  const tabs = page.getByRole('tab')
  await expect(tabs.first()).toBeVisible()
  const count = await tabs.count()
  expect(count).toBeGreaterThanOrEqual(3)

  // Exactly one tab is selected at a time.
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1)

  const panel = page.getByRole('tabpanel')
  const before = await panel.innerText()

  await tabs.last().click()
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1)

  await expect(panel).not.toHaveText(before)
})

test('the sliding indicator tracks the selected tab', async ({ page }) => {
  await page.goto('/en/matches/')
  const tabs = page.getByRole('tab')

  const first = await tabs.first().boundingBox()
  await tabs.last().click()
  await page.waitForTimeout(600)

  const pill = page.locator('[role="tablist"] > span[aria-hidden]')
  const pillBox = await pill.boundingBox()
  const lastBox = await tabs.last().boundingBox()

  expect(pillBox).not.toBeNull()
  // The pill sits under the last tab, not the first one it started on.
  expect(Math.abs((pillBox!.x ?? 0) - (lastBox!.x ?? 0))).toBeLessThan(6)
  expect(Math.abs((pillBox!.x ?? 0) - (first!.x ?? 0))).toBeGreaterThan(10)
})

test('tabs work in RTL', async ({ page }) => {
  await page.goto('/ar/matches/')
  const tabs = page.getByRole('tab')
  await tabs.last().click()
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true')
  // Let the sliding pill finish its transition before measuring.
  await page.waitForTimeout(600)

  const pill = page.locator('[role="tablist"] > span[aria-hidden]')
  const pillBox = await pill.boundingBox()
  const lastBox = await tabs.last().boundingBox()
  expect(Math.abs((pillBox!.x ?? 0) - (lastBox!.x ?? 0))).toBeLessThan(6)
})

test('no globe canvas remains anywhere', async ({ page }) => {
  for (const route of ['/en/', '/en/matches/', '/en/regions/philippines/']) {
    await page.goto(route)
    await expect(page.locator('canvas')).toHaveCount(0)
  }
})

test('every region is reachable from the home page', async ({ page }) => {
  await page.goto('/en/')
  const links = page.locator('a[href*="/regions/"]')
  await expect(links).toHaveCount(11)
})

test('the site root sends visitors to a locale', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL(/\/(en|ar)\//)
  await expect(page.locator('html')).toHaveAttribute('lang', /en|ar/)
  await expect(page.getByRole('tablist')).toBeVisible()
})
