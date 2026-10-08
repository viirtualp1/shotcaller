<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import ItemIcon from '../common/ItemIcon.vue'

const props = defineProps<{ focus: 'slots' | 'choice' | 'echo' }>()
const settings = useSettingsStore()
const echo = computed(() => props.focus === 'echo')

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        slot: 'Свободный слот',
        confirm: 'Собрать Tempest Blade',
        echo: 'Ещё одно заклинание · 25%',
      }
    : {
        slot: 'One free slot',
        confirm: 'Craft Tempest Blade',
        echo: 'One more spell · 25%',
      },
)
</script>

<template>
  <div class="recipe-art">
    <div class="ingredients">
      <ItemIcon :item-id="echo ? 'staff' : 'broadsword'" :size="52" />

      <b>+</b>

      <ItemIcon :item-id="echo ? 'manaStone' : 'gloves'" :size="52" />
    </div>

    <span class="arrow">↓</span>

    <div class="result">
      <ItemIcon :item-id="echo ? 'echoStaff' : 'tempestBlade'" :size="74" />

      <span v-if="focus === 'slots'" class="empty">+</span>
    </div>

    <strong>{{ echo ? copy.echo : focus === 'choice' ? copy.confirm : copy.slot }}</strong>
  </div>
</template>

<style scoped>
.recipe-art {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 12px;
  min-height: 250px;
  width: 100%;
  padding: 24px;
  color: var(--gold);
  background: radial-gradient(ellipse at center, #49604455, transparent 70%);
}
.ingredients,
.result {
  display: flex;
  gap: 20px;
  align-items: center;
}
.arrow {
  font-size: 26px;
  font-family: Caveat, cursive;
}
.empty {
  display: grid;
  place-items: center;
  width: 74px;
  height: 74px;
  border: 2px dashed #8ea98c;
  border-radius: var(--radius);
  color: #8ea98c;
  font-size: 30px;
}
strong {
  color: var(--chalk);
  text-align: center;
}
</style>
