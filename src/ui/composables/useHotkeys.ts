import { onKeyStroke } from '@vueuse/core'

const isTyping = (e: KeyboardEvent) =>
  e.target instanceof HTMLElement && Boolean(e.target.closest('input, textarea, [contenteditable="true"]'))

export interface Hotkeys {
  readonly reroll: () => void
  readonly buyXp: () => void
  readonly fight: () => void
  readonly sell: () => void
  readonly cancel: () => void
}

/** Matches physical keys so the shortcuts work on a Russian keyboard layout as well. */
export function useHotkeys({ reroll, buyXp, fight, sell, cancel }: Hotkeys): void {
  const bind = (code: string, action: () => void, skipOnButtons = false) =>
    onKeyStroke(
      (e) => e.code === code,
      (e) => {
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return
        if (skipOnButtons && e.target instanceof HTMLElement && e.target.closest('button')) return
        if (document.querySelector('[role="dialog"], .driver-popover')) return
        e.preventDefault()
        action()
      },
    )
  bind('KeyD', reroll)
  bind('KeyF', buyXp)
  bind('KeyE', sell)
  bind('Escape', cancel)
  bind('Space', fight, true)
}
