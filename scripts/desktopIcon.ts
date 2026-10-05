import { mkdirSync } from 'node:fs'
import sharp from 'sharp'
import { sharpsToIco } from 'sharp-ico'

/** Windows picks the size it needs from one file: taskbar, Start menu, Explorer and the Steam library. */
const SIZES = [256, 128, 64, 48, 32, 24, 16]

/** Regenerate the desktop game's Windows icon after changing the app icon: `npm run icons`. */
mkdirSync('build', { recursive: true })

await sharpsToIco([sharp('public/pwa-512x512.png')], 'build/icon.ico', {
  sizes: SIZES,
  resizeOptions: {},
})

console.log('build/icon.ico')
