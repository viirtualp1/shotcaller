/**
 * The desktop game is served from its own origin instead of a file path. Local saves live in that origin's storage,
 * so the scheme and host must never change once the game ships.
 */
export const APP_SCHEME = 'app'

export const APP_HOST = 'shotcaller'

export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`

/** Links the player's own browser opens: Discord, the web game and mail links. */
const EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

function parse(url: string) {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

/** Only the bundled game may load in the game window. */
export function isAppUrl(url: string) {
  const parsed = parse(url)

  return parsed?.protocol === `${APP_SCHEME}:` && parsed.host === APP_HOST
}

export function isExternalUrl(url: string) {
  const parsed = parse(url)

  return parsed !== null && EXTERNAL_PROTOCOLS.has(parsed.protocol)
}
