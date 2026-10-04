<script setup lang="ts">
import { useElementVisibility, useIntervalFn, usePreferredReducedMotion } from '@vueuse/core'
import { Shuffle, Sparkles } from '@lucide/vue'
import { computed, ref } from 'vue'
import { HERO_IDS, type HeroId, type ShopItemId } from '@/content/ids'
import type { TwistId } from '@/content/experiments'
import { cssColor } from '@/rendering/theme'
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
const BRANCHES = ['M150 0 C 150 40, 70 30, 70 70', 'M150 0 C 150 40, 230 30, 230 70'] as const
/** Seconds a branch takes to fill, the spark running ahead of the gold. */
const FILL_SECONDS = 0.9

/**
 * How long each state stays up once its branch has filled: the right one follows the left after a second, both
 * light together two seconds later, and the loop rests a little before starting over.
 */
const TALENT_HOLD: Readonly<Record<(typeof TALENT_STATES)[number], number>> = {
  0: 1,
  1: 2,
  both: 2.6,
}

const NEW_ITEMS: readonly ShopItemId[] = ['soulJar', 'soulbond', 'echoShard', 'townPortal', 'cursedBlade']
const SPARKS = 10
const ROTATION_SIZE = 15
/** Twist cards on the table: the one on air and the ones stacked behind it. */
const DECK_DEPTH = 3

/* Twist colours as they shipped in 9.0. */
const TWIST_ORDER: readonly { id: TwistId; color: number }[] = [
  {
    id: 'bloodMoon',
    color: 0xd9534f,
  },
  {
    id: 'fog',
    color: 0x9fb4c7,
  },
  {
    id: 'siegeTide',
    color: 0xd7b98a,
  },
  {
    id: 'manaSurge',
    color: 0x6fb3ff,
  },
  {
    id: 'stoneWalls',
    color: 0xa7a08f,
  },
  {
    id: 'tailwind',
    color: 0x7fe0b4,
  },
]

const settings = useSettingsStore()
const motion = usePreferredReducedMotion()
const root = ref<HTMLElement | null>(null)
const visible = useElementVisibility(root)
const talent = ref<(typeof TALENT_STATES)[number]>(0)
const spotlight = ref(0)
/** How many twist cards have been dealt; the newest is on top. */
const dealt = ref(0)
const shuffles = ref(0)
const rotation = ref<ReadonlySet<HeroId>>(drawRotation())

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
          bloodMoon: ['Кровавая луна', 'Герои наносят на 25% больше урона'],
          fog: ['Туман', 'Дальний бой бьёт на 25% ближе'],
          siegeTide: ['Осадный прилив', 'Крипы бьют строения на 60% сильнее'],
          manaSurge: ['Прилив маны', 'Мана копится на 50% быстрее'],
          stoneWalls: ['Каменные стены', 'Строения получают на 30% меньше урона'],
          tailwind: ['Попутный ветер', 'Герои бегают на 30% быстрее'],
        },
        twist: 'Правило раунда',
        roster: '15 из 21 героя',
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
          bloodMoon: ['Blood Moon', 'Heroes deal 25% more damage'],
          fog: ['Fog', 'Ranged heroes reach 25% less far'],
          siegeTide: ['Siege Tide', 'Creeps hit buildings 60% harder'],
          manaSurge: ['Mana Surge', 'Heroes gain mana 50% faster'],
          stoneWalls: ['Stone Walls', 'Buildings take 30% less damage'],
          tailwind: ['Tailwind', 'Heroes move 30% faster'],
        },
        twist: 'Round twist',
        roster: '15 of 21 heroes',
      },
)

/** The cards on the table, back to front: the newest one is on air. */
const deck = computed(() =>
  Array.from({ length: DECK_DEPTH }, (_, i) => {
    const number = dealt.value - (DECK_DEPTH - 1 - i)
    const twist = TWIST_ORDER[((number % TWIST_ORDER.length) + TWIST_ORDER.length) % TWIST_ORDER.length]!

    return {
      number,
      depth: DECK_DEPTH - 1 - i,
      ...twist,
    }
  }),
)

