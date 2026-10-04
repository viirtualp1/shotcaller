<script setup lang="ts">
import { Check, Droplet } from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ItemIcon from '../common/ItemIcon.vue'

// Historical 9.1 sheet: a 3-star Acolyte at 286/440 health and 40/70 mana, both talents, two items.
const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        role: 'Саппорт',
        regen: '+7,92 HP/с',
        mana: '+10 за атаку',
        health: 'Здоровье',
        damage: 'Урон',
        armor: 'Броня',
        speed: 'Скорость',
        ability: 'Способность',
        prayer: 'Лечит самого раненого кора рядом на 150.',
        talents: 'Таланты',
        communion: 'Лечит сразу 2 союзников.',
        devotion: 'Лечит на 220.',
      }
    : {
        role: 'Support',
        regen: '+7.92 HP/s',
        mana: '+10 per attack',
        health: 'Health',
        damage: 'Damage',
        armor: 'Armor',
        speed: 'Speed',
        ability: 'Ability',
        prayer: 'Heals the most wounded nearby core for 150.',
        talents: 'Talents',
        communion: 'Heals 2 allies at once.',
        devotion: 'Heals for 220.',
      },
)
</script>

<template>
  <div class="hero-art">
    <article class="card">
      <header class="head">
        <HeroAvatar hero-id="acolyte" :stars="3" :size="48" />

        <span class="who">
          <strong>Acolyte</strong>
          <em>{{ copy.role }}</em>
        </span>
      </header>

      <div class="body">
        <div class="facts">
          <div class="bar health">
            <i class="fill" style="width: 65%" />
            <span class="gain balance" aria-hidden="true">{{ copy.regen }}</span>
            <b>286</b>
            <span class="gain">{{ copy.regen }}</span>
          </div>

          <div class="bar mana">
            <i class="fill" style="width: 57%" />
            <span class="gain balance" aria-hidden="true">{{ copy.mana }}</span>
            <b>40</b>
            <span class="gain">{{ copy.mana }}</span>
          </div>

          <div class="stats">
            <span>{{ copy.health }} <b>440</b></span>
            <span>{{ copy.damage }} <b>26</b></span>
            <span>{{ copy.armor }} <b>5%</b></span>
            <span>{{ copy.speed }} <b>90</b></span>
          </div>
        </div>

        <section class="ability">
          <header class="block-head">
            <span class="label">{{ copy.ability }}</span>
            <span class="cost"><Droplet :size="12" /> 70</span>
          </header>

          <strong>Prayer</strong>
          <p>{{ copy.prayer }}</p>
        </section>
      </div>

      <section class="talents">
        <span class="label">{{ copy.talents }}</span>

        <div class="options">
          <article class="option">
            <strong><Check :size="13" /> Communion</strong>
            <p>{{ copy.communion }}</p>
          </article>

          <article class="option">
            <strong><Check :size="13" /> Devotion</strong>
            <p>{{ copy.devotion }}</p>
          </article>
        </div>
      </section>

      <div class="items">
        <span class="piece">
          <ItemIcon item-id="chalice+" :size="36" />
          Chalice
        </span>

        <span class="piece">
          <ItemIcon item-id="staff" :size="36" />
          Staff
        </span>
      </div>
    </article>
  </div>
</template>

<style scoped>
.hero-art {
  container-type: inline-size;
  display: grid;
  width: 100%;
  padding: 16px 18px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #101815;
  box-shadow: inset 3px 0 0 #e8d9a0;
}

.head,
.piece,
.option strong,
.cost {
  display: flex;
  align-items: center;
}

.head {
  gap: 10px;
}

.who {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.who strong {
  font-size: 18px;
  line-height: 1.1;
}

.who em {
  color: var(--chalk-dim);
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.label {
  color: var(--chalk-dim);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.body {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 10px;
  align-items: start;
}

.facts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.bar {
  --color: var(--heal);
  position: relative;
  display: flex;
  align-items: center;
  height: 24px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--gold) 62%, transparent);
  border-radius: 999px;
  background: rgba(236, 232, 220, 0.16);
  color: var(--chalk);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.75);
}

.health {
  --color: color-mix(in srgb, var(--heal) 32%, var(--board-deep));
  background: var(--board-deep);
}

.mana {
  --color: var(--mana);
}

.fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: var(--color);
}

.bar b {
  position: relative;
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.gain {
  position: relative;
  flex: none;
  padding-right: 8px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.balance {
  visibility: hidden;
  padding-right: 0;
  padding-left: 7px;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px 8px;
}

.stats span {
  color: var(--chalk-dim);
  font-size: 12px;
  font-weight: 700;
}

.stats b {
  color: var(--chalk);
  font-weight: 800;
}

.ability {
  min-width: 0;
  padding: 8px 10px;
  border-radius: var(--radius);
  border-left: 2px solid var(--mana);
  background: rgba(236, 232, 220, 0.06);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cost {
  gap: 3px;
  color: var(--mana);
  font-size: 12px;
  font-weight: 800;
}

.ability > strong {
  display: block;
  margin: 4px 0;
  font-size: 15px;
}

.ability p,
.option p {
  margin: 0;
  color: var(--chalk-dim);
  font-size: 12px;
  line-height: 1.35;
}

.talents {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.option {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 7px 8px;
  border: 1px solid rgba(127, 224, 180, 0.6);
  border-radius: var(--radius);
  background: rgba(127, 224, 180, 0.08);
}

.option strong {
  gap: 4px;
  color: var(--heal);
  font-family: var(--font-hand);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.05;
}

.items {
  display: flex;
  gap: 8px;
}

.piece {
  gap: 8px;
  min-width: 0;
  padding: 4px 10px 4px 4px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: rgba(236, 232, 220, 0.04);
  font-size: 13px;
  font-weight: 800;
}

@container (max-width: 460px) {
  .body,
  .options {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
