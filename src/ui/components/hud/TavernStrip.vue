<script setup lang="ts">
import { TowerControl } from 'lucide-vue-next'
import { computed } from 'vue'
import { LANE_IDS, TEAM_IDS } from '@/content/ids'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'

const store = useMatchStore()
const text = useGameText()
const { t } = text

/** Dota-style top bar: fallen heroes wait out their respawn under their team's side of the scoreboard. */
const sides = computed(() => {
  const heroes = [...(store.live?.heroes.values() ?? [])].filter((h) => h.dead)
  const structures = store.live?.structures ?? store.view!.structures

  return TEAM_IDS.map((team) => ({
    team,
    fallen: heroes.filter((h) => h.team === team).sort((a, b) => a.respawnIn - b.respawnIn),
    towersDown: LANE_IDS.filter((lane) => structures[team][lane] <= 0),
  }))
})

const visible = computed(() => sides.value.some((side) => side.fallen.length || side.towersDown.length))
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="tavern" aria-live="polite">
      <div v-for="side in sides" :key="side.team" class="side" :class="side.team === 0 ? 'ours' : 'theirs'">
        <TransitionGroup name="pop" tag="ul" class="fallen">
          <li
            v-for="hero in side.fallen"
            :key="hero.uid"
            class="grave"
            :aria-label="t('hud.respawnIn', { hero: text.heroName(hero.heroId), s: hero.respawnIn })"
          >
            <span class="portrait">
              <HeroAvatar :hero-id="hero.heroId" :team="side.team" :size="34" />
              <span class="timer">{{ hero.respawnIn }}</span>
            </span>

            <span class="name">{{ text.heroName(hero.heroId) }}</span>
          </li>
        </TransitionGroup>

        <ul v-if="side.towersDown.length" class="towers">
          <li v-for="lane in side.towersDown" :key="lane" class="tower anim-pop">
            <TowerControl :size="12" />
            {{ text.slotName(lane) }}
          </li>
        </ul>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.tavern {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  pointer-events: none;
}

.side {
  --team: var(--ours);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.side.theirs {
  --team: var(--theirs);
  align-items: flex-end;
}

.fallen,
.towers {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.theirs .fallen,
.theirs .towers {
  flex-direction: row-reverse;
}

.grave {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 80px;
}

.portrait {
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 50%;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--team) 75%, transparent);
}

.portrait :deep(.disc) {
  filter: grayscale(1) brightness(0.45);
}

.timer {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 5px;
  border-radius: 4px;
  background: rgba(17, 24, 21, 0.85);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--chalk-dim);
}

.tower {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(17, 24, 21, 0.9);
  border: 1px solid color-mix(in srgb, var(--team) 55%, transparent);
  color: var(--team);
  font-size: 11px;
  font-weight: 700;
  text-decoration: line-through;
}
</style>
