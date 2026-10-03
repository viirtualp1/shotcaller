/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />

interface ImportMetaEnv {
  /** Enable only after the consent migration and PostHog Edge Functions are deployed. */
  readonly VITE_TELEMETRY_ENABLED?: string
  /** Cloud saves: the Supabase project URL. Leave empty to keep the game local. */
  readonly VITE_SUPABASE_URL?: string
  /** Cloud saves: the publishable (or legacy anon) key. Never the secret key. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** `true` once the Google provider is set up in Supabase. */
  readonly VITE_SUPABASE_GOOGLE?: string
  /** The Discord application ID, needed only when the game runs as a Discord Activity. */
  readonly VITE_DISCORD_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
