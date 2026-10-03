import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
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
