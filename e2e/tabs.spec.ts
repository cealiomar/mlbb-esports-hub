import { test, expect } from '@playwright/test'

test('tabs switch the visible fixtures', async ({ page }) => {
  await page.goto('/en/matches/')

  const tabs = page.getByRole('tab')
  await expect(tabs.first()).toBeVisible()
  const count = await tabs.count()
  expect(count).toBeGreaterThanOrEqual(2)

  // Exactly one tab is selected at a time.
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1)

  const panel = page.getByRole('tabpanel')
  const before = await panel.innerText()

  await tabs.last().click()
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1)

  await expect(panel).not.toHaveText(before)
})

test('upcoming matches are the clear default view', async ({ page }) => {
  await page.goto('/en/matches/')
  await expect(page.getByRole('tab', { name: /Upcoming matches/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('tabpanel').locator('article').first()).toBeVisible()
})

test('every fixture opens a fast, self-contained detail page', async ({ page }) => {
  await page.goto('/en/matches/')
  const details = page.getByRole('link', { name: 'Details' }).first()
  await expect(details).toBeVisible()
  await details.click()
  await expect(page).toHaveURL(/\/en\/matches\/[^/]+\/$/)
  await expect(page.getByRole('heading', { name: 'Match details' })).toBeVisible()
  await expect(page.locator('.match-details-info')).toBeVisible()
  await expect(page.locator('.match-time').first()).toContainText('Your time')
})

test('match times use the visitor timezone and replay states are honest', async ({
  page,
}) => {
  await page.goto('/en/matches/')

  await expect(page.locator('main')).toContainText('local timezone')
  await expect(page.locator('.match-time').first()).toContainText('Your time')

  await page.getByRole('tab', { name: /Results/ }).click()
  const replay = page.locator('.rewatch-link').first()
  await expect(replay).toBeVisible()
  await expect(replay).toHaveAttribute(
    'href',
    /(?:youtube\.com\/(?:watch|live)|youtu\.be\/)/,
  )
  await expect(page.locator('.replay-unavailable').first()).toBeVisible()
})

test('tabs work in RTL', async ({ page }) => {
  await page.goto('/ar/matches/')
  const tabs = page.getByRole('tab')
  await tabs.last().click()
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('tabpanel').locator('article').first()).toBeVisible()
})

test('matches and results are grouped into simple region sections', async ({
  page,
}) => {
  await page.goto('/en/matches/')
  const panel = page.getByRole('tabpanel')
  const groups = panel.locator('.region-match-group')
  expect(await groups.count()).toBeGreaterThan(1)
  for (const group of await groups.all()) {
    expect(await group.locator('article').count()).toBeLessThanOrEqual(4)
  }

  const regionButtons = page.locator('.region-choice button')
  await regionButtons.nth(1).click()
  await expect(panel.locator('.region-match-group')).toHaveCount(1)
  await expect(panel.locator('article').first()).toBeVisible()

  await page.getByRole('tab', { name: /Results/ }).click()
  expect(await panel.locator('.region-match-group').count()).toBeGreaterThan(1)
})

test('the complex search and filter controls are gone', async ({ page }) => {
  await page.goto('/en/matches/')
  await expect(page.getByRole('searchbox')).toHaveCount(0)
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Stream \/ VOD/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Compact view|Card view/ })).toHaveCount(0)
})

test('all match status tabs fit on a phone without page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/en/matches/')

  const lastTab = page.getByRole('tab').last()
  const box = await lastTab.boundingBox()
  expect((box?.x ?? 400) + (box?.width ?? 0)).toBeLessThanOrEqual(390)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
})

test('no globe canvas remains anywhere', async ({ page }) => {
  for (const route of ['/en/', '/en/matches/', '/en/regions/philippines/']) {
    await page.goto(route)
    await expect(page.locator('canvas')).toHaveCount(0)
  }
})

test('generic placeholder crests and source redlink labels never leak to cards', async ({
  page,
}) => {
  await page.goto('/en/matches/')

  for (const tab of await page.getByRole('tab').all()) {
    await tab.click()
    await expect(page.locator('article img[src*="Mobile_Legends_2025_allmode"]')).toHaveCount(0)
    await expect(page.getByRole('tabpanel')).not.toContainText('page does not exist')
  }
})

