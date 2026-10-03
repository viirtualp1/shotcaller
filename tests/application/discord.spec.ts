import { describe, expect, it } from 'vitest'
import { isDiscordActivity } from '@/application/discord'

describe('Discord Activity', () => {
  it('recognises the launch parameters Discord adds', () => {
    expect(isDiscordActivity('?instance_id=i-1&frame_id=f-1&platform=desktop')).toBe(true)
  })

  it('treats a regular visit as the website', () => {
    expect(isDiscordActivity('')).toBe(false)
    expect(isDiscordActivity('?frame_id=f-1')).toBe(false)
  })
})
