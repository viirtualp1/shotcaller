import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { arbitrateGhost } from '@/application/social/ghostArbiter'
import { arbitrateDuel, winningSide } from '@/application/social/arbiter'
import { MATCH_RULES_FINGERPRINT } from '@/content/matchRules'
import { MODE_IDS } from '@/content/ids'

/**
 * Settles disputed ranked duels by replaying them (`supabase/migrations/20261007180000_ranked_integrity.sql`).
 * Needs the service key: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run arbiter`. Pass `--dry-run` to print
 * the verdicts without settling anything.
 */

/* A duel played under other battle rules waits a day for an arbiter of its version, then stays uncounted. */
const OTHER_RULES_GRACE_MS = 24 * 60 * 60 * 1000

const queueSchema = z.array(
  z.object({
    id: z.uuid(),
    mode: z.enum(MODE_IDS),
    seed: z.string().nullable(),
    balance: z.string().nullable(),
    finishedAt: z.string().nullable().optional(),
    boards: z.array(
      z.object({
        round: z.int(),
        side: z.union([z.literal(0), z.literal(1)]),
        board: z.unknown(),
      }),
    ),
  }),
)

const ghostQueueSchema = z.array(
  z.object({
    id: z.uuid(),
    mode: z.enum(MODE_IDS),
    seed: z.string(),
    balance: z.string(),
    finishedAt: z.string(),
    boards: z.array(z.unknown()),
    ghostBoards: z.array(z.unknown()).min(3),
  }),
)

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const dryRun = process.argv.includes('--dry-run')

if (!url || !key) {
  console.log('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set: nothing to arbitrate.')
  process.exit(0)
}

const client = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const { data, error } = await client.rpc('arbitration_queue', { max_duels: 50 })
if (error) {
  throw new Error(`Could not read the arbitration queue: ${error.message}`)
}

const queue = queueSchema.parse(data)
let settled = 0

for (const duel of queue) {
  const age = duel.finishedAt ? Date.now() - Date.parse(duel.finishedAt) : Infinity

  let side: number | null
  if (!duel.seed) {
    side = null
  } else if (duel.balance !== MATCH_RULES_FINGERPRINT) {
    if (age < OTHER_RULES_GRACE_MS) {
      console.log(`${duel.id}: played under other battle rules, waiting`)

      continue
    }

    side = null
  } else {
    const verdict = arbitrateDuel({
      mode: duel.mode,
      seed: duel.seed,
      boards: duel.boards,
    })

    side = winningSide(verdict)

    console.log(
      `${duel.id}: ${verdict.kind}, ${side === null ? 'undecided' : side === -1 ? 'draw' : `side ${side} won`}`,
    )
  }

  if (dryRun) {
    continue
  }

  const { error: settleError } = await client.rpc('arbitrate_duel', {
    duel: duel.id,
    winning_side: side,
  })

  if (settleError) {
    console.error(`${duel.id}: could not settle: ${settleError.message}`)
    process.exitCode = 1

    continue
  }

  settled++
}

console.log(`${queue.length} disputed duels, ${settled} settled${dryRun ? ' (dry run)' : ''}`)

const { data: recordingsData, error: recordingsError } = await client.rpc('ghost_recording_queue', {
  max_duels: 50,
})

if (recordingsError) {
  throw new Error('Could not read recordings queue: ' + recordingsError.message)
}

const recordings = queueSchema.parse(recordingsData)
for (const recording of recordings) {
  if (
    recording.balance !== MATCH_RULES_FINGERPRINT &&
    recording.finishedAt &&
    Date.now() - Date.parse(recording.finishedAt) < OTHER_RULES_GRACE_MS
  ) {
    continue
  }

  const valid =
    recording.balance === MATCH_RULES_FINGERPRINT &&
    recording.seed !== null &&
    arbitrateDuel({
      mode: recording.mode,
      seed: recording.seed,
      boards: recording.boards,
    }).kind === 'decided'

  console.log(recording.id + ': recording ' + (valid ? 'verified' : 'rejected'))

  if (dryRun) {
    continue
  }

  const { error: recordingError } = await client.rpc('verify_ghost_recording', {
    duel: recording.id,
    valid,
  })

  if (recordingError) {
    console.error(recording.id + ': could not verify recording: ' + recordingError.message)
    process.exitCode = 1
  }
}

const { data: ghostData, error: ghostError } = await client.rpc('ghost_arbitration_queue', { max_duels: 50 })
if (ghostError) {
  throw new Error(`Could not read ghost arbitration queue: ${ghostError.message}`)
}

let verified = 0
const ghosts = ghostQueueSchema.parse(ghostData)
for (const ghost of ghosts) {
  if (
    ghost.balance !== MATCH_RULES_FINGERPRINT &&
    Date.now() - Date.parse(ghost.finishedAt) < OTHER_RULES_GRACE_MS
  ) {
    console.log(`${ghost.id}: other ghost battle rules, waiting`)

    continue
  }

  /* Under rules this code no longer has, the reported result stands; a broken recording leaves it uncounted. */
  const replay = ghost.balance === MATCH_RULES_FINGERPRINT ? arbitrateGhost(ghost) : null
  const side = replay?.side ?? null
  const neutralize = replay?.neutralize ?? false

  console.log(`${ghost.id}: ghost verdict ${side ?? (neutralize ? 'uncounted' : 'kept as reported')}`)

  if (dryRun) {
    continue
  }

  const { error: verifyError } = await client.rpc('verify_ghost', {
    ghost: ghost.id,
    winning_side: side,
    neutralize,
  })

  if (verifyError) {
    console.error(`${ghost.id}: could not verify: ${verifyError.message}`)
    process.exitCode = 1

    continue
  }

  verified++
}

console.log(`${ghosts.length} ghost duels, ${verified} verified${dryRun ? ' (dry run)' : ''}`)
