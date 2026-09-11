import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
async function settleImages(page: Page) {
  await page.locator('img').evaluateAll(async (images) => {
    await Promise.all(
      images.map((image) => {
        image.loading = 'eager'
        return image.decode().catch(() => {})
      }),
    )
  })
}
test('search, combined filters, detail, clipboard and favorites persist', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await expect(page.locator('.prompt-card')).toHaveCount(12)
  await page.getByRole('searchbox').fill('85mm')
  await expect(page.locator('.prompt-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'View Summer in bloom', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Summer in bloom' }).last()).toBeVisible()
  await dialog.getByRole('button', { name: 'Copy prompt', exact: true }).first().click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('85mm')
  await dialog.getByRole('button', { name: 'Close dialog' }).click()
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await page.getByRole('combobox', { name: 'All models' }).selectOption('GPT Image')
  await page.getByRole('combobox', { name: 'All ratios' }).selectOption('1:1')
  await expect(page.locator('.prompt-card')).toHaveCount(3)
  await page
    .getByRole('button', { name: 'Save Golden hour essentials to favorites', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Remove Golden hour essentials from favorites' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Remove Golden hour essentials from favorites' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Favorites', exact: true }).click()
  await expect(page.locator('.prompt-card')).toHaveCount(5)
  await page.getByRole('searchbox').fill('not-a-real-prompt')
  await expect(page.getByText('No prompts found.')).toBeVisible()
})
test('upload validation, tags, editing and confirmed deletion', async ({ page }) => {
  await page.goto('/upload')
  await page.getByRole('button', { name: 'Save prompt', exact: true }).click()
  await expect(page.getByText('Choose an image to continue.')).toBeVisible()
  await page.getByLabel('Upload image', { exact: true }).setInputFiles({
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1sAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expect(page.getByAltText('Image preview')).toBeVisible()
  await page.getByLabel('Title', { exact: false }).fill('Test inspiration')
  await page
    .getByLabel('Prompt', { exact: true })
    .fill('A carefully lit ceramic vase in a quiet studio.')
  await page.getByLabel('Category', { exact: false }).selectOption('Product')
  await page.getByRole('textbox', { name: 'Tags', exact: true }).fill('ceramic')
  await page.getByRole('textbox', { name: 'Tags', exact: true }).press('Enter')
  await page.getByRole('button', { name: 'Save prompt', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('.prompt-card')).toHaveCount(13)
  await page.getByRole('button', { name: 'View Test inspiration', exact: true }).click()
  await page.getByRole('link', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Title', { exact: false }).fill('Updated inspiration')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL('/')
  await page.reload()
  await page.getByRole('button', { name: 'View Updated inspiration', exact: true }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.prompt-card')).toHaveCount(12)
})
test('desktop screenshots, list layout and persistent dark mode', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 1040 })
  await page.goto('/')
  await expect(page.locator('.prompt-card')).toHaveCount(12)
  await page
    .locator('.card-image img')
    .first()
    .evaluate((img: HTMLImageElement) => img.decode().catch(() => {}))
  await settleImages(page)
  await page.screenshot({ path: 'artifacts/gallery-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'View Summer in bloom', exact: true }).click()
  await settleImages(page)
  await page.screenshot({ path: 'artifacts/detail-desktop.png' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'List view', exact: true }).click()
  await expect(page.locator('.list-view')).toBeVisible()
  await page.getByRole('button', { name: 'Grid view', exact: true }).click()
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.prompt-card')).toHaveCount(12)
  await settleImages(page)
  await page.screenshot({ path: 'artifacts/gallery-dark.png', fullPage: true })
  await page.goto('/upload')
  await expect(page.locator('.prompt-form')).toBeVisible()
  await page.screenshot({ path: 'artifacts/upload-dark.png', fullPage: true })
  expect(errors).toEqual([])
})
test('mobile two-column layout, filter drawer and full-screen detail', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.prompt-card')).toHaveCount(12)
  await expect(page.locator('.prompt-grid')).toHaveCSS('column-count', '2')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await settleImages(page)
  await page.screenshot({ path: 'artifacts/gallery-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await page.getByRole('radio', { name: 'Product', exact: true }).check()
  await page.getByRole('button', { name: 'Show 3 prompts' }).click()
  await expect(page.locator('.prompt-card')).toHaveCount(3)
  await page.getByRole('button', { name: 'View Golden hour essentials', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCSS('width', '390px')
  await page.screenshot({ path: 'artifacts/detail-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.goto('/upload')
  await expect(page.locator('.prompt-form')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: 'artifacts/upload-mobile.png', fullPage: true })
})
