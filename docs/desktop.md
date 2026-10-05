# Desktop game

The desktop game is the same Vue bundle as the website, packaged with Electron for Steam. It carries its own files,
so matches against the computer work offline, and Steam delivers its updates.

## What the project already does

- `vite build --mode desktop` builds the game into `dist-desktop/`. `IN_DESKTOP` (`src/application/desktop.ts`) is
  true only in that bundle.
- Serves the bundle from `app://shotcaller`, a secure origin of its own, under the same security headers as the website
  (`vercel.json`). Any path without a file extension gets the game, so a reload on `/profile` stays on that page.
- Keeps local saves in `%APPDATA%\The Shotcaller` (`~/Library/Application Support/The Shotcaller` on macOS,
  `~/.config/The Shotcaller` on Linux). The origin and that folder hold every player's progress: never change either.
- Leaves out the service worker, the update toast and Vercel Analytics.
- Hides Google sign-in, which returns to a web page the app cannot receive. The email code signs the app in; the link in
  the same email opens the web game.
- Opens web and mail links in the player's browser. Nothing but the bundled game loads in the window, and the window
  grants only clipboard writes, notifications and fullscreen.
- Opens fullscreen. **F11** or **Alt+Enter** switches to a window and back, and the game remembers the choice in
  `window.json` beside the saves.
- One window at a time: launching the game again brings it to the front.
- Players never get the developer tools; running from source, **F12** opens them. Electron fuses lock the shipped exe:
  it cannot run as Node or take inspector flags, and it only loads its own untouched `app.asar`.

## Commands

| Command                   | What it does                                                                   |
| ------------------------- | ------------------------------------------------------------------------------ |
| `npm run desktop`         | Build the bundle and the Electron entry, then open the game                    |
| `npm run desktop:build`   | Build `dist-desktop/` and `dist-electron/` only (CI runs this)                 |
| `npm run desktop:package` | Package the game into `release/<platform>-unpacked/`, the folder Steam uploads |

The build reads Supabase keys from `.env`, like `npm run build`. Packaging makes a folder for the current platform;
Steam installs and updates it, so there is no installer. The Windows icon is `build/icon.ico`, made by `npm run icons`.

## Steam

`electron/steam.ts` connects to the Steam client through `steamworks.js` as the app starts. Without Steam running, or
for a player who does not own the game, the game simply plays without it.

- **Overlay:** Shift+Tab opens the Steam overlay over the game.
- **Achievements:** `src/application/steamAchievements.ts` reads them from the profile and unlocks any the player has
  earned, including progress from before Steam. [Steam achievements](steam-achievements.md) lists what to enter in
  Steamworks.
- **Sign-in:** the game asks Steam for a ticket and sends it to the `steam-auth` Edge Function. A new Steam player gets
  an account and keeps this device's progress; a returning one signs in to theirs; a player already signed in with
  email gets Steam linked to that account. `steam_accounts` records which account each Steam account belongs to.
- The page reaches Steam only through the preload bridge (`electron/preload.cts`), and only the bundled game may use it.

Until Steamworks issues an app ID the game runs as Spacewar (app 480), Valve's test app.

### When the app ID arrives

1. Set `STEAM_APP_ID` in `electron/steam.ts`.
2. Publish the achievements from [Steam achievements](steam-achievements.md).
3. Create a publisher Web API key in Steamworks (**Users & Permissions → Manage Groups**).
4. Apply `supabase/migrations/20261005190000_steam_accounts.sql`, then set the function's secrets and deploy it:

   ```bash
   supabase secrets set STEAM_WEB_API_KEY=... STEAM_APP_ID=... --project-ref YOUR_SUPABASE_PROJECT_REF
   supabase functions deploy steam-auth --project-ref YOUR_SUPABASE_PROJECT_REF --no-verify-jwt
   ```

5. Upload `release/win-unpacked` with SteamPipe and set the launch option to `The Shotcaller.exe`.
