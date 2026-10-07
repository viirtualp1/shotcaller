import {
  Axe,
  BowArrow,
  Droplet,
  Footprints,
  Heart,
  HeartPulse,
  Shield,
  Sparkles,
  Sword,
  Timer,
  WandSparkles,
} from '@lucide/vue'
import type { Component } from 'vue'
import { HEROES } from '@/content/heroes'
import type { HeroId, StarLevel } from '@/content/ids'
import { BATTLE, STAR_POWER } from '@/content/rules'
import type { HeroNumbers, HeroSheet } from '@/domain/roster/heroSheet'
import { useGameText } from './useGameText'

type StatKey = 'hp' | 'damage' | 'attackTime' | 'armor' | 'moveSpeed' | 'spellAmp' | 'healAmp'
type ManaKey = 'manaPerAttack' | 'cast'

interface StatDefinition {
  readonly key: StatKey
  readonly icon: Component
  /** The value as shown, in its unit: seconds, percent or points. */
  readonly read: (numbers: HeroNumbers, stars: StarLevel) => number
  readonly unit: 'points' | 'seconds' | 'percent'
  /** Attack time is better lower; everything else is better higher. */
  readonly lowerIsBetter?: boolean
  /** Shown only when items or synergies change it. */
  readonly optional?: boolean
}

const STATS: readonly StatDefinition[] = [
  {
    key: 'hp',
    icon: Heart,
    read: (n) => n.hp,
    unit: 'points',
  },
  {
    key: 'damage',
    icon: Sword,
    read: (n) => n.damage,
    unit: 'points',
  },
  {
    key: 'attackTime',
    icon: Timer,
    read: (n) => n.attackInterval,
    unit: 'seconds',
    lowerIsBetter: true,
  },
  {
    key: 'armor',
    icon: Shield,
    read: (n) => n.protection * 100,
    unit: 'percent',
  },
  {
    key: 'moveSpeed',
    icon: Footprints,
    read: (n) => n.speed,
    unit: 'points',
  },
  /* Stars already raise the ability numbers, so the multipliers read as 100% before items and synergies. */
  {
    key: 'spellAmp',
    icon: WandSparkles,
    read: (n, stars) => (n.spellPower / STAR_POWER[stars]) * 100,
    unit: 'percent',
  },
  {
    key: 'healAmp',
    icon: HeartPulse,
    read: (n, stars) => (n.healPower / STAR_POWER[stars]) * 100,
    unit: 'percent',
    optional: true,
  },
]

export interface StatRow {
  readonly key: StatKey
  readonly icon: Component
  readonly label: string
  readonly hint: string
  /** The hero on its own, white in the sheet. */
  readonly base: string
  /** What items and synergies add, green in the sheet; null when they add nothing. */
  readonly bonus: string | null
  readonly better: boolean
}

/** A row of the sheet as shown on cards: the stats with the attack range after the attack time. */
export interface SheetRow extends Omit<StatRow, 'key'> {
  readonly key: StatKey | 'range'
}

export interface StatChange {
  readonly key: StatKey | ManaKey
  readonly icon: Component
  readonly label: string
  readonly before: string
  readonly after: string
  readonly better: boolean
}

/** Stat rows of a hero sheet, Dota style: the hero's own value, then the bonus on top of it. */
export function useHeroStats() {
  const text = useGameText()
  const { t } = text

  /** Seconds keep two decimals and points none, so a bonus never rounds to "+0". */
  const round = (unit: StatDefinition['unit'], value: number) =>
    unit === 'seconds' ? Math.round(value * 100) / 100 : Math.round(value)

  function show(unit: StatDefinition['unit'], value: number) {
    if (unit === 'seconds') {
      return t('card.seconds', { n: text.precise(value) })
    }

    return unit === 'percent' ? `${text.number(value)}%` : text.number(value)
  }

  function signed(unit: StatDefinition['unit'], value: number) {
    const sign = value > 0 ? '+' : '−'

    return `${sign}${show(unit, Math.abs(value))}`
  }

  function rows(sheet: HeroSheet, stars: StarLevel): StatRow[] {
    return STATS.flatMap((stat) => {
      const base = round(stat.unit, stat.read(sheet.base, stars))
      const bonus = round(stat.unit, stat.read(sheet.total, stars) - base)

      if (stat.optional && bonus === 0) {
        return []
      }

      return [
        {
          key: stat.key,
          icon: stat.icon,
          label: t(`card.stats.${stat.key}`),
          hint: t(`card.stats.${stat.key}Hint`),
          base: show(stat.unit, base),
          bonus: bonus === 0 ? null : signed(stat.unit, bonus),
          better: stat.lowerIsBetter ? bonus < 0 : bonus > 0,
        },
      ]
    })
  }

  /** Melee heroes show their reach, so every hero has a range to compare. */
  function sheetRows(sheet: HeroSheet, heroId: HeroId, stars: StarLevel): SheetRow[] {
    const values = rows(sheet, stars)
    const attackIndex = values.findIndex((row) => row.key === 'attackTime')
    const range = HEROES[heroId].stats.range
    const reach = range || BATTLE.meleeReach

    const hint = range
      ? t('card.ranged', { range })
      : `${t('card.melee')} · ${t('card.peek.range')} ${text.number(reach)}`

    return [
      ...values.slice(0, attackIndex + 1),
      {
        key: 'range',
        icon: range ? BowArrow : Axe,
        label: t('card.stats.range'),
        hint,
        base: text.number(reach),
        bonus: null,
        better: true,
      },
      ...values.slice(attackIndex + 1),
    ]
  }

  const attacks = (n: number) => t('card.mana.attacks', { n }, n)

  /** The stats an item changes on a hero, mana included: before and after it. */
  function changes(before: HeroSheet, after: HeroSheet, stars: StarLevel): StatChange[] {
    const stats = STATS.flatMap((stat) => {
      const from = round(stat.unit, stat.read(before.total, stars))
      const to = round(stat.unit, stat.read(after.total, stars))

      if (from === to) {
        return []
      }

      return [
        {
          key: stat.key,
          icon: stat.icon,
          label: t(`card.stats.${stat.key}`),
          before: show(stat.unit, from),
          after: show(stat.unit, to),
          better: stat.lowerIsBetter ? to < from : to > from,
        },
      ]
    })

    const mana: StatChange[] = []
    if (before.mana.perAttack !== after.mana.perAttack) {
      mana.push({
        key: 'manaPerAttack',
        icon: Droplet,
        label: t('card.mana.perAttack'),
        before: text.number(before.mana.perAttack),
        after: text.number(after.mana.perAttack),
        better: after.mana.perAttack > before.mana.perAttack,
      })
    }

    if (before.mana.attacksToCast !== after.mana.attacksToCast) {
      mana.push({
        key: 'cast',
        icon: Sparkles,
        label: t('card.mana.cast'),
        before: attacks(before.mana.attacksToCast),
        after: attacks(after.mana.attacksToCast),
        better: after.mana.attacksToCast < before.mana.attacksToCast,
      })
    }

    return [...stats, ...mana]
  }

  return {
    rows,
    sheetRows,
    changes,
    attacks,
  }
}
