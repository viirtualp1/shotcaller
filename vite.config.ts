import { fileURLToPath, URL } from 'node:url'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    VueI18nPlugin({
      include: [src('ui/i18n/locales/**')],
      runtimeOnly: true,
      compositionOnly: true,
      fullInstall: false,
      dropMessageCompiler: true,
    }),
  ],
  base: './',
  resolve: {
    alias: { '@': src('') },
  },
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
            { name: 'vendor', test: /node_modules/ },
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
