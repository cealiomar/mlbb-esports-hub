import { test, expect } from '@playwright/test'

test('marquee wraps seamlessly', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/en/')
  const data = await page.evaluate(() => {
    const track = document.querySelector<HTMLElement>('.marquee-track')!
    const groups = Array.from(track.children) as HTMLElement[]
    return {
      groups: groups.length,
      groupWidth: Math.round(groups[0].getBoundingClientRect().width),
      halfTrack: Math.round(track.scrollWidth / 2),
      trackWidth: Math.round(track.scrollWidth),
      viewport: window.innerWidth,
    }
  })
  console.log('TICKER', JSON.stringify(data))
  // A group must be exactly half the track or the -50% wrap jumps.
  expect(Math.abs(data.groupWidth - data.halfTrack)).toBeLessThanOrEqual(1)
  // And the strip must overflow the screen, or there is a visible dead gap.
  expect(data.groupWidth).toBeGreaterThan(data.viewport)
})

test('marquee also wraps seamlessly in RTL', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/ar/')
  const data = await page.evaluate(() => {
    const track = document.querySelector<HTMLElement>('.marquee-track')!
    const groups = Array.from(track.children) as HTMLElement[]
    return {
      groupWidth: Math.round(groups[0].getBoundingClientRect().width),
      halfTrack: Math.round(track.scrollWidth / 2),
    }
  })
  expect(Math.abs(data.groupWidth - data.halfTrack)).toBeLessThanOrEqual(1)
})

test('the ticker pauses when hovered', async ({ page }) => {
  await page.goto('/en/')
  // Hover the container: the track itself is wider than the screen, so its
  // centre point sits outside the viewport.
  await page.locator('.marquee').hover()
  const state = await page.locator('.marquee-track').evaluate(
    (el) => getComputedStyle(el).animationPlayState,
  )
  expect(state).toBe('paused')
})

test('the footer credits the developer with working links', async ({ page }) => {
  await page.goto('/en/')

  const insta = page.getByRole('link', { name: 'cealiomar', exact: true })
  await expect(insta).toHaveAttribute(
    'href',
    'https://www.instagram.com/cealiomar.design/',
  )
  await expect(insta).toHaveAttribute('target', '_blank')

  await expect(
    page.getByRole('link', { name: 'cealiomar@gmail.com' }),
  ).toHaveAttribute('href', 'mailto:cealiomar@gmail.com')
})

test('the credit is present in Arabic too', async ({ page }) => {
  await page.goto('/ar/')
  await expect(
    page.getByRole('link', { name: 'cealiomar@gmail.com' }),
  ).toBeVisible()
})
