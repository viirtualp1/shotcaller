import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

export const GAME_URL = 'https://theshotcaller.online/'

/** Edge first: it ships with Windows and opens the game as an app window. */
export function browserCandidates(env: NodeJS.ProcessEnv = process.env) {
  const local = env.LOCALAPPDATA ?? ''
  const programs = env.ProgramFiles ?? env.PROGRAMFILES ?? ''
  const programs86 = env['PROGRAMFILES(X86)'] ?? ''

  return [
    path.join(programs, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programs86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programs, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ]
}

export function pickBrowser(candidates: readonly string[], exists: (file: string) => boolean) {
  return candidates.find((file) => file.length > 0 && exists(file)) ?? null
}

function psQuote(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

/** Start-menu and desktop shortcuts. The console stays minimized; the game window is the browser app. */
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

/** Opens the game. An app window reports itself as the installed app, so Discord status can connect. */
export function openGame() {
  const browser = pickBrowser(browserCandidates(), existsSync)

  const child = browser
    ? spawn(browser, [`--app=${GAME_URL}`], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })
    : spawn('cmd.exe', ['/c', 'start', '', GAME_URL], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })

  child.unref()
}
