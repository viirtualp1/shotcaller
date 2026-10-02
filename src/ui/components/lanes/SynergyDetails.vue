<script setup lang="ts">
import { computed } from 'vue'
import { ROLE_IDS, type HeroId, type RoleId, type SynergyId } from '@/content/ids'
import { ROLES } from '@/content/roles'
import { SYNERGY_BY_ID } from '@/content/synergies'
import { cssColor } from '@/rendering/theme'
import { useGameText } from '../../composables/useGameText'
import { ROLE_ICONS } from '../../icons'

/** Dota-style synergy tooltip: status up top, then what it needs and what it gives. */
const props = defineProps<{ synergy: SynergyId; missing?: readonly RoleId[]; recruit?: HeroId | null }>()

const text = useGameText()
const { t } = text
const color = computed(() => cssColor(SYNERGY_BY_ID[props.synergy].color))
const anyHero = computed(() => props.missing?.length === ROLE_IDS.length)
</script>

<template>
  <div class="synergy-details" :style="{ '--synergy': color }">
    <header class="head">
      <span class="dot" aria-hidden="true" />
      <strong class="name">{{ text.synergyName(synergy) }}</strong>

      <span class="status" :class="{ active: !missing }">
        {{ missing ? t('synergyTip.inactive') : t('synergyTip.active') }}
      </span>
    </header>

    <section class="block">
      <span class="label">{{ t('synergyTip.need') }}</span>
      <p>{{ text.synergyNeed(synergy) }}</p>
    </section>

    <section class="block effect">
      <span class="label">{{ t('synergyTip.effect') }}</span>
      <p>{{ text.synergyEffect(synergy) }}</p>
    </section>

    <footer v-if="missing" class="missing">
      <span class="label">{{ t('synergyTip.missing') }}</span>

      <span class="roles">
        <span v-if="anyHero" class="role">{{ t('tracker.anyHero') }}</span>

        <template v-else>
          <span
            v-for="role in missing"
            :key="role"
            class="role"
            :style="{ color: cssColor(ROLES[role].color) }"
          >
            <component :is="ROLE_ICONS[role]" :size="13" />
            {{ text.roleName(role) }}
          </span>
        </template>
      </span>

      <span v-if="recruit" class="call">{{ t('tracker.recruit', { hero: text.heroName(recruit) }) }}</span>
    </footer>
  </div>
</template>

<style scoped>
.synergy-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 250px;
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--edge);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--synergy);
  box-shadow: 0 0 8px var(--synergy);
}

.name {
  font-size: 14px;
}

.status {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid var(--edge-strong);
  font-size: 10.5px;
  font-weight: 700;
  color: var(--chalk-dim);
}

.status.active {
  border-color: color-mix(in srgb, var(--heal) 60%, transparent);
  color: var(--heal);
}

.block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 9px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.04);
  border-left: 2px solid var(--edge-strong);
}

.block.effect {
  border-left-color: var(--synergy);
}

.label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

p {
  margin: 0;
  color: var(--chalk);
}

.missing {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.roles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.role {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.call {
  color: var(--gold);
  font-weight: 600;
}
</style>
