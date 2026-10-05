/** How the game window opens. A game starts fullscreen until the player picks a window with F11 or Alt+Enter. */
export interface WindowState {
  readonly fullscreen: boolean
}

export const DEFAULT_WINDOW_STATE: WindowState = { fullscreen: true }

/** The saved state, or the default when the file is missing or was written by hand. */
export function readWindowState(text: string | null): WindowState {
  if (text === null) {
    return DEFAULT_WINDOW_STATE
  }

  try {
    const saved: unknown = JSON.parse(text)

    if (
      typeof saved === 'object' &&
      saved !== null &&
      'fullscreen' in saved &&
      typeof saved.fullscreen === 'boolean'
    ) {
      return { fullscreen: saved.fullscreen }
    }
  } catch {
    /* A damaged file falls back to the default. */
  }

  return DEFAULT_WINDOW_STATE
}

/** F11, as in browsers, and Alt+Enter, as in most Windows games. */
export function isFullscreenToggle(input: { readonly key: string; readonly alt: boolean }) {
  return input.key === 'F11' || (input.key === 'Enter' && input.alt)
}
