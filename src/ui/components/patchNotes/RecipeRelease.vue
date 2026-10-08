<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import ItemIcon from '../common/ItemIcon.vue'

const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: 'МАСТЕРСКАЯ · 8 РЕЦЕПТОВ',
        title: 'Собери свой\nкозырь.',
        intro:
          'Знакомые компоненты. Новые сочетания. Освободи место для предмета, который изменит следующий бой.',
        stamp: 'ДВА КОМПОНЕНТА → ОДИН СЛОТ',
        blade: 'Tempest Blade',
        stats: '20% крит · +20% скорости атаки',
      }
    : {
        eyebrow: 'WORKSHOP · 8 RECIPES',
        title: 'Craft your\nadvantage.',
        intro: 'Familiar components. New combinations. Make room for the item that changes your next fight.',
        stamp: 'TWO COMPONENTS → ONE SLOT',
        blade: 'Tempest Blade',
        stats: '20% crit · +20% attack speed',
      },
)
</script>

<template>
  <section class="workshop" aria-labelledby="recipe-headline">
    <div class="words">
      <span class="eyebrow">{{ copy.eyebrow }}</span>
      <h2 id="recipe-headline" class="hand">{{ copy.title }}</h2>
      <p>{{ copy.intro }}</p>
      <span class="stamp">{{ copy.stamp }}</span>
    </div>

    <div class="workbench">
      <div class="component first"><ItemIcon item-id="broadsword" :size="70" /><span>Broadsword</span></div>
      <div class="component second"><ItemIcon item-id="gloves" :size="70" /><span>Gloves of Fury</span></div>
      <span class="chalk-arrow">↘ &nbsp; ↙</span>

      <div class="crafted">
        <ItemIcon item-id="tempestBlade" :size="110" />

        <strong class="hand">{{ copy.blade }}</strong>

        <small>{{ copy.stats }}</small>
      </div>

      <span class="rivet one" /><span class="rivet two" />
    </div>
  </section>
</template>

<style scoped>
.workshop {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  padding: 48px;
  margin-bottom: 40px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: radial-gradient(ellipse at 80% 60%, #40564280, transparent 65%), #172923;
  overflow: hidden;
}
.words {
  align-self: center;
}
.eyebrow {
  color: var(--gold);
  font-size: 12px;
  letter-spacing: 0.14em;
  font-weight: 800;
}
h2 {
  margin: 18px 0;
  white-space: pre-line;
  font-size: clamp(46px, 5.8vw, 78px);
  line-height: 0.98;
  color: var(--gold);
  transform: rotate(-2deg);
}
p {
  font-size: 17px;
  line-height: 1.6;
  color: var(--chalk-dim);
  max-width: 390px;
}
.stamp {
  display: inline-block;
  margin-top: 18px;
  padding: 9px 0;
  border-block: 1px solid #f4c55b66;
  color: var(--gold);
  font-size: 11px;
  letter-spacing: 0.1em;
}
.workbench {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  justify-items: center;
  gap: 18px;
  align-content: center;
  padding: 30px 16px;
  border: 1px dashed #e1dfbe55;
  border-radius: var(--radius);
  transform: rotate(2deg);
  background: #13201e66;
}
.component,
.crafted {
  display: grid;
  justify-items: center;
  gap: 10px;
  text-align: center;
}
.component {
  font-size: 12px;
  color: var(--chalk-dim);
}
.first {
  transform: rotate(-8deg);
}
.second {
  transform: rotate(5deg);
}
.chalk-arrow {
  grid-column: span 2;
  font-size: 42px;
  line-height: 1;
  color: #dbdfce99;
}
.crafted {
  grid-column: span 2;
}
.crafted strong {
  color: var(--gold);
  font-size: 34px;
}
.crafted small {
  color: var(--chalk-dim);
}
.rivet {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gold);
  opacity: 0.5;
  top: 10px;
}
.one {
  left: 10px;
}
.two {
  right: 10px;
}
@media (max-width: 680px) {
  .workshop {
    grid-template-columns: 1fr;
    padding: 28px 20px;
    gap: 28px;
  }
  .workbench {
    margin: 0 6px;
  }
}
</style>
