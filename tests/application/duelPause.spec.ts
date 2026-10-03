import { describe, expect, it } from 'vitest'
import { cooldownLeft, pauseEndsIn, pausesLeft, resumeLeft } from '@/application/social/duelPause'
import { NO_PAUSE } from '@/application/social/duels'

const second = 1000

describe('duel pause', () => {
  it('allows each coach two pauses', () => {
    const pause = {
      ...NO_PAUSE,
      used: [2, 1] as const,
    }

    expect(pausesLeft(pause, 0)).toBe(0)
    expect(pausesLeft(pause, 1)).toBe(1)
  })

  it('keeps 90 seconds between two pauses by the same coach', () => {
    expect(cooldownLeft(null, 0)).toBe(0)
    expect(cooldownLeft(0, 30 * second)).toBe(60)
    expect(cooldownLeft(0, 90 * second)).toBe(0)
  })

  it('lets the coach who paused resume at once and the other after 10 seconds', () => {
    expect(resumeLeft(0, 2 * second, true)).toBe(0)
    expect(resumeLeft(0, 2 * second, false)).toBe(8)
    expect(resumeLeft(0, 10 * second, false)).toBe(0)
  })

  it('ends a pause on its own after a minute', () => {
    expect(pauseEndsIn(0, 15 * second)).toBe(45)
    expect(pauseEndsIn(0, 75 * second)).toBe(0)
  })
})
