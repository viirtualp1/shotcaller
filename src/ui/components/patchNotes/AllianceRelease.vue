<script setup lang="ts">
import { ArrowRight, Flag, Ghost, Plus, Shield, Swords, Undo2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'

const settings = useSettingsStore()
const reinforced = ref(false)

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: '10.0 · Фракции вступают в бой',
        title: ['Найди своих.', 'Держи линию.'],
        intro:
          'У знакомых героев появились новые причины сражаться вместе. Собирай фракции, усиливай связки и меняй исход боя одним точным пополнением.',
        guide: 'Познакомиться с фракциями',
        squad: 'Линия Легиона',
        pair: 'Двое держат строй',
        trio: 'Трое отвечают ударом',
        add: 'Добавить Sniper',
        remove: 'Вернуться к паре',
        damage: 'получаемого урона',
        reflection: 'урона атак обратно',
        note: 'Бонус действует на героев фракции на этой линии. Переставишь бойца — изменишь связку.',
        stats: ['фракций', 'ступени силы', 'секунд до выбора призрака'],
        ghost: 'Призрак — соперник из сохранённой партии',
        ghostText:
          'Не нашёл живого игрока за 45 секунд? Выбери бой с записанными составами прошлой партии за половину обычного изменения MMR. Или продолжай поиск — выбор за тобой.',
      }
    : {
        eyebrow: '10.0 · Factions enter the fight',
        title: ['Find your people.', 'Hold your lane.'],
        intro:
          'Familiar heroes have new reasons to fight together. Build factions, strengthen your combinations and turn a battle with one well-chosen recruit.',
        guide: 'Meet the factions',
        squad: 'The Legion line',
        pair: 'Two hold formation',
        trio: 'Three strike back',
        add: 'Bring in Sniper',
        remove: 'Back to the pair',
        damage: 'damage taken',
        reflection: 'attack damage returned',
        note: 'The bonus belongs to faction members on this lane. Move a hero and the formation changes.',
        stats: ['factions', 'power steps', 'seconds to choose a ghost'],
        ghost: 'A ghost uses squads from a saved match',
        ghostText:
          'No live player found after 45 seconds? Choose to fight the saved squads from a past match for half the usual MMR change. Or keep searching — it is your choice.',
      },
)
</script>

<template>
  <section class="alliance" aria-labelledby="alliance-title">
    <div class="lead">
      <span class="eyebrow"><Flag :size="15" /> {{ copy.eyebrow }}</span>

      <h2 id="alliance-title" class="hand">
        <span>{{ copy.title[0] }}</span>

        <span>{{ copy.title[1] }}</span>
      </h2>

      <p class="intro">{{ copy.intro }}</p>
      <a href="#patch-factions" class="btn guide">{{ copy.guide }} <ArrowRight :size="16" /></a>

      <div class="numbers">
        <div v-for="(value, i) in ['5', '2 / 3', '45']" :key="value">
          <strong class="hand">{{ value }}</strong>

          <span>{{ copy.stats[i] }}</span>
        </div>
      </div>
    </div>

    <div class="formation" :class="{ reinforced }">
      <div class="field-top">
        <span><Swords :size="15" /> {{ copy.squad }}</span>

        <b>{{ reinforced ? '3 / 3' : '2 / 3' }}</b>
      </div>

      <div class="chalk-field" aria-hidden="true">
        <svg viewBox="0 0 420 170" preserveAspectRatio="none">
          <path d="M20 110 C105 155 230 10 400 78" />
          <path class="second-line" d="M20 132 C100 176 230 34 400 100" />
        </svg>

        <span class="hero spearman"><HeroAvatar hero-id="spearman" :size="72" /><span>Spearman</span></span>
        <span class="hero herald"><HeroAvatar hero-id="herald" :size="72" /><span>Herald</span></span>

        <span class="hero sniper" :class="{ absent: !reinforced }"
          ><HeroAvatar hero-id="sniper" :size="72" /><span>Sniper</span></span
        >

        <span class="field-stamp hand">LEGION</span>
      </div>

      <div class="formation-result" aria-live="polite">
        <span class="result-title">{{ reinforced ? copy.trio : copy.pair }}</span>

        <div class="effects">
          <div>
            <Shield :size="20" />

            <strong>−{{ reinforced ? '22' : '12' }}%</strong>

            <span>{{ copy.damage }}</span>
          </div>

          <div v-if="reinforced">
            <Swords :size="20" /><strong>20%</strong><span>{{ copy.reflection }}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="btn reinforce"
        :aria-pressed="reinforced"
        @click="reinforced = !reinforced"
      >
        <component :is="reinforced ? Undo2 : Plus" :size="16" />{{ reinforced ? copy.remove : copy.add }}
      </button>

      <p class="field-note">{{ copy.note }}</p>
    </div>

    <div class="ghost-ribbon">
      <Ghost :size="38" />

      <div>
        <h3>{{ copy.ghost }}</h3>
        <p>{{ copy.ghostText }}</p>
      </div>

      <span class="half hand">½<span>MMR</span></span>
    </div>
  </section>
</template>

