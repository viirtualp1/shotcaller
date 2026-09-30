import { describe, expect, it } from 'vitest'
import { boardResolution } from '@/rendering/quality'

describe('board canvas resolution', () => {
  it('keeps ordinary screens at their native scale and limits high DPI', () => {
    expect(boardResolution(1280, 720, 1)).toBe(1)
    expect(boardResolution(390, 844, 3)).toBe(2)
  })

  it('bounds tablet backing pixels without changing the CSS size', () => {
    const resolution = boardResolution(1024, 768, 3)
    expect(resolution).toBeGreaterThan(1)
    expect(1024 * 768 * resolution ** 2).toBeCloseTo(2_000_000)
  })

  it('never adds oversampling to a native 4K canvas', () => {
    expect(boardResolution(3840, 2160, 2)).toBe(1)
  })
})
