<script setup lang="ts">
import { Droplet, Link2, Sparkles } from '@lucide/vue'
import { computed } from 'vue'
import { previewHeroVitals, type HeroVitals } from '@/application/heroVitals'
import { HEROES } from '@/content/heroes'
import type { HeroId, ItemId, RoleId, StarLevel, SynergyId } from '@/content/ids'
import { ITEMS } from '@/content/items'
import { activeTalents, type TalentChoice } from '@/content/talents'
import { ROLES } from '@/content/roles'
import { BATTLE } from '@/content/rules'
import { SYNERGY_BY_ID } from '@/content/synergies'
import { heroSheet } from '@/domain/roster/heroSheet'
import { cssColor } from '@/rendering/theme'
import { starsLabel, useGameText } from '../../composables/useGameText'
import { useHeroStats } from '../../composables/useHeroStats'
import { ADAPTIVE_ICON, ROLE_ICONS } from '../../icons'
import ItemIcon from './ItemIcon.vue'
import HeroResources from './HeroResources.vue'
import AbilityDescription from './AbilityDescription.vue'
import StatValue from './StatValue.vue'

/**
 * Dota-style hero sheet: identity and resources, then role and stats with the hero's own value in white
 * and what items and lane synergies add in green, then the ability and innate passive.
 */
const props = withDefaults(
  defineProps<{
    heroId: HeroId
    stars: StarLevel
    items?: readonly ItemId[]
    /** Synergies of the lane the hero stands on; none on the bench or in the shop. */
    synergies?: readonly SynergyId[]
    heading?: boolean
    /** Off when the containing card shows live resources in its own header. */
    resourceBars?: boolean
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
    resourceBars: true,
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

const rows = computed(() => stats.sheetRows(sheet.value, props.heroId, props.stars))

const mana = computed(() => sheet.value.mana)

/** Mana per attack the hero gets on its own, role included; items and synergies add the rest. */
const basePerAttack = computed(() => BATTLE.manaPerAttack * sheet.value.base.manaGain)
const bonusPerAttack = computed(() => Math.round((mana.value.perAttack - basePerAttack.value) * 10) / 10)
const basePerDamage = computed(() => (BATTLE.manaPerDamageTaken / 10) * sheet.value.base.manaGain)

const bonusPerDamage = computed(
  () => Math.round((mana.value.perTenthOfHealthLost - basePerDamage.value) * 10) / 10,
)

const vitals = computed(() => props.vitals ?? previewHeroVitals(props))
</script>

<template>
  <div class="hero-details">
    <div class="facts">
      <header v-if="heading || resourceBars" class="sheet-head">
        <div v-if="heading" class="heading">
          <strong class="name">{{ text.heroName(heroId) }}</strong>
          <span class="stars">{{ starsLabel(stars) }}</span>
        </div>

        <HeroResources v-if="resourceBars" :values="vitals" compact />
      </header>

      <section class="block passive" :style="{ '--role': cssColor(roleRules.color) }">
        <span class="label role-label">
          <component :is="roleIcon" :size="14" aria-hidden="true" />
          {{ t('card.rolePassive', { role: text.heroRoleName(heroId, props.role) }) }}
        </span>

        <p>{{ undecided ? t('roles.adaptive.passive') : text.rolePassive(playedRole) }}</p>
      </section>

      <section
        v-for="synergy in synergies"
        :key="synergy"
        class="block synergy"
        :style="{ '--synergy': cssColor(SYNERGY_BY_ID[synergy].color) }"
      >
        <span class="label synergy-label">
          <Link2 :size="14" aria-hidden="true" />
          {{ t('card.synergy', { name: text.synergyName(synergy) }) }}
        </span>

        <p>{{ text.synergyEffect(synergy) }}</p>
      </section>

      <dl class="stats" :title="t('card.statsHint')">
        <div v-for="row in rows" :key="row.key" class="stat" :class="row.key" :title="row.hint">
          <dt>
            <component :is="row.icon" :size="13" aria-hidden="true" />
            {{ row.label }}
          </dt>

          <dd>
            <StatValue :base="row.base" :bonus="row.bonus" :better="row.better" />
          </dd>
        </div>
      </dl>
    </div>

    <div class="kit">
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
          <AbilityDescription
            :ability-id="hero.ability"
            :base-power="sheet.base.spellPower"
            :power="sheet.total.spellPower"
            :base-heal-power="sheet.base.healPower"
            :heal-power="sheet.total.healPower"
            :role="props.role"
            :talents="activeTalents(stars, talent)"
          />
        </p>

        <p class="mana-rule">{{ t('card.mana.rule', { n: text.number(mana.cost) }) }}</p>

        <dl class="mana">
          <div :title="t('card.mana.perAttackHint')">
            <dt>{{ t('card.mana.perAttack') }}</dt>

            <dd>
              <StatValue
                :base="`+${text.number(basePerAttack)}`"
                :bonus="bonusPerAttack ? text.signed(bonusPerAttack) : null"
                :better="bonusPerAttack > 0"
              />
            </dd>
          </div>

          <div :title="t('card.mana.perDamageHint')">
            <dt>{{ t('card.mana.perDamage') }}</dt>

            <dd>
              <StatValue
                :base="`+${text.number(basePerDamage)}`"
                :bonus="bonusPerDamage ? text.signed(bonusPerDamage) : null"
                :better="bonusPerDamage > 0"
              />
            </dd>
          </div>

          <div>
            <dt>{{ t('card.mana.cast') }}</dt>
            <dd>{{ stats.attacks(mana.attacksToCast) }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="innate" class="block innate">
        <span class="label">{{ t('card.innate') }}</span>
        <p>{{ innate }}</p>
      </section>

      <p v-if="soulMax" class="souls">
        {{ t('card.souls', { n: text.number(Math.min(souls, soulMax)), max: text.number(soulMax) }) }}
      </p>
    </div>

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

/* The match card sets these side by side. Stacked, the sheet reads as one column. */
.facts,
.kit {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sheet-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.role-label,
.synergy-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.role-label svg {
  color: var(--role);
  flex: none;
}

.synergy-label svg {
  color: var(--synergy);
  flex: none;
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

.block.synergy {
  border-left-color: var(--synergy);
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
  gap: 4px;
  margin-top: 4px;
}

.mana > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--mana) 8%, transparent);
}

.mana dt {
  font-size: 11px;
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
