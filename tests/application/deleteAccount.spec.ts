import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SupabaseCloud } from '@/application/cloud/SupabaseCloud'

const client = vi.hoisted(() => ({
  rpc: vi.fn(),
  auth: { signOut: vi.fn() },
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: () => client }))

beforeEach(() => {
  vi.clearAllMocks()
  client.rpc.mockResolvedValue({ error: null })
  client.auth.signOut.mockResolvedValue({ error: null })
})

describe('delete account request', () => {
  const connect = () =>
    SupabaseCloud.connect({
      url: 'https://example.test',
      key: 'public',
      google: false,
    })

  it('deletes only the authenticated caller without accepting a client-provided ID', async () => {
    await (await connect()).deleteAccount()
    expect(client.rpc).toHaveBeenCalledWith('delete_account')
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('keeps the local session when the server refuses deletion', async () => {
    client.rpc.mockResolvedValue({ error: new Error('Deletion failed') })
    await expect((await connect()).deleteAccount()).rejects.toThrow('Deletion failed')
    expect(client.auth.signOut).not.toHaveBeenCalled()
  })

  it('treats completed deletion as successful even if logging out cannot reach Auth', async () => {
    client.auth.signOut.mockRejectedValue(new Error('Auth offline'))
    await expect((await connect()).deleteAccount()).resolves.toBeUndefined()
  })
})
