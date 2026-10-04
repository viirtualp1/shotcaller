# Discord companion

A small local bridge so the installed desktop app can show Discord Rich Presence. The game stays a PWA. This process is the only thing that talks to Discord Desktop.

```text
PWA  →  ws://127.0.0.1:38471  →  companion  →  Discord IPC
```

The Discord Activity (`@discord/embedded-app-sdk`) is separate and is not used here. No bot token is read.

## Run

From the repository root, after Node.js is installed:

```bash
npm run companion
```

The command installs nothing global. It listens on `127.0.0.1:38471` only. If Discord is closed, the bridge stays up and connects when Discord starts. A second launch exits because one bridge is already listening.

## Start at login

```bash
npm run companion:install
```

- Windows: a hidden Startup-folder script. The registry is not changed.
- macOS: a LaunchAgent in `~/Library/LaunchAgents`.
- Linux: an XDG autostart entry.

```bash
npm run companion:remove
```

## Rich Presence art

The application id is the same public id as the Activity. There is no Rich Presence image key in the project yet.

1. Open the application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Upload the game icon under **Rich Presence → Art Assets**.
3. Note the asset key you gave it.
4. Create `discord-companion/presence.json` (this file stays on your machine):

```json
{ "largeImageKey": "the-key-you-chose" }
```

Or set `DISCORD_PRESENCE_LARGE_IMAGE` in the environment. Until then, presence works without a picture.

`DISCORD_CLIENT_ID` overrides the built-in application id if you ever need a different one.
