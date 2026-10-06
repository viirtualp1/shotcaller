import { describe, expect, it } from 'vitest'
import { blendLens, clampLens, frameLens, IDENTITY_LENS, MAX_ZOOM, zoomLens } from '@/rendering/lens'

/** A 400 × 400 map area centred at (200, 200), with the fitted map filling it exactly. */
const area = {
  width: 400,
  height: 400,
  centerX: 200,
  centerY: 200,
}

const map = {
  x: 0,
  y: 0,
  width: 400,
  height: 400,
}

describe('touch camera lens', () => {
  it('returns to the fitted map at the smallest zoom', () => {
    expect(
      clampLens(
        {
          x: 120,
          y: -80,
          scale: 0.5,
        },
        area,
        map,
      ),
    ).toEqual(IDENTITY_LENS)
  })

  it('keeps the map edge from coming inside the area when zoomed', () => {
    const lens = clampLens(
      {
        x: 300,
        y: -900,
        scale: 2,
      },
      area,
      map,
    )

    /* At ×2 the map spans 800 px: its left edge may reach the area's left edge, its bottom the area's bottom. */
    expect(lens).toEqual({
      x: 0,
      y: -400,
      scale: 2,
    })
  })

  it('zooms around the fingers and stops at the closest zoom', () => {
    const zoomed = zoomLens(IDENTITY_LENS, 2, 100, 100)
    expect(zoomed).toEqual({
      x: -100,
      y: -100,
      scale: 2,
    })

    expect(zoomLens(zoomed, 10, 100, 100).scale).toBe(MAX_ZOOM)
  })

  it('frames a fight within the follow range', () => {
    const close = frameLens(
      {
        x: 90,
        y: 90,
        width: 20,
        height: 20,
      },
      area,
      40,
      1.4,
      2.4,
    )

    expect(close.scale).toBe(2.4)
    expect(close.x + close.scale * 100).toBeCloseTo(area.centerX)

    const spread = frameLens(map, area, 40, 1.4, 2.4)
    expect(spread.scale).toBe(1.4)
  })

  it('eases part of the way towards the target', () => {
    expect(
      blendLens(
        IDENTITY_LENS,
        {
          x: -100,
          y: -50,
          scale: 2,
        },
        0.5,
      ),
    ).toEqual({
      x: -50,
      y: -25,
      scale: 1.5,
    })
  })
})
