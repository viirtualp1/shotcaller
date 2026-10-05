/** The Vite mode of the desktop build, the bundle Electron packages for Steam. */
export const DESKTOP_MODE = 'desktop'

/** The desktop build is a bundle of its own, so this never changes while the game runs. */
export const IN_DESKTOP = import.meta.env.MODE === DESKTOP_MODE

/** Email links cannot open the desktop app, so they lead to the web game; the code in the same email signs it in. */
export const WEB_GAME_URL = 'https://theshotcaller.online/'
