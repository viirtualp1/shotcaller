import { isRef } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@/ui/i18n'

const initialLocale = i18n.global.locale.value

afterEach(() => {
  i18n.global.locale.value = initialLocale
})

describe('Composition API translations', () => {
  it('uses the composer when the build removes legacy mode', () => {
    expect(isRef(i18n.global.locale)).toBe(true)
    i18n.global.locale.value = 'en'
    expect(i18n.global.t('notifications.messages', { n: 1 }, 1)).toBe('1 new message')
    expect(i18n.global.t('notifications.messages', { n: 2 }, 2)).toBe('2 new messages')
  })

  it('keeps Russian one, few, and many plural forms', () => {
    i18n.global.locale.value = 'ru'
    const translate = (n: number) => i18n.global.t('notifications.messages', { n }, n)
    expect(translate(1)).toBe('1 новое сообщение')
    expect(translate(2)).toBe('2 новых сообщения')
    expect(translate(5)).toBe('5 новых сообщений')
    expect(translate(21)).toBe('21 новое сообщение')
  })
})
