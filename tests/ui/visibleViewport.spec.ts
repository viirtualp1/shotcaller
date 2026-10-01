import { effectScope, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useVisibleViewport } from '@/ui/composables/useVisibleViewport'

afterEach(() => vi.unstubAllGlobals())

describe('visible viewport for floating windows', () => {
  it('follows keyboard resize and viewport panning, restores position, and removes listeners', async () => {
    const viewport = Object.assign(new EventTarget(), {
      height: 844,
      offsetTop: 0,
    })

    const window = Object.assign(new EventTarget(), {
      innerHeight: 844,
      visualViewport: viewport,
    })

    vi.stubGlobal('window', window)
    const scope = effectScope()
    const visible = scope.run(useVisibleViewport)!
    await nextTick()

    expect(visible.style.value).toEqual({
      '--visible-height': '844px',
      '--visible-bottom': '0px',
    })

    viewport.height = 460
    viewport.dispatchEvent(new Event('resize'))

    expect(visible.style.value).toEqual({
      '--visible-height': '460px',
      '--visible-bottom': '384px',
    })

    viewport.offsetTop = 80
    viewport.dispatchEvent(new Event('scroll'))
    expect(visible.style.value['--visible-bottom']).toBe('304px')

    viewport.height = 844
    viewport.offsetTop = 0
    viewport.dispatchEvent(new Event('resize'))
    expect(visible.style.value['--visible-bottom']).toBe('0px')

    scope.stop()
    viewport.height = 400
    viewport.dispatchEvent(new Event('resize'))
    expect(visible.style.value['--visible-height']).toBe('844px')
  })

  it('keeps CSS viewport fallback when VisualViewport is unavailable', () => {
    vi.stubGlobal('window', undefined)
    const scope = effectScope()
    const visible = scope.run(useVisibleViewport)!
    expect(visible.style.value).toEqual({})
    scope.stop()
  })
})
