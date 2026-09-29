import { HERO_IDS, ITEM_IDS, type LaneId, type ModeId, type TeamId } from '@/content/ids'
import { MODES } from '@/content/modes'
import { createRng, weightedPick, type Rng } from '@/core/random/rng'
import type { BattleSetup } from '../battle/contracts'
import { freshStructures } from '../match/structures'
import type { Lineup, OwnedHero } from '../roster/Roster'

/** Heroes each side brings, spread over the mode's lanes. */
const HEROES_PER_SIDE = 6
/** Mid-game creeps and buildings, so both sides have something to push through. */
const DEMO_ROUND = 6

const anyOf = <T>(rng: Rng, items: readonly T[]) => weightedPick(rng, items, () => 1)!

function lineupOf(team: TeamId, mode: ModeId, rng: Rng): Lineup {
  const lanes = MODES[mode].lanes

  const lineup: Record<LaneId, OwnedHero[]> = {
    top: [],
    mid: [],
    bot: [],
  }

  for (let i = 0; i < HEROES_PER_SIDE; i++) {
    lineup[lanes[i % lanes.length]!].push({
      uid: `demo:${team}:${i}`,
      heroId: anyOf(rng, HERO_IDS),
      stars: rng.chance(0.35) ? 2 : 1,
      items: rng.chance(0.5) ? [anyOf(rng, ITEM_IDS)] : [],
    })
  }

  return lineup
}

/** A fight between two made-up lineups for the start screen: nothing is at stake and nothing is kept. */
export function demoBattle(mode: ModeId, seed: string): BattleSetup {
  const rng = createRng(seed)

  return {
    mode,
    round: DEMO_ROUND,
    seed,
    lineups: [lineupOf(0, mode, rng), lineupOf(1, mode, rng)],
    structures: [freshStructures(mode), freshStructures(mode)],
  }
}
