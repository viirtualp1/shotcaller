import { parseArgs } from 'node:util'
import { createMatch } from '@/application/createMatch'
import { HEROES } from '@/content/heroes'
import { LANE_STANCES, MODE_IDS, opponentOf, type HeroId, type ModeId, type TeamId } from '@/content/ids'
import { DEFAULT_MODE, MODES } from '@/content/modes'
import { STAR_POWER } from '@/content/rules'
import { sequentialIds } from '@/core/ids'
import { distance } from '@/core/math/vec2'
import { createRng } from '@/core/random/rng'
import type { BattleSetup } from '@/domain/battle/contracts'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import { isAlive } from '@/simulation/ecs/components'

const { values } = parseArgs({
  options: {
    matches: {
      type: 'string',
      default: '50',
    },
    seed: {
      type: 'string',
      default: 'balance',
    },
    mode: {
      type: 'string',
      default: DEFAULT_MODE,
    },
    /** An order team 0 gives every lane, to see what it is worth against lanes left to their heroes. */
    order: {
      type: 'string',
    },
  },
})

const matchCount = Number(values.matches)
const mode = MODE_IDS.find((id) => id === values.mode)
if (!mode) {
  throw new Error(`Unknown mode ${values.mode}; pick one of ${MODE_IDS.join(', ')}`)
}

const order = LANE_STANCES.find((id) => id === values.order) ?? null
if (values.order && !order) {
  throw new Error(`Unknown order ${values.order}; pick one of ${LANE_STANCES.join(', ')}`)
}

interface HeroTally {
  appearances: number
  damage: number
  kills: number
  deaths: number
}

const tallies = new Map<HeroId, HeroTally>()
const rounds: number[] = []

const results = {
  human: 0,
  opponent: 0,
  draw: 0,
  byThrone: 0,
}

/* How lively the matches are: the lead in rounds changing hands, a trailing side winning, rounds left even. */
const pace = {
  leadChanges: 0,
  comebacks: 0,
  drawnRounds: 0,
  roundsPlayed: 0,
}

/** Heroes this close to a falling hero count as being in the fight with it. */
const NEARBY = 250

/* How heroes die: with no ally hero around, or against more enemy heroes than the allies at hand. */
const deaths = {
  total: 0,
  alone: 0,
  outnumbered: 0,
}

function resolve(setup: BattleSetup) {
  const simulation = new BattleSimulation(setup)

  simulation.events.on('heroKilled', ({ victim }) => {
    const near = (team: TeamId) =>
      simulation.queries.heroes.entities.filter(
        (h) =>
          h !== victim && h.team === team && isAlive(h) && distance(h.position, victim.position) <= NEARBY,
      ).length

    const allies = near(victim.team)
    const enemies = near(opponentOf(victim.team))
    deaths.total++
    deaths.alone += allies === 0 ? 1 : 0
    deaths.outnumbered += enemies > allies + 1 ? 1 : 0
  })

  return simulation.runToEnd()
}

const started = performance.now()

for (let i = 0; i < matchCount; i++) {
  const seed = `${values.seed}-${i}`

  const match = createMatch({
    seed,
    ids: sequentialIds(seed),
    mode: mode as ModeId,
  })

  let leader = 0
  const trailed = [false, false]

  const humanCoach = new GreedyCoach()
  const rng = createRng(`${seed}-human`)
  while (match.phase !== 'finished') {
    humanCoach.playTurn(match.human, {
      round: match.round,
      rng,
    })

    for (const lane of MODES[mode].lanes) {
      match.human.setStance(lane, order)
    }

    const setup = match.startBattle()._unsafeUnwrap()
    const outcome = resolve(setup)
    for (const hero of outcome.heroes) {
      const tally = tallies.get(hero.heroId) ?? {
        appearances: 0,
        damage: 0,
        kills: 0,
        deaths: 0,
      }

      tally.appearances++
      tally.damage += hero.damageDealt / STAR_POWER[hero.stars]
      tally.kills += hero.kills
      tally.deaths += hero.deaths
      tallies.set(hero.heroId, tally)
    }

    const summary = match.finishBattle(outcome)._unsafeUnwrap()
    pace.roundsPlayed++
    pace.drawnRounds += summary.winner === null ? 1 : 0

    const [ours, theirs] = match.stats.teams.map((team) => team.roundsWon) as [number, number]
    const lead = Math.sign(ours - theirs)
    if (lead !== 0 && leader !== 0 && lead !== leader) {
      pace.leadChanges++
    }

    if (lead !== 0) {
      leader = lead
      trailed[lead > 0 ? 1 : 0] = true
    }

    if (match.phase === 'summary') {
      match.nextRound()
    }
  }

  const result = match.result!
  rounds.push(match.round)

  if (result.reason === 'throne') {
    results.byThrone++
  }

  if (result.winner !== null && trailed[result.winner]) {
    pace.comebacks++
  }

  if (result.winner === 0) {
    results.human++
  } else if (result.winner === 1) {
    results.opponent++
  } else {
    results.draw++
  }
}

rounds.sort((a, b) => a - b)
const pct = (n: number) => `${Math.round((n / matchCount) * 100)}%`
console.log(
  `mode ${mode}${order ? `, team0 order ${order}` : ''}, matches: ${matchCount} in ${((performance.now() - started) / 1000).toFixed(1)}s`,
)

console.log(`rounds: min ${rounds[0]}, median ${rounds[rounds.length >> 1]}, max ${rounds.at(-1)}`)
console.log(`winner: team0 ${pct(results.human)}, team1 ${pct(results.opponent)}, draw ${pct(results.draw)}`)
console.log(`decided by throne: ${pct(results.byThrone)}`)

console.log(
  `lead changes per match: ${(pace.leadChanges / matchCount).toFixed(2)}, comebacks: ${pct(pace.comebacks)}, ` +
    `drawn rounds: ${Math.round((pace.drawnRounds / pace.roundsPlayed) * 100)}%`,
)

console.log(
  `hero deaths per round: ${(deaths.total / pace.roundsPlayed).toFixed(2)}, ` +
    `alone: ${Math.round((deaths.alone / deaths.total) * 100)}%, ` +
    `outnumbered: ${Math.round((deaths.outnumbered / deaths.total) * 100)}%`,
)

console.log('\nhero            picks  dmg/round(1★)  kills/round  deaths/round')

for (const [id, t] of [...tallies].sort(
  (a, b) => b[1].damage / b[1].appearances - a[1].damage / a[1].appearances,
)) {
  console.log(
    `${id.padEnd(14)} ${String(t.appearances).padStart(6)} ${String(Math.round(t.damage / t.appearances)).padStart(14)}` +
      ` ${(t.kills / t.appearances).toFixed(2).padStart(12)} ${(t.deaths / t.appearances).toFixed(2).padStart(13)}` +
      `  tier ${HEROES[id].tier}`,
  )
}
