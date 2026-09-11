import { loadEnv } from 'vite'

const env = loadEnv('development', process.cwd(), 'VITE_SUPABASE_')
const url = env.VITE_SUPABASE_URL?.trim()
const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim()
if (!url || !key) {
  console.error(
    'Missing project configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.',
  )
  process.exit(1)
}
try {
  const headers = { apikey: key }
  const settings = await fetch(new URL('/auth/v1/settings', url), {
    headers,
    signal: AbortSignal.timeout(15000),
  })
  if (!settings.ok) throw new Error(`Auth settings check failed (HTTP ${settings.status}).`)
  const auth = await settings.json()
  console.log('Project Auth API: reachable')
  console.log(`Email provider: ${auth.external?.email ? 'enabled' : 'not enabled'}`)
  console.log(
    `Email confirmation: ${auth.mailer_autoconfirm === false ? 'required' : 'not required; enable Confirm email for registration verification'}`,
  )
  const table = await fetch(new URL('/rest/v1/prompts?select=id&limit=0', url), {
    headers,
    signal: AbortSignal.timeout(15000),
  })
  if (!table.ok)
    throw new Error(
      `Prompts table check failed (HTTP ${table.status}). Apply the migration and verify access grants.`,
    )
  console.log('Prompts table: reachable')
  console.log(
    'Real registration and password login are still required to verify delivery, private image uploads and account isolation. Check Confirm signup / Reset password email templates and SMTP in the dashboard.',
  )
  if (!auth.external?.email) process.exitCode = 1
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Connection check failed.')
  process.exitCode = 1
}
