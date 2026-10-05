// A sandboxed preload runs as CommonJS, so it loads Electron the CommonJS way.
import electron = require('electron')

/** What the game page may ask of Steam. `src/application/steam.ts` describes the same bridge to the game. */
electron.contextBridge.exposeInMainWorld('shotcallerSteam', {
  available: (): Promise<boolean> => electron.ipcRenderer.invoke('steam:available'),
  unlock: (names: readonly string[]): Promise<string[]> => electron.ipcRenderer.invoke('steam:unlock', names),
  ticket: (): Promise<string | null> => electron.ipcRenderer.invoke('steam:ticket'),
})
