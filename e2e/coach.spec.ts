import { test, expect } from '@playwright/test'

test('Draft Coach recalculates after every real draft action', async ({ page }) => {
  await page.goto('/en/draft-coach/')

  await expect(page.getByRole('heading', { name: 'Draft Coach' })).toBeVisible()
  await expect(page.locator('.coach-hero-grid button')).toHaveCount(133)
  await expect(page.locator('.coach-recommendation')).toHaveCount(0)

  await page.getByRole('button', { name: 'Start draft' }).click()
  await expect(page.locator('.coach-recommendation')).toHaveCount(5)
  await expect(page.locator('.coach-arena__topbar')).toContainText('BAN · Our move')

  const firstRecommendation = page.locator('.coach-recommendation').first()
  const selectedHero = (await firstRecommendation.locator('strong').first().textContent())?.trim()
  expect(selectedHero).toBeTruthy()
  await firstRecommendation.click()

  await expect(page.locator('.coach-team--ally .coach-ban-row [data-filled]')).toHaveCount(1)
  await expect(page.locator('.coach-team--ally .coach-ban-row')).toContainText(
    selectedHero ?? '',
  )
  await expect(page.locator('.coach-arena__topbar')).toContainText('BAN · Enemy move')
})

test('only active current-season regions feed the coach', async ({ page }) => {
  await page.goto('/en/draft-coach/')

  const regions = page.locator('.coach-region-rail')
  await expect(regions.getByRole('button', { name: /Indonesia/ })).toBeVisible()
  await expect(regions.getByRole('button', { name: /Philippines/ })).toBeVisible()
  await expect(regions.getByRole('button', { name: /Malaysia/ })).toBeVisible()
  await expect(regions.getByRole('button', { name: /Cambodia/ })).toHaveCount(0)
  await expect(regions.getByRole('button', { name: /MENA/ })).toHaveCount(0)

  await regions.getByRole('button', { name: /Philippines/ }).click()
  await expect(page.getByRole('combobox', { name: 'Map' }).locator('option')).toHaveText([
    'All map variants',
    /.+ · \d+/,
    /.+ · \d+/,
    /.+ · \d+/,
    /.+ · \d+/,
  ])
})

test('first-pick priorities are visible and never repeated in our ban list', async ({
  page,
}) => {
  await page.goto('/en/draft-coach/')
  await page.getByRole('button', { name: 'Start draft' }).click()

  const priorities = await page.locator('.coach-priority-picks b').allTextContents()
  const bans = await page
    .locator('.coach-recommendation__name strong')
    .allTextContents()

  expect(priorities).toHaveLength(3)
  expect(bans).toHaveLength(5)
  expect(bans.some((hero) => priorities.includes(hero))).toBe(false)
  await expect(page.locator('.coach-recommendation').first()).toContainText(
    'early-ban rate',
  )
})

test('second pick can lock an observed two-hero package in one action', async ({
  page,
}) => {
  await page.goto('/en/draft-coach/')
  await page.getByRole('button', { name: 'We have second pick' }).click()
  await page.getByRole('button', { name: 'Start draft' }).click()

  for (let index = 0; index < 7; index += 1) {
    await page.locator('.coach-recommendation').first().click()
  }

  await expect(page.locator('.coach-arena__topbar')).toContainText(
    'PICK · Our move',
  )
  await expect(page.locator('.coach-duos button')).toHaveCount(3)
  await page.locator('.coach-duos button').first().click()
  await expect(page.locator('.coach-team--ally .coach-pick-list [data-filled]')).toHaveCount(2)
  expect(
    new Set(
      await page.locator('.coach-team--ally .coach-slot__lane').allTextContents(),
    ).size,
  ).toBe(2)
  await expect(page.locator('.coach-arena__topbar')).toContainText(
    'PICK · Enemy move',
  )
})

test('an enemy pick opens a five-role current-season Counter Map', async ({
  page,
}) => {
  await page.goto('/en/draft-coach/')
  await page.getByRole('button', { name: 'Start draft' }).click()

  for (let index = 0; index < 9; index += 1) {
    await page.locator('.coach-recommendation').first().click()
  }

  await expect(page.locator('.coach-arena__topbar')).toContainText(
    'PICK · Our move',
  )
  const counterMap = page.locator('.coach-counter-map')
  await expect(counterMap).toBeVisible()
  await expect(counterMap.locator('.coach-counter-targets button')).toHaveCount(2)
  await expect(counterMap.locator('.coach-counter-card')).toHaveCount(5)
  await expect(counterMap.locator('.coach-counter-card:enabled')).toHaveCount(4)
  await expect(counterMap.locator('.coach-counter-card:disabled')).toHaveCount(1)
  await expect(counterMap.locator('.coach-counter-card > span')).toHaveText([
    'EXP',
    'Jungle',
    'Mid',
    'Gold',
    'Roam',
  ])

  const filledRole = (
    await page.locator('.coach-team--ally .coach-slot__lane').first().textContent()
  )?.trim()
  expect(filledRole).toBeTruthy()
  await expect(
    counterMap.locator('.coach-counter-card:disabled > span'),
  ).toHaveText(filledRole ?? '')
  const recommendationRoles = await page
    .locator('.coach-recommendation__name small')
    .allTextContents()
  expect(recommendationRoles).not.toContain(filledRole)
})

