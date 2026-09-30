<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed } from 'vue'
import { HEROES } from '@/content/heroes'
import { ITEM_SLOTS } from '@/content/items'
import type { ReplayHero } from '@/domain/replay/setup'
import { cssColor } from '@/rendering/theme'
import type { HeroStatus } from '@/simulation/BattleSimulation'
import { useGameText } from '../../composables/useGameText'
import HeroAvatar from '../common/HeroAvatar.vue'
import HeroDetails from '../common/HeroDetails.vue'
import InfoTooltip from '../common/InfoTooltip.vue'
import ItemDetails from '../common/ItemDetails.vue'
import ItemIcon from '../common/ItemIcon.vue'

const props = withDefaults(defineProps<{ hero: ReplayHero; status: HeroStatus | null; large?: boolean }>(), {
  large: false,
})

const emit = defineEmits<{ close: [] }>()

const text = useGameText()
const { t } = text
const enemy = computed(() => props.hero.team === 1)
const accent = computed(() => cssColor(HEROES[props.hero.heroId].color))

const slots = computed(() =>
  Array.from({ length: ITEM_SLOTS }, (_, index) => ({
    index,
    itemId: props.hero.items[index] ?? null,
  })),
)
</script>

<template>
  <aside
    class="hero-card replay-card"
    :class="{ enemy, large }"
    :style="{ '--hero': accent }"
    aria-live="polite"
  >
    <header class="head">
      <HeroAvatar :hero-id="hero.heroId" :stars="hero.stars" :team="hero.team" :size="large ? 64 : 54" />

      <span class="who">
        <span v-if="enemy" class="side">{{ t('card.enemy') }}</span>
        <strong class="name">{{ text.heroName(hero.heroId) }}</strong>
        <span class="lane">{{ text.slotName(hero.lane) }}</span>
      </span>

      <button type="button" class="close icon-btn" :aria-label="t('card.close')" @click="emit('close')">
        <X :size="16" />
      </button>
    </header>

    <HeroDetails class="details" :hero-id="hero.heroId" :stars="hero.stars" :heading="false" />

    <div v-if="status" class="live">
      <span class="vitals" :class="{ dead: status.dead }">
        <i class="hp"><b :style="{ width: `${status.healthRatio * 100}%` }" /></i>
        <i class="mp"><b :style="{ width: `${status.manaRatio * 100}%` }" /></i>
      </span>

      <p v-if="status.dead && status.respawnIn > 0" class="respawn">
        {{ t('hud.respawnIn', { hero: text.heroName(hero.heroId), s: status.respawnIn }) }}
      </p>

      <p class="nums">
        <span>{{ t('summary.heroDamage') }} {{ text.number(status.damageDealt) }}</span>
        <span>{{ t('summary.heroHealing') }} {{ text.number(status.healing) }}</span>
        <span>{{ t('summary.heroKills') }} {{ text.number(status.kills) }}</span>
      </p>
    </div>

    <footer class="bottom">
      <div class="items">
        <template v-for="slot in slots" :key="slot.index">
          <InfoTooltip v-if="slot.itemId" side="top">
            <button type="button" class="slot filled locked" :aria-label="text.itemName(slot.itemId)">
              <ItemIcon :item-id="slot.itemId" :size="large ? 52 : 44" />
            </button>

            <template #content>
              <ItemDetails :item-id="slot.itemId" />
            </template>
          </InfoTooltip>

          <span v-else class="slot empty" />
        </template>
      </div>
    </footer>
  </aside>
</template>

<style scoped>
.hero-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: 12px 14px 14px;
  border-radius: 14px;
  background: rgba(17, 24, 21, 0.96);
  border: 1px solid rgba(244, 197, 91, 0.45);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  font-size: 13px;
}

.hero-card.enemy {
  border-color: rgba(255, 112, 96, 0.5);
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: -12px -14px 0;
  padding: 12px 14px 10px;
  border-radius: 14px 14px 0 0;
  border-bottom: 1px solid var(--edge);
  background: linear-gradient(90deg, color-mix(in srgb, var(--hero) 22%, transparent), transparent 70%);
}

.who {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.side {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--theirs);
}

.name {
  font-size: 17px;
}

.lane {
  font-size: 12px;
  color: var(--chalk-dim);
}

.details {
  width: auto;
}

.live {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vitals {
  display: grid;
  gap: 3px;
}

.vitals i {
  display: block;
  height: 4px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.vitals b {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.hp b {
  background: var(--heal);
}

.mp b {
  background: var(--mana);
}

.vitals.dead {
  opacity: 0.45;
}

.respawn,
.nums {
  margin: 0;
}

.respawn {
  font-size: 12px;
  color: var(--chalk-dim);
}

.nums {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--chalk-dim);
}

.bottom {
  display: flex;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid var(--edge);
}

.items {
  display: flex;
  gap: 6px;
}

.slot {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 0;
  border-radius: 9px;
  background: transparent;
}

.slot.filled {
  border: 0;
}

.slot.locked {
  cursor: default;
}

.slot.empty {
  border: 1px dashed var(--edge-strong);
  background: rgba(0, 0, 0, 0.2);
}

.close {
  align-self: flex-start;
}

.hero-card.large {
  gap: 14px;
  padding: 16px 18px 18px;
  font-size: 15px;
}

.hero-card.large .head {
  gap: 14px;
  margin: -16px -18px 0;
  padding: 16px 18px 12px;
}

.hero-card.large .name {
  font-size: 22px;
}

.hero-card.large .lane,
.hero-card.large .respawn,
.hero-card.large .nums {
  font-size: 14px;
}

.hero-card.large .slot {
  width: 58px;
  height: 58px;
}
</style>
