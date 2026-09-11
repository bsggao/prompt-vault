import { test, expect } from '@playwright/test'
import { mockCloud } from './fixtures'

test('Google login uses PKCE and returns to the requested page', async ({ page }) => {
  await mockCloud(page, false)
  await page.goto('/upload')
  await page.getByRole('button', { name: 'Sign in to continue' }).click()
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page).toHaveURL(/\/auth\/v1\/authorize/)
  const authorization = new URL(page.url())
  expect(authorization.searchParams.get('provider')).toBe('google')
  expect(authorization.searchParams.get('code_challenge_method')).toBe('s256')
  expect(authorization.searchParams.get('code_challenge')).toBeTruthy()
  const callback = new URL(authorization.searchParams.get('redirect_to')!)
  callback.searchParams.set('code', 'mock-authorization-code')
  let exchanges = 0
  page.on('request', (request) => {
    if (request.url().includes('/auth/v1/token')) exchanges++
  })
  await page.goto(callback.toString())
  await expect(page).toHaveURL('/upload')
  await expect(page.locator('.prompt-form')).toBeVisible()
  expect(exchanges).toBe(1)
  await page.getByRole('button', { name: 'Open account' }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.locator('.prompt-form')).toHaveCount(0)
  await expect(page.locator('.prompt-card')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Sign in to continue' })).toBeVisible()
})

test('cancelled login shows a translated recoverable error and never saves local prompts', async ({
  page,
}) => {
  await mockCloud(page, false)
  await page.goto('/')
  await page.getByRole('button', { name: '切换为中文' }).click()
  await page.goto('/auth/callback?error=access_denied&next=//evil.example')
  await expect(page.getByRole('alert')).toHaveText('Google 登录已取消，请重试。')
  await expect(page).toHaveURL('/auth/callback')
  await page.getByRole('button', { name: '重试' }).click()
  await expect(page.getByRole('button', { name: '使用 Google 登录' })).toBeEnabled()
  expect(await page.evaluate(async () => (await indexedDB.databases()).length)).toBe(0)
})