const lit = (branch: 0 | 1) => talent.value === 'both' || talent.value === branch

/** A sample draw: fifteen heroes in and the rest left out, the way one match deals them. */
function drawRotation(): ReadonlySet<HeroId> {
  const pool = [...HERO_IDS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }

  return new Set(pool.slice(0, ROTATION_SIZE))
}

/* Left alone, the fork fills one talent, then the other, then both at three stars, and starts over. */
const { restart } = useAutoCycle(
  () => {
    talent.value = TALENT_STATES[(TALENT_STATES.indexOf(talent.value) + 1) % TALENT_STATES.length]!
  },
  () => (FILL_SECONDS + TALENT_HOLD[talent.value]) * 1000,
  computed(() => visible.value && props.focus === 'talents'),
)

function pickTalent(state: (typeof TALENT_STATES)[number]) {
  talent.value = state
  restart()
}

/* Every few seconds the next twist goes on air and the pool is dealt again. */
useAutoCycle(
  () => {
    dealt.value++
    shuffles.value++
    rotation.value = drawRotation()
  },
  5000,
  computed(() => visible.value && props.focus === 'experiments'),
)

/* The new items take turns in the spotlight. */
useIntervalFn(() => {
  if (motion.value !== 'reduce') {
    spotlight.value = (spotlight.value + 1) % NEW_ITEMS.length
  }
}, 1800)
</script>

<template>
  <div ref="root" class="forge" :class="focus">
    <!-- Two copies swing in, melt into one flash, and the upgrade springs out of it. -->
    <div v-if="focus === 'upgrades'" class="merge" aria-hidden="true">
      <span class="copy" style="--dir: -1"><ItemIcon item-id="gloves" :size="52" /></span>
      <span class="copy" style="--dir: 1"><ItemIcon item-id="gloves" :size="52" /></span>
      <span class="bloom" />
      <span class="ring" />

      <span class="sparks">
        <i v-for="n in SPARKS" :key="n" :style="{ '--a': `${(n * 360) / SPARKS}deg` }" />
      </span>

      <span class="result">
        <ItemIcon item-id="gloves+" :size="72" />
      </span>

      <span class="numbers"><s>+20%</s> <b>+40%</b> {{ copy.stat }}</span>
    </div>

    <!-- A two-star hero and the fork between its talents; three stars light both paths. -->
    <div v-else-if="focus === 'talents'" class="fork">
      <HeroAvatar hero-id="archer" :size="56" :stars="talent === 'both' ? 3 : 2" class="root" />

      <!-- A new SVG for every state, so its fills and sparks start over from the hero each time. -->
      <svg
        :key="String(talent)"
        class="paths"
        viewBox="0 0 300 70"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path v-for="(d, i) in BRANCHES" :key="`track-${i}`" class="track" :d="d" />

        <template v-for="(d, i) in BRANCHES" :key="`fill-${i}`">
          <template v-if="lit(i as 0 | 1)">
            <path class="fill" :d="d" :style="{ animationDuration: `${FILL_SECONDS}s` }" />

            <circle class="spark" r="4">
              <animateMotion :dur="`${FILL_SECONDS}s`" fill="freeze" :path="d" />

              <animate
                attributeName="opacity"
                values="1;1;0"
                keyTimes="0;0.8;1"
                :dur="`${FILL_SECONDS}s`"
                fill="freeze"
              />
            </circle>
          </template>
        </template>
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

    <!--
      Twists go on air like captions on a broadcast: each new card drops in over the last, which sinks back into
      the stack. Below, the pool is dealt again and again, fifteen heroes in and the rest left out.
    -->
    <div v-else class="lab" aria-hidden="true">
      <TransitionGroup tag="div" name="deal" class="deck">
        <span
          v-for="card in deck"
          :key="card.number"
          class="card"
          :style="{ '--depth': card.depth, '--twist': cssColor(card.color) }"
        >
          <span class="kicker"><Sparkles :size="11" /> {{ copy.twist }}</span>
          <strong>{{ copy.twists[card.id][0] }}</strong>
          <span class="rule">{{ copy.twists[card.id][1] }}</span>
        </span>
      </TransitionGroup>

      <div class="pool">
        <span class="label">
          <Shuffle :key="shuffles" :size="14" class="shuffle" />
          {{ copy.roster }}
        </span>

        <span class="grid">
          <span
            v-for="(id, i) in HERO_IDS"
            :key="id"
            class="seat"
            :class="{ out: !rotation.has(id) }"
            :style="{ '--d': `${(i % 7) * 40 + Math.floor(i / 7) * 60}ms` }"
          >
            <HeroAvatar :hero-id="id" :size="24" />
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

