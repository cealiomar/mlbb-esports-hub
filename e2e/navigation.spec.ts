import { test, expect } from '@playwright/test'

const DESTINATIONS = ['Home', 'Matches', 'Standings', 'Drafts', 'Coach']

test.describe('phone navigation', () => {
  // Sized rather than device-emulated: switching browser engine inside a
  // describe forces a new worker, and mobile.spec.ts already covers WebKit.
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
  })

  test('every destination is reachable and comfortably tappable', async ({
    page,
  }) => {
    await page.goto('/en/')

    const bar = page.locator('.mobile-nav')
    await expect(bar).toBeVisible()

    for (const label of DESTINATIONS) {
      const item = bar.getByRole('link', { name: label })
      await expect(item).toBeVisible()
      const box = await item.boundingBox()
      // Apple and Android both put the minimum comfortable target at 44px.
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
  })

  test('marks exactly one destination as current', async ({ page }) => {
    for (const [path, expected] of [
      ['/en/', 'Home'],
      ['/en/matches/', 'Matches'],
      ['/en/drafts/', 'Drafts'],
      ['/en/draft-coach/', 'Coach'],
    ] as const) {
      await page.goto(path)
      const current = page.locator('.mobile-nav a[aria-current="page"]')
      await expect(current).toHaveCount(1)
      await expect(current).toContainText(expected)
    }
  })

  test('navigates between sections by tapping the bar', async ({ page }) => {
    await page.goto('/en/')
    await page.locator('.mobile-nav').getByRole('link', { name: 'Drafts' }).click()
    await expect(page).toHaveURL(/\/en\/drafts\/?$/)
    await page.locator('.mobile-nav').getByRole('link', { name: 'Coach' }).click()
    await expect(page).toHaveURL(/\/en\/draft-coach\/?$/)
  })

  test('the bar never hides the end of the page', async ({ page }) => {
    await page.goto('/en/matches/')
    const covered = await page.evaluate(() => {
      const bar = document.querySelector('.mobile-nav')
      if (!bar) return 'no bar'
      const pad = Number.parseFloat(getComputedStyle(document.body).paddingBottom)
      return pad >= bar.getBoundingClientRect().height ? 'clear' : 'covered'
    })
    expect(covered).toBe('clear')
  })

  test('works the same in Arabic', async ({ page }) => {
    await page.goto('/ar/drafts/')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    const current = page.locator('.mobile-nav a[aria-current="page"]')
    await expect(current).toHaveCount(1)
  })
})

test('desktop keeps the destinations in the top bar and hides the phone bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/en/')

  for (const label of DESTINATIONS) {
    await expect(
      page.locator('nav.site-nav').getByRole('link', { name: label }),
    ).toBeVisible()
  }
  await expect(page.locator('.mobile-nav')).toBeHidden()
})
