# Optional PostHog gameplay analytics

Analytics is disabled until deployment sets `VITE_TELEMETRY_ENABLED=true`. Cloud saves,
friend profiles, duel boards and server ratings remain separate operational features.
This release does not implement a leaderboard.

## Local read-only analytics

Keep a personal API key with `query:read` in the Git-ignored root `.env.posthog.local`:

```dotenv
POSTHOG_QUERY_API_KEY=
POSTHOG_QUERY_HOST=https://us.posthog.com
POSTHOG_PROJECT_ID=
```

The project ID is the **PostHog** project's numeric ID. Use the management host for the
US region (`https://us.posthog.com`).
These variables are only for a local Node script: never prefix them with `VITE_`, import
the script into the game or upload this read-only key as the erasure key.

```sh
node --env-file=.env.posthog.local scripts/posthogQuery.ts "select count() from events where event = 'game_match_finished'"
```

Node 24 runs this TypeScript script directly. Queries use the [PostHog Query API](https://posthog.com/docs/api/queries).
The query key is separate from the cleanup key that needs `person:write`.

## Consent and collection

New and existing registered players see the same unchecked consent dialog after sign-in
once the feature is enabled. Already signed-in players see it on their next app load.
Guests and signed-out players are never enrolled. Choosing “Decide later” or dismissing
does not consent; a saved refusal is not prompted again. Preferences belong to the
account, not to browser storage, and can be changed in settings or the profile.

The client starts disabled and fails closed if consent cannot be loaded. The database
records the explanation version, choice and server timestamp. `reserve_telemetry`
checks consent again on every submission under the caller's JWT. Account switching
invalidates in-flight client work. Revisit the explanation only when the purpose or
data categories change, not on every game update. Update `PRIVACY_VERSION`, the shared
request schema, SQL version checks and translated explanation together.

Only the profile's **new match completion action** submits an event. Cloud sync and
history loading never submit telemetry. Events older than the grant or five minutes
are rejected. Offline events are intentionally dropped instead of saved for later.
The authenticated proxy validates enums, sizes and numbers, then reconstructs an
allowlisted object. It never forwards request headers or arbitrary metadata.

## Event: `game_match_finished`

| Property                              | Purpose                                                   |
| ------------------------------------- | --------------------------------------------------------- |
| `mode`, `kind`, `difficulty`          | Separate lanes, AI, live duels, ghost duels and trials    |
| `balance`                             | Separate balance revisions                                |
| `verdict`, `reason`, `rounds`         | Win rate, draws, forfeits and match length                |
| `ratingBand`                          | Compare player skill in 200 MMR bands                     |
| `goldEarned`, `towersDestroyed`       | Economy and objective pressure                            |
| `lineup`, `heroes`, `synergies`       | Own hero stars, items, stats and final composition        |
| `factions`                            | Faction steps the final lineup reaches, as `legion:2`     |
| `roundBoards`                         | Own board, active synergies and result of each round      |
| `hero_ids`, `item_ids`, `synergy_ids` | Deduplicated match-level breakdown arrays                 |
| `faction_steps`                       | Faction steps reached in any round or at the end          |
| `unit = player_match`                 | One consenting player's view of a match                   |
| `data_source = client_reported`       | Do not confuse analytics with authoritative server rating |

No names, emails, account IDs, registration dates, avatars, chats, opponent boards,
replay seeds, URLs, device fingerprints or IP headers are sent to PostHog. No frontend
PostHog SDK is initialized, so there is no autocapture, pageview tracking, session
replay, cookie, browser analytics identifier, survey or feature flag request.
GeoIP is explicitly disabled. PostHog sees the proxy's connection, not the player's IP.
Infrastructure logs in Supabase and PostHog remain subject to their own policies;
the application does not log request bodies or authentication headers.

PostHog receives a **random account analytics UUID**, unrelated to the auth UUID.
It creates a pseudonymous person with no identity properties. This allows player
win-rate analysis and reliable deletion using the Persons API. These are
pseudonymous data, not a claim of legally anonymous data. The mapping and consent
history are private in Supabase. The analytics UUID is rotated on a new grant after
withdrawal and is never reused after deletion.

## Deployment

1. Create an **US** PostHog project. This implementation deliberately accepts only
   `https://us.i.posthog.com` and uses `https://us.posthog.com` for management APIs.
   Check your project's actual event retention and processor agreement. The UI
   discloses retention while consent is active within the project retention period;
   specify an exact period there if your policy requires one. Add the controller's
   contact details to the published privacy policy before enabling the feature.
2. Apply `supabase/migrations/20261001120000_telemetry_consent.sql` through your normal
   migration workflow, or run that file's contents in the **Supabase SQL Editor**.
   Also apply `20261001150000_telemetry_us_region.sql`: policy version 2 discloses US,
   pauses previous grants and asks existing players to review the corrected explanation.
   The consent migration requires the existing friends migration's `public.is_registered()` function.
   No existing account receives a default grant. The analysis queries in
   `docs/posthog-queries.hogql` belong in **PostHog's SQL editor**: they use HogQL and
   PostHog's `events` table, so they cannot be applied as PostgreSQL migrations.
3. Set **server-only** Supabase function secrets:
   `POSTHOG_PROJECT_KEY`, `POSTHOG_HOST=https://us.i.posthog.com`,
   `POSTHOG_PROJECT_ID`, `POSTHOG_PERSONAL_API_KEY` with `person:write`, and a long
   random `TELEMETRY_CLEANUP_TOKEN`. Never put these in `VITE_` variables or commit them.
   Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` to its Edge runtime.

   The server template is [`supabase/functions/.env.example`](../supabase/functions/.env.example).
   Create `supabase/functions/.env` from it and fill in these values:

   | Variable                   | Value                                                                          |
   | -------------------------- | ------------------------------------------------------------------------------ |
   | `POSTHOG_PROJECT_KEY`      | Project API key from the US PostHog project's settings; used to capture events |
   | `POSTHOG_HOST`             | `https://us.i.posthog.com`                                                     |
   | `POSTHOG_PROJECT_ID`       | Numeric ID of that PostHog project                                             |
   | `POSTHOG_PERSONAL_API_KEY` | Personal API key with `person:write` access to that project; used for erasure  |
   | `TELEMETRY_CLEANUP_TOKEN`  | Long random token shared with the cleanup scheduler                            |

   For a hosted Supabase project, upload the file with the CLI:

   ```sh
   supabase secrets set --env-file supabase/functions/.env --project-ref YOUR_SUPABASE_PROJECT_REF
   ```

   `YOUR_SUPABASE_PROJECT_REF` is the **Supabase** project identifier: for
   `VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co`, use
   `abcdefghijklmnopqrst`. It is a CLI argument, separate from the **PostHog**
   project API key (`POSTHOG_PROJECT_KEY`) and numeric project ID (`POSTHOG_PROJECT_ID`).

   You can also enter these five names and values in **Supabase Dashboard > Edge
   Functions > Secrets**. The hosted functions read Supabase secrets; creating a
   local file alone does not configure the hosted project. The file containing real
   values is ignored by Git. See [Supabase's environment variable guide](https://supabase.com/docs/guides/functions/secrets).

   For local Edge Functions, `supabase/functions/.env` is the default secrets file;
   you can pass it explicitly with `supabase functions serve --env-file supabase/functions/.env --no-verify-jwt`.
   The root frontend `.env` needs only `VITE_TELEMETRY_ENABLED` and the existing
   `VITE_SUPABASE_*` configuration; the frontend calls Supabase rather than PostHog directly.

4. Deploy both functions:

   ```sh
   supabase functions deploy game-telemetry --project-ref YOUR_SUPABASE_PROJECT_REF --no-verify-jwt
   supabase functions deploy telemetry-cleanup --project-ref YOUR_SUPABASE_PROJECT_REF --no-verify-jwt
   ```

   `game-telemetry` verifies the user's token with Auth and uses that same JWT for
   database RPC calls; guests are rejected. `telemetry-cleanup` requires its separate
   secret bearer token. Gateway JWT verification is disabled to support publishable
   keys and the cleanup token; neither handler permits unauthenticated operation.

5. Configure Supabase Cron (Vault + pg_net), or your existing scheduler, to POST to
   `/functions/v1/telemetry-cleanup` every 15 minutes with
   `Authorization: Bearer <TELEMETRY_CLEANUP_TOKEN>`. Keep the token in Vault or the
   scheduler's secret store. Test it before rollout. This schedule is operational
   setup; the migration does **not** install a job or store a token in SQL.
6. Set `VITE_TELEMETRY_ENABLED=true` in the frontend deployment environment and rebuild.
   Keep it false until both capture and cleanup have been tested in your project.

## Withdrawal and deletion

Withdrawal stops new reservations and queues deletion of the previous analytics UUID
in the same transaction. Account deletion also creates a durable job that survives
the account cascade. A two-minute delay lets short capture requests already in
flight finish; a new grant uses a different analytics UUID. The worker requests
PostHog person and event deletion. HTTP 202 alone is not treated as success: errors
and missing persons retain the local job for retry. Acknowledgement means **queued by
PostHog**, not physically erased. Check PostHog's deletion status until completed.

The worker also prunes receipt metadata after 30 days. Gameplay payloads are never
stored in the receipts table. Failed capture is best effort and is not retried or
backfilled; server-side receipts prevent duplicate capture and limit submissions
to 200 per player per day. Monitor the cleanup queue age and PostHog's accepted
deletions; do not enable telemetry without a working cleanup schedule.

## Balance analysis

Start with [the included HogQL queries](posthog-queries.hogql) in **PostHog > SQL**: modes, player win rates,
heroes, items and synergies. Use separate filters for `kind`, `difficulty`, `balance`
and `ratingBand`. Arrays count an item or synergy once per player-match, not once
per copy or round. Draws stay in the win-rate denominator; show their count too.
Round-level exposure and hero-item combinations can be derived from `roundBoards`.

Show sample sizes and avoid balance decisions on small cohorts. Participation is
voluntary, so the sample does not represent every player. One duel may yield zero,
one or two player events; do not count these as unique duels or expect duel win rate
to equal 50%. Self-reported payloads can be forged, and late forfeits or offline
matches can be missing. Hero, item and synergy win rates show association, not
causation: skill, composition, mode and economy can explain the differences.

## Release verification

Run the unit tests and smoke-test on a staging Supabase/PostHog project:

- Existing account with no consent: dialog appears, no PostHog request/event.
- Guest: no dialog or analytics submission.
- Refusal survives reload and another device; gameplay still works.
- Grant creates one event for a fresh match with only the documented properties.
- Duplicate match, stale timestamp, stale explanation version and direct requests
  without consent are rejected by the server.
- Revoke on device A; direct submissions from device B are rejected immediately.
- Withdrawal and account deletion enqueue erasure; the scheduler submits it and
  PostHog eventually reports completed deletion.
- Re-grant generates a different pseudonym. There is no historical backfill.

The repository tests cover payload minimization, client consent/account races,
ingestion gating and deletion response handling. They do not prove a live migration,
US project configuration, scheduler or PostHog deletion has been deployed.

`supabase/tests/telemetry_consent.sql` exercises the migration in a disposable
PostgreSQL/Supabase database and rolls its test changes back. It also passed in an
isolated PGlite database with Supabase Auth functions stubbed.
For local visual QA, run Vite with `VITE_TELEMETRY_ENABLED=true` and
`VITE_SUPABASE_URL` set to a single space (cloud disabled), then open
`/tests/fixtures/telemetry.html` or append `?lang=en`. The fixture replaces the
account and privacy service with local fakes and never sends analytics.

References: [PostHog event API](https://posthog.com/docs/api/capture),
[data storage and deletion](https://posthog.com/docs/privacy/data-storage),
[array breakdowns](https://posthog.com/tutorials/array-filter-breakdown),
[Supabase Edge dependencies](https://supabase.com/docs/guides/functions/dependencies).
