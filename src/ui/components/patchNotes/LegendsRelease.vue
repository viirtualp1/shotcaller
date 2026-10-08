<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'

const heroes = [
  {
    id: 'alpha',
    name: 'Alpha',
    faction: {
      en: 'Wildkin',
      ru: 'Дикие',
    },
    color: '#a7cb7e',
  },
  {
    id: 'archon',
    name: 'Archon',
    faction: {
      en: 'Arcanum',
      ru: 'Арканум',
    },
    color: '#c2a6ff',
  },
  {
    id: 'reaper',
    name: 'Reaper',
    faction: {
      en: 'Grave',
      ru: 'Склеп',
    },
    color: '#66c5a3',
  },
] as const

const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: 'НОВЫЙ ТИР · НОВЫЙ ФИНАЛ',
        title: 'Оставь место\nдля легенды.',
        text: 'Твой отряд уже силён. Последний выбор может сделать его незабываемым.',
        cost: '4 золота',
        odds: '8% → 20%',
        hint: 'На двух последних уровнях',
      }
    : {
        eyebrow: 'A NEW TIER · A NEW ENDGAME',
        title: 'Make room\nfor a legend.',
        text: 'Your squad is already strong. One last pick can make it unforgettable.',
        cost: '4 gold',
        odds: '8% → 20%',
        hint: 'At the last two levels',
      },
)
</script>

<template>
  <section class="legends-release" aria-labelledby="legends-headline">
    <span class="eyebrow">{{ copy.eyebrow }}</span>
    <h2 id="legends-headline" class="hand">{{ copy.title }}</h2>
    <p>{{ copy.text }}</p>

    <div class="draft">
      <div v-for="hero in heroes" :key="hero.id" class="legend" :style="{ '--accent': hero.color }">
        <span class="tier hand">IV</span>

        <HeroAvatar :hero-id="hero.id" :size="90" />

        <strong class="hand">{{ hero.name }}</strong>

        <span>{{ hero.faction[settings.locale] }}</span>

        <small>{{ copy.cost }}</small>
      </div>
    </div>

    <footer>
      <strong>{{ copy.odds }}</strong>

      <span>{{ copy.hint }}</span>
    </footer>
  </section>
</template>

<style scoped>
.legends-release {
  padding: 44px 32px;
  margin-bottom: 40px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  overflow: hidden;
  text-align: center;
  background: radial-gradient(ellipse at 50% 90%, #42634b88, transparent 75%), #182720;
}
.eyebrow {
  color: var(--gold);
  letter-spacing: 0.14em;
  font-size: 12px;
  font-weight: 800;
}
h2 {
  color: var(--gold);
  white-space: pre-line;
  margin: 22px 0;
  font-size: clamp(46px, 6vw, 80px);
  line-height: 0.98;
  transform: rotate(-2deg);
}
p {
  max-width: 440px;
  margin: 0 auto 38px;
  color: var(--chalk-dim);
  font-size: 17px;
  line-height: 1.6;
}
.draft {
  display: flex;
  justify-content: center;
  gap: 24px;
}
.legend {
  display: grid;
  justify-items: center;
  position: relative;
  gap: 12px;
  width: 210px;
  padding: 30px 20px 20px;
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  background: #13201eee;
  box-shadow: 0 18px 30px #0005;
}
.legend:first-child {
  transform: rotate(-6deg) translateY(10px);
}
.legend:last-child {
  transform: rotate(6deg) translateY(10px);
}
.tier {
  position: absolute;
  left: 14px;
  top: 7px;
  color: var(--gold);
  font-size: 30px;
}
.legend strong {
  color: var(--accent);
  font-size: 38px;
}
.legend > span:not(.tier) {
  color: var(--chalk-dim);
  font-size: 13px;
}
.legend small {
  color: var(--gold);
}
footer {
  display: grid;
  gap: 5px;
  margin-top: 42px;
  color: var(--chalk-dim);
  font-size: 13px;
}
footer strong {
  color: var(--gold);
  font-size: 22px;
}
@media (max-width: 560px) {
  .legends-release {
    padding: 32px 16px;
  }
  .draft {
    gap: 8px;
  }
  .legend {
    min-width: 0;
    width: 30%;
    padding: 36px 5px 14px;
  }
  .legend :deep(.avatar) {
    --size: 58px !important;
  }
  .legend strong {
    font-size: 27px;
  }
  .legend > span:not(.tier) {
    font-size: 11px;
  }
  .legend:first-child,
  .legend:last-child {
    transform: translateY(12px);
  }
}
</style>
