# Matchmaking, storage and leaderboard

Apply migrations in filename order before deploying the updated client. The pending changes are
`20261003120000_fair_duels.sql`, `20261003130000_lean_storage.sql`,
`20261003140000_mmr_leaderboard.sql`, `20261003150000_read_only_leaderboard.sql`,
`20261003160000_delete_account.sql`, and `20261004120000_withdraw_board.sql`. The second changes the return type
of `publish_live_match` and adds the heartbeat APIs, so deploy the migrations and client together.

## Matchmaking

New match → Online starts a rated search in the selected mode for a registered account. The client
closes the setup dialog and shows the selected mode, elapsed search time, and connection
status in a compact fixed bar attached to the top of every page. Other game-start controls stay disabled while searching or
cancelling. A match starts automatically when paired. The client renews the search every five seconds. An entry expires after
30 seconds without renewal. Coaches
must use the same balance fingerprint; blocked coaches never meet. The allowed rating gap starts
at 100, grows by ten per second of waiting, and stops at 1,000. Cancelling returns a match that was
already paired, so both participants can still start it. Interrupted cancellation requests retry
until the server confirms cancellation or returns the paired duel.

Pairing, cancellation, and invitation acceptance share a transaction lock. Pairing rechecks active
duels after acquiring that lock, and acceptance also locks both coaches in UUID order. This prevents
overlapping searches and friend invitations from creating two active matches for one coach. The
queue is intentionally serialized; monitor database latency before expanding beyond a small service.

Results use Elo with K = 50 and a 400-point scale. Equal ratings move by 25, with no throne bonus.
Ratings stay above zero and retain at least a one-point change. Above the floor, a win transfers
points between coaches. Each side's first result is immutable. A reported result survives a silent
opponent's timeout claim; a contradicting report or subsequent board creates a counted dispute.
Reporting releases that coach to play again. Local pending reports survive reloads and retry.

An honest client rejects boards whose gold, heroes, items and paid XP/rerolls exceed the budget it
replayed for the opponent. XP progression and streaks are checked too. This prevents free upgrades,
but does not prove that heroes came from the seeded shop. Results still come from clients: malicious
reports and collusion require authoritative action or battle verification for stronger protection.
Disputes are counted for review; victims are not automatically excluded from matchmaking.

## Traffic and retention

- Presence returns only online friends through a 30-second heartbeat, plus activity changes. It no
  longer subscribes every player to a global presence channel. Offline detection takes up to 75 seconds.
- Live matches publish on match, round and phase changes. Between changes, unwatched matches send
  only a heartbeat. A watching friend enables full updates every three seconds, and demand expires
  ten seconds after their last request. Viewers can initially see the last phase snapshot until the
  player's next update. A missing stored row is republished automatically.
- Board payloads travel through RPCs. Realtime watches the small duel row; board subscriptions are
  removed. Active duels retain the latest exchanged round for retries, and settlement deletes boards.
- The append-only match archive stores summaries without round lineups or replay data, including
  trimming existing rows. Full recent replays remain in profiles and are served by `coach_match`.
- Archive summaries expire after 90 days; terminal duels after 30 days; expired invitations after one
  day; idle queue entries after one minute; idle live snapshots after ten minutes; friend decline
  cooldown records after seven days; telemetry deduplication receipts after two days. Cron run logs
  are retained for seven days. Profiles, ratings, consent records, messages and accounts are preserved.

When available, the migration enables `pg_cron` and schedules `settle-stale-duels` every five minutes
and `cleanup-old-data` daily at 03:17 UTC. Unresponsive rounds can be claimed after 180 seconds. The
scheduled fallback handles them after the timeout plus two minutes; completely idle duels are
abandoned after 30 minutes. If Cron is unavailable, the migration emits a notice and an administrator
must schedule `public.settle_stale_duels()` and `public.cleanup_old_data()` externally. Confirm the
jobs execute successfully in the project's Cron dashboard after deployment.

