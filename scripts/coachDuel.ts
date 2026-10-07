import { parseArgs } from 'node:util'
import { createMatch } from '@/application/createMatch'
import { MODE_IDS, type ModeId } from '@/content/ids'
import { DEFAULT_MODE } from '@/content/modes'
import { opponentStyleFor, type Difficulty, type OpponentStyle } from '@/content/rules'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { headlessResolver } from '@/simulation/BattleSimulation'

/** Computer coaches of two difficulties play each other: how often the first one wins. */
const { values } = parseArgs({
  options: {
    first: {
      type: 'string',
      default: 'hard',
    },
    second: {
      type: 'string',
      default: 'standard',
    },
    matches: {
      type: 'string',
      default: '40',
    },
    mode: {
      type: 'string',
      default: DEFAULT_MODE,
    },
    seed: {
      type: 'string',
      default: 'coach-duel',
    },
    /** JSON with style fields that replace the first coach's, to try a change before writing it down. */
    override: {
      type: 'string',
    },
  },
})

const override = values.override ? (JSON.parse(values.override) as Partial<OpponentStyle>) : {}

const mode = MODE_IDS.find((id) => id === values.mode)
if (!mode) {
  throw new Error(`Unknown mode ${values.mode}; pick one of ${MODE_IDS.join(', ')}`)
}

const first = values.first as Difficulty
const second = values.second as Difficulty

const results = {
  first: 0,
  second: 0,
  draw: 0,
}

const started = performance.now()

for (let i = 0; i < Number(values.matches); i++) {
  const seed = `${values.seed}-${i}`
  /* Every other match the coaches swap sides, so neither side's advantage counts for one of them. */
  const swapped = i % 2 === 1
  const [human, rival] = swapped ? [second, first] : [first, second]

  const style = (difficulty: Difficulty, isFirst: boolean) => ({
    ...opponentStyleFor(mode, difficulty),
    ...(isFirst ? override : {}),
  })

  const match = createMatch({
    seed,
    ids: sequentialIds(seed),
    mode: mode as ModeId,
    opponentCoach: new GreedyCoach(undefined, style(rival, swapped)),
  })

  const coach = new GreedyCoach(undefined, style(human, !swapped))
  const rng = createRng(`${seed}-human`)

  while (match.phase !== 'finished') {
    coach.playTurn(match.human, {
      round: match.round,
      rng,
    })

    match.finishBattle(headlessResolver.resolve(match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()))

    if (match.phase === 'summary') {
      match.nextRound()
    }
  }

  const winner = match.result!.winner
  if (winner === null) {
    results.draw++
  } else if ((winner === 0) !== swapped) {
    results.first++
  } else {
    results.second++
  }
}

const total = Number(values.matches)
const pct = (n: number) => `${Math.round((100 * n) / total)}%`

console.log(
  `${mode}, ${total} matches in ${((performance.now() - started) / 1000).toFixed(0)}s: ` +
    `${first} ${pct(results.first)}, ${second} ${pct(results.second)}, draw ${pct(results.draw)}`,
)
