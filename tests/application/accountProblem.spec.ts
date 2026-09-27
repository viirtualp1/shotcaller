import { describe, expect, it } from 'vitest'
import { accountProblem } from '@/application/cloud/accountProblem'

const authError = (message: string, status?: number, code?: string, name = 'AuthApiError') =>
  Object.assign(new Error(message), {
    name,
    status,
    code,
  })

describe('accountProblem', () => {
  it('explains signing in with an email no coach uses yet', () => {
    expect(accountProblem(authError('Signups not allowed for otp', 422, 'otp_disabled'))).toBe('noAccount')
    expect(accountProblem(authError('Signups not allowed for otp', 422))).toBe('noAccount')
  })

  it('explains linking an email another coach already uses', () => {
    expect(
      accountProblem(
        authError('A user with this email address has already been registered', 422, 'email_exists'),
      ),
    ).toBe('emailTaken')
  })

  it('tells a wrong code, rate limits and a lost connection apart', () => {
    expect(accountProblem(authError('Token has expired or is invalid', 403, 'otp_expired'))).toBe('badCode')
    expect(accountProblem(authError('For security purposes…', 429))).toBe('tooMany')

    expect(accountProblem(authError('Failed to fetch', 0, undefined, 'AuthRetryableFetchError'))).toBe(
      'offline',
    )

    expect(
      accountProblem(authError('Email address not authorized', 400, 'email_address_not_authorized')),
    ).toBe('notAuthorized')
  })

  it('falls back to unknown', () => {
    expect(accountProblem(authError('Something odd', 500, 'unexpected_failure'))).toBe('unknown')
    expect(accountProblem('nope')).toBe('unknown')
  })
})
