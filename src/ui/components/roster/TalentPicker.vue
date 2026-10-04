<script setup lang="ts">
import { Check, Lock, Sparkle } from '@lucide/vue'
import { computed } from 'vue'
import { HEROES } from '@/content/heroes'
import type { HeroId, StarLevel } from '@/content/ids'
import { STAR_POWER } from '@/content/rules'
import { activeTalents, type TalentChoice } from '@/content/talents'
import { useGameText } from '../../composables/useGameText'

/**
 * The two talents of a hero's ability. Below two stars both are previews; at two stars the coach picks one, once;
 * three stars bring both. `canChoose` is off for enemy heroes and outside planning.
 */
const props = defineProps<{
  heroId: HeroId
  stars: StarLevel
  talent?: TalentChoice
  canChoose: boolean
}>()

const emit = defineEmits<{ choose: [talent: TalentChoice] }>()

const text = useGameText()
const { t } = text
const ability = computed(() => HEROES[props.heroId].ability)
const active = computed(() => activeTalents(props.stars, props.talent))
const picking = computed(() => props.stars === 2 && props.talent === undefined)
const power = computed(() => STAR_POWER[props.stars])

const hint = computed(() => {
  if (props.stars >= 3) {
    return t('talentPicker.both')
  }

  return picking.value ? t('talentPicker.pick') : props.stars < 2 ? t('talentPicker.locked') : null
})

const options = computed(() =>
  ([0, 1] as const).map((talent) => ({
    talent,
    name: text.talentName(ability.value, talent),
    description: text.talentDescription(ability.value, talent, power.value),
    on: active.value.includes(talent),
  })),
)
</script>

<template>
  <section class="talents" :class="{ picking }">
    <header class="head">
      <span class="label">{{ t('talentPicker.title') }}</span>
      <span class="stars">★★</span>
    </header>

    <p v-if="hint" class="hint">{{ hint }}</p>

    <div class="options">
      <component
        :is="picking && canChoose ? 'button' : 'div'"
        v-for="(option, i) in options"
        :key="option.talent"
        :type="picking && canChoose ? 'button' : undefined"
        class="option"
        :class="{ on: option.on, off: !option.on && !picking, open: picking }"
        :style="{ '--i': i }"
        @click="picking && canChoose && emit('choose', option.talent)"
      >
        <span class="title">
          <Check v-if="option.on" :size="13" />
          <Sparkle v-else-if="picking" :size="13" />
          <Lock v-else :size="12" />
          {{ option.name }}
        </span>

        <span class="text">{{ option.description }}</span>

        <span v-if="picking && canChoose" class="cta">{{ t('talentPicker.choose') }}</span>

        <span v-else-if="option.on && stars === 2" class="cta quiet">{{ t('talentPicker.chosen') }}</span>

        <span v-else-if="!option.on && stars === 2" class="cta quiet">{{ t('talentPicker.later') }}</span>
      </component>
    </div>
  </section>
</template>

<style scoped>
.talents {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.stars {
  font-size: 11px;
  color: var(--gold);
  letter-spacing: -0.05em;
}

.hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--chalk-faint);
}

.picking .hint {
  color: var(--gold);
}

.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.option {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: var(--radius);
  border: 1px solid var(--edge);
  background: rgba(255, 255, 255, 0.03);
  color: var(--chalk);
  font: inherit;
  text-align: left;
  transition:
    border-color 0.2s,
    background 0.2s,
    translate 0.2s,
    opacity 0.2s;
}

.title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-hand);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.05;
}

.text {
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--chalk-dim);
}

.cta {
  margin-top: auto;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
}

.cta.quiet {
  color: var(--chalk-faint);
}

.option.on {
  border-color: rgba(127, 224, 180, 0.6);
  background: rgba(127, 224, 180, 0.08);
}

.option.on .title {
  color: var(--heal, #7fe0b4);
}

.option.off {
  opacity: 0.55;
}

/* Waiting for a pick: both cards breathe in gold, one after the other, until the coach chooses. */
.option.open {
  border-color: rgba(244, 197, 91, 0.55);
  animation: talent-call 2.4s ease-in-out infinite;
  animation-delay: calc(var(--i) * 1.2s);
}

button.option.open {
  cursor: pointer;
}

button.option.open:hover,
button.option.open:focus-visible {
  translate: 0 -2px;
  border-color: var(--gold);
  background: rgba(244, 197, 91, 0.1);
  animation-play-state: paused;
}

@keyframes talent-call {
  50% {
    box-shadow: 0 0 14px rgba(244, 197, 91, 0.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .option.open {
    animation: none;
  }
}
</style>
