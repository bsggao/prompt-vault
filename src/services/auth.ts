import { z } from 'zod'
import { createRecoveryClient, requireSupabase } from '../lib/supabase'
import { setRememberMe } from '../lib/auth-storage'

function normalizeEmail(email: string) {
  const value = email.trim().toLowerCase()
  if (!z.email().safeParse(value).success) throw new Error('Please enter a valid email address.')
  return value
}
function validatePassword(password: string) {
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
}
function normalizeCode(code: string) {
  const token = code.trim()
  if (!/^\d{6,10}$/.test(token))
    throw new Error('Please enter the verification code from your email.')
  return token
}

export async function signInWithPassword(email: string, password: string, remember: boolean) {
  const address = normalizeEmail(email)
  if (!password) throw new Error('Please enter your password.')
  setRememberMe(remember)
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email: address,
    password,
  })
  if (error) throw error
  if (!data.session) throw new Error('Sign-in could not be completed. Please try again.')
}

export async function sendRegistrationCode(email: string, password: string) {
  const address = normalizeEmail(email)
  validatePassword(password)
  const client = requireSupabase()
  const { data, error } = await client.auth.signUp({ email: address, password })
  if (error) throw error
  if (data.session) {
    await client.auth.signOut({ scope: 'local' })
    throw new Error('Please enable email confirmation in the project settings.')
  }
  return address
}

export async function resendRegistrationCode(email: string) {
  const { error } = await requireSupabase().auth.resend({
    type: 'signup',
    email: normalizeEmail(email),
  })
  if (error) throw error
}

export async function verifyRegistrationCode(email: string, code: string, remember: boolean) {
  const address = normalizeEmail(email)
  const token = normalizeCode(code)
  setRememberMe(remember)
  const { data, error } = await requireSupabase().auth.verifyOtp({
    email: address,
    token,
    type: 'signup',
  })
  if (error) throw error
  if (!data.session) throw new Error('Sign-in could not be completed. Please try again.')
}

export async function sendRecoveryCode(email: string) {
  const address = normalizeEmail(email)
  const { error } = await requireSupabase().auth.resetPasswordForEmail(address)
  if (error) throw error
  return address
}

export async function resetPassword(
  email: string,
  code: string,
  password: string,
  remember: boolean,
) {
  const address = normalizeEmail(email)
  const token = normalizeCode(code)
  validatePassword(password)
  const recovery = createRecoveryClient()
  const { data, error } = await recovery.auth.verifyOtp({ email: address, token, type: 'recovery' })
  if (error) throw error
  if (!data.session) throw new Error('Sign-in could not be completed. Please try again.')
  const { error: updateError } = await recovery.auth.updateUser({ password })
  if (updateError) throw updateError
  setRememberMe(remember)
  const { error: sessionError } = await requireSupabase().auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
  if (sessionError) throw sessionError
}

export function authErrorMessage(cause: unknown) {
  const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined
  switch (code) {
    case 'invalid_credentials':
      return 'Invalid login credentials'
    case 'email_not_confirmed':
      return 'Email not confirmed'
    case 'otp_expired':
      return 'The code is invalid or has expired. Please request a new code.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many requests. Please wait before trying again.'
    case 'email_address_invalid':
      return 'Please enter a valid email address.'
    case 'email_provider_disabled':
    case 'otp_disabled':
      return 'Email sign-in is not enabled. Please contact the site administrator.'
    case 'signup_disabled':
      return 'New accounts are not enabled. Please contact the site administrator.'
    case 'email_address_not_authorized':
      return 'Unable to send email. Please check the project email configuration.'
    case 'weak_password':
      return 'Choose a stronger password with letters, numbers and symbols.'
    case 'same_password':
      return 'Choose a password different from your current password.'
    default:
      return cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.'
  }
}
