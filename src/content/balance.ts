import { ABILITY_PARAMS } from './abilities'
import { HEROES } from './heroes'
import { FACTIONS } from './factions'
import { FACTION_IDS, HERO_IDS, ITEM_IDS, MODE_IDS, ROLE_IDS } from './ids'
import { ITEMS } from './items'
import { MAPS } from './map'
import { MODES } from './modes'
import { ROLES } from './roles'
import { BATTLE, RELIC, STAR_POWER } from './rules'
import { SYNERGIES } from './synergies'
import { TALENTS } from './talents'
import { TWIST_IDS, TWISTS } from './experiments'
import { CREEPS, STRUCTURES } from './units'

/**
 * Bump when a fight can play out differently without any of the numbers below changing,
 * for example a new targeting rule or a synergy that turns on in a different lineup.
 */
const LOGIC_REVISION = 6

/** FNV-1a, 32 bits, so a match can remember which balance it was played on. */
export function fnv1a(text: string) {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Colours are only drawn, so a new shade does not retire replays. */
function withoutColor(value: object) {
  const copy: Record<string, unknown> = { ...value }
  delete copy.color

  return copy
}

/**
 * Everything a fight reads, and nothing a patch can change without changing the fight:
 * prices, names and colours stay out, so a shop tweak does not retire old replays.
 */
function balanceData() {
  return {
    logic: LOGIC_REVISION,
    starPower: STAR_POWER,
    battle: BATTLE,
    relic: withoutColor(RELIC),
    creeps: CREEPS,
    structures: STRUCTURES,
    abilities: ABILITY_PARAMS,
    talents: TALENTS,
    twists: TWIST_IDS.map((id) => withoutColor(TWISTS[id])),
    heroes: HERO_IDS.map((id) => {
      const hero = HEROES[id]
      return {
        id,
        role: hero.role,
        faction: hero.faction ?? null,
        ability: hero.ability,
        stats: hero.stats,
        bash: hero.bash ?? null,
        adaptive: hero.adaptive ?? false,
        manaRegen: hero.manaRegen ?? 0,
      }
    }),
    items: ITEM_IDS.map((id) => {
      const item = ITEMS[id]
      return {
        id,
        modifiers: item.modifiers,
        effects: item.effects,
      }
    }),
    roles: ROLE_IDS.map((id) => withoutColor(ROLES[id])),
    factions: FACTION_IDS.map((id) => withoutColor(FACTIONS[id])),
    synergies: SYNERGIES.map(({ id, effects }) => ({
      id,
      effects,
    })),
    modes: MODE_IDS.map((id) => {
      const mode = MODES[id]
      const map = MAPS[id]
      return {
        id,
        lanes: mode.lanes,
        towers: mode.towers,
        relics: mode.relics,
        bases: map.bases,
        paths: map.lanes,
        towerSpots: map.towers,
        relicSpots: map.relics,
      }
    }),
  }
}

export const BALANCE_FINGERPRINT = fnv1a(JSON.stringify(balanceData()))
