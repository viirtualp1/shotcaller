import { describe, expect, it, vi } from 'vitest'
import { cloudConfig, isSecretKey } from '@/application/cloud/config'

const jwt = (claims: object) => `header.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.signature`

describe('cloud config', () => {
  it('stays local until both the URL and the key are set', () => {
    expect(cloudConfig({})).toBeNull()
    expect(cloudConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull()

    expect(
      cloudConfig({
        VITE_SUPABASE_URL: 'https://x.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
      }),
    ).toEqual({
      url: 'https://x.supabase.co',
      key: 'sb_publishable_abc',
      google: false,
    })
  })

  it('refuses secret keys, which would bypass row level security', () => {
    expect(isSecretKey('sb_secret_abc')).toBe(true)
    expect(isSecretKey(jwt({ role: 'service_role' }))).toBe(true)
    expect(isSecretKey(jwt({ role: 'anon' }))).toBe(false)
    expect(isSecretKey('sb_publishable_abc')).toBe(false)

    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(
      cloudConfig({
        VITE_SUPABASE_URL: 'https://x.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc',
      }),
    ).toBeNull()

    expect(error).toHaveBeenCalledOnce()
    error.mockRestore()
  })

  it('reaches Supabase through the URL mapping inside a Discord Activity', () => {
    expect(
      cloudConfig(
        {
          VITE_SUPABASE_URL: 'https://x.supabase.co',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
          VITE_SUPABASE_GOOGLE: 'true',
        },
        'https://123.discordsays.com',
      ),
    ).toEqual({
      url: 'https://123.discordsays.com/.proxy/supabase',
      key: 'sb_publishable_abc',
      google: false,
    })
  })
})