test('every region is reachable from the home page', async ({ page }) => {
  await page.goto('/en/')
  const links = page.getByTestId('region-rail').locator('a[href*="/regions/"]')
  await expect(links).toHaveCount(11)
})

test('the home page puts live matches directly after the hero', async ({
  page,
}) => {
  await page.goto('/en/')
  const liveSection = page.locator('[data-home-live]')

  if ((await liveSection.count()) > 0) {
    const order = await liveSection.evaluate((node) => ({
      previousIsHero: node.previousElementSibling?.classList.contains('hero'),
      nextIsStandings:
        node.nextElementSibling?.hasAttribute('data-home-standings'),
      standingsThenTicker:
        node.nextElementSibling?.nextElementSibling?.classList.contains('marquee'),
    }))
    expect(order).toEqual({
      previousIsHero: true,
      nextIsStandings: true,
      standingsThenTicker: true,
    })
    await expect(page.locator('a[href="#live"]')).toBeVisible()
  }
})

test('the home page shows compact standings by region', async ({ page }) => {
  await page.goto('/en/')

  const section = page.locator('[data-home-standings]')
  await expect(section).toBeVisible()
  await expect(section.getByRole('heading', { name: 'League standings' })).toBeVisible()

  const cards = page.getByTestId('standings-rail').locator('article')
  await expect(cards).toHaveCount(11)
  expect(await cards.first().locator('tbody tr').count()).toBeLessThanOrEqual(4)
  await expect(cards.first().getByRole('link', { name: /Full standings/ })).toBeVisible()
  await expect(
    page.getByTestId('standings-rail').locator('img[src*="liquipedia"]'),
  ).toHaveCount(0)
})

test('a region page shows its complete standings and qualification legend', async ({
  page,
}) => {
  await page.goto('/en/regions/philippines/')

  const section = page.locator('[data-region-standings]')
  await expect(section).toBeVisible()
  await expect(section.locator('tbody tr').first()).toBeVisible()
  expect(await section.locator('tbody tr').count()).toBeGreaterThan(4)
  await expect(section.locator('[data-standing-legend="advance"]')).toBeVisible()
  await expect(section.locator('[data-standing-legend="eliminated"]')).toBeVisible()
})

test('an inactive season never leaks last season standings or teams', async ({
  page,
}) => {
  await page.goto('/en/regions/mena/')

  const standings = page.locator('[data-region-standings]')
  await expect(standings.locator('tbody tr')).toHaveCount(0)
  await expect(standings).toContainText('Standings not published yet')
  await expect(page.locator('main')).not.toContainText(/GAMAX/i)
  await expect(page.locator('main')).toContainText(
    'Current-season teams will appear when the league publishes them.',
  )
})

test('regions use a horizontal snap rail with working controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/en/')
  await page.waitForTimeout(2400)

  const rail = page.getByTestId('region-rail')
  const sizes = await rail.evaluate((node) => ({
    viewport: node.clientWidth,
    content: node.scrollWidth,
  }))
  expect(sizes.content).toBeGreaterThan(sizes.viewport)

  const before = Math.abs(await rail.evaluate((node) => node.scrollLeft))
  await page.getByTestId('region-next').click()
  await expect
    .poll(() => rail.evaluate((node) => Math.abs(node.scrollLeft)))
    .toBeGreaterThan(before + 40)
})

test('region rail controls follow the RTL direction', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/ar/')
  await page.waitForTimeout(2400)

  const rail = page.getByTestId('region-rail')
  const before = Math.abs(await rail.evaluate((node) => node.scrollLeft))
  await page.getByTestId('region-next').click()
  await expect
    .poll(() => rail.evaluate((node) => Math.abs(node.scrollLeft)))
    .toBeGreaterThan(before + 40)
})

test('the site root sends visitors to a locale', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL(/\/(en|ar)\//)
  await expect(page.locator('html')).toHaveAttribute('lang', /en|ar/)
  await expect(page.getByRole('tablist')).toBeVisible()
})
