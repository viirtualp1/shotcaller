import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { companionRoot } from './config.ts'
import { isPackaged } from './packaged.ts'

const STARTUP_NAME = 'The Shotcaller'

interface Launch {
  readonly command: readonly string[]
  readonly cwd: string
}

/** The installed exe starts itself. From source, Node runs the TypeScript entry through tsx. */
function launchOf(root: string): Launch {
  if (isPackaged()) {
    return {
      command: [process.execPath, '--background'],
      cwd: path.dirname(process.execPath),
    }
  }

  return {
    command: [
      process.execPath,
      path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      path.join(root, 'src', 'index.ts'),
    ],
    cwd: root,
  }
}

function installWindows(launch: Launch) {
  const startup = process.env.APPDATA

  if (!startup) {
    throw new Error('APPDATA is not set, so the Startup folder cannot be found.')
  }

  const command = launch.command.map((part) => `"${part.replaceAll('"', '')}"`).join(' ')

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
  const directory = `"${launch.cwd.replaceAll('"', '""')}"`

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

function installMac(launch: Launch) {
  const directory = path.join(homedir(), 'Library', 'LaunchAgents')
  mkdirSync(directory, { recursive: true })
  const file = path.join(directory, 'online.theshotcaller.discord-companion.plist')

  const args = launch.command.map(
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
      `  <string>${launch.cwd.replaceAll('&', '&amp;')}</string>`,
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

function installLinux(launch: Launch) {
  const directory = path.join(homedir(), '.config', 'autostart')
  mkdirSync(directory, { recursive: true })
  const file = path.join(directory, 'the-shotcaller-discord.desktop')
  const exec = launch.command.map((part) => (part.includes(' ') ? `"${part}"` : part)).join(' ')

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

/** Writes the login item that starts the bridge. The installed exe calls this on startup. */
export function registerStartup(root = companionRoot()) {
  const launch = launchOf(root)

  if (process.platform === 'win32') {
    return installWindows(launch)
  }

  if (process.platform === 'darwin') {
    return installMac(launch)
  }

  return installLinux(launch)
}

/** Registers an OS login item that starts the bridge, then starts it now. Windows uses the Startup folder. */
export function installStartup(root = companionRoot()) {
  const file = registerStartup(root)
  const launch = launchOf(root)
  const [bin, ...args] = launch.command

  const child = spawn(bin ?? process.execPath, args, {
    cwd: launch.cwd,
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
