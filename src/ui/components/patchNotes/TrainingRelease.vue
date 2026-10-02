<script setup lang="ts">
import { Coins, Dumbbell, Infinity as Endless, Swords, Users } from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ItemIcon from '../common/ItemIcon.vue'

/**
 * The 8.8 introduction: a practice yard rather than an arena. A coach's hero works over a row of dummies with a build
 * that cost nothing. The numbers are a fixed example from the release, not anyone's match.
 */
const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: 'Новый режим · Тренировка',
        title: 'Площадка открыта',
        intro:
          'Собери любую связку, надень что угодно и проверь её на манекенах. Без счёта, без рейтинга, без спешки',
        gold: 'Золото без конца',
        heroes: 'Любой герой',
        dummies: 'Манекены на линиях',
        build: 'Сборка · бесплатно',
        sample: 'Пример раунда',
        dps: 'урона за раунд',
      }
    : {
        eyebrow: 'New mode · Training',
        title: 'The yard is open',
        intro:
          'Put together any lineup, equip anything and try it on the dummies. No score, no rating, no rush',
        gold: 'Endless gold',
        heroes: 'Any hero',
        dummies: 'Dummies on the lanes',
        build: 'Build · free',
        sample: 'Sample round',
        dps: 'damage in the round',
      },
)

/* A fixed example, written out so later balance changes do not rewrite the release. */
const HITS = [
  {
    value: '142',
    spell: false,
    x: 18,
    delay: 0,
  },
  {
    value: '85',
    spell: true,
    x: 52,
    delay: 0.7,
  },
  {
    value: '142',
    spell: false,
    x: 80,
    delay: 1.4,
  },
] as const
</script>

<template>
  <section class="campaign" aria-labelledby="training-release-title">
    <header class="pitch">
      <p class="eyebrow"><Dumbbell :size="14" /> {{ copy.eyebrow }}</p>
      <h2 id="training-release-title" class="hand">{{ copy.title }}</h2>
      <p class="intro">{{ copy.intro }}</p>

      <ul class="perks">
        <li><Endless :size="15" /> {{ copy.gold }}</li>
        <li><Users :size="15" /> {{ copy.heroes }}</li>
        <li><Swords :size="15" /> {{ copy.dummies }}</li>
      </ul>
    </header>

    <div class="yard" aria-hidden="true">
      <span class="lane" />

      <div class="trainee">
        <HeroAvatar hero-id="blademaster" :size="84" :stars="2" />

        <div class="build">
          <span class="build-label"><Coins :size="12" /> {{ copy.build }}</span>

          <span class="build-items">
            <ItemIcon item-id="gloves" :size="30" />
            <ItemIcon item-id="broadsword" :size="30" />
          </span>
        </div>
      </div>

      <div class="dummies">
        <span
          v-for="(hit, i) in HITS"
          :key="i"
          class="dummy"
          :style="{ '--x': `${hit.x}%`, '--delay': `${hit.delay}s` }"
        >
          <span class="hit" :class="{ spell: hit.spell }">−{{ hit.value }}</span>

          <i class="head" />

          <i class="bar" />

          <i class="post" />
        </span>
      </div>

      <p class="tally">
        <span>{{ copy.sample }}</span>
        <strong class="hand">4 260</strong>
        <span>{{ copy.dps }}</span>
      </p>
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
  gap: 28px;
  margin-top: 28px;
  padding: 34px 32px;
  border: 1px solid #7fe0b440;
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 78% 60%, #7fe0b414, transparent 55%),
    radial-gradient(ellipse at 10% 10%, #f4c55b12, transparent 45%), linear-gradient(170deg, #1b2a22, #0f1915);
  box-shadow: 0 20px 60px #0004;
}

/* Chalk lines of a practice field. */
.campaign::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background:
    repeating-linear-gradient(90deg, transparent 0 46px, #ece8dc08 46px 47px),
    repeating-linear-gradient(0deg, transparent 0 46px, #ece8dc06 46px 47px);
  mask-image: linear-gradient(90deg, transparent, #000 45%);
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: var(--heal);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h2 {
  margin: 12px 0;
  font-size: clamp(38px, 6vw, 62px);
  line-height: 1.05;
}

.intro {
  max-width: 420px;
  margin: 0;
  color: var(--chalk-dim);
  font-size: 14px;
  line-height: 1.6;
}

.perks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.perks li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff06;
  font-size: 12px;
  font-weight: 700;
}

.perks li:first-child {
  border-color: #f4c55b70;
  color: var(--gold);
}

.yard {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: end;
  gap: 18px;
  min-height: 250px;
  padding: 20px 18px 54px;
}

/* The strip of lane the dummies stand on. */
.lane {
  position: absolute;
  inset: auto 0 46px;
  height: 34px;
  border-top: 2px dashed #ece8dc26;
  border-bottom: 2px dashed #ece8dc26;
  background: #ece8dc06;
}

.trainee {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.build {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid #f4c55b50;
  border-radius: var(--radius);
  background: #10181599;
}

.build-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.build-items {
  display: flex;
  gap: 5px;
}

.dummies {
  position: relative;
  height: 160px;
}

.dummy {
  position: absolute;
  bottom: 0;
  left: var(--x);
  width: 44px;
  height: 104px;
  transform: translateX(-50%);
}

.head {
  position: absolute;
  top: 26px;
  left: 50%;
  width: 28px;
  height: 28px;
  border: 3px solid var(--theirs);
  border-radius: 50%;
  background: #d8c27a;
  transform: translateX(-50%);
}

.bar {
  position: absolute;
  top: 58px;
  left: 0;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: var(--wood-light);
  box-shadow: inset 0 -2px 0 var(--wood-dark);
}

.post {
  position: absolute;
  top: 52px;
  bottom: 0;
  left: 50%;
  width: 8px;
  background: var(--wood);
  transform: translateX(-50%);
}

.hit {
  position: absolute;
  top: 0;
  left: 50%;
  color: var(--chalk);
  font-size: 15px;
  font-weight: 800;
  text-shadow: 0 2px 6px #000a;
  transform: translateX(-50%);
  animation: rise 2.1s var(--delay) ease-out infinite;
}

.hit.spell {
  color: var(--mana);
}

@keyframes rise {
  0% {
    opacity: 0;
    transform: translate(-50%, 14px);
  }

  20% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -18px);
  }
}

.tally {
  position: absolute;
  right: 18px;
  bottom: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  color: var(--chalk-faint);
  font-size: 11px;
}

.tally strong {
  color: var(--gold);
  font-size: 30px;
  line-height: 1;
}

@media (max-width: 760px) {
  .campaign {
    grid-template-columns: 1fr;
    padding: 28px 18px 22px;
  }

  .yard {
    min-height: 220px;
    padding-inline: 4px;
  }

  .tally {
    right: 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hit {
    animation: none;
    opacity: 1;
  }
}
</style>
