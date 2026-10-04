import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { companionRoot } from './config.ts'

const STARTUP_NAME = 'The Shotcaller Discord'

function entryPoint(root: string) {
  const node = process.execPath
  const tsx = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  const script = path.join(root, 'src', 'index.ts')

  return { node, tsx, script }
}

function installWindows(root: string) {
  const startup = process.env.APPDATA

  if (!startup) {
    throw new Error('APPDATA is not set, so the Startup folder cannot be found.')
  }

  const { node, tsx, script } = entryPoint(root)
  const command = [node, tsx, script].map((part) => `"${part.replaceAll('"', '')}"`).join(' ')
  const file = path.join(
    startup,
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'Startup',
    `${STARTUP_NAME}.vbs`,
  )
  const quotedCommand = `"${command.replaceAll('"', '""')}"`
  const directory = `"${root.replaceAll('"', '""')}"`

  writeFileSync(
    file,
    [
      'Set shell = CreateObject("WScript.Shell")',
      `shell.CurrentDirectory = ${directory}`,
      `shell.Run ${quotedCommand}, 0, False`,
      '',
    ].join('\r\n'),
    'utf8',
  )

  return file
}

function installMac(root: string) {
  const { node, tsx, script } = entryPoint(root)
  const directory = path.join(homedir(), 'Library', 'LaunchAgents')
  mkdirSync(directory, { recursive: true })
  const file = path.join(directory, 'online.theshotcaller.discord-companion.plist')
  const args = [node, tsx, script].map(
    (part) => `    <string>${part.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</string>`,
  )

  writeFileSync(
    file,
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0"><dict>',
      '  <key>Label</key><string>online.theshotcaller.discord-companion</string>',
      '  <key>RunAtLoad</key><true/>',
      '  <key>WorkingDirectory</key>',
      `  <string>${root.replaceAll('&', '&amp;')}</string>`,
      '  <key>ProgramArguments</key>',
      '  <array>',
      ...args,
      '  </array>',
      '</dict></plist>',
      '',
    ].join('\n'),
    'utf8',
  )

  return file
}

function installLinux(root: string) {
  const { node, tsx, script } = entryPoint(root)
  const directory = path.join(homedir(), '.config', 'autostart')
  mkdirSync(directory, { recursive: true })
  const file = path.join(directory, 'the-shotcaller-discord.desktop')
  const exec = [node, tsx, script].map((part) => (part.includes(' ') ? `"${part}"` : part)).join(' ')

  writeFileSync(
    file,
    [
      '[Desktop Entry]',
      'Type=Application',
      `Name=${STARTUP_NAME}`,
      `Exec=${exec}`,
      'X-GNOME-Autostart-enabled=true',
      '',
    ].join('\n'),
    'utf8',
  )

  return file
}

export function startupFile() {
  if (process.platform === 'win32') {
    const startup = process.env.APPDATA ?? ''

    return path.join(
      startup,
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup',
      `${STARTUP_NAME}.vbs`,
    )
  }

  if (process.platform === 'darwin') {
    return path.join(homedir(), 'Library', 'LaunchAgents', 'online.theshotcaller.discord-companion.plist')
  }

  return path.join(homedir(), '.config', 'autostart', 'the-shotcaller-discord.desktop')
}

/** Registers an OS login item that starts the bridge. Windows uses the Startup folder, not the registry. */
export function installStartup(root = companionRoot()) {
  const file =
    process.platform === 'win32'
      ? installWindows(root)
      : process.platform === 'darwin'
        ? installMac(root)
        : installLinux(root)

  const { node, tsx, script } = entryPoint(root)
  const child = spawn(node, [tsx, script], {
    cwd: root,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })

  child.unref()

  return file
}

export function uninstallStartup() {
  const file = startupFile()
  rmSync(file, { force: true })

  return file
}
