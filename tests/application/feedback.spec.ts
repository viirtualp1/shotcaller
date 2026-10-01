import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SupabaseCloud } from '@/application/cloud/SupabaseCloud'
import { feedbackFailure, type Feedback } from '@/application/feedback'

const client = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    signInAnonymously: vi.fn(),
  },
  rpc: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: () => client }))

const request: Feedback = {
  id: '50000000-0000-4000-8000-000000000001',
  kind: 'bug',
  subject: ' Cloud save ',
  message: ' Saving fails after a long match. ',
  email: '',
  locale: 'en',
  version: '8.6.2',
}

const connect = () =>
  SupabaseCloud.connect({
    url: 'https://example.supabase.co',
    key: 'public',
    google: false,
  })

beforeEach(() => {
  vi.resetAllMocks()

  client.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  })

  client.auth.signInAnonymously.mockResolvedValue({
    data: {
      user: {
        id: 'guest',
        is_anonymous: true,
      },
    },
    error: null,
  })

  client.rpc.mockResolvedValue({ error: null })
})

describe('support feedback', () => {
  it('allows guests and sends only deliberately submitted fields', async () => {
    const cloud = await connect()
    await cloud.sendFeedback(request)
    expect(client.auth.signInAnonymously).toHaveBeenCalledOnce()

    expect(client.rpc).toHaveBeenCalledExactlyOnceWith('submit_feedback', {
      request_id: request.id,
      category: 'bug',
      subject: 'Cloud save',
      message: 'Saving fails after a long match.',
      reply_email: null,
      game_version: '8.6.2',
      language: 'en',
    })
  })

  it('validates the draft before creating a guest or making a request', async () => {
    const cloud = await connect()
    await expect(
      cloud.sendFeedback({
        ...request,
        message: 'short',
      }),
    ).rejects.toThrow()

    await expect(
      cloud.sendFeedback({
        ...request,
        email: 'invalid',
      }),
    ).rejects.toThrow()

    expect(client.auth.getSession).not.toHaveBeenCalled()
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('keeps a signed-in session and reports rejected submissions rather than success', async () => {
    client.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'registered',
            email: 'private@example.test',
          },
        },
      },
      error: null,
    })

    const error = {
      message: 'feedback_rate_limit',
      code: 'P0001',
    }

    client.rpc.mockResolvedValue({ error })
    const cloud = await connect()
    await expect(cloud.sendFeedback(request)).rejects.toEqual(error)
    expect(client.auth.signInAnonymously).not.toHaveBeenCalled()
    expect(feedbackFailure(error)).toBe('rateLimit')
    expect(client.rpc.mock.calls[0]![1].reply_email).toBeNull()
  })
})
