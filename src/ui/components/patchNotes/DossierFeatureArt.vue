<script setup lang="ts">
import { ArrowRight, Flame, FlaskConical, Play } from '@lucide/vue'
import { computed } from 'vue'
import type { HeroId } from '@/content/ids'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ItemIcon from '../common/ItemIcon.vue'

/* Fixed 9.5 examples: sample heroes, win rates and rounds, apart from real accounts and the current balance. */
defineProps<{ focus: 'scout' | 'build' | 'rounds' }>()

const POOL: readonly { hero: HeroId; theirs: number; ours: number }[] = [
  {
    hero: 'giant',
    theirs: 71,
    ours: 48,
  },
  {
    hero: 'pyromancer',
    theirs: 64,
    ours: 66,
  },
  {
    hero: 'sniper',
    theirs: 58,
    ours: 35,
  },
]

const ROUNDS: readonly ('win' | 'loss' | 'draw')[] = ['win', 'loss', 'loss', 'win', 'win', 'draw', 'win']
const TURNING = 4

const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        you: 'ты',
        training: 'В тренировку',
        free: 'Бесплатно',
        turning: 'Переломный раунд',
        watch: 'Смотреть',
      }
    : {
        you: 'you',
        training: 'To training',
        free: 'Free',
        turning: 'Turning round',
        watch: 'Watch',
      },
)
</script>

<template>
  <div class="illustration">
    <ul v-if="focus === 'scout'" class="pool">
      <li v-for="row in POOL" :key="row.hero">
        <HeroAvatar :hero-id="row.hero" :size="34" />

        <span class="meter"
          ><span :style="{ width: `${row.theirs}%` }" />

          <i class="mark" :style="{ left: `${row.ours}%` }"
        /></span>

        <b>{{ row.theirs }}%</b>
      </li>

      <li class="legend"><i class="mark" /> {{ copy.you }}</li>
    </ul>

    <div v-else-if="focus === 'build'" class="build">
      <div class="loadout">
        <HeroAvatar hero-id="giant" :stars="2" :size="64" />

        <div class="items">
          <ItemIcon item-id="chainmail+" :size="30" />
          <ItemIcon item-id="vitality" :size="30" />
        </div>
      </div>

      <ArrowRight :size="28" class="arrow" />

      <div class="destination">
        <FlaskConical :size="36" />
        <strong class="hand">{{ copy.training }}</strong>
        <small>{{ copy.free }}</small>
      </div>
    </div>

    <div v-else class="rounds">
      <ol class="strip">
        <li
          v-for="(verdict, index) in ROUNDS"
          :key="index"
          :class="[verdict, { turning: index + 1 === TURNING }]"
        >
          <Flame v-if="index + 1 === TURNING" :size="11" class="flame" />
          {{ index + 1 }}
        </li>
      </ol>

      <div class="moment">
        <span class="chip"><Flame :size="13" /> {{ copy.turning }}</span>

        <div class="picks">
          <HeroAvatar hero-id="giant" :stars="2" :size="34" />
          <HeroAvatar hero-id="pyromancer" :size="34" />
          <HeroAvatar hero-id="acolyte" :size="34" />
        </div>

        <span class="watch"><Play :size="13" /> {{ copy.watch }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.illustration {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 26px;
}

/* Their win rate as a bar, the viewer's as a gold tick on the same scale. */
.pool {
  display: grid;
  gap: 12px;
  width: min(100%, 280px);
  margin: 0;
  padding: 18px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #1b2922;
  box-shadow: 0 15px 35px #0005;
  list-style: none;
}

.pool li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 38px;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.pool b {
  text-align: right;
  color: var(--heal);
}

.meter {
  position: relative;
  display: block;
  height: 5px;
  border-radius: 999px;
  background: var(--edge);
}

.meter > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--heal);
}

.mark {
  position: absolute;
  top: -3px;
  width: 3px;
  height: 11px;
  border-radius: 2px;
  background: var(--gold);
  box-shadow: 0 0 0 1px #0009;
  translate: -50% 0;
}

.pool .legend {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  font-size: 11px;
  color: var(--chalk-faint);
}

.legend .mark {
  position: static;
  translate: none;
}

.build {
  display: flex;
  align-items: center;
  gap: 18px;
}

.loadout {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.items {
  display: flex;
  gap: 6px;
}

.arrow {
  color: var(--gold);
}

.destination {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 18px 20px;
  border: 1px solid #f4c55b66;
  border-radius: var(--radius);
  background: linear-gradient(145deg, #2a2a1c, #172019);
  color: var(--gold);
  box-shadow: 0 15px 35px #0005;
}

.destination strong {
  font-size: 24px;
  line-height: 1;
}

.destination small {
  color: var(--heal);
  font-size: 11px;
  font-weight: 700;
}

.rounds {
  display: grid;
  gap: 14px;
  width: min(100%, 300px);
}

.strip {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.strip li {
  --verdict: var(--chalk-faint);
  position: relative;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid color-mix(in srgb, var(--verdict) 55%, transparent);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--verdict) 18%, transparent);
  font-size: 12px;
  font-weight: 700;
}

.strip .win {
  --verdict: var(--heal);
}

.strip .loss {
  --verdict: var(--theirs);
}

.strip .turning {
  outline: 2px solid var(--gold);
  outline-offset: 1px;
}

.flame {
  position: absolute;
  top: -6px;
  right: -5px;
  color: var(--gold);
}

.moment {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #1b2922;
  box-shadow: 0 15px 35px #0005;
}

.chip,
.watch {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
}

.chip {
  padding: 2px 9px;
  border: 1px solid rgba(244, 197, 91, 0.5);
  border-radius: var(--radius);
  color: var(--gold);
}

.picks {
  display: flex;
  gap: 8px;
}

.watch {
  padding: 5px 12px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  color: var(--chalk);
}
</style>
