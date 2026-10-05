import { readFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  protocol,
  session,
  shell,
  type IpcMainInvokeEvent,
} from 'electron'
import { bundleFile, contentType, securityHeaders, type HostingConfig } from './bundle.js'
import { APP_ORIGIN, APP_SCHEME, isAppUrl, isExternalUrl } from './origin.js'
import { startSteam } from './steam.js'
import { isFullscreenToggle, readWindowState, type WindowState } from './windowState.js'

const BOARD_COLOR = '#131b18'

/** What the game asks the system for: copying a friend code, its notifications and fullscreen. */
const GRANTED_PERMISSIONS = new Set(['clipboard-sanitized-write', 'notifications', 'fullscreen'])

/** Local saves live here. It is named outright, so renaming the npm package can never lose a player's progress. */
const SAVE_FOLDER = 'The Shotcaller'

const root = path.join(app.getAppPath(), 'dist-desktop')

app.setPath('userData', path.join(app.getPath('appData'), SAVE_FOLDER))

const steam = startSteam()

/* Before the app is ready: a standard, secure scheme gets storage, fetch and the same rules as an https site. */
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      codeCache: true,
    },
  },
])

function hostingHeaders() {
  const config = JSON.parse(readFileSync(path.join(app.getAppPath(), 'vercel.json'), 'utf8')) as HostingConfig

  return securityHeaders(config)
}

async function serve(request: Request, headers: Record<string, string>) {
  const file = bundleFile(root, request.url)

  if (!file) {
    return new Response(null, { status: 404 })
  }

  try {
    const body = await readFile(file)

    return new Response(body, {
      headers: {
        'Content-Type': contentType(file),
        ...headers,
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}

function windowStateFile() {
  return path.join(app.getPath('userData'), 'window.json')
}

function loadWindowState() {
  try {
    return readWindowState(readFileSync(windowStateFile(), 'utf8'))
  } catch {
    return readWindowState(null)
  }
}

function saveWindowState(state: WindowState) {
  void writeFile(windowStateFile(), JSON.stringify(state)).catch(() => undefined)
}

/** Only the bundled game may talk to Steam, never a page that somehow reached the window. */
function fromGame(event: IpcMainInvokeEvent) {
  return isAppUrl(event.senderFrame?.url ?? '')
}

function answerSteam() {
  ipcMain.handle('steam:available', (event) => fromGame(event) && steam !== null)

  ipcMain.handle('steam:unlock', (event, names: unknown) => {
    if (!fromGame(event) || !steam) {
      return []
    }

    return steam.unlock(names)
  })

  ipcMain.handle('steam:ticket', async (event) => {
    if (!fromGame(event) || !steam) {
      return null
    }

    try {
      return await steam.ticket()
    } catch (error) {
      console.warn('Steam did not issue a sign-in ticket', error)

      return null
    }
  })
}

function openExternally(url: string) {
  if (isExternalUrl(url)) {
    void shell.openExternal(url)
  }
}

function createWindow() {
  const game = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    fullscreen: loadWindowState().fullscreen,
    show: false,
    title: 'The Shotcaller',
    backgroundColor: BOARD_COLOR,
    icon: path.join(root, 'pwa-512x512.png'),
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      /* Players never get the developer tools; running from source, F12 opens them. */
      devTools: !app.isPackaged,
    },
  })

  game.webContents.setWindowOpenHandler(({ url }) => {
    openExternally(url)

    return { action: 'deny' }
  })

  game.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) {
      return
    }

    event.preventDefault()
    openExternally(url)
  })

  game.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') {
      return
    }

    if (isFullscreenToggle(input)) {
      event.preventDefault()
      game.setFullScreen(!game.isFullScreen())
    } else if (input.key === 'F12' && !app.isPackaged) {
      event.preventDefault()
      game.webContents.toggleDevTools()
    }
  })

  game.on('enter-full-screen', () => saveWindowState({ fullscreen: true }))
  game.on('leave-full-screen', () => saveWindowState({ fullscreen: false }))
  game.once('ready-to-show', () => game.show())
  void game.loadURL(`${APP_ORIGIN}/`)
}

/* One game window: launching again brings the open one forward. */
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [game] = BrowserWindow.getAllWindows()

    if (!game) {
      return
    }

    if (game.isMinimized()) {
      game.restore()
    }

    game.focus()
  })

  app.on('window-all-closed', () => app.quit())

  void app.whenReady().then(() => {
    Menu.setApplicationMenu(null)

    const headers = hostingHeaders()
    protocol.handle(APP_SCHEME, (request) => serve(request, headers))

    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) =>
      callback(GRANTED_PERMISSIONS.has(permission)),
    )

    answerSteam()

    /* The game has no text to check, so Chromium never downloads spelling dictionaries. */
    session.defaultSession.setSpellCheckerEnabled(false)

    session.defaultSession.setPermissionCheckHandler((_contents, permission) =>
      GRANTED_PERMISSIONS.has(permission),
    )

    createWindow()
  })
}
