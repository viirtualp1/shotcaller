# Discord Activity

The game runs as a Discord Activity from the same Vercel deployment as the website. Discord loads it in an
iframe at `https://<application id>.discordsays.com` and forwards requests through URL mappings; the page may
not contact any other host directly.

## What the project already does

- Detects an Activity launch from Discord's `frame_id` and `instance_id` parameters (`src/application/discord.ts`).
- Loads `@discord/embedded-app-sdk` only inside Discord and completes the `ready()` handshake.
- Sends Supabase traffic, including Realtime, to `/.proxy/supabase` instead of `*.supabase.co`.
- Hides Google sign-in, which leaves the page and cannot return to the Activity frame. Email codes still work.
- Skips the service worker and update toast; Discord loads the current deployment on every launch.
- Ships its fonts with the game instead of loading Google Fonts, which Discord's content policy would block.
- Vercel Analytics and Speed Insights use same-origin `/_vercel/*` paths and work through the root mapping.

## 1. Create the application

1. Open <https://discord.com/developers/applications> and choose **New Application**.
2. On **General Information**, copy the **Application ID**.
3. In Vercel, add `VITE_DISCORD_CLIENT_ID=<application id>` to the Production environment and redeploy.
   The ID is public. Never put the client secret in a `VITE_` variable.
4. On **OAuth2**, add `https://127.0.0.1` as a redirect URI. Activities do not redirect there, but Discord
   expects one before authorization can be added later.

## 2. URL mappings

Open **Activities → URL Mappings** and add:

| Prefix      | Target                    |
| ----------- | ------------------------- |
| `/`         | `theshotcaller.online`    |
| `/supabase` | `<project ref>.supabase.co` |

Targets have no `https://`. The Supabase reference is the subdomain of `VITE_SUPABASE_URL`.

## 3. Enable the Activity

1. **Activities → Settings**: turn on **Enable Activities**.
2. Choose the supported platforms. The layout adapts to desktop, tablet and phone widths, so web, desktop,
   iOS and Android can all stay enabled. Leave orientation unlocked unless phone testing shows otherwise.
3. **Installation**: enable **Guild Install** and **User Install**, and set **Install Link** to
   **Discord Provided Link**.

## 4. Test it

While the app is unpublished, the Activity is available to its owner, team members and **App Testers**
(add friends there to test together).

1. Join a voice channel, open the **Activities** (rocket) button and pick the game. In a text channel, the
   App Launcher offers it as well.
2. On first launch, open the browser console (Ctrl+Shift+I in the desktop client after enabling developer
   tools in Discord's Advanced settings). There should be no blocked requests or handshake errors.
3. Check guest play, training, the email-code sign-in, cloud saves, friends, matchmaking and the leaderboard.

### Testing local changes

Point the root mapping at a tunnel to the dev server, then restore `theshotcaller.online` afterwards:

```bash
npx cloudflared tunnel --url http://localhost:5173
```

Vite rejects unknown hosts; temporarily add the tunnel domain to `server.allowedHosts` in `vite.config.ts`
(for example `['.trycloudflare.com']`) and set `VITE_DISCORD_CLIENT_ID` in `.env`. Hot reload may not connect
through Discord's proxy; reload the Activity instead.

## 5. Publish

1. **App Directory**: fill in the description, images, category, Terms of Service URL and Privacy Policy URL.
   Mention that the Activity uses the existing cloud saves and optional analytics.
2. Share the install link or let players start it from the Activity launcher. To appear in Discord's
   Activity discovery, enable discovery in the App Directory settings and follow Discord's current review
   requirements. Apps in 100 or more servers must complete verification.

## Known limits and next steps

- Google sign-in is unavailable inside Discord. Signing in with Discord would need the SDK's `authorize`
  command, a Supabase Edge Function that exchanges the code with the client secret, and a way to issue a
  Supabase session for that Discord account.
- External links opened with `target="_blank"` are blocked; use `sdk.commands.openExternalLink` for any
  link that must leave the Activity.
- Google profile photos come from `googleusercontent.com`, which Discord blocks; the default avatar is shown
  instead unless that host gets its own URL mapping.
- Rich Presence (`sdk.commands.setActivity`) and duels between people in the same voice channel are natural
  follow-ups.
