import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchReleaseVersion } from '@/application/releaseVersion'

afterEach(() => vi.unstubAllGlobals())

describe('published release version', () => {
  it('reads the published version independently of the HTTP cache', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '9.6.0' }),
    })

    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal

    expect(await fetchReleaseVersion(signal)).toBe('9.6.0')

    expect(fetch).toHaveBeenCalledExactlyOnceWith('/release.json', {
      cache: 'no-store',
      signal,
    })
  })

  it.each([null, {}, { version: 10 }, { version: 'new' }, { version: '9.6.0<script>' }])(
    'treats an invalid release response as unknown: %j',
    async (release) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => release,
        }),
      )

      expect(await fetchReleaseVersion()).toBeNull()
    },
  )

  it('handles missing metadata, offline requests and a response containing HTML', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new TypeError('Offline'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => JSON.parse('<html>'),
      })

    vi.stubGlobal('fetch', fetch)

    expect(await fetchReleaseVersion()).toBeNull()
    expect(await fetchReleaseVersion()).toBeNull()
    expect(await fetchReleaseVersion()).toBeNull()
  })
})
