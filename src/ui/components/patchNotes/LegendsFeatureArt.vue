<script setup lang="ts">
import { Footprints, Sparkles, Skull } from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'

const props = defineProps<{ hero: 'alpha' | 'archon' | 'reaper' }>()
const settings = useSettingsStore()

const icon = computed(() =>
  props.hero === 'alpha' ? Footprints : props.hero === 'archon' ? Sparkles : Skull,
)

const caption = computed(
  () =>
    ({
      alpha: settings.locale === 'ru' ? '3 волка · 10 секунд' : '3 wolves · 10 seconds',
      archon: settings.locale === 'ru' ? 'Удар через всю карту' : 'Strike across the map',
      reaper: settings.locale === 'ru' ? '20% здоровья → казнь' : '20% health → execution',
    })[props.hero],
)
</script>

<template>
  <div class="legend-art">
    <span class="tier hand">IV</span>
    <HeroAvatar :hero-id="hero" :size="88" />
    <div class="trail"><component :is="icon" v-for="n in 3" :key="n" :size="24" /></div>
    <strong>{{ caption }}</strong>
  </div>
</template>

<style scoped>
.legend-art {
  display: grid;
  justify-items: center;
  align-content: center;
  position: relative;
  gap: 18px;
  width: 100%;
  min-height: 250px;
  padding: 24px;
  background: radial-gradient(ellipse, #45644966, transparent 70%);
}
.tier {
  position: absolute;
  top: 20px;
  left: 25px;
  color: var(--gold);
  font-size: 44px;
  transform: rotate(-10deg);
  opacity: 0.7;
}
.trail {
  display: flex;
  gap: 22px;
  color: var(--gold);
}
strong {
  text-align: center;
  font-size: 13px;
  color: var(--chalk);
}
</style>
