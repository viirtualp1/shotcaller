<script setup lang="ts">
import { Axe, BowArrow, Droplet, Sparkles } from '@lucide/vue'
import { computed } from 'vue'
import { previewHeroVitals, type HeroVitals } from '@/application/heroVitals'
import { HEROES } from '@/content/heroes'
import type { HeroId, ItemId, RoleId, StarLevel, SynergyId } from '@/content/ids'
import { ITEMS } from '@/content/items'
import { activeTalents, type TalentChoice } from '@/content/talents'
import { ROLES } from '@/content/roles'
import { BATTLE } from '@/content/rules'
import { heroSheet } from '@/domain/roster/heroSheet'
import { cssColor } from '@/rendering/theme'
import { starsLabel, useGameText } from '../../composables/useGameText'
import { useHeroStats } from '../../composables/useHeroStats'
import { ADAPTIVE_ICON, ROLE_ICONS } from '../../icons'
import ItemIcon from './ItemIcon.vue'
import HeroResources from './HeroResources.vue'

/**
 * Dota-style hero sheet: identity, then stats with the hero's own value in white and what items and lane synergies
 * add in green, then the ability with its mana, and the passives.
 */
const props = withDefaults(
  defineProps<{
    heroId: HeroId
    stars: StarLevel
    items?: readonly ItemId[]
    /** Synergies of the lane the hero stands on; none on the bench or in the shop. */
    synergies?: readonly SynergyId[]
    heading?: boolean
    /** Off where the hero's item slots are already on screen next to the sheet. */
    itemIcons?: boolean
    vitals?: HeroVitals | null
    /** The role the hero took on its lane; an adaptive hero has none on the bench. */
    role?: RoleId
    souls?: number
    talent?: TalentChoice
  }>(),
  {
    items: () => [],
    synergies: () => [],
    heading: true,
    itemIcons: true,
    vitals: null,
    role: undefined,
    souls: 0,
    talent: undefined,
  },
)

const text = useGameText()
const { t } = text
const stats = useHeroStats()

const hero = computed(() => HEROES[props.heroId])
const playedRole = computed(() => props.role ?? hero.value.role)
const roleRules = computed(() => ROLES[playedRole.value])
/** An adaptive hero off the lanes has no role yet: it shows the mask and how it picks one. */
const undecided = computed(() => Boolean(hero.value.adaptive && !props.role))
const roleIcon = computed(() => (undecided.value ? ADAPTIVE_ICON : ROLE_ICONS[playedRole.value]))

const soulMax = computed(
  () => props.items.map((id) => ITEMS[id].effects.soulMax ?? 0).find((max) => max > 0) ?? 0,
)

const range = computed(() => hero.value.stats.range)
const innate = computed(() => text.heroPassive(props.heroId))

const sheet = computed(() =>
  heroSheet({
    heroId: props.heroId,
    stars: props.stars,
    items: props.items,
    synergies: props.synergies,
    role: playedRole.value,
    souls: props.souls,
    ...(props.talent !== undefined ? { talent: props.talent } : {}),
  }),
)

const rows = computed(() => stats.rows(sheet.value, props.stars))
const mana = computed(() => sheet.value.mana)

/** Mana per attack the hero gets on its own, role included; items and synergies add the rest. */
const basePerAttack = computed(() => BATTLE.manaPerAttack * sheet.value.base.manaGain)
const bonusPerAttack = computed(() => Math.round((mana.value.perAttack - basePerAttack.value) * 10) / 10)
const startingMana = computed(() => roleRules.value.startingManaRatio ?? 0)
const vitals = computed(() => props.vitals ?? previewHeroVitals(props))
</script>

