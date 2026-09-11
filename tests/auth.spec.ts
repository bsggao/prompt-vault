import { test, expect, type Page } from '@playwright/test'
import { mockCloud } from './fixtures'

async function openLogin(page: Page) {
  await mockCloud(page, false)
  await page.goto('/upload')
  await page.getByRole('button', { name: 'Sign in to continue' }).click()
}

test('password login remembers the session in a new tab and sign-out clears access', async ({
  page,
  context,
}) => {
  await openLogin(page)
  let codesSent = 0
  page.on('request', (request) => {
    if (/\/auth\/v1\/(otp|signup|recover)/.test(request.url())) codesSent++
  })
  await page.getByLabel('Email', { exact: true }).fill('creator@example.test')
  await page.getByLabel('Password', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Invalid login credentials')
  await expect(page.locator('.prompt-form')).toHaveCount(0)
  await page.getByLabel('Password', { exact: true }).fill('Test-password-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('.prompt-form')).toBeVisible()
  expect(codesSent).toBe(0)
  expect(await page.evaluate(() => !!localStorage.getItem('promptvault-auth'))).toBe(true)
  const next = await context.newPage()
  await mockCloud(next, false)
  await page.close()
  await next.goto('/upload')
  await expect(next.locator('.prompt-form')).toBeVisible()
  await next.getByRole('button', { name: 'Open account' }).click()
  await next.getByRole('button', { name: 'Sign out', exact: true }).click()
  await next.reload()
  await expect(next.getByRole('button', { name: 'Sign in to continue' })).toBeVisible()
  expect(
    await next.evaluate(
      () => localStorage.getItem('promptvault-auth') ?? sessionStorage.getItem('promptvault-auth'),
    ),
  ).toBeNull()
  expect(await next.evaluate(async () => (await indexedDB.databases()).length)).toBe(0)
})

test('unchecked remember-me keeps the login in this tab only', async ({ page, context }) => {
  await openLogin(page)
  await page.getByLabel('Email', { exact: true }).fill('creator@example.test')
  await page.getByLabel('Password', { exact: true }).fill('Test-password-123')
  await page.getByLabel('Remember me').uncheck()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('.prompt-form')).toBeVisible()
  await page.reload()
  await expect(page.locator('.prompt-form')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('promptvault-auth'))).toBeNull()
  const next = await context.newPage()
  await mockCloud(next, false)
  await next.goto('/upload')
  await expect(next.getByRole('button', { name: 'Sign in to continue' })).toBeVisible()
})

test('registration verifies email before granting access and supports resend', async ({ page }) => {
  await openLogin(page)
  await page.clock.install()
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await page.getByLabel('Email', { exact: true }).fill('creator@example.test')
  await page.getByLabel('Password', { exact: true }).fill('Test-password-123')
  const sent = page.waitForRequest('**/auth/v1/signup')
  await page.getByRole('button', { name: 'Send verification code' }).click()
  expect((await sent).postDataJSON()).toMatchObject({
    email: 'creator@example.test',
    password: 'Test-password-123',
  })
  await expect(page.getByLabel('Verification code', { exact: true })).toBeFocused()
  await expect(page.getByRole('button', { name: /Resend in/ })).toBeDisabled()
  await expect(page.locator('.prompt-form')).toHaveCount(0)
  await page.clock.fastForward(61_000)
  const resent = page.waitForRequest('**/auth/v1/resend')
  await page.getByRole('button', { name: 'Resend code', exact: true }).click()
  expect((await resent).postDataJSON()).toMatchObject({
    email: 'creator@example.test',
    type: 'signup',
  })
  await page.getByLabel('Verification code', { exact: true }).fill('000000')
  await page.getByRole('button', { name: 'Verify and create account' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'The code is invalid or has expired. Please request a new code.',
  )
  await expect(page.locator('.prompt-form')).toHaveCount(0)
  await page.getByLabel('Verification code', { exact: true }).fill('123456')
  const verified = page.waitForRequest('**/auth/v1/verify')
  await page.getByRole('button', { name: 'Verify and create account' }).click()
  expect((await verified).postDataJSON()).toMatchObject({ token: '123456', type: 'signup' })
  await expect(page.locator('.prompt-form')).toBeVisible()
})

test('password recovery verifies a code and saves the new password before login', async ({
  page,
}) => {
  await openLogin(page)
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await page.getByLabel('Email', { exact: true }).fill('creator@example.test')
  const sent = page.waitForRequest('**/auth/v1/recover')
  await page.getByRole('button', { name: 'Send verification code' }).click()
  expect((await sent).postDataJSON().email).toBe('creator@example.test')
  await page.getByLabel('New password').fill('New-password-456')
  await page.getByLabel('Verification code', { exact: true }).fill('123456')
  const updated = page.waitForRequest(
    (request) => request.url().endsWith('/auth/v1/user') && request.method() === 'PUT',
  )
  await page.getByRole('button', { name: 'Reset password and sign in' }).click()
  expect((await updated).postDataJSON().password).toBe('New-password-456')
  await expect(page.locator('.prompt-form')).toBeVisible()
})

test('Chinese mobile forms support password visibility, switching and delivery failure', async ({
  page,
}) => {
  await mockCloud(page, false)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: '切换为中文' }).click()
  await page.getByRole('button', { name: '登录后继续' }).click()
  await page.getByLabel('邮箱', { exact: true }).fill('creator@example.test')
  await page.getByLabel('密码', { exact: true }).fill('Test-password-123')
  await page.getByRole('button', { name: '显示密码' }).click()
  await expect(page.getByLabel('密码', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: '隐藏密码' }).click()
  await page.screenshot({ path: 'artifacts/password-login-mobile.png' })
  await page.getByRole('button', { name: '创建账户', exact: true }).click()
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue('creator@example.test')
  await page.getByLabel('密码', { exact: true }).fill('Test-password-123')
  await page.screenshot({ path: 'artifacts/registration-mobile.png' })
  await page.route('**/auth/v1/signup', (route) =>
    route.fulfill({
      status: 429,
      headers: {
        'x-supabase-api-version': '2024-01-01',
        'access-control-expose-headers': 'x-supabase-api-version',
      },
      json: { code: 'over_email_send_rate_limit', msg: 'Email rate limit exceeded' },
    }),
  )
  await page.getByRole('button', { name: '发送验证码', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('请求过于频繁，请稍后再试。')
  await expect(page.getByLabel('邮箱验证码')).toHaveCount(0)
  await page.getByRole('button', { name: '直接登录' }).click()
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'artifacts/password-login-desktop.png' })
})
