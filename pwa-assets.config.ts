import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

/** Regenerate the icons in `public` after changing `public/icon.svg`: `npm run icons`. */
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { background: '#1c2824' },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { background: '#1c2824' },
    },
  },
  images: ['public/icon.svg'],
})