/*
 * Upgrades, a 4.2 s loop. The copies arc toward each other, tilt and shrink as they heat up; a bloom, a ring and
 * a burst of sparks cover the merge; the upgrade springs out, its plus clicks on, and the numbers rise.
 */
.merge {
  --loop: 4.2s;
  position: relative;
  width: 280px;
  height: 210px;
}

.copy,
.bloom,
.ring,
.sparks,
.result {
  position: absolute;
  top: 42%;
  left: 50%;
  translate: -50% -50%;
}

.copy {
  animation: converge var(--loop) cubic-bezier(0.5, 0, 0.6, 1) infinite;
}

.bloom {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff7dc 0%, #f4c55bcc 30%, #ff8a3d44 55%, transparent 72%);
  opacity: 0;
  animation: bloom var(--loop) ease-out infinite;
}

.ring {
  width: 70px;
  height: 70px;
  border: 2px solid var(--gold);
  border-radius: 50%;
  opacity: 0;
  animation: ring var(--loop) ease-out infinite;
}

.sparks i {
  position: absolute;
  top: 0;
  left: 0;
  width: 5px;
  height: 5px;
  margin: -2.5px;
  border-radius: 50%;
  background: #ffd27a;
  box-shadow: 0 0 8px #ff9d4d;
  opacity: 0;
  animation: spark var(--loop) cubic-bezier(0.2, 0.7, 0.3, 1) infinite;
}

.result {
  opacity: 0;
  animation: spring var(--loop) infinite;
}

.result :deep(.plus) {
  animation: plus-click var(--loop) infinite;
}

.numbers {
  position: absolute;
  bottom: 18px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 13px;
  color: var(--chalk-dim);
  opacity: 0;
  animation: numbers var(--loop) ease-out infinite;
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
  stroke-width: 2.5;
}

.paths .track {
  stroke: #ece8dc30;
  stroke-dasharray: 6 6;
}

/* The branch fills with gold from the hero down to the talent. */
.paths .fill {
  stroke: var(--gold);
  stroke-dasharray: 160;
  stroke-dashoffset: 160;
  filter: drop-shadow(0 0 4px #f4c55b99);
  animation: draw-path ease-in-out forwards;
}

.spark {
  fill: #fff2c4;
  filter: drop-shadow(0 0 6px #f4c55b);
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
  /* Lights up as the gold reaches it. */
  transition-delay: 0.75s;
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

/* Experiments. */
.lab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  width: 100%;
}

.deck {
  position: relative;
  width: min(250px, 100%);
  height: 92px;
  perspective: 700px;
}

/* A caption card; the ones further back sit higher, smaller and dimmer, like a stack of slates. */
.card {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 12px 10px 16px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--twist) 55%, transparent);
  border-radius: var(--radius);
  background: linear-gradient(100deg, color-mix(in srgb, var(--twist) 20%, #15120c), #110e09 70%);
  box-shadow: 0 10px 22px #0008;
  transform: translateY(calc(var(--depth) * -12px)) scale(calc(1 - var(--depth) * 0.06));
  transform-origin: 50% 0;
  opacity: calc(1 - var(--depth) * 0.3);
  z-index: calc(10 - var(--depth));
  transition:
    transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.6s;
}

/* The coloured edge a broadcast caption carries. */
.card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: var(--twist);
}

.kicker {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--twist);
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.card strong {
  color: var(--chalk);
  font-size: 15px;
  line-height: 1.1;
}

.rule {
  color: var(--chalk-dim);
  font-size: 11.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* A new card flips down onto the stack; the oldest one fades away at the back. */
.deal-enter-active {
  transition:
    transform 0.7s cubic-bezier(0.2, 0.9, 0.25, 1.15),
    opacity 0.35s;
}

.deal-enter-from {
  transform: translateY(-34px) rotateX(-80deg) scale(1.04);
  opacity: 0;
}

.deal-leave-active {
  transition:
    transform 0.5s,
    opacity 0.4s;
}

.deal-leave-to {
  transform: translateY(-40px) scale(0.8);
  opacity: 0;
}

.pool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--chalk-dim);
  font-size: 11.5px;
  font-weight: 700;
}