test('a manual Mage pick locks Mid in recommendations and Counter Map', async ({
  page,
}) => {
  await page.goto('/en/draft-coach/')
  await page.getByRole('button', { name: 'Start draft' }).click()

  for (const hero of ['Aamon', 'Akai', 'Aldous', 'Alice', 'Alpha', 'Alucard']) {
    await page.getByTitle(new RegExp(`^${hero} ·`)).click()
  }

  await expect(page.locator('.coach-arena__topbar')).toContainText(
    'PICK · Our move',
  )
  await page.getByRole('button', { name: 'Mid', exact: true }).click()
  await page.getByTitle(/^Chang'e ·/).click()
  await expect(page.locator('.coach-team--ally .coach-slot__lane')).toHaveText(
    'Mid',
  )

  await page.locator('.coach-recommendation').first().click()
  await page.locator('.coach-recommendation').first().click()

  await expect(page.locator('.coach-arena__topbar')).toContainText(
    'PICK · Our move',
  )
  expect(
    await page.locator('.coach-recommendation__name small').allTextContents(),
  ).not.toContain('Mid')
  const midCounter = page
    .locator('.coach-counter-card')
    .filter({ has: page.locator('span', { hasText: /^Mid$/ }) })
  await expect(midCounter).toBeDisabled()
  await expect(midCounter).toContainText('Role already filled')
})

test('phase-two bans target enemy open roles and the final Jungle follows pro priority', async ({
  page,
}) => {
  await page.goto('/en/draft-coach/')
  await page.getByRole('button', { name: 'Start draft' }).click()

  const select = async (hero: string) => {
    await page.getByTitle(new RegExp(`^${hero} ·`)).click()
  }

  for (const hero of [
    'Freya',
    'Atlas',
    'Marcel',
    'Paquito',
    'Fanny',
    'Hirara',
    'Melissa',
    'Novaria',
    'Barats',
    'Uranus',
    'Rafaela',
    'Mathilda',
    'Chou',
  ]) {
    await select(hero)
  }

  await expect(page.locator('.coach-arena__topbar')).toContainText(
    'BAN · Our move',
  )
  expect(
    new Set(
      await page.locator('.coach-recommendation__name small').allTextContents(),
    ),
  ).toEqual(new Set(['Jungle', 'Gold']))
  await expect(page.locator('.coach-recommendations')).not.toContainText('Eudora')

  await select('Nolan')
  await select('Kaja')
  await select('Ixia')
  await select('Suyou')
  await select('Brody')
  await select('Gloo')

  await expect(page.locator('.coach-arena__topbar')).toContainText(
    'PICK · Our move',
  )
  await expect(page.locator('.coach-role-readout')).toContainText('Jungle')
  await expect(page.locator('.coach-recommendation').first()).toContainText(
    'Harley',
  )
  await expect(page.locator('.coach-recommendation').first()).toContainText(
    'Frequent pro pick',
  )
  await expect(page.getByTitle(/^Harley ·/).locator('b')).toHaveText('Pick 17%')
})

test('a complete practice draft records five unique roles per team', async ({
  page,
}) => {
  await page.goto('/en/draft-coach/')
  await page.getByRole('button', { name: 'Start draft' }).click()

  for (let index = 0; index < 20; index += 1) {
    await expect(page.locator('.coach-recommendation').first()).toBeEnabled()
    await page.locator('.coach-recommendation').first().click()
  }

  await expect(page.locator('.coach-arena__topbar')).toContainText(
    'Draft complete',
  )
  for (const side of ['ally', 'enemy']) {
    const team = page.locator(`.coach-team--${side}`)
    await expect(team.locator('.coach-pick-list [data-filled]')).toHaveCount(5)
    await expect(team.locator('.coach-ban-row [data-filled]')).toHaveCount(5)
    expect(new Set(await team.locator('.coach-slot__lane').allTextContents())).toEqual(
      new Set(['EXP', 'Jungle', 'Mid', 'Gold', 'Roam']),
    )
  }
  const comparison = page.locator('.coach-draft-result')
  await expect(comparison).toBeVisible()
  await expect(comparison).toContainText('Draft comparison')
  await expect(comparison).toContainText('Estimated draft edge')
  await expect(page.locator('.coach-brain > header h2')).toHaveText(
    'Draft comparison',
  )
  await expect(comparison.locator('.coach-draft-result__scores b')).toHaveCount(2)
  expect(await comparison.locator('.coach-draft-result__scores b').allTextContents()).toEqual([
    expect.stringMatching(/^\d+%$/),
    expect.stringMatching(/^\d+%$/),
  ])
})

test('Hero Pool filters never force every coach recommendation into one role', async ({
  page,
}) => {
  await page.goto('/en/draft-coach/')

  await page.getByRole('button', { name: 'Roam', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Roam', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Start draft' }).click()

  for (let index = 0; index < 6; index += 1) {
    await page.locator('.coach-recommendation').first().click()
  }

  await expect(page.locator('.coach-arena__topbar')).toContainText(
    'PICK · Our move',
  )
  const recommendationRoles = await page
    .locator('.coach-recommendation__name small')
    .allTextContents()
  expect(new Set(recommendationRoles).size).toBe(5)
  await expect(page.locator('.coach-role-readout')).toContainText(
    'Best option for every open role',
  )
})

test('hero portraits are local and Draft Coach fits a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/ar/draft-coach/')
  await page.waitForLoadState('networkidle')

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'مدرب الدرافت' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'المدرب' }).first()).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  const images = page.locator('.coach-hero-grid img')
  expect(await images.count()).toBe(133)
  for (let index = 0; index < await images.count(); index += 1) {
    const image = images.nth(index)
    await image.scrollIntoViewIfNeeded()
    await expect
      .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
  }
  expect(
    await images.evaluateAll((nodes) =>
      (nodes as HTMLImageElement[]).every(
        (image) => new URL(image.src).origin === location.origin,
      ),
    ),
  ).toBe(true)
})
