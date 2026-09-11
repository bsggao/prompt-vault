import { test as base, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { seedPrompts } from '../src/data/prompts'

export const testUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'creator@example.test',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'google', providers: ['google'] },
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

export async function mockCloud(page: Page, authenticated = true) {
  await page.addInitScript(
    ({ authenticated, value }) => {
      if (!sessionStorage.getItem('mock-auth-initialized')) {
        if (authenticated) sessionStorage.setItem('promptvault-auth', JSON.stringify(value))
        sessionStorage.setItem('mock-auth-initialized', 'true')
      }
    },
    { authenticated, value: session() },
  )
  let rows = seedPrompts.map((p) => ({
    id: p.id,
    user_id: testUser.id,
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
    is_public: p.isPublic,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }))
  const images = new Map<string, { bytes: Buffer; contentType: string }>()
  await page.route('https://promptvault-test.supabase.co/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = decodeURIComponent(url.pathname)
    const method = request.method()
    const json = (value: unknown, status = 200) => route.fulfill({ status, json: value })
    if (method === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      })
    if (pathname === '/auth/v1/user') return json(testUser)
    if (pathname === '/auth/v1/logout') return json({})
    if (pathname === '/auth/v1/token') return json(session())
    if (pathname === '/auth/v1/authorize')
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<h1>Mock Google authorization</h1>',
      })
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
        request
          .postDataJSON()
          .paths.map((path: string) => ({
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
