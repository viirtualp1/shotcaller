<script setup lang="ts">
import { ArrowLeft, ChevronsRight, Shield } from 'lucide-vue-next'
import { LANE_STANCES, type HeroId, type LaneId, type LaneStance } from '@/content/ids'
import { useGameText } from '../../composables/useGameText'
import HeroAvatar from '../common/HeroAvatar.vue'
import { ORDER_ICONS } from '../lanes/orderIcons'

/** One lane of the planning panel, each with a different order so the three read at a glance. */
const LANES: readonly {
  readonly lane: LaneId
  readonly stance: LaneStance
  readonly ours: readonly HeroId[]
  readonly theirs: readonly HeroId[]
}[] = [
  {
    lane: 'top',
    stance: 'push',
    ours: ['sapper', 'archer'],
    theirs: ['warden'],
  },
  {
    lane: 'mid',
    stance: 'hold',
    ours: ['giant'],
    theirs: ['blademaster', 'pyromancer'],
  },
  {
    lane: 'bot',
    stance: 'group',
    ours: ['butcher', 'sniper'],
    theirs: ['shade'],
  },
]

defineProps<{ order?: LaneStance }>()

const { t } = useGameText()
</script>

<template>
  <div class="board">
    <ul v-if="!order" class="panel">
      <li v-for="entry in LANES" :key="entry.lane" class="lane">
        <!-- The lane's name sits beside the heroes, not above them: three lanes have to fit a phone-wide picture. -->
        <div class="matchup">
          <span class="name hand">{{ t(`lanes.${entry.lane}`) }}</span>

          <span class="side ours">
            <HeroAvatar v-for="id in entry.ours" :key="id" :hero-id="id" :size="26" />
          </span>

          <span class="vs">{{ t('tracker.vs') }}</span>

          <span class="side theirs">
            <HeroAvatar v-for="id in entry.theirs" :key="id" :hero-id="id" :team="1" :size="26" />
          </span>
        </div>

        <span class="orders">
          <span
            v-for="stance in LANE_STANCES"
            :key="stance"
            class="order"
            :class="{ on: entry.stance === stance }"
          >
            <component :is="ORDER_ICONS[stance]" :size="12" />
            {{ t(`orders.${stance}.name`) }}
          </span>
        </span>
      </li>
    </ul>

    <div v-else class="scene" :class="order">
      <div class="cast">
        <template v-if="order === 'push'">
          <span class="tower ours" />
          <span class="creeps"> <i /><i /><i /> </span>

          <span class="squad">
            <HeroAvatar hero-id="sapper" :size="46" />
            <HeroAvatar hero-id="archer" :size="46" />
          </span>

          <ChevronsRight class="march" :size="34" />
          <span class="tower theirs besieged" />
        </template>

        <template v-else-if="order === 'hold'">
          <span class="tower ours" />

          <span class="squad">
            <HeroAvatar hero-id="giant" :size="46" />
            <HeroAvatar hero-id="warden" :size="46" />
          </span>

          <span class="mark">
            <Shield class="mark-icon" :size="20" />
          </span>

          <span class="squad">
            <HeroAvatar hero-id="blademaster" :team="1" :size="46" />
            <HeroAvatar hero-id="pyromancer" :team="1" :size="46" />
          </span>
        </template>

        <template v-else>
          <span class="pack">
            <HeroAvatar hero-id="butcher" :size="46" />
            <HeroAvatar hero-id="sniper" :size="46" />
          </span>

          <span class="loner">
            <ArrowLeft class="back" :size="22" />
            <HeroAvatar hero-id="rogue" :size="46" />
          </span>

          <span class="squad">
            <HeroAvatar hero-id="shade" :team="1" :size="46" />
            <HeroAvatar hero-id="packLeader" :team="1" :size="46" />
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 10px 16px;
}

.panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  width: min(100%, 520px);
  height: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lane {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-height: 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}

/* Wide enough for the longest lane name, so the heroes line up from lane to lane. */
.name {
  min-width: 3em;
  font-size: 18px;
  line-height: 1;
}

.orders {
  display: flex;
  align-self: flex-start;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.28);
}

.order {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 5px;
  color: var(--chalk-dim);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.order.on {
  background: var(--gold);
  color: var(--ink);
}

.matchup {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.side {
  display: flex;
  gap: 4px;
  min-width: 0;
}

.side.ours {
  justify-self: start;
}

.side.theirs {
  justify-self: end;
}

.vs {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-faint);
}

.scene {
  display: flex;
  align-items: center;
  width: min(100%, 520px);
  height: 100%;
}

.cast {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: clamp(6px, 2vw, 16px);
  width: 100%;
  padding-bottom: 16px;
}

.cast::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4px;
  height: 8px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.12);
}

.tower,
.squad,
.creeps,
.pack,
.loner,
.mark,
.march {
  position: relative;
  z-index: 1;
}

.tower {
  flex: none;
  width: 22px;
  height: 30px;
  border-radius: 4px;
  background: var(--ours);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.45);
}

.tower::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 100%;
  translate: -50% 3px;
  border-left: 9px solid transparent;
  border-right: 9px solid transparent;
  border-bottom: 9px solid var(--ours);
}

.tower.theirs {
  background: var(--theirs);
}

.tower.theirs::before {
  border-bottom-color: var(--theirs);
}

.tower.besieged {
  box-shadow:
    0 0 0 3px var(--gold),
    0 0 18px rgba(244, 197, 91, 0.65);
}

.squad,
.creeps,
.pack {
  display: flex;
  align-items: center;
  gap: 4px;
}

.creeps i {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #d7c4a1;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.45);
}

.march {
  flex: none;
  align-self: center;
  margin-bottom: 10px;
  color: var(--gold);
  filter: drop-shadow(0 0 6px rgba(244, 197, 91, 0.45));
  animation: march 1.3s ease-in-out infinite;
}

.scene.hold .cast {
  height: 82%;
}

.mark {
  align-self: flex-end;
  width: 0;
  height: 92px;
  margin-bottom: -6px;
  border-left: 2px dashed var(--gold);
}

.scene.hold .mark {
  align-self: stretch;
  height: auto;
  margin-bottom: -12px;
}

.mark-icon {
  position: absolute;
  top: 42%;
  left: 0;
  translate: -50% -50%;
  padding: 5px;
  border-radius: 50%;
  background: var(--board-deep, #111a17);
  box-shadow: 0 0 0 2px var(--gold);
  color: var(--gold);
}

.pack {
  padding: 6px 8px 6px 6px;
  border-radius: 999px;
  box-shadow: 0 0 0 2px rgba(244, 197, 91, 0.75);
  background: rgba(244, 197, 91, 0.08);
}

.loner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-bottom: 2px;
  animation: fall-back 1.8s ease-in-out infinite;
}

.back {
  color: var(--gold);
}

@keyframes march {
  50% {
    transform: translateX(7px);
  }
}

@keyframes fall-back {
  50% {
    transform: translateX(-12px);
  }
}
</style>
