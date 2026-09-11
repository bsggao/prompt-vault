import { describe, expect, it, vi, beforeEach } from 'vitest'
const { auth, recovery, remember } = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resend: vi.fn(),
    verifyOtp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    setSession: vi.fn(),
    signOut: vi.fn(),
  },
  recovery: { verifyOtp: vi.fn(), updateUser: vi.fn() },
  remember: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({
  requireSupabase: () => ({ auth }),
  createRecoveryClient: () => ({ auth: recovery }),
}))
vi.mock('../lib/auth-storage', () => ({ setRememberMe: remember }))
import {
  authErrorMessage,
  signInWithPassword,
  sendRegistrationCode,
  resendRegistrationCode,
  verifyRegistrationCode,
  sendRecoveryCode,
  resetPassword,
} from './auth'
const session = { access_token: 'access', refresh_token: 'refresh' }
describe('Email registration and password login', () => {
  beforeEach(() => vi.resetAllMocks())
  it('logs in with a password and remembers the selected persistence without requesting OTP', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null })
    await signInWithPassword(' Creator@Example.test ', 'secret123', true)
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'creator@example.test',
      password: 'secret123',
    })
    expect(remember).toHaveBeenCalledWith(true)
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })
  it('registers with a password, then resends signup confirmation without needing the password again', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
    auth.resend.mockResolvedValue({ error: null })
    expect(await sendRegistrationCode(' Creator@Example.test ', 'secret123')).toBe(
      'creator@example.test',
    )
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'creator@example.test',
      password: 'secret123',
    })
    await resendRegistrationCode('creator@example.test')
    expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'creator@example.test' })
  })
  it('rejects invalid inputs before making network requests', async () => {
    await expect(sendRegistrationCode('bad', 'secret123')).rejects.toThrow('valid email')
    await expect(sendRegistrationCode('creator@example.test', 'short')).rejects.toThrow(
      '8 characters',
    )
    await expect(verifyRegistrationCode('creator@example.test', '12345', true)).rejects.toThrow(
      'verification code',
    )
    expect(auth.signUp).not.toHaveBeenCalled()
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })
  it('requires signup verification to return a session', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { session }, error: null })
    await verifyRegistrationCode('creator@example.test', ' 123456 ', false)
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'creator@example.test',
      token: '123456',
      type: 'signup',
    })
    expect(remember).toHaveBeenCalledWith(false)
    auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: null })
    await expect(verifyRegistrationCode('creator@example.test', '123456', true)).rejects.toThrow(
      'Sign-in could not be completed',
    )
  })
  it('does not establish the main session if recovery password update fails', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    await sendRecoveryCode(' Creator@Example.test ')
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('creator@example.test')
    recovery.verifyOtp.mockResolvedValue({ data: { session }, error: null })
    recovery.updateUser.mockResolvedValue({ error: new Error('password rejected') })
    await expect(
      resetPassword('creator@example.test', '123456', 'new-password', true),
    ).rejects.toThrow('password rejected')
    expect(auth.setSession).not.toHaveBeenCalled()
    recovery.updateUser.mockResolvedValue({ error: null })
    auth.setSession.mockResolvedValue({ error: null })
    await resetPassword('creator@example.test', '123456', 'new-password', true)
    expect(recovery.verifyOtp).toHaveBeenCalledWith({
      email: 'creator@example.test',
      token: '123456',
      type: 'recovery',
    })
    expect(auth.setSession).toHaveBeenCalledWith(session)
  })
  it('rejects auto-confirmed registration and propagates provider errors', async () => {
    auth.signUp.mockResolvedValue({ data: { session }, error: null })
    auth.signOut.mockResolvedValue({ error: null })
    await expect(sendRegistrationCode('creator@example.test', 'secret123')).rejects.toThrow(
      'enable email confirmation',
    )
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error('Invalid login credentials'),
    })
    await expect(signInWithPassword('creator@example.test', 'wrong', false)).rejects.toThrow(
      'Invalid login credentials',
    )
  })
  it('maps provider error codes to translatable messages', () => {
    expect(authErrorMessage({ code: 'otp_expired' })).toBe(
      'The code is invalid or has expired. Please request a new code.',
    )
    expect(authErrorMessage({ code: 'over_email_send_rate_limit' })).toBe(
      'Too many requests. Please wait before trying again.',
    )
  })
})
