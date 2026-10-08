import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { continueGhostBoard } from '@/application/social/ghostContinuation'
import { fnv1a } from '@/content/balance'
import { MATCH_RULES_FINGERPRINT } from '@/content/matchRules'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { headlessResolver } from '@/simulation/BattleSimulation'

/* A whole match on the bridge, the shortest mode, played by two computer coaches. */
const MATCH_TIMEOUT = 30_000

/**
 * What each revision of the rules does to one fixed match. Duels, ghosts and the arbiter trust
 * `MATCH_RULES_FINGERPRINT` to mean the same match everywhere, so a match that plays out differently needs a new
 * fingerprint: change a number, or bump `MATCH_LOGIC_REVISION` in `src/content/matchRules.ts` for a change in code.
 * Then add the new fingerprint here. Old entries stay, so a fingerprint can never be reused for other behaviour.
 */
const PINNED: Readonly<Record<string, string>> = {
  '5c05c6b7': '6990e625',
}

function behaviour() {
  const match = createMatch({
    seed: 'rules-pin',
    ids: sequentialIds('rules-pin'),
    mode: 'oneLane',
  })

  const coach = new GreedyCoach()
  const rng = createRng('rules-pin:coach')
  const boards: string[] = []

  while (match.phase === 'planning') {
    coach.playTurn(match.human, {
      round: match.round,
      rng,
    })

    boards.push(JSON.stringify(match.human.snapshot()))
    match.finishBattle(headlessResolver.resolve(match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()))
    match.nextRound()
  }

  /* The coach that plays a ghost on after its recording ends. */
  const continued = continueGhostBoard(match.opponent.snapshot(), 'oneLane', 'rules-pin', match.round + 1)

  return fnv1a(
    JSON.stringify({
      result: match.result,
      structures: match.structures,
      boards,
      continued,
    }),
  )
}

describe('match rules', () => {
  it('names what a whole match does under them', { timeout: MATCH_TIMEOUT }, () => {
    const pinned = PINNED[MATCH_RULES_FINGERPRINT]
    const actual = behaviour()

    expect(pinned, `New rules ${MATCH_RULES_FINGERPRINT}: pin them as '${actual}'`).toBeDefined()

    expect(
      actual,
      'A match plays out differently under the same rules: bump MATCH_LOGIC_REVISION, then pin the new fingerprint',
    ).toBe(pinned)
  })
})
