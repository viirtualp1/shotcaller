<script setup lang="ts">
import { useElementVisibility, usePreferredReducedMotion } from '@vueuse/core'
import { Castle, Flame, Hammer, HeartHandshake, Layers3, Sparkles, Swords, Users, Zap } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { HeroId, LaneStance, RoleId } from '@/content/ids'
import { useAutoCycle } from '../../composables/useAutoCycle'
import { useGameText } from '../../composables/useGameText'
import { useSettingsStore } from '../../stores/settings'
import { ROLE_ICONS } from '../../icons'
import HeroAvatar from '../common/HeroAvatar.vue'

/**
 * The introduction of the heroes-and-forge release: three new heroes step out of the forge. Picking one plays a short
 * scene of what it does. Left alone, the scene plays itself: every few seconds the next order, the next hero or the
 * next lane-mate. Every number is the release's own, written out so later balance changes leave this page as it was.
 */
type Stage = 'herald' | 'stonewright' | 'changeling'
type Order = LaneStance | 'none'

const props = defineProps<{ version: string }>()

const settings = useSettingsStore()
const text = useGameText()
const root = ref<HTMLElement | null>(null)
const visible = useElementVisibility(root)
const motion = usePreferredReducedMotion()
const stage = ref<Stage>('herald')
const order = ref<Order>('push')
const mate = ref(0)

const tilt = ref({
  x: 0,
  y: 0,
})

const STATS = [
  {
    value: 3,
    icon: Users,
  },
  {
    value: 5,
    icon: Sparkles,
  },
  {
    value: 16,
    icon: Hammer,
  },
  {
    value: 42,
    icon: Layers3,
  },
] as const

const counted = ref(STATS.map(() => 0))

/* The Changeling beside a lane-mate: the role it takes and the synergy that switches on, as of 9.0. */
const MATES: readonly { heroId: HeroId; role: RoleId; synergy: { en: string; ru: string } }[] = [
  {
    heroId: 'archer',
    role: 'support',
    synergy: {
      en: 'Guardian',
      ru: 'Опека',
    },
  },
  {
    heroId: 'pyromancer',
    role: 'mage',
    synergy: {
      en: 'Arcane',
      ru: 'Арканы',
    },
  },
  {
    heroId: 'rogue',
    role: 'initiator',
    synergy: {
      en: 'Hunt',
      ru: 'Охота',
    },
  },
  {
    heroId: 'sapper',
    role: 'carry',
    synergy: {
      en: 'Siege',
      ru: 'Осада',
    },
  },
]

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: `Патч ${props.version} · Герои · Предметы · Таланты`,
        title: ['Новая кровь.', 'Новая сталь.'],
        intro:
          'Три героя, которые меняют правила линии. Предметы, которые куются из двух в один. И выбор на второй звезде, который делает каждого героя твоим',
        stats: ['новых героя', 'новых предметов', 'улучшений', 'талантов'],
        pick: 'Выбери героя',
        heroes: {
          herald: {
            name: 'Herald',
            tag: 'Инициатор · 1 тир',
          },
          stonewright: {
            name: 'Stonewright',
            tag: 'Саппорт · 2 тир',
          },
          changeling: {
            name: 'Changeling',
            tag: 'Редкий · 3 тир',
          },
        },
        orders: {
          push: ['Вперёд', 'Крипы атакуют на 20% быстрее и бьют строения на 35% сильнее'],
          hold: ['Защита', 'Башни и трон получают на 40% меньше урона'],
          group: ['Вместе', 'Герои бьют на 25% сильнее, враги оглушены на 1,2 с'],
          none: ['Без приказа', 'Герои получают на 10% меньше урона'],
        },
        banner: 'Знамя слушает приказ линии',
        mend: 'Чинит башню: 50 здоровья в секунду',
        reclaimed: 'Под «Защитой» урон врага за раунд отыгран',
        tower: 'Башня',
        becomes: 'становится',
        lit: 'Синергия включена',
        rare: 'Всего 4 копии в пуле',
      }
    : {
        eyebrow: `Patch ${props.version} · Heroes · Items · Talents`,
        title: ['New blood.', 'New steel.'],
        intro:
          'Three heroes that change how a lane plays. Items forged from two into one. And a choice at the second star that makes every hero yours',
        stats: ['new heroes', 'new items', 'upgrades', 'talents'],
        pick: 'Pick a hero',
        heroes: {
          herald: {
            name: 'Herald',
            tag: 'Initiator · Tier 1',
          },
          stonewright: {
            name: 'Stonewright',
            tag: 'Support · Tier 2',
          },
          changeling: {
            name: 'Changeling',
            tag: 'Rare · Tier 3',
          },
        },
        orders: {
          push: ['Push', 'Creeps attack 20% faster and hit buildings 35% harder'],
          hold: ['Defence', 'Towers and the throne take 40% less damage'],
          group: ['Together', 'Heroes deal 25% more, enemies stunned for 1.2 s'],
          none: ['No order', 'Heroes take 10% less damage'],
        },
        banner: 'The banner follows the lane order',
        mend: 'Repairs a tower: 50 health per second',
        reclaimed: 'Under Defence the enemy’s damage this round is won back',
        tower: 'Tower',
        becomes: 'becomes',
        lit: 'Synergy on',
        rare: 'Only 4 copies in the pool',
      },
)

