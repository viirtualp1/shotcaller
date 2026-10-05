import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'

export const GAME_URL = 'https://theshotcaller.online/'

/** `start` with an empty title opens the URL in the system default browser. */
export const GAME_LAUNCH = ['/c', 'start', '', GAME_URL] as const

function psQuote(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

/** Start-menu and desktop shortcuts. The console stays minimized; the game window is the browser. */
export function installShortcuts(exe: string) {
  const target = psQuote(exe)
  const cwd = psQuote(path.dirname(exe))

  const script = [
    '$shell = New-Object -ComObject WScript.Shell',
    "foreach ($folder in @($shell.SpecialFolders('Programs'), $shell.SpecialFolders('Desktop'))) {",
    "  $link = $shell.CreateShortcut((Join-Path $folder 'The Shotcaller.lnk'))",
    `  $link.TargetPath = ${target}`,
    `  $link.WorkingDirectory = ${cwd}`,
    '  $link.WindowStyle = 7',
    "  $link.Description = 'The Shotcaller'",
    '  $link.Save()',
    '}',
  ].join('\n')

  spawnSync('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script], {
    windowsHide: true,
  })
}

/** Opens the game in whichever browser the system uses for https links. */
export function openGame() {
  const child = spawn('cmd.exe', [...GAME_LAUNCH], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })

  child.unref()
}
