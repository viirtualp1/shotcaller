<script setup lang="ts">
import { Droplet, Sparkles, Swords, Zap } from '@lucide/vue'
import { computed } from 'vue'
import { HEROES, ROLE_SIGNATURES } from '@/content/heroes'
import type { AbilityId, HeroId, RoleId, StarLevel } from '@/content/ids'
import { activeTalents, tunedParams, type TalentChoice } from '@/content/talents'
import type { HeroSheet } from '@/domain/roster/heroSheet'
import { abilityValueKind } from '../../abilityValueKinds'
import { useGameText } from '../../composables/useGameText'
import { useHeroStats } from '../../composables/useHeroStats'
import AbilityValue from '../common/AbilityValue.vue'

/** Rows in the order a reader meets them: what it does, to how many, for how long, then the lane orders. */
const ROW_ORDER = [
  'damage',
  'poison',
  'heal',
  'repair',
  'absorb',
  'arrows',
  'bounces',
  'targets',
  'count',
  'maxAlive',
  'hp',
  'falloff',
  'structureBonus',
  'radius',
  'stun',
  'slow',
  'tick',
  'duration',
  'lifetime',
  'pushAttackSpeed',
  'pushStructureDamage',
  'holdProtection',
  'groupDamage',
  'guard',
] as const

const SECONDS = new Set(['stun', 'tick', 'duration', 'lifetime'])

const PERCENT = new Set([
  'falloff',
  'slow',
  'pushAttackSpeed',
  'pushStructureDamage',
  'holdProtection',
  'groupDamage',
  'guard',
])

/**
 * The ability as a Dota tooltip lays it out: name, damage type, what it does in words, then one number per row, and
 * the mana that casts it at the bottom.
 */
const props = defineProps<{
  heroId: HeroId
  stars: StarLevel
  sheet: HeroSheet
  role?: RoleId
  talent?: TalentChoice
}>()

const text = useGameText()
const { t } = text
const stats = useHeroStats()

const ability = computed(() => HEROES[props.heroId].ability)
const active = computed(() => activeTalents(props.stars, props.talent))
const mana = computed(() => props.sheet.mana)

/** Mimicry lists the numbers of the ability it borrowed, cast with Perfect Copy; undecided, it has none yet. */
const shown = computed<{ id: AbilityId; boost: number } | null>(() => {
  if (ability.value !== 'mimic') {
    return {
      id: ability.value,
      boost: 1,
    }
  }

  if (!props.role) {
    return null
  }

  const tuned = tunedParams('mimic', active.value)

  return {
    id: ROLE_SIGNATURES[props.role],
    boost: tuned.power * tuned.borrowed,
  }
})

/** What the ability does, without numbers: they all stand in the rows below, as in Dota. */
const summary = computed(() => {
  const source = shown.value

  if (!source || source.id === ability.value) {
    return t(`abilityTips.${ability.value}`)
  }

  return t('abilityTips.mimicAs', {
    ability: text.abilityName(source.id),
    effect: t(`abilityTips.${source.id}`),
  })
})

/** Coloured and marked like the damage numbers below, so the type reads the same everywhere in the tooltip. */
const damageType = computed(() => {
  const kind = shown.value ? abilityValueKind(shown.value.id, 'damage') : null

  if (kind === 'magicalDamage') {
    return {
      kind,
      icon: Zap,
      label: t('card.abilityTip.magical'),
    }
  }

  return kind === 'physicalDamage'
    ? {
        kind,
        icon: Swords,
        label: t('card.abilityTip.physical'),
      }
    : null
})

