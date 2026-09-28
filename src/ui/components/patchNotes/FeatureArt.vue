<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { MODE_IDS, type HeroId, type ModeId } from '@/content/ids'
import type { RankTier } from '@/content/profile'
import { paintMapPicture } from '@/rendering/art/paintMapPicture'
import { laneMapFor } from '@/simulation/map/LaneMap'
import { useBoardLabels } from '../../composables/useBoardRenderer'
import { useGameText } from '../../composables/useGameText'
import type { FeatureArt } from '../../patchNotes/notes'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ModeMap from '../modes/ModeMap.vue'
import RankMedal from '../profile/RankMedal.vue'

const props = defineProps<{ art: FeatureArt }>()

/** A made-up rank per mode, only to show that each has its own. */
const SAMPLE_RANKS: Readonly<Record<ModeId, { tier: RankTier; stars: number }>> = {
  threeLanes: {
    tier: 'strategist',
    stars: 3,
  },
  twoLanes: {
    tier: 'scout',
    stars: 4,
  },
  oneLane: {
    tier: 'legend',
    stars: 1,
  },
}

const SAMPLE_ROUNDS = ['win', 'loss', 'draw', 'win', 'win'] as const
const PICKED_ROUND = 3

const SAMPLE_LINEUPS: readonly (readonly HeroId[])[] = [
  ['giant', 'archer', 'acolyte', 'pyromancer'],
  ['butcher', 'sniper', 'warden'],
]

/* Painting a board takes a moment; each map and language is painted once per visit. */
const pictures = new Map<string, string>()

const settings = useSettingsStore()
const labels = useBoardLabels()
const { t } = useGameText()
const picture = ref<string | null>(null)

const mode = computed(() => (props.art.kind === 'map' ? props.art.mode : null))

onMounted(() => {
  if (!mode.value) {
    return
  }

  const key = `${mode.value}:${settings.locale}`
  let url = pictures.get(key)
  if (!url) {
    url = paintMapPicture(laneMapFor(mode.value), labels, 900).toDataURL('image/webp', 0.85)
    pictures.set(key, url)
  }

  picture.value = url
})
</script>

<template>
  <div class="art" :class="art.kind" aria-hidden="true">
    <img v-if="art.kind === 'map' && picture" class="map" :src="picture" alt="" />

    <div v-else-if="art.kind === 'modes'" class="row">
      <figure v-for="id in MODE_IDS" :key="id" class="figure">
        <ModeMap :mode="id" :size="104" />
        <figcaption>{{ t(`modes.${id}.name`) }}</figcaption>
      </figure>
    </div>

    <div v-else-if="art.kind === 'ratings'" class="row">
      <figure v-for="id in MODE_IDS" :key="id" class="figure">
        <RankMedal :tier="SAMPLE_RANKS[id].tier" :stars="SAMPLE_RANKS[id].stars" :size="64" />
        <figcaption>{{ t(`modes.${id}.name`) }}</figcaption>
      </figure>
    </div>

    <div v-else-if="art.kind === 'rounds'" class="rounds">
      <div class="pips">
        <span
          v-for="(verdict, i) in SAMPLE_ROUNDS"
          :key="i"
          class="pip"
          :class="[verdict, { picked: i + 1 === PICKED_ROUND }]"
        >
          {{ i + 1 }}
        </span>
      </div>

      <div v-for="(heroes, team) in SAMPLE_LINEUPS" :key="team" class="lineup">
        <HeroAvatar
          v-for="id in heroes"
          :key="id"
          :hero-id="id"
          :team="team === 0 ? 0 : 1"
          :stars="1"
          :size="34"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.art {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background:
    radial-gradient(ellipse 70% 60% at 50% 45%, rgba(244, 197, 91, 0.12), transparent 70%),
    var(--board-deep, #111a17);
}

.map {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.row {
  display: flex;
  justify-content: center;
  gap: clamp(10px, 3vw, 22px);
  padding: 16px;
}

.figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.figure figcaption {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chalk-dim);
  white-space: nowrap;
}

.rounds {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.pips {
  display: flex;
  gap: 6px;
}

.pip {
  --verdict: var(--chalk-faint);
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--verdict) 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--verdict) 60%, transparent);
  font-size: 13px;
  font-weight: 700;
}

.pip.win {
  --verdict: var(--heal);
}

.pip.loss {
  --verdict: var(--theirs);
}

.pip.picked {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.lineup {
  display: flex;
  gap: 8px;
}
</style>
