import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import pngToIco from 'png-to-ico'
import { Data, NtExecutable, NtExecutableResource, Resource } from 'resedit'

const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'

if (process.platform !== 'win32') {
  console.error('Build the player installer on Windows. It copies the Windows Node binary.')
  process.exit(1)
}

const root = fileURLToPath(new URL('.', import.meta.url))
const dist = path.join(root, 'dist')
const bundle = path.join(dist, 'companion.cjs')
const blob = path.join(dist, 'sea-prep.blob')
const config = path.join(dist, 'sea-config.json')
const exe = path.join(dist, 'The Shotcaller Installer.exe')

mkdirSync(dist, { recursive: true })

await build({
  entryPoints: [path.join(root, 'src', 'index.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: bundle,
  external: ['bufferutil', 'utf-8-validate'],
  logLevel: 'info',
})

writeFileSync(
  config,
  `${JSON.stringify(
    {
      main: bundle,
      output: blob,
      disableExperimentalSEAWarning: true,
    },
    null,
    2,
  )}\n`,
)

execFileSync(process.execPath, ['--experimental-sea-config', config], {
  stdio: 'inherit',
})

copyFileSync(process.execPath, exe)

const postject = path.join(root, 'node_modules', 'postject', 'dist', 'cli.js')

execFileSync(process.execPath, [postject, exe, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', FUSE], {
  stdio: 'inherit',
})

const logo = path.join(root, '..', 'public', 'pwa-512x512.png')
const ico = await pngToIco(logo, { interpolation: 'bicubicInterpolation' })
const binary = NtExecutable.from(readFileSync(exe), { ignoreCert: true })
const resources = NtExecutableResource.from(binary)
const icons = Data.IconFile.from(ico).icons.map((item) => item.data)
const groups = Resource.IconGroupEntry.fromEntries(resources.entries)

if (groups.length === 0) {
  groups.push({
    id: 1,
    lang: 1033,
  })
}

for (const group of groups) {
  Resource.IconGroupEntry.replaceIconsForResource(resources.entries, group.id, group.lang, icons)
}

for (const info of Resource.VersionInfo.fromEntries(resources.entries)) {
  for (const language of info.getAllLanguagesForStringValues()) {
    info.setStringValue(language, 'FileDescription', 'The Shotcaller Installer')
    info.setStringValue(language, 'ProductName', 'The Shotcaller')
    info.setStringValue(language, 'InternalName', 'The Shotcaller Installer')
    info.setStringValue(language, 'OriginalFilename', 'The Shotcaller Installer.exe')
  }

  info.outputToResourceEntries(resources.entries)
}

resources.outputResource(binary)
writeFileSync(exe, Buffer.from(binary.generate()))

console.log(exe)
