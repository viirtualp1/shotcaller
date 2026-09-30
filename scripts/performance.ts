import { cpus, platform, arch } from 'node:os'
import { performance } from 'node:perf_hooks'
import { MODE_IDS, HERO_IDS, ITEM_IDS } from '@/content/ids'
import { MODES } from '@/content/modes'
import { BATTLE } from '@/content/rules'
import { demoBattle } from '@/domain/demo/demoBattle'
import { BattleSimulation } from '@/simulation/BattleSimulation'

const percentile = (samples: number[], p: number) =>
  samples.toSorted((a, b) => a - b)[Math.min(samples.length - 1, Math.floor(samples.length * p))]!

const round = (number: number) => Number(number.toFixed(3))
const runs = 5
const results = []
for (const mode of MODE_IDS) {
  for (const scenario of ['preview', 'late-round'] as const) {
    const samples: number[] = []
    const duration: number[] = []
    let maxEntities = 0
    for (let run = -1; run < runs; run++) {
      const setup = demoBattle(mode, `performance-${run}`)
      const count = MODES[mode].levels.at(-1)!.board

      const lineups = setup.lineups.map((lineup, team) => {
        const heroes = MODES[mode].lanes.flatMap((lane) => lineup[lane]).slice(0, count)
        return Object.fromEntries(
          ['top', 'mid', 'bot'].map((lane) => [
            lane,
            heroes
              .filter((_hero, index) => MODES[mode].lanes[index % MODES[mode].lanes.length] === lane)
              .map((hero, index) => ({
                ...hero,
                uid: `perf-${team}-${lane}-${index}`,
                heroId: HERO_IDS[(index * 3 + team * 7 + run + HERO_IDS.length) % HERO_IDS.length]!,
                stars: 3 as const,
                items: [
                  ITEM_IDS[(index + team) % ITEM_IDS.length]!,
                  ITEM_IDS[(index + team + 3) % ITEM_IDS.length]!,
                ],
              })),
          ]),
        ) as unknown as typeof lineup
      }) as unknown as typeof setup.lineups

      const simulation = new BattleSimulation(
        scenario === 'preview'
          ? setup
          : {
              ...setup,
              round: 16,
              lineups,
            },
      )

      const start = performance.now()
      while (!simulation.isOver) {
        const stepStart = performance.now()
        simulation.step()

        if (run >= 0) {
          samples.push(performance.now() - stepStart)
          maxEntities = Math.max(maxEntities, simulation.world.size)
        }
      }

      if (run >= 0) {
        duration.push(performance.now() - start)
      }

      simulation.dispose()
    }

    results.push({
      mode,
      scenario,
      runs,
      steps: samples.length,
      maxEntities,
      meanStepMs: round(samples.reduce((sum, sample) => sum + sample, 0) / samples.length),
      p95StepMs: round(percentile(samples, 0.95)),
      p99StepMs: round(percentile(samples, 0.99)),
      maxStepMs: round(Math.max(...samples)),
      p95CpuMsPer60HzFrameAt2x: round(percentile(samples, 0.95) * (2 / 60 / BATTLE.step)),
      longestFullRoundMs: round(Math.max(...duration)),
    })
  }
}

console.log(
  JSON.stringify(
    {
      machine: {
        cpu: cpus()[0]?.model,
        arch: arch(),
        platform: platform(),
        node: process.version,
      },
      stepSeconds: BATTLE.step,
      results,
    },
    null,
    2,
  ),
)
