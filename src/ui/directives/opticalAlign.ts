import type { Directive } from 'vue'

let context: CanvasRenderingContext2D | null = null

/** Pulls the text left by the blank its first glyph leaves, so it lines up with the text under it. */
function align(el: HTMLElement) {
  context ??= document.createElement('canvas').getContext('2d')

  if (!context) {
    return
  }

  const style = getComputedStyle(el)
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const { actualBoundingBoxLeft } = context.measureText(el.textContent?.trim() ?? '')
  el.style.marginLeft = `${Math.min(0, actualBoundingBoxLeft)}px`
}

/**
 * For hand-lettered titles: letters such as V start well right of where the line does. Measured per text,
 * and again once the web font has loaded.
 */
export const vOpticalAlign: Directive<HTMLElement> = {
  mounted(el) {
    align(el)
    void document.fonts.ready.then(() => align(el))
  },
  updated: align,
}
