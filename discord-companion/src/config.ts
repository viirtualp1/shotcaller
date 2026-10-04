import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Public Discord application id for The Shotcaller. The Activity uses the same id via
 * `VITE_DISCORD_CLIENT_ID`. It is not a secret; a client secret is never read here.
 */
export const DEFAULT_CLIENT_ID = '1555914530922430464'

const IMAGE_KEY = /^[a-z0-9_-]{1,64}$/i

export function companionRoot() {
  return fileURLToPath(new URL('..', import.meta.url))
}

function clientIdFromEnvFile(file: string) {
  try {
    const match = readFileSync(file, 'utf8').match(/^VITE_DISCORD_CLIENT_ID=(\d+)\s*$/m)

    return match?.[1]
  } catch {
    return undefined
  }
}

function imageKeyFromFile(file: string) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as { largeImageKey?: unknown }

    return typeof parsed.largeImageKey === 'string' && IMAGE_KEY.test(parsed.largeImageKey)
      ? parsed.largeImageKey
      : undefined
  } catch {
    return undefined
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, root = companionRoot()) {
  const fromEnv = env.DISCORD_CLIENT_ID?.trim() || env.VITE_DISCORD_CLIENT_ID?.trim()

  const clientId =
    (fromEnv && /^\d+$/.test(fromEnv) ? fromEnv : undefined) ??
    clientIdFromEnvFile(`${root}/../.env`) ??
    DEFAULT_CLIENT_ID

  const fromImageEnv = env.DISCORD_PRESENCE_LARGE_IMAGE?.trim()

  const largeImageKey =
    (fromImageEnv && IMAGE_KEY.test(fromImageEnv) ? fromImageEnv : undefined) ??
    imageKeyFromFile(`${root}/presence.json`)

  return {
    clientId,
    ...(largeImageKey
      ? {
          largeImageKey,
          largeImageText: 'The Shotcaller',
        }
      : {}),
  }
}
