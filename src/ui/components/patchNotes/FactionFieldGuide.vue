<script setup lang="ts">
import { Flag } from '@lucide/vue'
import { useGameText } from '../../composables/useGameText'
import type { FactionNote } from '../../patchNotes/notes'
import HeroAvatar from '../common/HeroAvatar.vue'
import NoteLine from './NoteLine.vue'

defineProps<{ factions: readonly FactionNote[] }>()
const { t, heroName } = useGameText()
</script>

<template>
  <div class="field-guide">
    <article
      v-for="faction in factions"
      :key="faction.id"
      class="faction"
      :style="{ '--faction': faction.color }"
    >
      <header>
        <span class="flag"><Flag :size="20" /></span>

        <div>
          <h3><NoteLine :text="faction.name" /></h3>
          <p><NoteLine :text="faction.identity" /></p>
        </div>
      </header>

      <div class="members">
        <div v-for="hero in faction.heroes" :key="hero">
          <HeroAvatar :hero-id="hero" :size="38" /><span>{{ heroName(hero) }}</span>
        </div>
      </div>

      <dl>
        <div>
          <dt>{{ t('patchNotes.factionPair') }}</dt>
          <dd><NoteLine :text="faction.pair" /></dd>
        </div>

        <div class="trio">
          <dt>{{ t('patchNotes.factionTrio') }}</dt>
          <dd><NoteLine :text="faction.trio" /></dd>
        </div>
      </dl>
    </article>
  </div>
</template>

<style scoped>
.field-guide {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.faction {
  min-width: 0;
  padding: 24px;
  border: 1px solid color-mix(in srgb, var(--faction) 35%, var(--edge));
  border-radius: var(--radius);
  background: linear-gradient(135deg, color-mix(in srgb, var(--faction) 6%, var(--panel)), var(--panel));
}
.faction:last-child {
  grid-column: 1 / -1;
}
header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.flag {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  color: var(--faction);
  background: color-mix(in srgb, var(--faction) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--faction) 30%, transparent);
  border-radius: var(--radius);
}
h3 {
  margin: 0;
  color: var(--faction);
  font-family: var(--font-hand);
  font-size: 30px;
  line-height: 1;
}
header p {
  margin: 7px 0 0;
  font-size: 12px;
  color: var(--chalk-dim);
  line-height: 1.5;
}
.members {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 22px 0;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--edge);
}
.members > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.members span {
  font-size: 10px;
  color: var(--chalk-dim);
  text-align: center;
  overflow-wrap: anywhere;
}
dl {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: 20px;
  margin: 0;
}
dt {
  color: var(--faction);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  font-weight: 800;
  margin-bottom: 8px;
}
dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--chalk-dim);
}
dd :deep(strong) {
  color: var(--chalk);
}
.trio {
  padding-left: 20px;
  border-left: 1px solid var(--edge);
}
.faction:last-child .members {
  display: flex;
  justify-content: flex-start;
  gap: 32px;
}
.faction:last-child dl {
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 680px) {
  .field-guide {
    grid-template-columns: minmax(0, 1fr);
  }
  .faction {
    padding: 20px;
  }
  .faction:last-child .members {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
}
@media (max-width: 400px) {
  dl,
  .faction:last-child dl {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
  .trio {
    padding: 14px 0 0;
    border: 0;
    border-top: 1px solid var(--edge);
  }
}
</style>