The live optimizations reduce payload traffic; they still make small RPCs while a match is open.
These changes do not guarantee remaining within every Free plan quota. Watch database size, egress,
Realtime usage and RPC latency in the Supabase dashboard.

## MMR leaderboard

`mmr_leaderboard(mode)` returns at most 100 registered coaches, ordered by server rating in that
mode. Equal ratings share a place. It exposes only a stable coach ID, nickname,
chosen avatar/photo, rating and place. It does not read saved profile data or return friend codes,
contact details, consent, match history or presence. Guests can browse; signed-in viewers do not
see coaches blocked in either direction. Raw tables retain their existing restrictions.

The leaderboard is a view-only table opened from the profile. Friendship requests use the existing
friend-code flow in the friends panel. `20261003150000_read_only_leaderboard.sql` removes the former
leaderboard-specific request endpoint for projects that installed it. Apply all pending migrations
before deploying the updated UI.

For a project managed through Supabase's SQL Editor, run the contents of
`supabase/migrations/20261003140000_mmr_leaderboard.sql` after any earlier pending migrations,
then `supabase/migrations/20261003150000_read_only_leaderboard.sql`.
The similarly named `supabase/tests/mmr_leaderboard.sql` only tests existing functions; it does
not install the feature. Confirm installation with:

```sql
select to_regprocedure('public.mmr_leaderboard(text)');
-- This removed endpoint should return NULL:
select to_regprocedure('public.request_leaderboard_friend(uuid)');
select * from public.mmr_leaderboard('threeLanes');
```

If `mmr_leaderboard` is missing, apply its migration in the same project/database as the client.
An error saying `mmr_leaderboard(unknown) does not exist` means the function is missing;
the quoted game-mode argument does not need an explicit cast.

## Support notifications

`20261004130000_support_telegram.sql` forwards each new support request to a Telegram chat through
`pg_net`. Create a bot with @BotFather, send it any message from the chat that should receive requests,
and read the chat ID from `https://api.telegram.org/bot<token>/getUpdates`. Then store both values in
Vault from the SQL Editor:

```sql
select vault.create_secret('<bot token>', 'support_telegram_token');
select vault.create_secret('<chat id>', 'support_telegram_chat');
```

Without both secrets the trigger does nothing. Delivery is asynchronous and never blocks a submission;
Telegram's replies stay in `net._http_response` for a few hours if a message does not arrive. To rotate
the token, use `vault.update_secret`. Requests remain in `support_requests` for Table Editor review.

## SQL validation

Account deletion in 8.8.1 requires `20261003160000_delete_account.sql` before the client is deployed.
The `delete_account()` RPC accepts no account ID and erases only its authenticated registered caller.
Auth, profiles, ratings, matches, social data, duels, queue entries, live matches and consent records
cascade from the account. Support requests are explicitly erased, including their text and reply address.
The existing anonymous analytics deletion job remains until external erasure is acknowledged by
`telemetry-cleanup`; ensure that function is deployed and scheduled. The client clears account progress
and saved games on this device after success. Language and sound preferences are retained.

Run `supabase/tests/*.sql` as the database owner against a disposable Supabase database after all
migrations. Each suite creates its own fixtures and rolls back. `fair_duels.sql` covers reporting,
timeouts, Elo, pairing, version isolation, blocking and cancellation. `lean_storage.sql` covers
friend-only presence and viewing, viewer expiry, retention and function privileges.
`mmr_leaderboard.sql` covers public fields, per-mode ordering, ties, guest access, blocked coaches,
the 100-row cap and removal of the leaderboard-specific request endpoint. `delete_account.sql` checks
caller isolation, guest rejection, all dependent game records, support erasure and external analytics
deletion jobs. Fixtures run inside a rolled-back transaction.

Local validation used an isolated PostgreSQL runtime with stand-ins for Supabase's `auth.uid()`,
`auth.jwt()`, roles and Realtime publication. It executes the migrations and SQL suites, but does
not exercise parallel database sessions, the hosted Auth service, Realtime delivery or Cron's
scheduler. Validate those integrations on a disposable Supabase project before a public rollout.