<style scoped>
.alliance {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
  margin-top: 30px;
  padding: 40px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  overflow: hidden;
  background:
    radial-gradient(ellipse at 80% 30%, #bc8e331a, transparent 55%),
    linear-gradient(135deg, #20332b, #101c17 80%);
  box-shadow: 0 24px 70px #0004;
}
.alliance::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.035;
  pointer-events: none;
  background-image: repeating-linear-gradient(0deg, transparent, transparent 3px, #fff 4px);
}
.lead,
.formation,
.ghost-ribbon {
  position: relative;
  min-width: 0;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--gold);
}
h2 {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 22px 0 16px;
  font-size: clamp(42px, 5.3vw, 66px);
  line-height: 0.98;
  font-weight: 700;
}
h2 span:last-child {
  color: var(--gold);
}
.intro {
  max-width: 460px;
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--chalk-dim);
}
.guide {
  margin-top: 24px;
  background: var(--gold);
  border-color: var(--gold);
  color: var(--ink);
}
.numbers {
  display: flex;
  gap: 30px;
  margin-top: 30px;
}
.numbers div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.numbers strong {
  font-size: 36px;
  line-height: 1;
  color: var(--gold);
}
.numbers span {
  max-width: 115px;
  font-size: 11px;
  color: var(--chalk-dim);
}
.formation {
  align-self: center;
  padding: 20px;
  border: 1px solid #d9a44166;
  border-radius: var(--radius);
  background: #0c151bcc;
  transform: rotate(1deg);
  box-shadow:
    8px 14px 0 #0002,
    0 20px 45px #0003;
}
.field-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--gold);
}
.field-top span {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-top b {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.chalk-field {
  position: relative;
  height: 192px;
  margin: 12px -6px;
  overflow: hidden;
}
.chalk-field svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.chalk-field path {
  fill: none;
  stroke: #d9a44188;
  stroke-width: 2;
  stroke-dasharray: 5 7;
}
.chalk-field .second-line {
  stroke: #d9a44125;
}
.hero {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 1;
  font-size: 10px;
  font-weight: 700;
  transition:
    opacity 0.25s,
    filter 0.25s,
    transform 0.25s;
}
.hero :deep(.avatar) {
  box-shadow:
    0 0 0 4px #d9a44122,
    0 12px 20px #0005;
}
.spearman {
  top: 70px;
  left: 4%;
}
.herald {
  top: 25px;
  left: calc(50% - 36px);
}
.sniper {
  top: 62px;
  right: 3%;
}
.sniper.absent {
  opacity: 0.23;
  filter: grayscale(1);
  transform: translateY(8px);
}
.field-stamp {
  position: absolute;
  right: 20px;
  bottom: 1px;
  color: #d9a44119;
  font-size: 40px;
  transform: rotate(-8deg);
}
.formation-result {
  padding-top: 16px;
  border-top: 1px solid var(--edge);
  min-height: 92px;
}
.result-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--chalk);
}
.effects {
  display: flex;
  gap: 24px;
  margin-top: 12px;
}
.effects div {
  display: grid;
  grid-template-columns: 20px auto;
  gap: 3px 9px;
  align-items: center;
}
.effects svg {
  color: var(--gold);
}
.effects strong {
  font-size: 24px;
  color: var(--gold);
  line-height: 1;
}
.effects span {
  grid-column: 1 / -1;
  font-size: 10px;
  color: var(--chalk-dim);
}
.reinforce {
  width: 100%;
  margin-top: 18px;
  border-color: #d9a44166;
  color: var(--gold);
}
.field-note {
  margin: 12px 0 0;
  color: var(--chalk-faint);
  font-size: 11px;
  line-height: 1.5;
}
.ghost-ribbon {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 22px;
  margin-top: 8px;
  padding-top: 24px;
  border-top: 1px solid var(--edge-strong);
}
.ghost-ribbon > svg {
  flex: none;
  color: #a2bdd3;
}
.ghost-ribbon h3 {
  margin: 0 0 6px;
  font-size: 17px;
}
.ghost-ribbon p {
  margin: 0;
  max-width: 740px;
  color: var(--chalk-dim);
  font-size: 13px;
  line-height: 1.6;
}
.half {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-left: auto;
  font-size: 50px;
  line-height: 0.9;
  color: #a2bdd3;
}
.half span {
  margin-top: 6px;
  font-family: var(--font-body);
  font-size: 10px;
  letter-spacing: 0.15em;
}
@media (max-width: 820px) {
  .alliance {
    grid-template-columns: 1fr;
    padding: 28px;
    gap: 28px;
  }
  .formation {
    transform: none;
    max-width: 490px;
    width: 100%;
    justify-self: center;
  }
  h2 {
    font-size: clamp(42px, 8vw, 64px);
  }
  .intro {
    max-width: 590px;
  }
}
@media (max-width: 460px) {
  .alliance {
    padding: 20px 16px;
    gap: 26px;
  }
  .eyebrow {
    font-size: 9px;
    letter-spacing: 0.1em;
  }
  h2 {
    font-size: 43px;
  }
  .numbers {
    gap: 24px;
  }
  .numbers strong {
    font-size: 30px;
  }
  .numbers span {
    max-width: 90px;
    font-size: 10px;
  }
  .formation {
    padding: 16px;
  }
  .chalk-field {
    height: 180px;
  }
  .hero :deep(.avatar) {
    --size: 60px !important;
  }
  .herald {
    left: calc(50% - 30px);
  }
  .ghost-ribbon {
    gap: 12px;
    align-items: flex-start;
  }
  .ghost-ribbon > svg {
    width: 25px;
  }
  .ghost-ribbon h3 {
    font-size: 15px;
  }
  .half {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .hero {
    transition: none;
  }
}
</style>
