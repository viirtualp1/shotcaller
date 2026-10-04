<script setup lang="ts">
import { useElementVisibility, useIntervalFn, usePreferredReducedMotion } from '@vueuse/core'
import { Shuffle, Sparkles } from '@lucide/vue'
import { computed, ref } from 'vue'
import type { HeroId, ShopItemId } from '@/content/ids'
import type { TwistId } from '@/content/experiments'
import { useAutoCycle } from '../../composables/useAutoCycle'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ItemIcon from '../common/ItemIcon.vue'

/**
 * Pictures of the 9.0 highlights. The values are the release's own, written out: a later balance change leaves
 * them as they were. Only the talent fork takes clicks, because picking is what the feature is about.
 */
const props = defineProps<{ focus: 'upgrades' | 'talents' | 'items' | 'experiments' }>()

const TALENT_STATES = [0, 1, 'both'] as const

const settings = useSettingsStore()
const motion = usePreferredReducedMotion()
const root = ref<HTMLElement | null>(null)
const visible = useElementVisibility(root)
const talent = ref<(typeof TALENT_STATES)[number]>(0)
const spotlight = ref(0)

const NEW_ITEMS: readonly ShopItemId[] = ['soulJar', 'soulbond', 'echoShard', 'townPortal', 'cursedBlade']

const TWIST_ORDER: readonly TwistId[] = [
  'bloodMoon',
  'fog',
  'siegeTide',
  'manaSurge',
  'stoneWalls',
  'tailwind',
]

/** A sample rotation: fifteen heroes in, six out. */
const ROTATION: readonly { id: HeroId; in: boolean }[] = [
  {
    id: 'spearman',
    in: true,
  },
  {
    id: 'archer',
    in: true,
  },
  {
    id: 'acolyte',
    in: false,
  },
  {
    id: 'sapper',
    in: true,
  },
  {
    id: 'shaman',
    in: true,
  },
  {
    id: 'rogue',
    in: false,
  },
  {
    id: 'herald',
    in: true,
  },
  {
    id: 'shade',
    in: true,
  },
  {
    id: 'pyromancer',
    in: true,
  },
  {
    id: 'warden',
    in: false,
  },
  {
    id: 'blademaster',
    in: true,
  },
  {
    id: 'packLeader',
    in: true,
  },
  {
    id: 'necromancer',
    in: false,
  },
  {
    id: 'stonewright',
    in: true,
  },
  {
    id: 'frostWitch',
    in: true,
  },
  {
    id: 'giant',
    in: true,
  },
  {
    id: 'engineer',
    in: false,
  },
  {
    id: 'butcher',
    in: true,
  },
  {
    id: 'sniper',
    in: false,
  },
  {
    id: 'oracle',
    in: true,
  },
  {
    id: 'changeling',
    in: true,
  },
]

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        stat: 'скорость атаки',
        arrows: 'стрел',
        damage: 'урона',
        storm: 'Arrow Storm',
        bodkin: 'Bodkin Points',
        both: 'На ★★★ — оба',
        pick: 'Выбери талант',
        items: [
          'Души копятся весь матч',
          'Делит урон с напарником',
          'Способность — дважды',
          'Мчится к падающей башне',
          'Сила ценой трона',
        ],
        twists: {
          bloodMoon: 'Кровавая луна',
          fog: 'Туман',
          siegeTide: 'Осадный прилив',
          manaSurge: 'Прилив маны',
          stoneWalls: 'Каменные стены',
          tailwind: 'Попутный ветер',
        },
        roster: '15 из 21 героя',
        round: 'Раунд 4',
      }
    : {
        stat: 'attack speed',
        arrows: 'arrows',
        damage: 'damage',
        storm: 'Arrow Storm',
        bodkin: 'Bodkin Points',
        both: 'At ★★★: both',
        pick: 'Pick a talent',
        items: [
          'Souls last the whole match',
          'Shares damage with a lane-mate',
          'The ability, twice',
          'Rushes to a falling tower',
          'Power at the throne’s cost',
        ],
        twists: {
          bloodMoon: 'Blood Moon',
          fog: 'Fog',
          siegeTide: 'Siege Tide',
          manaSurge: 'Mana Surge',
          stoneWalls: 'Stone Walls',
          tailwind: 'Tailwind',
        },
        roster: '15 of 21 heroes',
        round: 'Round 4',
      },
)

const lit = (branch: 0 | 1) => talent.value === 'both' || talent.value === branch

/* Left alone, the fork shows one talent, then the other, then both at three stars, and starts over. */
const { restart } = useAutoCycle(
  () => {
    talent.value = TALENT_STATES[(TALENT_STATES.indexOf(talent.value) + 1) % TALENT_STATES.length]!
  },
  5000,
  computed(() => visible.value && props.focus === 'talents'),
)

function pickTalent(state: (typeof TALENT_STATES)[number]) {
  talent.value = state
  restart()
}

