# Duel arbiter

Both devices replay every duel battle and report the result. When their reports disagree, a ranked duel is not
dropped any more: the server keeps every board both sides sent, and the arbiter replays the duel with the same
deterministic simulation the game runs. The replay settles the rating as the duel was really played.

- `supabase/migrations/20261007180000_ranked_integrity.sql` keeps the boards of ranked duels until they are settled,
  and those of a disputed one until the arbiter has replayed it (at most a week). It also stops early forfeits from
  paying the winner, caps rated duels between the same two coaches at three a day, and closes ranked for 14 days
  for a coach whose reports two replays in 30 days contradicted.
- `src/application/social/arbiter.ts` replays a duel from its boards. Every board is checked against the rules and
  the previous round, as the receiving device checks it; a board that breaks them loses the duel for its side.
- `scripts/arbiter.ts` reads the queue with the service key, replays each duel and settles it.
- `.github/workflows/arbiter.yml` runs the script every 15 minutes.

## Setup

1. Apply both `20261007180000_ranked_integrity.sql` and `20261007190000_ghosts.sql`.
   The ghost migration must precede deploying its client.
   Bootstrap the current balance's pool using `npm run ghosts:seed` with the same service credentials.
   Use `npm run ghosts:seed -- --dry-run --runs 1` to validate generation without uploading.
2. Add the repository secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in **GitHub > Settings > Secrets and
   variables > Actions**. Missing credentials fail the workflow visibly instead of reporting a successful empty run.
3. Run the workflow once by hand (**Actions > Arbitrate disputed duels > Run workflow**) and check its log.
4. Add the repository variable `ARBITER_ENABLED` = `true` on the same page (**Variables** tab). Until then the
   15-minute schedule stays idle instead of failing every run.

To try it locally without settling anything:

```sh
SUPABASE_URL=https://<project>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> npm run arbiter -- --dry-run
```

## Versions

A duel remembers the rules of the whole match (`MATCH_RULES_FINGERPRINT` in `src/content/matchRules.ts`) its
coaches queued with: the fights, and also prices, gold, levels, round judging and the computer coach that plays a
ghost on. Two clients that would judge a board or a round differently are never paired, and the arbiter only
replays a match under the rules of its own code. `tests/domain/matchRules.spec.ts` pins what each fingerprint does;
a code change that plays a match differently fails it until `MATCH_LOGIC_REVISION` is bumped and the new
fingerprint is pinned.

A live dispute played under other rules waits a day for an arbiter of its version, then stays uncounted. A ghost
duel under other rules keeps the result its coach reported. Run the arbiter from the branch that is deployed, and
seed ghosts again (`npm run ghosts:seed`) after any release that changes the fingerprint.

## Ghost opponents

After 45 seconds in a continuously refreshed ranked queue, the client asks for a recorded opponent under the
same balance rules. The server checks the wait, the single active-match slot, sanctions and blocked coaches.
Only committed rounds reveal a ghost board; retries cannot replace the submitted board. The recorded coach
remains anonymous and their rating is unchanged. Human recordings enter the selectable pool only after the arbiter has replayed the full original duel and checked both economies. A ghost changes the playing coach's MMR by half (13 between
equals), rounded away from zero. The match can be resumed from this device's save; another device can forfeit
it. An abandoned match loses after two hours.

The bootstrap ratings (0, 500, 1000) are provisional tiers for easy, standard and hard bot recordings, not measured
player ratings. Finished live ranked matches supply real recordings. Seed every new balance fingerprint;
old-rule runs are never selected. The pool keeps the newest 300 recordings per mode and balance.

A coach meets each recording at most once in 30 days, only the first ten ghost duels of a day move their rating,
and a ghost duel can be reported as won or drawn only after three rounds.

The arbiter now also checks ghost results. Incomplete claimed results count as losses; explicit forfeits do not
require a replay and cannot count as false reports. A broken ghost board or unavailable old rules neutralizes
the provisional rating rather than penalizing the coach. Keep service keys in server/Actions secrets.

The fallback is optional: at 45 seconds the player can choose **Play a ghost** or keep waiting for a live coach.
Simply waiting never starts a recorded match. If no recording is available, the live queue remains active.

Until its recording ends, a ghost repeats each recorded round's squad and positions. After that, the standard
computer coach takes over the last squad: it earns the ordinary income from this match, buys heroes/items,
levels and rearranges lanes. It receives no Hard bonus gold and cannot see the human's current draft.
The server exposes the recording length, but future boards remain private. After the last recorded turn,
the round endpoint returns the final recording as an anchor; client and arbiter derive the continuing board
from the previous battle's ghost state, the duel seed and the current round. Its random stream and hero pool
are separate from the human's, so purchases and reloads cannot change the arbiter's reconstruction.

## Release checks

`npm run test:sql` loads all migrations into a disposable PGlite PostgreSQL database and runs every check in
`supabase/tests`. It uses local Auth/Vault/pg_net stubs and
does not validate hosted cron or Edge Functions. CI runs it alongside application tests and both builds.

Apply migrations, deploy the changed `steam-auth` and `game-telemetry` Edge Functions, seed the current balance
and configure the arbiter before releasing the client. Vercel deployment and these backend steps are separate
from the GitHub CI workflow. A passing local build does not mean these production steps ran.

Discord announcements now depend on successful CI and only run on pushes to main, skipping a version that was
already the latest before the push. No announcement is sent for a pull request or a failed build.

## Moderation

Contradicted reports are kept in `duels.false_reporters` and `ghost_duels.false_report`. Both count towards the
same two-in-30-days limit, regardless of their order. A coach kept out of ranked has a `ranked` sanction, which
`public.lift_sanction(player, 'ranked')` lifts from the SQL editor.
