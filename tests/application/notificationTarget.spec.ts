import { describe, expect, it } from 'vitest'
import { consumeNotificationTarget } from '@/application/notificationTarget'

describe('notification launch targets', () => {
  it.each(['friends', 'game'] as const)('consumes a %s launch exactly once', (kind) => {
    const url = new URL(`https://theshotcaller.online/?notification=${kind}`)
    expect(consumeNotificationTarget(url)).toEqual({ kind })
    expect(consumeNotificationTarget(url)).toBeNull()
  })

  it('decodes the friend without changing sign-in or launch parameters', () => {
    const url = new URL(
      'https://theshotcaller.online/?notification=chat&notificationFriend=a%26b&code=auth&source=pwa#token',
    )

    expect(consumeNotificationTarget(url)).toEqual({
      kind: 'chat',
      friendId: 'a&b',
    })

    expect(url.href).toBe('https://theshotcaller.online/?code=auth&source=pwa#token')
  })

  it.each(['chat', 'unknown', 'chat&notificationFriend='])('discards invalid targets: %s', (query) => {
    const url = new URL(`https://theshotcaller.online/?notification=${query}&source=pwa`)
    expect(consumeNotificationTarget(url)).toBeNull()
    expect(url.search).toBe('?source=pwa')
  })

  it('leaves an ordinary launch untouched', () => {
    const url = new URL('https://theshotcaller.online/?code=a%20b#token')
    expect(consumeNotificationTarget(url)).toBeNull()
    expect(url.href).toBe('https://theshotcaller.online/?code=a%20b#token')
  })
})
