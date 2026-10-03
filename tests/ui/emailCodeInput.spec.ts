import { describe, expect, it } from 'vitest'
import { emailCodeDigits, isCompleteEmailCode } from '@/ui/components/common/emailCodeInput'

describe('email code input', () => {
  it('preserves leading zeroes and strips formatting copied from an email', () => {
    expect(emailCodeDigits(' 012\u00a0345\n')).toBe('012345')
    expect(emailCodeDigits('Your code: 012-345')).toBe('012345')
    expect(emailCodeDigits('abc')).toBe('')
  })

  it('accepts full-width, Arabic and Persian keyboard digits', () => {
    expect(emailCodeDigits('０１２３４５')).toBe('012345')
    expect(emailCodeDigits('٠١٢٣٤٥')).toBe('012345')
    expect(emailCodeDigits('۰۱۲۳۴۵')).toBe('012345')
  })

  it('accepts every supported code length without submitting incomplete or malformed codes', () => {
    for (let length = 6; length <= 10; length++) {
      expect(isCompleteEmailCode('0'.repeat(length))).toBe(true)
    }

    for (const code of ['', '01234', '01234567890', '012 345', 'abcdef', '１２３４５６']) {
      expect(isCompleteEmailCode(code)).toBe(false)
    }
  })
})
