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
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true')

  const pill = page.locator('[role="tablist"] > span[aria-hidden]')
  // Wait on the actual geometry: under load the CSS transition can take a
  // little longer than its nominal duration.
  await expect
    .poll(async () => {
      const pillBox = await pill.boundingBox()
      const lastBox = await tabs.last().boundingBox()
      return Math.abs((pillBox?.x ?? 0) - (lastBox?.x ?? 0))
    })
    .toBeLessThan(6)

  const pillBox = await pill.boundingBox()
  expect(Math.abs((pillBox!.x ?? 0) - (first!.x ?? 0))).toBeGreaterThan(10)
})

test('tabs work in RTL', async ({ page }) => {
  await page.goto('/ar/matches/')
  const tabs = page.getByRole('tab')
  await tabs.last().click()
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true')

  const pill = page.locator('[role="tablist"] > span[aria-hidden]')
  await expect
    .poll(async () => {
      const pillBox = await pill.boundingBox()
      const lastBox = await tabs.last().boundingBox()
      return Math.abs((pillBox?.x ?? 0) - (lastBox?.x ?? 0))
    })
    .toBeLessThan(6)
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
  const links = page.locator('a[href*="/regions/"]')
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
      nextIsTicker: node.nextElementSibling?.classList.contains('marquee'),
    }))
    expect(order).toEqual({ previousIsHero: true, nextIsTicker: true })
    await expect(page.locator('a[href="#live"]')).toBeVisible()
  }
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