const rows = computed(() => {
  const source = shown.value

  if (!source) {
    return []
  }

  const values = text.abilityValues(
    source.id,
    props.sheet.base.spellPower * source.boost,
    props.sheet.total.spellPower * source.boost,
    props.sheet.base.healPower * source.boost,
    props.sheet.total.healPower * source.boost,
    source.id === ability.value ? active.value : [],
  )

  return ROW_ORDER.flatMap((key) => {
    const value = values[key]

    if (!value) {
      return []
    }

    const kind = abilityValueKind(source.id, key)

    return [
      {
        key,
        kind,
        label: key === 'damage' && kind ? t(`abilityValueKinds.${kind}`) : t(`card.abilityTip.stats.${key}`),
        base: withUnit(key, value.base),
        bonus: value.bonus,
        better: value.better,
      },
    ]
  })
})

function withUnit(key: string, value: string) {
  if (SECONDS.has(key)) {
    return t('card.seconds', { n: value })
  }

  if (PERCENT.has(key)) {
    return `${value}%`
  }

  return key === 'structureBonus' ? `×${value}` : value
}
</script>

<template>
  <div class="ability-tip">
    <header class="tip-head">
      <span class="glyph">
        <Sparkles :size="16" aria-hidden="true" />
      </span>

      <strong class="tip-name">{{ text.abilityName(ability) }}</strong>
    </header>

    <dl v-if="damageType" class="meta">
      <div>
        <dt>{{ t('card.abilityTip.damageType') }}</dt>

        <dd class="damage-type" :class="damageType.kind">
          <component :is="damageType.icon" :size="12" aria-hidden="true" />
          {{ damageType.label }}
        </dd>
      </div>
    </dl>

    <p class="body">{{ summary }}</p>

    <dl v-if="rows.length" class="values">
      <div v-for="row in rows" :key="row.key">
        <dt>{{ row.label }}:</dt>

        <dd>
          <AbilityValue :kind="row.kind" :base="row.base" :bonus="row.bonus" :better="row.better" />
        </dd>
      </div>
    </dl>

    <footer class="tip-foot">
      <span class="mana">
        <Droplet :size="13" aria-hidden="true" />
        {{ text.number(mana.cost) }}
      </span>

      <span class="fill">
        <Swords :size="13" aria-hidden="true" />
        {{ t('card.abilityTip.fill', { attacks: stats.attacks(mana.attacksToCast) }) }}
      </span>
    </footer>
  </div>
</template>

<style scoped>
/* Bands across the whole tooltip, so each part reads as its own block, the way Dota stacks them. */
.ability-tip {
  display: flex;
  flex-direction: column;
  margin: -10px -12px;
}

.ability-tip > * {
  margin: 0;
  padding: 8px 12px;
}

.ability-tip > * + * {
  border-top: 1px solid var(--edge);
}

.tip-head {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: var(--radius) var(--radius) 0 0;
  background: linear-gradient(90deg, color-mix(in srgb, var(--mana) 22%, transparent), transparent 80%);
}

.glyph {
  display: grid;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid color-mix(in srgb, var(--mana) 45%, transparent);
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.3);
  color: var(--mana);
}

.tip-name {
  font-size: 15px;
  color: var(--chalk);
}

dl,
dd {
  margin: 0;
}

.meta,
.values {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.meta > div,
.values > div {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.2;
}

/* Small capitals, icons and numbers keep one centre line in every row. */
.meta dd,
.values dd {
  display: flex;
  align-items: center;
}

.values dd :deep(.ability-value) {
  align-items: center;
}

.meta dt {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-faint);
}

.meta dd {
  font-size: 12px;
  font-weight: 700;
  color: var(--chalk);
}

.damage-type {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.meta .physicalDamage {
  color: var(--damage-physical);
}

.meta .magicalDamage {
  color: var(--damage-magical);
}

.body {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--chalk-dim);
}

.values {
  background: rgba(0, 0, 0, 0.18);
}

.values dt {
  color: var(--chalk-dim);
  font-size: 12px;
}

.values dd {
  font-size: 12.5px;
}

.tip-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 0 0 var(--radius) var(--radius);
  font-size: 12px;
  font-weight: 700;
}

.tip-foot span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.mana {
  color: var(--mana);
}

.fill {
  color: var(--chalk-dim);
}
</style>
