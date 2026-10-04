import { err, ok, type Result } from 'neverthrow'
import {
  LANE_IDS,
  type HeroId,
  type ItemId,
  type LaneId,
  type LaneStance,
  type StarLevel,
} from '@/content/ids'
import type { TalentChoice } from '@/content/talents'
import type { LaneStances } from '../battle/contracts'
import type { DomainError } from '../errors'

export interface OwnedHero {
  readonly uid: string
  readonly heroId: HeroId
  stars: StarLevel
  items: ItemId[]
  /** Kept by a hero carrying a Soul Jar: one per hero kill, from round to round. */
  souls?: number
  /** The talent picked at two stars; three stars bring both. Missing until the coach picks. */
  talent?: TalentChoice
}

export type RosterSlot = 'bench' | LaneId
export type Lineup = Readonly<Record<LaneId, readonly OwnedHero[]>>

export interface HeroLocation {
  readonly hero: OwnedHero
  readonly slot: RosterSlot
  readonly index: number
}

export interface RosterState {
  readonly bench: readonly OwnedHero[]
  readonly lanes: Lineup
  readonly stances: LaneStances
}

const ALL_SLOTS = ['bench', ...LANE_IDS] as const

const cloneHero = (hero: OwnedHero) => ({
  ...hero,
  items: [...hero.items],
})

export class Roster {
  private readonly slots: Record<RosterSlot, OwnedHero[]> = {
    bench: [],
    top: [],
    mid: [],
    bot: [],
  }

  private orders: Partial<Record<LaneId, LaneStance>> = {}

  constructor(readonly benchSize: number) {}

  get bench() {
    return this.slots.bench
  }

  get boardCount() {
    return LANE_IDS.reduce((sum, lane) => sum + this.slots[lane].length, 0)
  }

  get hasBenchSpace() {
    return this.slots.bench.length < this.benchSize
  }

  lane(lane: LaneId) {
    return this.slots[lane]
  }

  boardHeroes() {
    return LANE_IDS.flatMap((lane) => this.slots[lane])
  }

  /** Board heroes come first so that promotions keep the upgraded copy on the map. */
  all() {
    return [...this.boardHeroes(), ...this.slots.bench]
  }

  locate(uid: string) {
    for (const slot of ALL_SLOTS) {
      const index = this.slots[slot].findIndex((h) => h.uid === uid)
      const hero = this.slots[slot][index]
      if (hero) {
        return {
          hero,
          slot,
          index,
        }
      }
    }

    return undefined
  }

  add(hero: OwnedHero) {
    this.slots.bench.push(hero)
  }

  remove(uid: string) {
    const location = this.locate(uid)
    if (!location) {
      return undefined
    }

    this.slots[location.slot].splice(location.index, 1)

    return location.hero
  }

  move(uid: string, to: RosterSlot, boardCapacity: number): Result<void, DomainError> {
    const location = this.locate(uid)
    if (!location) {
      return err({ code: 'heroNotFound' })
    }

    if (location.slot === to) {
      return ok(undefined)
    }

    if (to === 'bench' && !this.hasBenchSpace) {
      return err({ code: 'benchFull' })
    }

    if (to !== 'bench' && location.slot === 'bench' && this.boardCount >= boardCapacity) {
      return err({
        code: 'boardFull',
        capacity: boardCapacity,
      })
    }

    this.slots[location.slot].splice(location.index, 1)
    this.slots[to].push(location.hero)

    return ok(undefined)
  }

  swap(a: string, b: string): Result<void, DomainError> {
    const first = this.locate(a)
    const second = this.locate(b)
    if (!first || !second) {
      return err({ code: 'heroNotFound' })
    }

    this.slots[first.slot][first.index] = second.hero
    this.slots[second.slot][second.index] = first.hero

    return ok(undefined)
  }

  arrange(board: ReadonlyMap<OwnedHero, LaneId>) {
    const everyone = this.all()
    for (const slot of ALL_SLOTS) {
      this.slots[slot].length = 0
    }

    for (const hero of everyone) {
      this.slots[board.get(hero) ?? 'bench'].push(hero)
    }
  }

  lineup() {
    const copy = (lane: LaneId) => this.slots[lane].map(cloneHero)
    return {
      top: copy('top'),
      mid: copy('mid'),
      bot: copy('bot'),
    }
  }

  /** The orders given to the lanes; they stay until the coach changes them. */
  stances(): LaneStances {
    return { ...this.orders }
  }

  /** Null takes the lane's order back and leaves it to its heroes. */
  setStance(lane: LaneId, stance: LaneStance | null) {
    if (stance) {
      this.orders[lane] = stance
    } else {
      delete this.orders[lane]
    }
  }

  snapshot(): RosterState {
    return {
      bench: this.slots.bench.map(cloneHero),
      lanes: this.lineup(),
      stances: this.stances(),
    }
  }

  restore(state: RosterState) {
    this.slots.bench = state.bench.map(cloneHero)

    for (const lane of LANE_IDS) {
      this.slots[lane] = state.lanes[lane].map(cloneHero)
    }

    this.orders = { ...state.stances }
  }
}
