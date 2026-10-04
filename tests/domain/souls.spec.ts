import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { parseSnapshot, serializeSnapshot } from '@/application/persistence/snapshot'
import { HEROES } from '@/content/heroes'
import { ITEMS } from '@/content/items'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { HeroPool } from '@/domain/economy/HeroPool'
import { affordableBoard } from '@/domain/player/boardValue'
import type { PlayerState } from '@/domain/player/Player'
import { promoteDuplicates } from '@/domain/roster/promotion'
import { Roster, type OwnedHero } from '@/domain/roster/Roster'
import { headlessResolver } from '@/simulation/BattleSimulation'

function matchWithBoard() {
  const match = createMatch({
    seed: 'souls',
    ids: sequentialIds('souls'),
  })

  new GreedyCoach().playTurn(match.human, {
    round: 1,
    rng: createRng('souls-coach'),
  })

  return match
}

/** The same board with every hero claiming this many souls. */
const withSouls = (state: PlayerState, souls: number): PlayerState => {
  const claim = (heroes: readonly OwnedHero[]) =>
    heroes.map((hero) => ({
      ...hero,
      souls,
    }))

  const { bench, lanes } = state.roster

  return {
    ...state,
    roster: {
      ...state.roster,
      bench: claim(bench),
      lanes: {
        top: claim(lanes.top),
        mid: claim(lanes.mid),
        bot: claim(lanes.bot),
      },
    },
  }
}

describe('Soul Jar souls', () => {
  it('stay with the hero into the next round', () => {
    const match = matchWithBoard()
    const [carrier] = match.human.roster.boardHeroes()
    const outcome = headlessResolver.resolve(match.startBattle()._unsafeUnwrap())

    match.finishBattle({
      ...outcome,
      heroes: outcome.heroes.map((h) =>
        h.uid === carrier!.uid
          ? {
              ...h,
              souls: 4,
            }
          : h,
      ),
    })

    expect(match.human.roster.locate(carrier!.uid)?.hero.souls).toBe(4)
  })

  it('survive a save and a reload', () => {
    const match = matchWithBoard()
    const [carrier] = match.human.roster.boardHeroes()
    carrier!.souls = 7

    const restored = parseSnapshot(serializeSnapshot(match.snapshot()))!
    const lane = Object.values(restored.players[0].roster.lanes).flat()

    expect(lane.find((h) => h.uid === carrier!.uid)?.souls).toBe(7)
  })

  it('pass the most souls of the merged copies to the promoted hero', () => {
    const roster = new Roster(8)
    for (const [uid, souls] of [
      ['a', 1],
      ['b', 6],
      ['c', 2],
    ] as const) {
      roster.add({
        uid,
        heroId: 'archer',
        stars: 1,
        items: [],
        souls,
      })
    }

    const { promoted } = promoteDuplicates(roster)
    expect(promoted[0]?.souls).toBe(6)
  })

  it('cannot be invented by the other side of a duel', () => {
    const previous = withSouls(matchWithBoard().human.snapshot(), 2)

    expect(affordableBoard(withSouls(previous, 2), previous, 'threeLanes', 1)).toBe(true)

    expect(
      affordableBoard(withSouls(previous, ITEMS.soulJar.effects.soulMax!), previous, 'threeLanes', 1),
    ).toBe(false)
  })

  it('reject a save claiming more than a jar can hold', () => {
    const match = matchWithBoard()
    match.human.roster.boardHeroes()[0]!.souls = ITEMS.soulJar.effects.soulMax! + 1

    expect(parseSnapshot(serializeSnapshot(match.snapshot()))).toBeNull()
  })
})

describe('hero pool saved before new heroes', () => {
  it('gives heroes missing from the save all their copies', () => {
    const match = matchWithBoard()
    const state = match.snapshot()
    const pool = { ...state.pool }
    delete pool.herald
    delete pool.changeling

    const restored = parseSnapshot(
      serializeSnapshot({
        ...state,
        pool,
      }),
    )

    expect(restored).not.toBeNull()

    const fresh = new HeroPool()
    const reloaded = new HeroPool()
    reloaded.restore(restored!.pool)

    expect(reloaded.available('herald')).toBe(fresh.available('herald'))
    expect(reloaded.available('changeling')).toBe(HEROES.changeling.copies)
    expect(reloaded.available('archer')).toBe(state.pool.archer)
  })
})
