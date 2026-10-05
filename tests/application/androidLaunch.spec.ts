import { describe, expect, it } from 'vitest'
import { isAndroidLaunch } from '@/application/android'

describe('Google Play app launch', () => {
  it('is told apart by its start address or its referrer', () => {
    expect(isAndroidLaunch('?source=twa', '')).toBe(true)
    expect(isAndroidLaunch('', 'android-app://online.theshotcaller.game/')).toBe(true)
    expect(isAndroidLaunch('?source=web', 'https://www.google.com/')).toBe(false)
    expect(isAndroidLaunch('', '')).toBe(false)
  })
})
