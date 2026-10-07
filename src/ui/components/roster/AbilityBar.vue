<script setup lang="ts">
import { Diamond, Droplet, Sparkles } from '@lucide/vue'
import { computed } from 'vue'
import { HEROES } from '@/content/heroes'
import type { HeroId, RoleId, StarLevel } from '@/content/ids'
import { STAR_POWER } from '@/content/rules'
import { activeTalents, type TalentChoice } from '@/content/talents'
import type { HeroSheet } from '@/domain/roster/heroSheet'
import { useGameText } from '../../composables/useGameText'
import InfoTooltip from '../common/InfoTooltip.vue'
import AbilityTooltip from './AbilityTooltip.vue'

/**
 * The ability as a square icon, as Dota shows it: mana cost on its edge, the full tooltip on hover or tap. Its two
 * talents sit beside it as diamonds, lit when they work and breathing in gold while one waits to be picked.
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

const ability = computed(() => HEROES[props.heroId].ability)
const mana = computed(() => props.sheet.mana)
const active = computed(() => activeTalents(props.stars, props.talent))
const picking = computed(() => props.stars === 2 && props.talent === undefined)

const talents = computed(() =>
  ([0, 1] as const).map((talent) => {
    const on = active.value.includes(talent)

    return {
      talent,
      on,
      name: text.talentName(ability.value, talent),
      description: text.talentDescription(ability.value, talent, STAR_POWER[props.stars]),
      status: talentStatus(on),
    }
  }),
)

function talentStatus(on: boolean) {
  if (props.stars >= 3) {
    return t('talentPicker.both')
  }

  if (picking.value) {
    return t('talentPicker.pick')
  }

  if (props.stars < 2) {
    return t('talentPicker.locked')
  }

  return on ? t('talentPicker.chosen') : t('talentPicker.later')
}
</script>

<template>
  <div class="ability-bar">
    <InfoTooltip side="top" clickable>
      <button
        type="button"
        class="ability"
        :aria-label="`${t('card.ability')}: ${text.abilityName(ability)}`"
      >
        <Sparkles :size="20" aria-hidden="true" />

        <span class="cost">
          <Droplet :size="9" aria-hidden="true" />
          {{ text.number(mana.cost) }}
        </span>
      </button>

      <template #content>
        <AbilityTooltip :hero-id="heroId" :stars="stars" :sheet="sheet" :role="role" :talent="talent" />
      </template>
    </InfoTooltip>

    <div class="talents">
      <InfoTooltip v-for="option in talents" :key="option.talent" side="top" clickable>
        <button
          type="button"
          class="talent"
          :class="{ on: option.on, open: picking }"
          :style="{ '--i': option.talent }"
          :aria-label="`${t('talentPicker.title')}: ${option.name}`"
        >
          <Diamond :size="11" aria-hidden="true" />
        </button>

        <template #content>
          <div class="tip">
            <strong class="tip-title talent-name">{{ option.name }}</strong>
            <span>{{ option.description }}</span>
            <span class="tip-status" :class="{ on: option.on }">{{ option.status }}</span>
          </div>
        </template>
      </InfoTooltip>
    </div>
  </div>
</template>

<style scoped>
.ability-bar {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.ability {
  position: relative;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 0 0 10px;
  border: 1px solid color-mix(in srgb, var(--mana) 45%, transparent);
  border-radius: var(--radius);
  background:
    radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--mana) 30%, transparent), transparent 75%),
    rgba(0, 0, 0, 0.25);
  color: var(--mana);
  font: inherit;
  cursor: help;
  transition: border-color 0.15s;
}

.ability:hover,
.ability:focus-visible {
  border-color: var(--mana);
}

/* The mana cost sits on the bottom edge of the icon, as on a Dota ability. */
.cost {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 1px 0;
  border-radius: 0 0 var(--radius) var(--radius);
  background: rgba(8, 14, 12, 0.8);
  color: var(--mana);
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.talents {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.talent {
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  padding: 0;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.03);
  color: var(--chalk-faint);
  cursor: help;
}

.talent.on {
  border-color: rgba(127, 224, 180, 0.6);
  color: var(--heal);
}

.talent.on svg {
  fill: currentColor;
}

/* Waiting for a pick: the diamonds breathe in gold, one after the other, until the coach chooses. */
.talent.open {
  border-color: rgba(244, 197, 91, 0.55);
  color: var(--gold);
  animation: talent-call 2.4s ease-in-out infinite;
  animation-delay: calc(var(--i) * 1.2s);
}

@keyframes talent-call {
  50% {
    box-shadow: 0 0 10px rgba(244, 197, 91, 0.45);
  }
}

.tip {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tip-title {
  color: var(--chalk);
}

.talent-name {
  font-family: var(--font-hand);
  font-size: 17px;
  line-height: 1.05;
}

.tip-status {
  font-size: 11px;
  font-weight: 700;
  color: var(--chalk-faint);
}

.tip-status.on {
  color: var(--heal);
}

@media (prefers-reduced-motion: reduce) {
  .talent.open {
    animation: none;
  }
}
</style>
