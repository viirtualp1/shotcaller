import { describe, expect, it } from 'vitest'
import { formatFriendCode, isFriendCode, normalizeFriendCode } from '@/application/social/friends'

describe('friend codes', () => {
  it('reads codes typed with dashes, spaces or lower case', () => {
    expect(normalizeFriendCode(' abcd-2345 ')).toBe('ABCD2345')
    expect(isFriendCode('abcd 2345')).toBe(true)
  })

  it('rejects look-alike characters and wrong lengths', () => {
    expect(isFriendCode('ABCD-O123')).toBe(false)
    expect(isFriendCode('ABCD-I234')).toBe(false)
    expect(isFriendCode('ABC-2345')).toBe(false)
  })

  it('shows codes in two halves', () => {
    expect(formatFriendCode('ABCD2345')).toBe('ABCD-2345')
  })
})