const ORDER_ICONS = {
  push: Swords,
  hold: Castle,
  group: Users,
  none: HeartHandshake,
} as const

const ORDERS: readonly Order[] = ['push', 'hold', 'group', 'none']
const STAGES: readonly Stage[] = ['herald', 'stonewright', 'changeling']
const current = computed(() => MATES[mate.value]!)

/** Seconds each state of the scene stays up when nobody clicks. */
const CYCLE_SECONDS = 5

/* One timeline: the Herald goes through every order, the Stonewright repairs once, the Changeling tries every
   lane-mate; then back to the Herald. */
function advance() {
  if (stage.value === 'herald') {
    const next = ORDERS.indexOf(order.value) + 1
    if (next < ORDERS.length) {
      order.value = ORDERS[next]!
    } else {
      stage.value = 'stonewright'
    }
  } else if (stage.value === 'stonewright') {
    mate.value = 0
    stage.value = 'changeling'
  } else if (mate.value + 1 < MATES.length) {
    mate.value++
  } else {
    order.value = ORDERS[0]!
    stage.value = 'herald'
  }
}

const { restart } = useAutoCycle(advance, CYCLE_SECONDS * 1000, visible)

function pickStage(id: Stage) {
  stage.value = id
  restart()
}

function pickOrder(id: Order) {
  order.value = id
  restart()
}

function pickMate(index: number) {
  mate.value = index
  restart()
}

/* The numbers count up once, the first time the introduction scrolls into view. */
let frame = 0
watch(
  visible,
  (shown) => {
    if (!shown || counted.value.some((n) => n > 0)) {
      return
    }

    if (motion.value === 'reduce') {
      counted.value = STATS.map((s) => s.value)

      return
    }

    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1400)
      const eased = 1 - (1 - t) ** 3
      counted.value = STATS.map((s) => Math.round(s.value * eased))

      if (t < 1) {
        frame = requestAnimationFrame(step)
      }
    }

    frame = requestAnimationFrame(step)
  },
  { immediate: true },
)

onBeforeUnmount(() => cancelAnimationFrame(frame))

/* The stage leans a little toward the pointer, like a display case. */
function lean(event: PointerEvent) {
  if (motion.value === 'reduce' || event.pointerType !== 'mouse') {
    return
  }

  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  tilt.value = {
    x: ((event.clientY - box.top) / box.height - 0.5) * -6,
    y: ((event.clientX - box.left) / box.width - 0.5) * 8,
  }
}
</script>

