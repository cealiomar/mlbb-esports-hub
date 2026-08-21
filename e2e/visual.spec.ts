import { test } from '@playwright/test'

test('captures desktop pages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  for (const [name, path] of [
    ['home', '/en/'],
    ['matches', '/en/matches/'],
    ['region', '/en/regions/philippines/'],
    ['team', '/en/teams/AP.Bren'],
    ['home-ar', '/ar/'],
    ['matches-ar', '/ar/matches/'],
  ] as const) {
    await page.goto(path)
    await page.waitForTimeout(1400)
    await page.screenshot({ path: `e2e/shots/${name}.png` })
  }
})

test('captures mobile pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const [name, path] of [
    ['m-home', '/en/'],
    ['m-matches', '/en/matches/'],
    ['m-home-ar', '/ar/'],
  ] as const) {
    await page.goto(path)
    await page.waitForTimeout(1400)
    await page.screenshot({ path: `e2e/shots/${name}.png` })
  }
})

test('captures the dark glass theme', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mlbb-theme', 'dark'))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/en/')
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'e2e/shots/home-dark.png' })
})
