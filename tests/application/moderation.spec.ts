import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '@/application/cloud/database'
import { SupabaseChat } from '@/application/cloud/SupabaseChat'
import { SupabaseFriends } from '@/application/cloud/SupabaseFriends'
import { ChatError } from '@/application/social/chat'

const FRIEND = '22222222-2222-4222-8222-222222222222'

function clientAnswering(error: { code: string } | null) {
  return {
    rpc: vi.fn(async () => ({
      data: null,
      error,
    })),
  } as unknown as SupabaseClient<Database>
}

describe('sanctions from moderation', () => {
  it('sends a report, and tells a coach who lost the right to report apart from a failure', async () => {
    await expect(
      new SupabaseFriends(clientAnswering(null), 'owner').report(FRIEND, 'abuse', ''),
    ).resolves.toBe('sent')

    await expect(
      new SupabaseFriends(clientAnswering({ code: 'P0403' }), 'owner').report(FRIEND, 'abuse', ''),
    ).resolves.toBe('restricted')

    await expect(
      new SupabaseFriends(clientAnswering({ code: 'P0001' }), 'owner').report(FRIEND, 'abuse', ''),
    ).rejects.toBeTruthy()
  })

  it('reads a muted chat as its own failure', async () => {
    const sending = new SupabaseChat(clientAnswering({ code: 'P0403' }), 'owner').send(FRIEND, 'hi')

    await expect(sending).rejects.toBeInstanceOf(ChatError)
    await expect(sending).rejects.toMatchObject({ reason: 'muted' })
  })
})
