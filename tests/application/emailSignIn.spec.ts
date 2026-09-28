import { describe, expect, it } from 'vitest'
import type { AccountMode } from '@/application/cloud/CloudStore'
import { sendEmailCode, type EmailAuth } from '@/application/cloud/emailSignIn'

function fakeAuth(known: readonly string[], failure?: Error) {
  const sent: [string, AccountMode][] = []
  let guests = 0

  const auth: EmailAuth = {
    ensureAccount: async () => {
      guests++

      return {
        id: 'guest',
        anonymous: true,
        email: null,
        photo: null,
      }
    },
    sendEmail: async (email, mode) => {
      if (failure) {
        throw failure
      }

      if (mode === 'signIn' && !known.includes(email)) {
        throw Object.assign(new Error('Signups not allowed for otp'), {
          status: 422,
          code: 'otp_disabled',
        })
      }

      sent.push([email, mode])
    },
  }

  return {
    auth,
    sent,
    guests: () => guests,
  }
}

describe('sendEmailCode', () => {
  it('signs in to a coach the address already belongs to', async () => {
    const { auth, sent, guests } = fakeAuth(['coach@test.dev'])
    expect(await sendEmailCode(auth, 'coach@test.dev')).toBe('signIn')
    expect(sent).toEqual([['coach@test.dev', 'signIn']])
    expect(guests()).toBe(0)
  })

  it('signs a new address up by linking it to this device’s progress', async () => {
    const { auth, sent, guests } = fakeAuth([])
    expect(await sendEmailCode(auth, 'new@test.dev')).toBe('link')
    expect(sent).toEqual([['new@test.dev', 'link']])
    expect(guests()).toBe(1)
  })

  it('passes other problems through', async () => {
    const limited = Object.assign(new Error('rate limit'), { status: 429 })
    const { auth } = fakeAuth([], limited)
    await expect(sendEmailCode(auth, 'coach@test.dev')).rejects.toBe(limited)
  })
})
