import type { ModeId } from '@/content/ids'
import { COPIES_PER_STAR } from '@/content/rules'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { HeroPool } from '@/domain/economy/HeroPool'
import { Player, type PlayerState } from '@/domain/player/Player'

/**
 * After the recording, a coach spends the ghost's actual match income and rearranges its own squad.
 * Its shop, random stream and ids are independent of human purchases, so a saved client and the arbiter
 * reproduce the same turn from the previous board. It never reads the human's current lineup.
 */
export function continueGhostBoard(previous: PlayerState, mode: ModeId, seed: string, round: number) {
  const pool = new HeroPool()
  const remaining = pool.snapshot()
  const owned = [...previous.roster.bench, ...Object.values(previous.roster.lanes).flat()]
  for (const hero of owned) {
    remaining[hero.heroId] = Math.max(0, remaining[hero.heroId] - COPIES_PER_STAR[hero.stars])
  }

  pool.restore(remaining)
  const rng = createRng(`ghost-tail:${seed}:${round}`)

  const player = new Player(1, {
    mode,
    pool,
    rng,
    ids: sequentialIds(`ghost-tail:${round}`),
  })

  // Previous offers expire. Owned copies remain out of this independent pool.
  player.restore({
    ...previous,
    shop: [],
  })

  player.prepareRound()

  new GreedyCoach().playTurn(player, {
    round,
    rng,
  })

  return player.snapshot()
}
