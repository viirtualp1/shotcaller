import { fileURLToPath, URL } from 'node:url'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

const BOARD_COLOR = '#131b18'
const YEAR_SECONDS = 60 * 60 * 24 * 365

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      /* A new version waits for the player's go-ahead: reloading on its own could cut into a duel. */
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: './',
        name: 'Shotcaller',
        short_name: 'Shotcaller',
        description: 'Draft heroes, send them down three lanes and break the enemy throne.',
        lang: 'ru',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        theme_color: BOARD_COLOR,
        background_color: BOARD_COLOR,
        categories: ['games', 'strategy'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        /* Supabase is never cached: saves, friends and duels have to be live. */
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: YEAR_SECONDS,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    VueI18nPlugin({
      include: [src('ui/i18n/locales/**')],
      runtimeOnly: true,
      compositionOnly: true,
      fullInstall: false,
      dropMessageCompiler: true,
    }),
  ],
  base: './',
  resolve: { alias: { '@': src('') } },
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'pixi',
              test: /node_modules[\\/](pixi\.js|@pixi|earcut|eventemitter3|parse-svg-path|gifuct-js|ismobilejs)/,
            },
            {
              name: 'vue',
              test: /node_modules[\\/](@vue|vue|pinia|vue-i18n|@intlify|reka-ui|@vueuse|@floating-ui|vue-draggable-plus|sortablejs)/,
            },
            {
              /* Only fetched when cloud saves are configured. */
              name: 'supabase',
              test: /node_modules[\\/](@supabase|iceberg-js|tslib)[\\/]/,
            },
            {
              name: 'vendor',
              test: /node_modules/,
            },
          ],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
  },
})
