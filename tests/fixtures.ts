import { test as base, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { seedPrompts } from '../src/data/prompts'

export const testUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'creator@example.test',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Test Creator' },
  created_at: '2026-01-01T00:00:00Z',
}
function session() {
  const expires = Math.floor(Date.now() / 1000) + 3600
  const payload = Buffer.from(
    JSON.stringify({ sub: testUser.id, exp: expires, aud: 'authenticated', role: 'authenticated' }),
  ).toString('base64url')
  return {
    access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.test-signature`,
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expires,
    user: testUser,
  }
}

export async function mockCloud(
  page: Page,
  authenticated = true,
  adminState: {
    removed?: boolean
    suspended?: boolean
    title?: string
  } = {},
) {
  await page.addInitScript(
    ({ authenticated, value }) => {
      if (!sessionStorage.getItem('mock-auth-initialized')) {
        if (authenticated) sessionStorage.setItem('promptvault-auth', JSON.stringify(value))
        sessionStorage.setItem('mock-auth-initialized', 'true')
      }
    },
    { authenticated, value: session() },
  )
  let rows = seedPrompts.map((p, index) => ({
    id: p.id,
    user_id: index === 1 ? '22222222-2222-4222-8222-222222222222' : testUser.id,
    title: p.title,
    image_url: `${testUser.id}/${p.id}.jpg`,
    prompt: p.prompt,
    negative_prompt: p.negativePrompt,
    category: p.category,
    tags: p.tags,
    model: p.model,
    aspect_ratio: p.aspectRatio,
    source: p.source,
    source_url: p.sourceUrl,
    notes: p.notes,
    is_favorite: p.isFavorite,
    is_public: true,
    moderation_status: adminState.removed && index === 0 ? 'removed' : 'normal',
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }))
  const favoriteIds = new Set(
    seedPrompts.filter((prompt) => prompt.isFavorite).map((prompt) => prompt.id),
  )
  const images = new Map<string, { bytes: Buffer; contentType: string }>()
  await page.route('https://promptvault-test.supabase.co/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = decodeURIComponent(url.pathname)
    const method = request.method()
    const json = (value: unknown, status = 200) =>
      route.fulfill({
        status,
        json: value,
        headers: {
          'x-supabase-api-version': '2024-01-01',
          'access-control-expose-headers': 'x-supabase-api-version',
        },
      })
    if (method === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      })
    if (pathname === '/rest/v1/console_settings')
      return adminState.title
        ? json({ site_title: adminState.title, description: '后台配置的站点简介' })
        : json({ code: 'PGRST205', message: 'Settings not installed yet' }, 404)
    if (pathname === '/rest/v1/rpc/console_can_write') return json(!adminState.suspended)
    if (pathname === '/auth/v1/user') return json(testUser)
    if (pathname === '/auth/v1/logout') return json({})
    if (pathname === '/auth/v1/token') {
      if (
        url.searchParams.get('grant_type') === 'password' &&
        request.postDataJSON().password !== 'Test-password-123'
      )
        return json({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400)
      return json(session())
    }
    if (pathname === '/auth/v1/signup')
      return json({ ...testUser, identities: [{ id: testUser.id }] })
    if (pathname === '/auth/v1/resend' || pathname === '/auth/v1/recover') return json({})
    if (pathname === '/auth/v1/verify') {
      if (request.postDataJSON().token !== '123456')
        return json({ code: 'otp_expired', msg: 'Token has expired or is invalid' }, 403)
      return json(session())
    }
    if (pathname.startsWith('/rest/v1/prompt_favorites')) {
      const promptId = url.searchParams.get('prompt_id')?.replace(/^eq\./, '')
      if (method === 'POST') {
        const body = request.postDataJSON() as { prompt_id: string }
        favoriteIds.add(body.prompt_id)
      }
      if (method === 'DELETE' && promptId) favoriteIds.delete(promptId)
      return json([...favoriteIds].map((prompt_id) => ({ prompt_id })))
    }
    if (pathname.startsWith('/rest/v1/prompts')) {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '')
      let result = rows.filter((row) => !id || row.id === id)
      if (method === 'POST') {
        const row = {
          ...request.postDataJSON(),
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        rows.unshift(row)
        result = [row]
      }
      if (method === 'PATCH') {
        const patch = request.postDataJSON()
        result.forEach((row) => Object.assign(row, patch))
      }
      if (method === 'DELETE') rows = rows.filter((row) => row.id !== id)
      const single = request.headers()['accept']?.includes('vnd.pgrst.object')
      return json(single ? result[0] : result)
    }
    const prefix = '/storage/v1/object/'
    if (pathname === `${prefix}sign/prompt-images` && method === 'POST') {
      return json(
        request.postDataJSON().paths.map((path: string) => ({
          path,
          signedURL: `/object/sign/prompt-images/${path}?token=test`,
          error: null,
        })),
      )
    }
    if (pathname.startsWith(`${prefix}sign/prompt-images/`)) {
      const path = pathname.slice(`${prefix}sign/prompt-images/`.length)
      const uploaded = images.get(path)
      const body = uploaded?.bytes ?? (await readFile(`public/images/${path.split('/').pop()}`))
      return route.fulfill({
        status: 200,
        contentType: uploaded?.contentType ?? 'image/jpeg',
        body,
      })
    }
    if (pathname.startsWith(`${prefix}prompt-images/`) && method === 'POST') {
      const form = await new Request(request.url(), {
        method: 'POST',
        headers: { 'content-type': request.headers()['content-type'] },
        body: request.postDataBuffer()!,
      }).formData()
      const file = [...form.values()].find((value) => typeof value !== 'string') as File
      const path = pathname.slice(`${prefix}prompt-images/`.length)
      images.set(path, { bytes: Buffer.from(await file.arrayBuffer()), contentType: file.type })
      return json({ Key: `prompt-images/${path}` })
    }
    if (pathname === `${prefix}prompt-images` && method === 'DELETE') {
      request.postDataJSON().prefixes.forEach((path: string) => images.delete(path))
      return json([])
    }
    return json({ error: `Unhandled test request ${method} ${pathname}` }, 400)
  })
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await mockCloud(page)
    await use(page)
  },
})
export { expect }
