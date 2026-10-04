import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { isPackaged } from './packaged.ts'

const INSTALL_DIR = 'The Shotcaller'
const INSTALL_EXE = 'TheShotcaller.exe'

export function installedExePath() {
  const base = process.env.LOCALAPPDATA

  if (process.platform !== 'win32' || !base) {
    return null
  }

  return path.join(base, INSTALL_DIR, INSTALL_EXE)
}

function samePath(left: string, right: string) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase()
}

function tell(message: string) {
  console.log(message)

  if (process.platform !== 'win32') {
    return
  }

  const quoted = `'${message.replaceAll("'", "''")}'`

  spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-WindowStyle',
      'Hidden',
      '-Command',
      `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show(${quoted}, 'The Shotcaller') | Out-Null`,
    ],
    { windowsHide: true },
  )
}

/**
 * A downloaded exe copies itself beside the player's account and starts that copy.
 * The copy is what signs in with Windows. Returns true when this process should exit.
 */
export function handOffToInstalledCopy() {
  if (!isPackaged()) {
    return false
  }

  const target = installedExePath()

  if (!target || samePath(process.execPath, target)) {
    return false
  }

  mkdirSync(path.dirname(target), { recursive: true })

  try {
    copyFileSync(process.execPath, target)
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : ''

    if (code === 'EBUSY' || code === 'EPERM') {
      tell('The Shotcaller is already running. Quit it, then run the installer again.')

      return true
    }

    throw error
  }

  const child = spawn(target, [], {
    cwd: path.dirname(target),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })

  child.unref()
  tell('The Shotcaller is installed and opening.')

  return true
}
