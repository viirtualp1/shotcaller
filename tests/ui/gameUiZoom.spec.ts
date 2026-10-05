import { describe, expect, it } from 'vitest'
import { gameUiZoom } from '@/ui/composables/useGameUiZoom'

describe('match interface zoom', () => {
  it('keeps 110% up to a 1080p window, and 100% on a short one so the side panels fit', () => {
    expect(gameUiZoom(1600, 900)).toBe(1.1)
    expect(gameUiZoom(1920, 1080)).toBe(1.1)
    expect(gameUiZoom(1280, 800)).toBe(1)
    expect(gameUiZoom(1366, 768)).toBe(1)
  })

  it('grows with a bigger window, up to the menus’ 150%', () => {
    expect(gameUiZoom(2560, 1440)).toBe(1.47)
    expect(gameUiZoom(3840, 2160)).toBe(1.5)
  })

  it('follows the narrower side, so a tall window does not crowd the board', () => {
    expect(gameUiZoom(1200, 1440)).toBe(1.1)
    expect(gameUiZoom(2560, 1080)).toBe(1.1)
  })
})
