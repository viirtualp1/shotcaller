<script setup lang="ts">
import { computed } from 'vue'
import type { ShopOfferView } from '@/application/views'
import { HEROES } from '@/content/heroes'
import type { HeroId } from '@/content/ids'
import { ROLES } from '@/content/roles'
import { cssColor } from '@/rendering/theme'
import { ROLE_ICONS } from '../../icons'
import { useGameText } from '../../composables/useGameText'
import HeroAvatar from '../common/HeroAvatar.vue'
import HeroDetails from '../common/HeroDetails.vue'
import InfoTooltip from '../common/InfoTooltip.vue'

const props = defineProps<{ offer: ShopOfferView & { heroId: HeroId }; disabled: boolean; index: number }>()

defineEmits<{ buy: [slot: number] }>()

const text = useGameText()
const { t } = text
const hero = computed(() => HEROES[props.offer.heroId])
</script>

<template>
  <InfoTooltip side="left">
    <button
      type="button"
      class="offer anim-slide"
      :class="{ poor: !offer.affordable, completes: offer.completesSet, [`tier-${hero.tier}`]: true }"
      :style="{ '--i': index, '--hero': cssColor(hero.color), '--role': cssColor(ROLES[hero.role].color) }"
      :disabled="disabled"
      @click="$emit('buy', offer.slot)"
    >
      <HeroAvatar :hero-id="offer.heroId" :size="36" />

      <span class="info">
        <span class="name">{{ text.heroName(offer.heroId) }}</span>

        <span class="role">
          <component :is="ROLE_ICONS[hero.role]" :size="12" />
          {{ text.roleName(hero.role) }} · {{ text.abilityName(hero.ability) }}
        </span>
      </span>

      <span class="side">
        <span class="cost"><span class="coin" /> {{ hero.tier }}</span>
        <span v-if="offer.completesSet" class="badge up">{{ t('shop.completes') }}</span>

        <span v-else-if="offer.ownedCopies" class="badge">{{
          t('shop.owned', { n: offer.ownedCopies })
        }}</span>
      </span>
    </button>

    <template #content>
      <HeroDetails :hero-id="offer.heroId" :stars="1" />
    </template>
  </InfoTooltip>
</template>

<style scoped>
.offer {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--edge);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--hero) 22%, transparent), transparent 55%),
    var(--panel-raised);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition:
    transform 0.12s,
    border-color 0.15s,
    box-shadow 0.15s;
}

.offer::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--hero);
}

.offer:hover:not(:disabled) {
  transform: translateX(-3px);
  border-color: var(--edge-strong);
}

.offer:active:not(:disabled) {
  transform: scale(0.98);
}

.offer:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.offer.poor {
  filter: saturate(0.4);
  opacity: 0.6;
}

.offer.completes {
  border-color: var(--gold);
  animation: glow 1.6s ease-in-out infinite;
}

.info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.name {
  font-weight: 700;
  font-size: 13.5px;
}

.role {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--role);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.cost {
  font-weight: 700;
  color: var(--gold);
  font-variant-numeric: tabular-nums;
}

.badge {
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  color: var(--chalk-dim);
  border: 1px solid var(--edge-strong);
  white-space: nowrap;
}

.badge.up {
  color: var(--ink);
  background: var(--gold);
  border-color: var(--gold);
  font-weight: 700;
}

.tier-2 .cost::after,
.tier-3 .cost::after {
  content: '';
}

@keyframes glow {
  50% {
    box-shadow: 0 0 16px rgba(244, 197, 91, 0.45);
  }
}
</style>
