<script setup lang="ts">
import { Plus, UserRound } from 'lucide-vue-next'
import { computed } from 'vue'
import { ROLE_IDS, type HeroId, type RoleId, type SynergyId } from '@/content/ids'
import { ROLES } from '@/content/roles'
import { SYNERGY_BY_ID } from '@/content/synergies'
import { cssColor } from '@/rendering/theme'
import { useGameText } from '../../composables/useGameText'
import { ROLE_ICONS } from '../../icons'
import InfoTooltip from '../common/InfoTooltip.vue'
import SynergyDetails from './SynergyDetails.vue'

/**
 * Without `missing` the synergy is active. With it, the chip shows which roles would switch it on,
 * and becomes a button when `recruit` names a hero the player can send in right away.
 */
const props = defineProps<{ synergy: SynergyId; missing?: readonly RoleId[]; recruit?: HeroId | null }>()
const emit = defineEmits<{ recruit: [] }>()

const text = useGameText()
const anyHero = computed(() => props.missing?.length === ROLE_IDS.length)
const recruitable = computed(() => Boolean(props.missing && props.recruit))
</script>

<template>
  <InfoTooltip side="right" pass-through>
    <component
      :is="recruitable ? 'button' : 'span'"
      :type="recruitable ? 'button' : undefined"
      class="chip anim-pop"
      :class="[missing ? 'next' : 'active', { recruitable }]"
      :style="{ '--c': cssColor(SYNERGY_BY_ID[synergy].color) }"
      @click.stop="recruitable && emit('recruit')"
    >
      <template v-if="missing">
        <Plus v-if="recruitable" :size="11" />
        <UserRound v-if="anyHero" :size="12" />

        <template v-else>
          <component
            :is="ROLE_ICONS[role]"
            v-for="role in missing"
            :key="role"
            :size="12"
            :style="{ color: cssColor(ROLES[role].color) }"
          />
        </template>
      </template>

      <span class="label">{{ text.synergyName(synergy) }}</span>
    </component>

    <template #content>
      <SynergyDetails :synergy="synergy" :missing="missing" :recruit="recruit" />
    </template>
  </InfoTooltip>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 100%;
  padding: 1px 8px;
  border-radius: 7px;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  cursor: help;
}

.label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip.active {
  color: var(--ink);
  background: var(--c);
  box-shadow: 0 0 10px color-mix(in srgb, var(--c) 45%, transparent);
}

.chip.next {
  color: var(--chalk-dim);
  background: transparent;
  border: 1px dashed var(--edge-strong);
}

.chip.recruitable {
  color: var(--chalk);
  border-style: solid;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.chip.recruitable:hover {
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 18%, transparent);
}
</style>
