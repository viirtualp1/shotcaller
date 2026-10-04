import { HEROES } from '@/content/heroes'
import { ITEMS } from '@/content/items'
import { MODES } from '@/content/modes'
import { COPIES_PER_STAR, ECONOMY } from '@/content/rules'
import { CoachProgression } from '../progression/CoachProgression'
import type { ModeId } from '@/content/ids'
import type { PlayerState } from './Player'

const heroesOf = (state: PlayerState) => [...state.roster.bench, ...Object.values(state.roster.lanes).flat()]

/** Gold still owned or irreversibly spent. Item sales can reduce this value, never increase it. */
export function boardValue(state: PlayerState) {
  const heroes = heroesOf(state)
  const items = [...state.stash, ...heroes.flatMap((hero) => hero.items)]

  return (
    state.gold +
    heroes.reduce((total, hero) => total + HEROES[hero.heroId].tier * COPIES_PER_STAR[hero.stars], 0) +
    items.reduce((total, item) => total + ITEMS[item].cost, 0) +
    state.ledger.rerolls * ECONOMY.rerollCost +
    state.ledger.xpBought * ECONOMY.xpCost
  )
}

/**
 * Souls come only from battles this device replayed too: no hero may have more than the most any hero of the
 * previous board had, since a promotion keeps the largest count of the copies it merges.
 */
function earnedSouls(state: PlayerState, previous: PlayerState) {
  const most = Math.max(0, ...heroesOf(previous).map((hero) => hero.souls ?? 0))

  return heroesOf(state).every((hero) => (hero.souls ?? 0) <= most)
}

/** The previous board includes the income this device replayed since the last exchange. */
export function affordableBoard(state: PlayerState, previous: PlayerState, mode: ModeId, round: number) {
  if (
    !earnedSouls(state, previous) ||
    state.ledger.rerolls < previous.ledger.rerolls ||
    state.ledger.xpBought < previous.ledger.xpBought ||
    state.streak !== previous.streak ||
    boardValue(state) > boardValue(previous)
  ) {
    return false
  }

  const progression = new CoachProgression(MODES[mode].levels)
  progression.gain((round - 1) * ECONOMY.passiveXpPerRound + state.ledger.xpBought * ECONOMY.xpPerPurchase)

  return state.level === progression.level && state.xp === progression.xp
}
