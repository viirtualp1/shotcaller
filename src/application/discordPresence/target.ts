import { IN_DISCORD } from '@/application/discord'

/** Desktop installed app only. A browser tab, a phone and the Discord Activity stay disconnected. */
export function isDesktopApp(input: { inDiscord: boolean; standalone: boolean; phone: boolean }) {
  return input.standalone && !input.inDiscord && !input.phone
}

export function detectDesktopApp() {
  if (typeof window === 'undefined' || IN_DISCORD) {
    return false
  }

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches

  const phone = window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(hover: none)').matches

  return isDesktopApp({
    inDiscord: false,
    standalone,
    phone,
  })
}
