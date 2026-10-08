import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { createMatch } from '@/application/createMatch'
import { MATCH_RULES_FINGERPRINT } from '@/content/matchRules'
import { MODE_IDS } from '@/content/ids'
import { opponentStyleFor, type Difficulty } from '@/content/rules'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import type { PlayerState } from '@/domain/player/Player'
import { headlessResolver } from '@/simulation/BattleSimulation'

/** Bootstrap the current rules' pool. --dry-run generates runs without uploading them. */
const { values } = parseArgs({
  options: {
    /* A coach never meets a recording twice in 30 days, so the pool needs depth at every rating. */
    runs: {
      type: 'string',
      default: '20',
    },
    seed: {
      type: 'string',
      default: 'ghost-bootstrap',
    },
    'dry-run': {
      type: 'boolean',
      default: false,
    },
  },
})

const count = Number(values.runs)

const tiers: readonly { difficulty: Difficulty; rating: number }[] = [
  {
    difficulty: 'relaxed',
    rating: 0,
  },
  {
    difficulty: 'standard',
    rating: 500,
  },
  {
    difficulty: 'hard',
    rating: 1000,
  },
]

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!Number.isInteger(count) || count < 1 || count > 60) {
  throw new Error('--runs must be an integer between 1 and 60 per tier and mode')
}

if (!values['dry-run'] && (!url || !key)) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use --dry-run')
}

const client = values['dry-run']
  ? null
  : createClient(url!, key!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

let total = 0
for (const mode of MODE_IDS) {
  for (const { difficulty, rating } of tiers) {
    for (let index = 0; index < count; index++) {
      /* Every set of rules gets its own matches, not the same ones replayed under new numbers. */
      const seed = `${values.seed}:${MATCH_RULES_FINGERPRINT}:${mode}:${difficulty}:${index}`

      const match = createMatch({
        seed,
        mode,
        ids: sequentialIds(seed),
      })

      const coach = new GreedyCoach(undefined, opponentStyleFor(mode, difficulty))
      const rng = createRng(`${seed}:coach`)
      const boards: PlayerState[] = []

      while (match.phase === 'planning') {
        coach.playTurn(match.human, {
          round: match.round,
          rng,
        })

        boards.push(match.human.snapshot())
        const setup = match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()
        match.finishBattle(headlessResolver.resolve(setup))._unsafeUnwrap()
        match.nextRound()
      }

      if (boards.length < 3) {
        continue
      }

      if (client) {
        const { error } = await client.rpc('add_ghost_runs', {
          runs: [
            {
              mode,
              balance: MATCH_RULES_FINGERPRINT,
              rating,
              boards,
            },
          ],
        })

        if (error) {
          throw new Error(`Could not upload ${mode}/${difficulty}: ${error.message}`)
        }
      }

      total++
      console.log(`${mode}/${difficulty}: ${boards.length} boards${client ? ' uploaded' : ' generated'}`)
    }
  }
}

console.log(`${total} runs for ${MATCH_RULES_FINGERPRINT}${client ? '' : ' (dry run)'}`)
