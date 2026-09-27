import type { LaneId } from '@/content/ids'
import type { Rng } from '@/core/random/rng'
import type { Player } from '../player/Player'
import type { OwnedHero } from '../roster/Roster'
import { heroPower, type LaneOptimizer } from './LaneOptimizer'

export function arrangeStrongestLineup(player: Player, optimizer: LaneOptimizer, rng?: Rng): void {
  const team = [...player.roster.all()]
    .sort((a, b) => heroPower(b) - heroPower(a))
    .slice(0, player.boardCapacity)
  const lanes = optimizer.assign(team, rng)
  const board = new Map<OwnedHero, LaneId>(team.map((hero, i) => [hero, lanes[i]!]))
  player.roster.arrange(board)
}
