import '@fontsource/caveat/600.css'
import '@fontsource/caveat/700.css'
import '@fontsource/onest/400.css'
import '@fontsource/onest/500.css'
import '@fontsource/onest/600.css'
import '@fontsource/onest/700.css'
import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { IN_DISCORD, startDiscordActivity } from './application/discord'
import { migrateLegacyStorage } from './application/persistence/storageKeys'
import App from './ui/App.vue'
import { i18n } from './ui/i18n'
import { useSettingsStore } from './ui/stores/settings'
import './ui/styles/base.css'

migrateLegacyStorage()
const app = createApp(App).use(createPinia()).use(i18n)
useSettingsStore()
app.mount('#app')

inject({ framework: 'vue' })
injectSpeedInsights({ framework: 'vue' })

if (IN_DISCORD) {
  startDiscordActivity(import.meta.env.VITE_DISCORD_CLIENT_ID).catch((error: unknown) =>
    console.error('Discord Activity handshake failed', error),
  )
}
