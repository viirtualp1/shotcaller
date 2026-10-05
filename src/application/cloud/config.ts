import { DESKTOP_MODE } from '../desktop'
import { discordCloudUrl } from '../discord'

export interface CloudConfig {
  readonly url: string
  /** The publishable (or legacy anon) key. It is public by design: row level security guards the data. */
  readonly key: string
  /** Google sign-in needs the provider switched on in the Supabase dashboard first. */
  readonly google: boolean
}

export interface CloudEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_GOOGLE?: string
  readonly MODE?: string
}

function jwtRole(token: string) {
  const payload = token.split('.')[1]
  if (!payload) {
    return null
  }

  try {
    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=')

    const claims: unknown = JSON.parse(atob(base64))
    return typeof claims === 'object' && claims !== null && 'role' in claims ? String(claims.role) : null
  } catch {
    return null
  }
}

/** Secret and service-role keys skip row level security, so the browser must never get one. */
export const isSecretKey = (key: string) => key.startsWith('sb_secret_') || jwtRole(key) === 'service_role'

/**
 * Cloud saves are optional: without a URL and a key the game simply stays local. A Discord Activity passes its
 * origin, and Supabase is then reached through the Activity's URL mapping. Google sign-in returns to a web page,
 * which neither the Activity nor the desktop app can receive, so both sign in with the email code.
 */
export function cloudConfig(env: CloudEnv, discordOrigin: string | null = null): CloudConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim()
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key) {
    return null
  }

  if (isSecretKey(key)) {
    console.error(
      'Cloud saves are off: VITE_SUPABASE_PUBLISHABLE_KEY holds a secret key. Use the publishable key.',
    )

    return null
  }

  if (discordOrigin) {
    return {
      url: discordCloudUrl(discordOrigin),
      key,
      google: false,
    }
  }

  return {
    url,
    key,
    google: env.MODE !== DESKTOP_MODE && env.VITE_SUPABASE_GOOGLE === 'true',
  }
}
