import { useEventListener, useMediaQuery } from '@vueuse/core'

interface SheetDrag {
  readonly sheet: HTMLElement
  readonly startX: number
  readonly startY: number
  lastY: number
  lastTime: number
  /** Pixels per millisecond, downwards positive. */
  velocity: number
  active: boolean
}

/** A finger moving less than this has not chosen between a scroll and a pull yet. */
const SLOP = 8
/** Pulled down past this share of its height, a sheet closes when let go. */
const CLOSE_SHARE = 0.3
/** A flick this fast closes it however far it went. */
const FLICK_SPEED = 0.5
const SETTLE_MS = 220

/** Somewhere between the finger and the sheet is scrolled away from its top, so a pull down scrolls back first. */
function scrolledAbove(target: Element, sheet: HTMLElement) {
  for (let el: Element | null = target; el; el = el.parentElement) {
    if (el instanceof HTMLElement && el.scrollTop > 0) {
      return true
    }

    if (el === sheet) {
      return false
    }
  }

  return false
}

function settle(sheet: HTMLElement, transform: string) {
  sheet.style.transition = `transform ${SETTLE_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
  sheet.style.transform = transform
}

function release(sheet: HTMLElement) {
  sheet.style.transition = ''
  sheet.style.transform = ''
}

/**
 * Dialogs on a phone are sheets from the bottom edge: pulled down far enough, or flicked, one closes the way Esc closes
 * it, so a dialog that must not be dismissed (a match report, a busy consent form) springs back instead.
 */
export function useSheetSwipe() {
  const phone = useMediaQuery('(max-width: 640px)')
  let drag: SheetDrag | null = null

  function dismiss(sheet: HTMLElement) {
    settle(sheet, 'translateY(100%)')

    setTimeout(() => {
      sheet.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      )

      /* Still open: this dialog keeps itself on screen, so it comes back up. */
      requestAnimationFrame(() => {
        if (sheet.isConnected && sheet.dataset.state === 'open') {
          settle(sheet, '')
          setTimeout(() => release(sheet), SETTLE_MS)
        }
      })
    }, SETTLE_MS)
  }

  useEventListener(
    document,
    'touchstart',
    (e: TouchEvent) => {
      drag = null
      const touch = e.touches[0]
      if (!phone.value || e.touches.length !== 1 || !touch || !(e.target instanceof Element)) {
        return
      }

      const sheet = e.target.closest<HTMLElement>('.sheet[role][data-state="open"]')
      if (!sheet || e.target.closest('input, textarea, select') || scrolledAbove(e.target, sheet)) {
        return
      }

      drag = {
        sheet,
        startX: touch.clientX,
        startY: touch.clientY,
        lastY: touch.clientY,
        lastTime: e.timeStamp,
        velocity: 0,
        active: false,
      }
    },
    { passive: true },
  )

  useEventListener(
    document,
    'touchmove',
    (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!drag || !touch) {
        return
      }

      const dx = touch.clientX - drag.startX
      const dy = touch.clientY - drag.startY

      /* Upwards or sideways belongs to the content: a scroll, a slider, a row of tabs. */
      if (!drag.active) {
        if (Math.hypot(dx, dy) < SLOP) {
          return
        }

        if (dy <= 0 || Math.abs(dx) > dy) {
          drag = null

          return
        }

        drag.active = true
      }

      e.preventDefault()
      /* At least a frame apart, so two events in the same instant do not read as an endless flick. */
      drag.velocity = (touch.clientY - drag.lastY) / Math.max(16, e.timeStamp - drag.lastTime)
      drag.lastY = touch.clientY
      drag.lastTime = e.timeStamp
      drag.sheet.style.transition = 'none'
      drag.sheet.style.transform = `translateY(${Math.max(0, dy)}px)`
    },
    { passive: false },
  )

  const end = () => {
    const current = drag
    drag = null

    if (!current?.active) {
      return
    }

    const pulled = current.lastY - current.startY
    if (pulled > current.sheet.offsetHeight * CLOSE_SHARE || current.velocity > FLICK_SPEED) {
      dismiss(current.sheet)

      return
    }

    settle(current.sheet, '')
    setTimeout(() => release(current.sheet), SETTLE_MS)
  }

  useEventListener(document, 'touchend', end, { passive: true })
  useEventListener(document, 'touchcancel', end, { passive: true })
}
