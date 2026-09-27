import { parseArgs } from 'node:util'
import { createMatch } from '@/application/createMatch'
import { HEROES } from '@/content/heroes'
import type { HeroId } from '@/content/ids'
import { STAR_POWER } from '@/content/rules'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { headlessResolver } from '@/simulation/BattleSimulation'

const { values } = parseArgs({
  options: { matches: { type: 'string', default: '50' }, seed: { type: 'string', default: 'balance' } },
})
const matchCount = Number(values.matches)

interface HeroTally {
  appearances: number
  damage: number
  kills: number
  deaths: number
}

const tallies = new Map<HeroId, HeroTally>()
const rounds: number[] = []
const results = { human: 0, opponent: 0, draw: 0, byThrone: 0 }
const started = performance.now()

for (let i = 0; i < matchCount; i++) {
  const seed = `${values.seed}-${i}`
  const match = createMatch({ seed, ids: sequentialIds(seed) })
  const humanCoach = new GreedyCoach()
  const rng = createRng(`${seed}-human`)
  while (match.phase !== 'finished') {
    humanCoach.playTurn(match.human, { round: match.round, rng })
    const setup = match.startBattle()._unsafeUnwrap()
    const outcome = headlessResolver.resolve(setup)
    for (const hero of outcome.heroes) {
      const tally = tallies.get(hero.heroId) ?? { appearances: 0, damage: 0, kills: 0, deaths: 0 }
      tally.appearances++
      tally.damage += hero.damageDealt / STAR_POWER[hero.stars]
      tally.kills += hero.kills
      tally.deaths += hero.deaths
      tallies.set(hero.heroId, tally)
    }
    match.finishBattle(outcome)
    if (match.phase === 'summary') match.nextRound()
  }
  const result = match.result!
  rounds.push(match.round)
  if (result.reason === 'throne') results.byThrone++
  if (result.winner === 0) results.human++
  else if (result.winner === 1) results.opponent++
  else results.draw++
}

rounds.sort((a, b) => a - b)
const pct = (n: number) => `${Math.round((n / matchCount) * 100)}%`
console.log(`matches: ${matchCount} in ${((performance.now() - started) / 1000).toFixed(1)}s`)
console.log(`rounds: min ${rounds[0]}, median ${rounds[rounds.length >> 1]}, max ${rounds.at(-1)}`)
console.log(`winner: team0 ${pct(results.human)}, team1 ${pct(results.opponent)}, draw ${pct(results.draw)}`)
console.log(`decided by throne: ${pct(results.byThrone)}`)
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