/* The new items take turns in the spotlight. */
useIntervalFn(() => {
  if (motion.value !== 'reduce') {
    spotlight.value = (spotlight.value + 1) % NEW_ITEMS.length
  }
}, 1800)
</script>

<template>
  <div ref="root" class="forge" :class="focus">
    <!-- Two copies fly together, flash, and come out as one upgrade. -->
    <div v-if="focus === 'upgrades'" class="merge" aria-hidden="true">
      <span class="copy left"><ItemIcon item-id="gloves" :size="52" /></span>
      <span class="copy right"><ItemIcon item-id="gloves" :size="52" /></span>
      <span class="flash" />

      <span class="result">
        <ItemIcon item-id="gloves+" :size="72" />
        <span class="numbers"><s>+20%</s> <b>+40%</b> {{ copy.stat }}</span>
      </span>
    </div>

    <!-- A two-star hero and the fork between its talents; three stars light both paths. -->
    <div v-else-if="focus === 'talents'" class="fork">
      <HeroAvatar hero-id="archer" :size="56" :stars="talent === 'both' ? 3 : 2" class="root" />

      <svg class="paths" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">
        <path :class="{ lit: lit(0) }" d="M150 0 C 150 40, 70 30, 70 70" />
        <path :class="{ lit: lit(1) }" d="M150 0 C 150 40, 230 30, 230 70" />
      </svg>

      <div class="branches" role="group" :aria-label="copy.pick">
        <button type="button" :class="{ lit: lit(0) }" :aria-pressed="lit(0)" @click="pickTalent(0)">
          <strong>{{ copy.storm }}</strong>
          <span><s>3</s> <b>5</b> {{ copy.arrows }}</span>
        </button>

        <button type="button" :class="{ lit: lit(1) }" :aria-pressed="lit(1)" @click="pickTalent(1)">
          <strong>{{ copy.bodkin }}</strong>
          <span><s>70</s> <b>90</b> {{ copy.damage }}</span>
        </button>
      </div>

      <button type="button" class="both" :aria-pressed="talent === 'both'" @click="pickTalent('both')">
        {{ copy.both }}
      </button>
    </div>

    <!-- The five new items on an arc, each lifted into the light in turn. -->
    <div v-else-if="focus === 'items'" class="arc" aria-hidden="true">
      <span
        v-for="(id, i) in NEW_ITEMS"
        :key="id"
        class="relic"
        :class="{ on: spotlight === i }"
        :style="{ '--i': i - 2 }"
      >
        <ItemIcon :item-id="id" :size="spotlight === i ? 58 : 42" />
      </span>

      <Transition name="caption" mode="out-in">
        <span :key="spotlight" class="caption">{{ copy.items[spotlight] }}</span>
      </Transition>
    </div>

    <!-- A fanned deck of twists, and a hero pool with six heroes left out. -->
    <div v-else class="lab" aria-hidden="true">
      <div class="deck">
        <span v-for="(id, i) in TWIST_ORDER" :key="id" class="card" :style="{ '--i': i }">
          <Sparkles :size="13" /> {{ copy.twists[id] }}
        </span>

        <span class="round">{{ copy.round }}</span>
      </div>

      <div class="pool">
        <span class="label"><Shuffle :size="13" /> {{ copy.roster }}</span>

        <span class="grid">
          <span v-for="hero in ROTATION" :key="hero.id" class="seat" :class="{ out: !hero.in }">
            <HeroAvatar :hero-id="hero.id" :size="22" />
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forge {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 250px;
  padding: 18px;
  background:
    radial-gradient(ellipse at 50% 100%, #ff8a3d1f, transparent 60%),
    radial-gradient(ellipse 70% 60% at 50% 40%, #f4c55b14, transparent 70%);
}

s {
  color: var(--chalk-faint);
}

b {
  color: var(--gold);
}

/* Upgrades: a 3.6 s loop of two copies meeting in a flash. */
.merge {
  position: relative;
  width: 260px;
  height: 200px;
}

.copy {
  position: absolute;
  top: 50px;
  animation: 3.6s ease-in-out infinite;
}

.copy.left {
  left: 10px;
  animation-name: from-left;
}

.copy.right {
  right: 10px;
  animation-name: from-right;
}

.flash {
  position: absolute;
  top: 34px;
  left: 50%;
  width: 90px;
  height: 90px;
  translate: -50% 0;
  border-radius: 50%;
  background: radial-gradient(circle, #fff6d9, #f4c55b88 40%, transparent 70%);
  opacity: 0;
  animation: flash 3.6s ease-out infinite;
}

.result {
  position: absolute;
  top: 40px;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  translate: -50% 0;
  opacity: 0;
  animation: reveal 3.6s ease-out infinite;
  white-space: nowrap;
}

.numbers {
  font-size: 13px;
  color: var(--chalk-dim);
}

/* Talents: the chosen branch is drawn in gold, the other stays chalk. */
.fork {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(320px, 100%);
}

.paths {
  width: 100%;
  height: 54px;
  overflow: visible;
}

.paths path {
  fill: none;
  stroke: #ece8dc30;
  stroke-width: 2.5;
  stroke-dasharray: 6 6;
  transition: stroke 0.3s;
}

.paths path.lit {
  stroke: var(--gold);
  stroke-dasharray: 160;
  animation: draw-path 0.6s ease-out;
}

.branches {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
}

.branches button,
.both {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 9px 6px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff05;
  color: var(--chalk-dim);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition:
    border-color 0.25s,
    background 0.25s,
    box-shadow 0.25s,
    color 0.25s;
}

.branches strong {
  font-family: var(--font-hand);
  font-size: 18px;
  color: var(--chalk);
}

.branches button.lit {
  border-color: var(--gold);
  background: #f4c55b14;
  box-shadow: 0 0 18px #f4c55b33;
}

.both {
  margin-top: 10px;
  padding: 5px 12px;
  font-weight: 700;
}

.both[aria-pressed='true'] {
  border-color: var(--gold);
  color: var(--gold);
}

/* Items: an arc of relics, one lifted and lit at a time. */
.arc {
  position: relative;
  width: 300px;
  height: 200px;
}

.relic {
  position: absolute;
  bottom: 60px;
  left: 50%;
  translate: calc(-50% + var(--i) * 56px) calc(var(--i) * var(--i) * 6px);
  filter: saturate(0.7) brightness(0.85);
  transition:
    translate 0.5s cubic-bezier(0.3, 1.3, 0.5, 1),
    filter 0.4s;
}

.relic.on {
  translate: calc(-50% + var(--i) * 56px) calc(var(--i) * var(--i) * 6px - 18px);
  filter: drop-shadow(0 0 14px #f4c55b88);
}

.caption {
  position: absolute;
  bottom: 14px;
  left: 0;
  right: 0;
  text-align: center;
  color: var(--chalk);
  font-size: 13px;
  font-weight: 700;
}

.caption-enter-active,
.caption-leave-active {
  transition:
    opacity 0.2s,
    translate 0.2s;
}

.caption-enter-from {
  opacity: 0;
  translate: 0 6px;
}

.caption-leave-to {
  opacity: 0;
  translate: 0 -6px;
}

/* Experiments: the twist deck fans out and shuffles; the pool greys out the heroes left home. */
.lab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.deck {
  position: relative;
  width: 240px;
  height: 90px;
}

.card {
  position: absolute;
  top: 10px;
  left: 50%;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: 128px;
  padding: 10px 8px;
  border: 1px solid #f4c55b66;
  border-radius: var(--radius);
  background: linear-gradient(160deg, #2a2418, #17130c);
  color: var(--gold);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 6px 14px #0006;
  transform-origin: 50% 160%;
  translate: -50% 0;
  rotate: calc((var(--i) - 2.5) * 9deg);
  animation: shuffle 6s ease-in-out infinite;
  animation-delay: calc(var(--i) * -1s);
}

.round {
  position: absolute;
  bottom: -14px;
  left: 50%;
  translate: -50% 0;
  color: var(--chalk-faint);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--chalk-dim);
  font-size: 11px;
  font-weight: 700;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 22px);
  gap: 5px;
}

.seat.out {
  opacity: 0.22;
  filter: grayscale(1);
}

@keyframes from-left {
  0%,
  10% {
    translate: 0 0;
    opacity: 1;
  }

  42% {
    translate: 92px 0;
    opacity: 1;
  }

  48%,
  100% {
    translate: 92px 0;
    opacity: 0;
  }
}

@keyframes from-right {
  0%,
  10% {
    translate: 0 0;
    opacity: 1;
  }

  42% {
    translate: -92px 0;
    opacity: 1;
  }

  48%,
  100% {
    translate: -92px 0;
    opacity: 0;
  }
}

@keyframes flash {
  0%,
  40% {
    opacity: 0;
    scale: 0.4;
  }

  48% {
    opacity: 1;
    scale: 1.3;
  }

  65%,
  100% {
    opacity: 0;
    scale: 1.6;
  }
}

@keyframes reveal {
  0%,
  46% {
    opacity: 0;
    scale: 0.7;
  }

  56% {
    opacity: 1;
    scale: 1.08;
  }

  62%,
  92% {
    opacity: 1;
    scale: 1;
  }

  100% {
    opacity: 0;
    scale: 1;
  }
}

@keyframes draw-path {
  from {
    stroke-dashoffset: 160;
  }

  to {
    stroke-dashoffset: 0;
  }
}

@keyframes shuffle {
  0%,
  70%,
  100% {
    rotate: calc((var(--i) - 2.5) * 9deg);
  }

  80% {
    rotate: calc((2.5 - var(--i)) * 4deg);
    translate: -50% -8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .copy,
  .flash,
  .card {
    animation: none;
  }

  .copy {
    opacity: 0;
  }

  .result {
    opacity: 1;
    animation: none;
  }

  .paths path.lit {
    animation: none;
  }
}
</style>
