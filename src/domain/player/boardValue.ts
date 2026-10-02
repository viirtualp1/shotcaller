import { HEROES } from '@/content/heroes'
import { ITEMS } from '@/content/items'
import { MODES } from '@/content/modes'
import { COPIES_PER_STAR, ECONOMY } from '@/content/rules'
import { CoachProgression } from '../progression/CoachProgression'
import type { ModeId } from '@/content/ids'
import type { PlayerState } from './Player'

/** Gold still owned or irreversibly spent. Item sales can reduce this value, never increase it. */
export function boardValue(state: PlayerState) {
  const heroes = [...state.roster.bench, ...Object.values(state.roster.lanes).flat()]
  const items = [...state.stash, ...heroes.flatMap((hero) => hero.items)]

  return (
    state.gold +
    heroes.reduce((total, hero) => total + HEROES[hero.heroId].tier * COPIES_PER_STAR[hero.stars], 0) +
    items.reduce((total, item) => total + ITEMS[item].cost, 0) +
    state.ledger.rerolls * ECONOMY.rerollCost +
    state.ledger.xpBought * ECONOMY.xpCost
  )
}

/** The previous board includes the income this device replayed since the last exchange. */
export function affordableBoard(state: PlayerState, previous: PlayerState, mode: ModeId, round: number) {
  if (
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