<template>
  <section ref="root" class="campaign" :class="{ shown: visible }" aria-labelledby="forge-release-title">
    <span class="embers" aria-hidden="true"><i v-for="n in 14" :key="n" :style="{ '--n': n }" /></span>

    <header class="pitch">
      <p class="eyebrow"><Flame :size="14" /> {{ copy.eyebrow }}</p>

      <h2 id="forge-release-title" class="hand">
        <span v-for="(line, i) in copy.title" :key="i" class="line" :style="{ '--i': i }">{{ line }}</span>

        <svg class="stroke" viewBox="0 0 320 18" preserveAspectRatio="none" aria-hidden="true">
          <path d="M4 12 C 70 2, 140 18, 200 9 S 290 4, 316 10" />
        </svg>
      </h2>

      <p class="intro">{{ copy.intro }}</p>

      <dl class="stats">
        <div v-for="(stat, i) in STATS" :key="i" :style="{ '--i': i }">
          <dt>
            <component :is="stat.icon" :size="16" />
            <span class="count">{{ counted[i] }}</span>
          </dt>

          <dd>{{ copy.stats[i] }}</dd>
        </div>
      </dl>
    </header>

    <div class="stage" @pointermove="lean" @pointerleave="tilt = { x: 0, y: 0 }">
      <div class="picker" role="tablist" :aria-label="copy.pick">
        <button
          v-for="id in STAGES"
          :key="id"
          type="button"
          role="tab"
          class="pedestal"
          :class="{ on: stage === id }"
          :aria-selected="stage === id"
          :aria-controls="`forge-scene-${id}`"
          @click="pickStage(id)"
        >
          <HeroAvatar :hero-id="id" :size="58" :stars="1" />
          <span class="name">{{ copy.heroes[id].name }}</span>
          <span class="tag">{{ copy.heroes[id].tag }}</span>
        </button>
      </div>

      <div
        class="case"
        :style="{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }"
      >
        <Transition name="scene" mode="out-in">
          <div v-if="stage === 'herald'" id="forge-scene-herald" key="herald" class="scene" role="tabpanel">
            <div class="banner-field" :class="order">
              <span class="aura" />

              <svg class="banner" viewBox="0 0 80 110" aria-hidden="true">
                <rect x="10" y="6" width="5" height="100" rx="2" class="pole" />
                <path class="cloth" d="M15 10 C 40 4, 55 18, 76 12 L 76 52 C 55 58, 40 44, 15 50 Z" />
              </svg>

              <component :is="ORDER_ICONS[order]" :size="22" class="order-mark" />
            </div>

            <p class="caption">{{ copy.banner }}</p>

            <div class="orders" role="group" :aria-label="copy.banner">
              <button
                v-for="id in ORDERS"
                :key="id"
                type="button"
                :class="{ on: order === id }"
                :aria-pressed="order === id"
                @click="pickOrder(id)"
              >
                <component :is="ORDER_ICONS[id]" :size="14" /> {{ copy.orders[id][0] }}
              </button>
            </div>

            <Transition name="line" mode="out-in">
              <p :key="order" class="effect">{{ copy.orders[order][1] }}</p>
            </Transition>
          </div>

          <div
            v-else-if="stage === 'stonewright'"
            id="forge-scene-stonewright"
            key="stonewright"
            class="scene"
            role="tabpanel"
          >
            <div class="repair">
              <span class="tower"><Castle :size="54" /></span>
              <span class="beam" />
              <HeroAvatar hero-id="stonewright" :size="48" class="mason" />
              <span class="floater">+150</span>
            </div>

            <div class="hp" :aria-label="copy.tower">
              <span class="fill" />
              <span class="ghost" />
            </div>

            <p class="caption">{{ copy.mend }}</p>
            <p class="effect gold"><Castle :size="14" /> {{ copy.reclaimed }}</p>
          </div>

          <div v-else id="forge-scene-changeling" key="changeling" class="scene" role="tabpanel">
            <div class="morph">
              <HeroAvatar :hero-id="current.heroId" :size="56" :stars="1" class="mate" />
              <span class="plus">+</span>

              <span class="shifter">
                <Transition name="morph" mode="out-in">
                  <span :key="current.role" class="mask">
                    <HeroAvatar hero-id="changeling" :role="current.role" :size="64" :stars="1" />
                  </span>
                </Transition>
              </span>
            </div>

            <Transition name="line" mode="out-in">
              <p :key="current.role" class="effect">
                <component :is="ROLE_ICONS[current.role]" :size="14" />
                {{ copy.becomes }} <b>{{ text.roleName(current.role) }}</b> · {{ copy.lit }}:
                <b>{{ current.synergy[settings.locale] }}</b>
              </p>
            </Transition>

            <div class="mates" role="group" :aria-label="copy.pick">
              <button
                v-for="(entry, i) in MATES"
                :key="entry.heroId"
                type="button"
                :class="{ on: mate === i }"
                :aria-pressed="mate === i"
                @click="pickMate(i)"
              >
                <HeroAvatar :hero-id="entry.heroId" :size="30" />
              </button>
            </div>

            <p class="caption"><Zap :size="13" /> {{ copy.rare }}</p>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.campaign {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  align-items: center;
  gap: 32px;
  margin-top: 28px;
  padding: 40px 36px;
  border: 1px solid #f4c55b45;
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 78% 110%, #ff8a3d2e, transparent 55%),
    radial-gradient(ellipse at 10% -10%, #f4c55b1c, transparent 50%),
    radial-gradient(ellipse at 50% 50%, #7fe0b40a, transparent 70%),
    linear-gradient(160deg, #1d2a24, #0e1713 70%);
  box-shadow:
    0 24px 70px #0006,
    inset 0 1px 0 #ffffff0d;
}

/* The forge's glow breathes along the lower edge. */
.campaign::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: auto 0 0;
  height: 40%;
  background: radial-gradient(ellipse at 70% 100%, #ff8a3d30, transparent 65%);
  animation: forge-glow 4s ease-in-out infinite;
}

/* Sparks rising from the anvil, behind everything and out of the layout. */
.embers {
  position: absolute;
  z-index: -1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.embers i {
  position: absolute;
  z-index: -1;
  bottom: -10px;
  left: calc(48% + var(--n) * 3.6%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ffb35c;
  box-shadow: 0 0 8px #ff8a3d;
  opacity: 0;
  animation: ember 5.5s linear infinite;
  animation-delay: calc(var(--n) * -0.41s);
}

.embers i:nth-child(3n) {
  width: 3px;
  height: 3px;
  animation-duration: 7s;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: var(--gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h2 {
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 14px 0 18px;
  font-size: clamp(44px, 6.6vw, 72px);
  line-height: 1;
}

.line {
  opacity: 0;
  translate: 0 18px;
}

.shown .line {
  animation: rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
  animation-delay: calc(0.12s + var(--i) * 0.18s);
}

.line:last-of-type {
  background: linear-gradient(100deg, var(--gold) 0%, #ffe3a1 45%, #ff9d4d 100%);
  background-clip: text;
  color: transparent;
}

/* A chalk stroke drawn under the headline once it comes into view. */
.stroke {
  width: min(320px, 90%);
  height: 18px;
  margin-top: 4px;
  overflow: visible;
}

.stroke path {
  fill: none;
  stroke: var(--gold);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 340;
  stroke-dashoffset: 340;
}

.shown .stroke path {
  animation: draw 1.1s 0.6s ease-out forwards;
}

.intro {
  max-width: 420px;
  margin: 0;
  color: var(--chalk-dim);
  font-size: 15px;
  line-height: 1.6;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 26px 0 0;
}

.stats div {
  padding: 12px 10px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #ffffff05;
  opacity: 0;
  translate: 0 10px;
}

.shown .stats div {
  animation: rise 0.6s ease-out forwards;
  animation-delay: calc(0.5s + var(--i) * 0.1s);
}

.stats dt {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--gold);
}

.count {
  font-family: var(--font-hand);
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stats dd {
  margin: 4px 0 0;
  color: var(--chalk-dim);
  font-size: 11px;
  line-height: 1.3;
}

.stage {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.picker {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pedestal {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  min-height: 118px;
  padding: 12px 6px 10px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: linear-gradient(180deg, transparent, #ffffff07);
  color: var(--chalk);
  font: inherit;
  cursor: pointer;
  transition:
    border-color 0.25s,
    background 0.25s,
    translate 0.25s;
}

/* A plinth of light under the hero in focus. */
.pedestal::after {
  content: '';
  position: absolute;
  bottom: 44px;
  width: 70%;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(ellipse, #f4c55b55, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}

.pedestal:hover {
  translate: 0 -2px;
}

.pedestal.on {
  border-color: #f4c55b99;
  background: linear-gradient(180deg, #f4c55b0f, #f4c55b1f);
}

.pedestal.on::after {
  opacity: 1;
}

.pedestal :deep(.avatar) {
  transform: scale(0.76);
  transition: transform 0.3s;
}

.pedestal.on :deep(.avatar) {
  transform: scale(1);
}

.name {
  margin-top: 6px;
  font-weight: 800;
  font-size: 13px;
}

.tag {
  color: var(--chalk-faint);
  font-size: 10.5px;
}

.case {
  height: 350px;
  padding: 22px 18px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background:
    radial-gradient(circle at 50% 30%, #f4c55b12, transparent 60%),
    linear-gradient(180deg, #0f1814cc, #0a110ecc);
  transition: transform 0.25s ease-out;
  transform-style: preserve-3d;
}

.scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.caption {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--chalk-faint);
  font-size: 12px;
}

.effect {
  min-height: 2.6em;
  margin: 0;
  text-wrap: balance;
  color: var(--chalk);
  font-size: 14px;
  font-weight: 700;
}

.effect svg {
  margin-right: 4px;
  vertical-align: -2px;
}

.effect.gold {
  color: var(--gold);
  font-size: 12.5px;
}

.effect b {
  color: var(--gold);
}

/* Herald: the banner waves, and its aura takes the colour of the order. */
.banner-field {
  --order: var(--gold);
  position: relative;
  display: grid;
  place-items: center;
  width: 150px;
  height: 140px;
}

.banner-field.hold {
  --order: #8fd6ff;
}

.banner-field.group {
  --order: #ff9e66;
}

.banner-field.none {
  --order: #7fe0b4;
}

.aura {
  position: absolute;
  inset: 0;
  border: 2px solid color-mix(in srgb, var(--order) 70%, transparent);
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--order) 22%, transparent), transparent 70%);
  animation: aura 2.2s ease-in-out infinite;
  transition: border-color 0.3s;
}

.banner {
  width: 70px;
  height: 96px;
  overflow: visible;
}

.pole {
  fill: #6b5137;
}

.cloth {
  fill: var(--order);
  transform-origin: 15px 30px;
  animation: wave 1.8s ease-in-out infinite;
  transition: fill 0.3s;
}

.order-mark {
  position: absolute;
  top: 40px;
  left: 76px;
  color: #11181499;
}

.orders,
.mates {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.orders button,
.mates button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff06;
  color: var(--chalk-dim);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.2s,
    color 0.2s,
    background 0.2s;
}

.mates button {
  padding: 4px;
}

.orders button.on,
.mates button.on {
  border-color: var(--gold);
  background: #f4c55b18;
  color: var(--gold);
}

/* Stonewright: a beam from the hammer, a bar filling back up, a number floating away. */
.repair {
  position: relative;
  display: flex;
  align-items: center;
  gap: 54px;
  height: 120px;
}

.tower {
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  border: 2px solid #5fa8ff;
  border-radius: var(--radius);
  color: #9fd0ff;
  background: #5fa8ff14;
}

.beam {
  position: absolute;
  left: 86px;
  width: 54px;
  height: 4px;
  background: linear-gradient(90deg, #7fe0b4, #7fe0b400);
  box-shadow: 0 0 12px #7fe0b4;
  animation: beam 1s ease-in-out infinite;
}

.floater {
  position: absolute;
  top: 6px;
  left: 30px;
  color: #7fe0b4;
  font-weight: 800;
  animation: float-up 2.4s ease-out infinite;
}

.hp {
  position: relative;
  width: min(260px, 90%);
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #ffffff10;
}

.hp .fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 45%;
  border-radius: inherit;
  background: linear-gradient(90deg, #5fa8ff, #7fe0b4);
  animation: refill 2.4s ease-in-out infinite;
}

.hp .ghost {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(90deg, transparent 0 24px, #0004 24px 26px);
}

/* Changeling: a lane-mate on the left, and the mask shifting into the role that completes the pair. */
.morph {
  display: flex;
  align-items: center;
  gap: 18px;
  height: 120px;
}

.plus {
  color: var(--chalk-faint);
  font-size: 26px;
  font-weight: 800;
}

.shifter {
  position: relative;
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
}

.shifter::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #b28ce0, #f4c55b, #7fe0b4, #8fd6ff, #b28ce0);
  mask: radial-gradient(circle, transparent 60%, #000 62%);
  animation: spin 6s linear infinite;
}

.morph-enter-active,
.morph-leave-active {
  transition:
    transform 0.35s cubic-bezier(0.3, 1.4, 0.5, 1),
    opacity 0.25s,
    filter 0.35s;
}

.morph-enter-from {
  transform: scale(0.6) rotate(-25deg);
  opacity: 0;
  filter: blur(4px);
}

.morph-leave-to {
  transform: scale(1.25) rotate(20deg);
  opacity: 0;
  filter: blur(4px);
}

.scene-enter-active,
.scene-leave-active {
  transition:
    opacity 0.3s,
    translate 0.3s;
}

.scene-enter-from {
  opacity: 0;
  translate: 0 12px;
}

.scene-leave-to {
  opacity: 0;
  translate: 0 -12px;
}

.line-enter-active,
.line-leave-active {
  transition:
    opacity 0.2s,
    translate 0.2s;
}

.line-enter-from {
  opacity: 0;
  translate: 6px 0;
}

.line-leave-to {
  opacity: 0;
  translate: -6px 0;
}

@keyframes rise {
  to {
    opacity: 1;
    translate: 0 0;
  }
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes ember {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(1);
  }

  15% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(calc((var(--n) - 7) * 6px), -420px) scale(0.3);
  }
}

@keyframes forge-glow {
  50% {
    opacity: 0.55;
  }
}

@keyframes aura {
  50% {
    transform: scale(1.06);
    opacity: 0.7;
  }
}

@keyframes wave {
  50% {
    transform: skewY(-4deg) scaleX(0.94);
  }
}

@keyframes beam {
  50% {
    opacity: 0.4;
  }
}

@keyframes float-up {
  0% {
    opacity: 0;
    translate: 0 10px;
  }

  20% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    translate: 0 -30px;
  }
}

@keyframes refill {
  0%,
  15% {
    width: 45%;
  }

  70%,
  100% {
    width: 75%;
  }
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

@media (max-width: 860px) {
  .campaign {
    grid-template-columns: 1fr;
    padding: 30px 18px;
  }

  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .case {
    transform: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .line,
  .stats div {
    opacity: 1;
    translate: none;
    animation: none !important;
  }

  .stroke path {
    stroke-dashoffset: 0;
    animation: none !important;
  }

  .campaign::after,
  .embers i,
  .aura,
  .cloth,
  .beam,
  .floater,
  .hp .fill,
  .shifter::before {
    animation: none;
  }

  .embers {
    display: none;
  }
}
</style>