<template>
  <div class="hero-details">
    <header v-if="heading" class="heading">
      <strong class="name">{{ text.heroName(heroId) }}</strong>
      <span class="stars">{{ starsLabel(stars) }}</span>
    </header>

    <div class="meta">
      <span
        class="chip attack"
        :title="range ? t('card.ranged', { range }) : t('card.melee')"
        :aria-label="range ? t('card.ranged', { range }) : t('card.melee')"
      >
        <BowArrow v-if="range" :size="14" />
        <Axe v-else :size="14" />
        <span v-if="range" class="range">{{ text.number(range) }}</span>
      </span>

      <span class="chip role" :style="{ '--role': cssColor(roleRules.color) }">
        <component :is="roleIcon" :size="13" />
        {{ text.heroRoleName(heroId, props.role) }}
      </span>
    </div>

    <HeroResources :values="vitals" :live="Boolean(props.vitals)" />

    <dl class="stats" :title="t('card.statsHint')">
      <div v-for="row in rows" :key="row.key" class="stat" :class="row.key" :title="row.hint">
        <dt>
          <component :is="row.icon" :size="13" aria-hidden="true" />
          {{ row.label }}
        </dt>

        <dd>
          {{ row.base }}
          <span v-if="row.bonus" class="bonus" :class="{ worse: !row.better }">{{ row.bonus }}</span>
        </dd>
      </div>
    </dl>

    <section class="block ability">
      <header class="block-head">
        <span class="label">{{ t('card.ability') }}</span>

        <span class="mana-cost" :title="t('card.mana.costHint', { n: mana.cost })">
          <Droplet :size="12" aria-hidden="true" />
          {{ text.number(mana.cost) }}
        </span>
      </header>

      <strong class="block-title">
        <Sparkles :size="14" />
        {{ text.abilityName(hero.ability) }}
      </strong>

      <p>
        {{
          text.abilityDescription(
            hero.ability,
            sheet.total.spellPower,
            sheet.total.healPower,
            props.role,
            activeTalents(stars, talent),
          )
        }}
      </p>

      <dl class="mana">
        <div :title="t('card.mana.perAttackHint')">
          <dt>{{ t('card.mana.perAttack') }}</dt>

          <dd>
            +{{ text.number(basePerAttack) }}
            <span v-if="bonusPerAttack" class="bonus">+{{ text.number(bonusPerAttack) }}</span>
          </dd>
        </div>

        <div :title="t('card.mana.perDamageHint')">
          <dt>{{ t('card.mana.perDamage') }}</dt>
          <dd>+{{ text.number(mana.perTenthOfHealthLost) }}</dd>
        </div>

        <div :title="t('card.mana.castHint')">
          <dt>{{ t('card.mana.cast') }}</dt>
          <dd>{{ stats.attacks(mana.attacksToCast) }}</dd>
        </div>
      </dl>

      <p v-if="startingMana" class="first-cast">
        {{
          t('card.mana.firstCast', {
            percent: text.number(startingMana * 100),
            attacks: stats.attacks(mana.attacksToFirstCast),
          })
        }}
      </p>
    </section>

    <section v-if="innate" class="block innate">
      <span class="label">{{ t('card.innate') }}</span>
      <p>{{ innate }}</p>
    </section>

    <section v-if="undecided" class="block passive">
      <span class="label">{{ t('card.rolePassive', { role: t('roles.adaptive.name') }) }}</span>
      <p>{{ t('roles.adaptive.passive') }}</p>
    </section>

    <section v-else class="block passive" :style="{ '--role': cssColor(roleRules.color) }">
      <span class="label">{{ t('card.rolePassive', { role: text.roleName(playedRole) }) }}</span>
      <p>{{ text.rolePassive(playedRole) }}</p>
    </section>

    <p v-if="soulMax" class="souls">
      {{ t('card.souls', { n: text.number(Math.min(souls, soulMax)), max: text.number(soulMax) }) }}
    </p>

    <ul v-if="itemIcons && items.length" class="items">
      <li v-for="(item, i) in items" :key="`${item}-${i}`">
        <ItemIcon :item-id="item" :size="40" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hero-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 300px;
  max-width: 100%;
}

.heading {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.name {
  font-size: 15px;
}

.stars {
  color: var(--gold);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--edge-strong);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--chalk-dim);
}

.range {
  font-variant-numeric: tabular-nums;
}

.chip.role {
  border-color: color-mix(in srgb, var(--role) 55%, transparent);
  background: color-mix(in srgb, var(--role) 14%, transparent);
  color: var(--role);
}

dl,
dd {
  margin: 0;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 5px 8px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.05);
}

.stat dt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--chalk-dim);
}

.stat dd {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stat.hp svg {
  color: var(--heal);
}

.stat.damage svg {
  color: #ff9a6b;
}

.stat.attackTime svg,
.stat.moveSpeed svg {
  color: var(--chalk);
}

.stat.armor svg {
  color: var(--ours);
}

.stat.spellAmp svg,
.stat.healAmp svg {
  color: var(--mana);
}

.bonus {
  margin-left: 2px;
  color: var(--heal);
  font-weight: 700;
}

.bonus.worse {
  color: var(--theirs);
}

.block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 9px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.04);
  border-left: 2px solid var(--edge-strong);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.block.ability {
  border-left-color: var(--mana);
}

.block.innate {
  border-left-color: var(--gold);
}

.block.passive {
  border-left-color: var(--role);
}

.label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.mana-cost {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--mana) 18%, transparent);
  color: var(--mana);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.block-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--chalk);
}

p {
  margin: 0;
  font-size: 12.5px;
  color: var(--chalk-dim);
}

.mana {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-top: 4px;
}

.mana > div {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 6px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--mana) 8%, transparent);
}

.mana dt {
  font-size: 10px;
  font-weight: 600;
  color: var(--chalk-dim);
}

.mana dd {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--chalk);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.first-cast {
  font-size: 11.5px;
  color: var(--chalk-faint);
}

.souls {
  margin: 0;
  font-size: 12px;
  color: #d9c2ff;
}

.items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
