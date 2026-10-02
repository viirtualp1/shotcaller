<script setup lang="ts">
import {
  Droplet,
  Eye,
  Footprints,
  Heart,
  LoaderCircle,
  Shield,
  Sparkles,
  Sword,
  Timer,
  Undo2,
} from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ItemIcon from '../common/ItemIcon.vue'

defineProps<{ focus: 'yard' | 'stats' | 'ready' | 'live' }>()

const settings = useSettingsStore()

// Historical examples: the numbers are written out, not read from today's balance.
const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        dummies: 'Манекены на линии',
        endless: 'Без таймера',
        rounds: 'Раунды',
        creeps: 'Волны крипов',
        on: 'вкл',
        free: 'Бесплатно',
        health: 'Здоровье',
        damage: 'Урон',
        attack: 'Атака',
        armor: 'Броня',
        speed: 'Скорость',
        spells: 'Умения',
        seconds: 'с',
        perAttack: 'За атаку',
        cast: 'Каст через',
        attacks: '8 атак',
        waiting: 'Ждём соперника…',
        withdraw: 'Отменить готовность',
        planning: 'Соперник расставляет героев',
        started: 'начала матч',
        watch: 'Смотреть',
        sample: 'Пример',
      }
    : {
        dummies: 'Dummies per lane',
        endless: 'No clock',
        rounds: 'Rounds',
        creeps: 'Creep waves',
        on: 'on',
        free: 'Free',
        health: 'Health',
        damage: 'Damage',
        attack: 'Attack',
        armor: 'Armor',
        speed: 'Speed',
        spells: 'Spells',
        seconds: 's',
        perAttack: 'Per attack',
        cast: 'Casts after',
        attacks: '8 attacks',
        waiting: 'Waiting for your opponent…',
        withdraw: 'Not ready yet',
        planning: 'Your opponent is still planning',
        started: 'started a match',
        watch: 'Watch',
        sample: 'Example',
      },
)
</script>

<template>
  <div class="training-art" :class="focus">
    <template v-if="focus === 'yard'">
      <div class="controls">
        <span class="segments"
          ><i class="on">{{ copy.endless }}</i>

          <i>{{ copy.rounds }}</i></span
        >

        <span class="label">{{ copy.dummies }}</span>
        <span class="segments"><i>0</i><i>1</i><i class="on">2</i><i>3</i></span>

        <span class="toggle"
          ><i class="box" /> {{ copy.creeps }} <small>{{ copy.on }}</small></span
        >
      </div>

      <div class="catalog">
        <span v-for="id in ['frostWitch', 'sniper', 'giant'] as const" :key="id" class="offer">
          <HeroAvatar :hero-id="id" :size="30" />
          <small>{{ copy.free }}</small>
        </span>
      </div>
    </template>

    <div v-else-if="focus === 'stats'" class="stat-sheet">
      <div class="grid">
        <span><Heart :size="12" class="hp" /> {{ copy.health }} <b>650</b></span>
        <span><Sword :size="12" class="dmg" /> {{ copy.damage }} <b>36</b></span>

        <span
          ><Timer :size="12" /> {{ copy.attack }} <b>1,1 {{ copy.seconds }}</b>
          <em>−0,22 {{ copy.seconds }}</em></span
        >

        <span><Shield :size="12" class="armor" /> {{ copy.armor }} <b>15%</b></span>
        <span><Footprints :size="12" /> {{ copy.speed }} <b>95</b></span>
        <span><Sparkles :size="12" class="mana" /> {{ copy.spells }} <b>100%</b> <em>+20%</em></span>
      </div>

      <div class="mana-row">
        <span
          ><small>{{ copy.perAttack }}</small> <b>+10</b></span
        >

        <span
          ><small>{{ copy.cast }}</small> <b>{{ copy.attacks }}</b></span
        >

        <span class="cost"><Droplet :size="12" /> 80</span>
      </div>

      <span class="sample">{{ copy.sample }} · Spearman <ItemIcon item-id="gloves" :size="18" /></span>
    </div>

    <div v-else-if="focus === 'ready'" class="ready">
      <span class="fight">
        <LoaderCircle :size="18" />

        <span
          >{{ copy.waiting }} <small><Undo2 :size="11" /> {{ copy.withdraw }}</small></span
        >
      </span>

      <span class="status">{{ copy.planning }}</span>
    </div>

    <div v-else class="live">
      <span class="friend">
        <HeroAvatar hero-id="oracle" :size="52" />
        <i class="presence" />
      </span>

      <span class="toast">
        <strong>Ana</strong> {{ copy.started }}
        <span class="watch"><Eye :size="13" /> {{ copy.watch }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.training-art {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
  height: 100%;
  padding: 16px;
}

.controls,
.stat-sheet,
.ready,
.toast {
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #101815;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
}

.label,
small {
  color: var(--chalk-dim);
  font-size: 10.5px;
  font-weight: 700;
}

.segments {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: var(--radius);
  background: #0006;
}

.segments i {
  flex: 1;
  padding: 3px 12px;
  border-radius: var(--radius);
  color: var(--chalk-dim);
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
  text-align: center;
}

.segments .on {
  background: var(--gold);
  color: var(--ink);
}

.toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
}

.box {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: var(--gold);
}

.catalog {
  display: flex;
  gap: 8px;
}

.offer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.offer small {
  color: var(--heal);
}

.stat-sheet {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  width: min(300px, 100%);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.grid span {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: var(--radius);
  background: #ffffff0a;
  color: var(--chalk-dim);
  font-size: 10.5px;
}

.grid b,
.mana-row b {
  color: var(--chalk);
  font-size: 12.5px;
}

.grid em {
  color: var(--heal);
  font-size: 11.5px;
  font-style: normal;
  font-weight: 700;
}

.hp {
  color: var(--heal);
}

.dmg {
  color: #ff9a6b;
}

.armor {
  color: var(--ours);
}

.mana {
  color: var(--mana);
}

.mana-row {
  display: flex;
  gap: 4px;
}

.mana-row span {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 4px 7px;
  border-radius: var(--radius);
  background: #8fb8ff14;
}

.mana-row .cost {
  flex: none;
  flex-direction: row;
  align-items: center;
  gap: 3px;
  color: var(--mana);
  font-weight: 700;
}

.sample {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--chalk-faint);
  font-size: 10.5px;
}

.ready {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-color: transparent;
  background: none;
}

.fight {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
}

.fight span {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.fight small {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink);
  opacity: 0.75;
}

.status {
  color: var(--chalk-dim);
  font-size: 12px;
}

.live {
  display: flex;
  align-items: center;
  gap: 16px;
}

.friend {
  position: relative;
  display: grid;
}

.presence {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 0 2px #101815;
}

.presence::before,
.presence::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid var(--gold);
  animation: broadcast 1.8s ease-out infinite;
}

.presence::after {
  animation-delay: 0.9s;
}

@keyframes broadcast {
  from {
    opacity: 0.9;
    transform: scale(1);
  }

  to {
    opacity: 0;
    transform: scale(2.6);
  }
}

.toast {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  font-size: 12px;
}

.watch {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 5px;
  padding: 3px 10px;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
  font-weight: 800;
}

@media (prefers-reduced-motion: reduce) {
  .presence::before,
  .presence::after {
    animation: none;
    opacity: 0;
  }
}
</style>
