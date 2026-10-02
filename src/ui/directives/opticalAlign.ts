import type { Directive } from 'vue'

let context: CanvasRenderingContext2D | null = null
const observers = new WeakMap<HTMLElement, ResizeObserver>()

/** Aligns visible glyphs rather than the empty space inside a font's text box. */
function align(el: HTMLElement, centered = false) {
  context ??= document.createElement('canvas').getContext('2d')

  if (!context) {
    return
  }

  const style = getComputedStyle(el)
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`

  const { width, actualBoundingBoxLeft, actualBoundingBoxRight } = context.measureText(
    el.textContent?.trim() ?? '',
  )

  if (centered) {
    el.style.translate = `${(width + actualBoundingBoxLeft - actualBoundingBoxRight) / 2}px 0`

    return
  }

  el.style.marginLeft = `${Math.min(0, actualBoundingBoxLeft)}px`
}

/**
 * For hand-lettered titles: letters such as V start well right of where the line does. Measured per text,
 * and again once the web font has loaded. `:center` balances both glyph bearings
 * for centered labels and follows responsive font-size changes.
 */
export const vOpticalAlign: Directive<HTMLElement> = {
  mounted(el, binding) {
    const centered = binding.arg === 'center'
    const update = () => align(el, centered)
    update()

    if (centered) {
      const observer = new ResizeObserver(update)
      observer.observe(el)
      observers.set(el, observer)
    }

    void document.fonts.ready.then(update)
  },
  updated(el, binding) {
    align(el, binding.arg === 'center')
  },
  unmounted(el) {
    observers.get(el)?.disconnect()
    observers.delete(el)
  },
}