/* The shuffle icon gives a full turn each time the pool is dealt again. */
.shuffle {
  color: var(--gold);
  animation: turn 0.8s cubic-bezier(0.3, 1.4, 0.5, 1);
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 24px);
  gap: 10px 12px;
}

/* Seats change in a wave across the grid when the pool is dealt again. */
.seat {
  transition:
    opacity 0.45s,
    filter 0.45s,
    transform 0.45s cubic-bezier(0.3, 1.5, 0.5, 1);
  transition-delay: var(--d);
}

.seat.out {
  opacity: 0.2;
  filter: grayscale(1);
  transform: scale(0.8);
}

@keyframes converge {
  0% {
    transform: translateX(calc(var(--dir) * 96px)) rotate(0) scale(1);
    opacity: 0;
  }

  8%,
  14% {
    transform: translateX(calc(var(--dir) * 96px)) rotate(0) scale(1);
    opacity: 1;
    filter: none;
  }

  28% {
    transform: translateX(calc(var(--dir) * 60px)) translateY(-28px) rotate(calc(var(--dir) * -12deg))
      scale(0.94);
  }

  40% {
    transform: translateX(calc(var(--dir) * 8px)) translateY(-4px) rotate(calc(var(--dir) * -34deg))
      scale(0.7);
    opacity: 1;
    filter: brightness(1.9) drop-shadow(0 0 10px #f4c55b);
  }

  44%,
  100% {
    transform: translateX(0) rotate(calc(var(--dir) * -40deg)) scale(0.5);
    opacity: 0;
  }
}

@keyframes bloom {
  0%,
  38% {
    opacity: 0;
    scale: 0.3;
  }

  44% {
    opacity: 1;
    scale: 1.15;
  }

  62%,
  100% {
    opacity: 0;
    scale: 1.5;
  }
}

@keyframes ring {
  0%,
  41% {
    opacity: 0;
    scale: 0.3;
  }

  44% {
    opacity: 1;
    scale: 0.6;
  }

  64%,
  100% {
    opacity: 0;
    scale: 2.4;
  }
}

@keyframes spark {
  0%,
  41% {
    opacity: 0;
    transform: rotate(var(--a)) translateX(0);
  }

  44% {
    opacity: 1;
    transform: rotate(var(--a)) translateX(10px);
  }

  62%,
  100% {
    opacity: 0;
    transform: rotate(var(--a)) translateX(82px);
  }
}

@keyframes spring {
  0%,
  42% {
    opacity: 0;
    scale: 0.3;
  }

  50% {
    opacity: 1;
    scale: 1.18;
  }

  56% {
    scale: 0.95;
  }

  61%,
  90% {
    opacity: 1;
    scale: 1;
  }

  100% {
    opacity: 0;
    scale: 1;
  }
}

@keyframes plus-click {
  0%,
  54% {
    scale: 0;
  }

  60% {
    scale: 1.5;
  }

  65%,
  100% {
    scale: 1;
  }
}

@keyframes numbers {
  0%,
  56% {
    opacity: 0;
    translate: 0 8px;
  }

  64%,
  90% {
    opacity: 1;
    translate: 0 0;
  }

  100% {
    opacity: 0;
    translate: 0 0;
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

@keyframes turn {
  from {
    rotate: -360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .copy,
  .bloom,
  .ring,
  .sparks i {
    display: none;
  }

  .result,
  .numbers,
  .result :deep(.plus) {
    opacity: 1;
    scale: 1;
    animation: none;
  }

  .paths path.lit,
  .shuffle {
    animation: none;
  }
}
</style>
