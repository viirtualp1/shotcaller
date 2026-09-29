<script setup lang="ts">
import {
  useElementBounding,
  useEventListener,
  useMediaQuery,
  useRafFn,
  useScrollLock,
  useWindowSize,
} from '@vueuse/core'
import { Pause, Play, RotateCcw, X } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { BattleSession } from '@/application/BattleSession'
import { MODES } from '@/content/modes'
import { BATTLE } from '@/content/rules'
import type { PerTeam, StructureState } from '@/domain/battle/contracts'
import { fromSide, seenFrom } from '@/domain/battle/mirror'
import { emptyStructureState } from '@/domain/match/structures'
import type { MatchRecord } from '@/domain/profile/Profile'
import { replayRoundHeroes, replaySetup } from '@/domain/replay/setup'
import type { Insets } from '@/rendering/BoardRenderer'
import type { HeroHit } from '@/rendering/views/HeroToken'
import { BattleSimulation, type HeroStatus } from '@/simulation/BattleSimulation'
import { useBoardRenderer } from '../composables/useBoardRenderer'
import { useGameText } from '../composables/useGameText'
import BaseStatus from '../components/hud/BaseStatus.vue'
import HudPanel from '../components/common/HudPanel.vue'
import ReplayHeroCard from '../components/replay/ReplayHeroCard.vue'
import ReplayHeroTooltip from '../components/replay/ReplayHeroTooltip.vue'
import HeroAvatar from '../components/common/HeroAvatar.vue'
import type { MeterStat } from '../components/battle/DamageMeter.vue'
import { useReplayStore } from '../stores/replay'

const SPEEDS = [1, 2, 4] as const
type Speed = (typeof SPEEDS)[number]

const METER_STATS: readonly MeterStat[] = ['damageDealt', 'healing', 'damageReceived']
const LIVE_REFRESH_SECONDS = 0.15

const props = defineProps<{
  match: MatchRecord
}>()

const replay = useReplayStore()
const text = useGameText()
const { t } = text
const host = ref<HTMLElement | null>(null)
const topEl = ref<HTMLElement | null>(null)
const sideEl = ref<HTMLElement | null>(null)
const renderer = useBoardRenderer(host, props.match.side, props.match.mode)
const wide = useMediaQuery('(min-width: 1100px)')
const { width: viewportW, height: viewportH } = useWindowSize()
const topBox = useElementBounding(topEl)
const sideBox = useElementBounding(sideEl)
const avatarSize = computed(() => (wide.value ? 30 : 22))

const playing = ref(false)
const speed = ref<Speed>(1)
const elapsed = ref(0)
const over = ref(false)
const meter = ref<MeterStat>('damageDealt')
const selectedUid = ref<string | null>(null)
const hovered = shallowRef<HeroHit | null>(null)
const structures = shallowRef<PerTeam<StructureState>>(tapeStructures(replay.round))
const statuses = shallowRef<ReadonlyMap<string, HeroStatus>>(new Map())

let session: BattleSession | null = null
let sinceRefresh = 0

const cast = computed(() => replayRoundHeroes(props.match, replay.round) ?? [])
const selected = computed(() => cast.value.find((hero) => hero.uid === selectedUid.value) ?? null)

const selectedStatus = computed(() =>
  selected.value ? (statuses.value.get(selected.value.uid) ?? null) : null,
)

const hoveredHero = computed(() => {
  const hit = hovered.value
  if (!hit || hit.uid === selectedUid.value) {
    return null
  }

  return cast.value.find((hero) => hero.uid === hit.uid) ?? null
})

const maxRounds = computed(() => MODES[props.match.mode].maxRounds)
const opponentName = computed(() => props.match.duel?.opponentName ?? undefined)
const secondsLeft = computed(() => Math.max(0, Math.ceil(BATTLE.duration - elapsed.value)))

const meterRows = computed(() => {
  const rows = cast.value
    .map((hero) => {
      const status = statuses.value.get(hero.uid)

      return {
        ...hero,
        dead: status?.dead ?? false,
        value: status?.[meter.value] ?? 0,
      }
    })
    .filter((row) => meter.value !== 'healing' || row.value > 0)
    .sort((a, b) => b.value - a.value)

  const top = Math.max(1, rows[0]?.value ?? 1)

  return rows.map((row) => ({
    ...row,
    share: row.value / top,
  }))
})

const insets = computed<Insets>(() => {
  const top = Math.max(84, topBox.height.value > 0 ? Math.ceil(topBox.bottom.value) + 6 : 96)

  if (wide.value) {
    const side = sideBox.left.value > 0 ? Math.ceil(viewportW.value - sideBox.left.value) + 8 : 428

    return {
      top,
      right: side,
      bottom: 12,
      left: side,
    }
  }

  const bottom = sideBox.top.value > top ? Math.ceil(viewportH.value - sideBox.top.value) + 8 : 240

  return {
    top,
    right: 12,
    bottom,
    left: 12,
  }
})

function tapeStructures(round: number): PerTeam<StructureState> {
  return props.match.replays[round - 1]?.structures ?? [emptyStructureState(), emptyStructureState()]
}

function refreshLive() {
  const simulation = session?.simulation
  if (!simulation) {
    return
  }

  structures.value = fromSide(props.match.side, simulation.structureHealth())
  const next = new Map<string, HeroStatus>()

  for (const status of simulation.heroStatus().values()) {
    next.set(status.uid, {
      ...status,
      team: seenFrom(props.match.side, status.team),
    })
  }

  statuses.value = next
  sinceRefresh = 0
}

function loadRound(round: number) {
  const built = replaySetup(props.match, round)
  if (!built) {
    return
  }

  const previous = session
  session = new BattleSession(new BattleSimulation(built.setup))
  elapsed.value = 0
  over.value = false
  structures.value = tapeStructures(round)
  renderer.value?.showBattle(session.simulation)
  refreshLive()
  previous?.dispose()
}

function pick(uid: string) {
  selectedUid.value = selectedUid.value === uid ? null : uid
}

function tick(seconds: number) {
  if (!session || !playing.value) {
    return
  }

  session.advance(seconds, speed.value)
  elapsed.value = session.simulation.elapsed
  sinceRefresh += seconds

  if (session.isOver) {
    playing.value = false
    over.value = true
    refreshLive()

    return
  }

  if (sinceRefresh >= LIVE_REFRESH_SECONDS) {
    refreshLive()
  }
}

function toggle() {
  if (over.value) {
    playing.value = true
    loadRound(replay.round)

    return
  }

  playing.value = !playing.value
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()

    if (selectedUid.value) {
      selectedUid.value = null

      return
    }

    replay.close()
  } else if (event.key === ' ') {
    event.preventDefault()
    toggle()
  }
}

function onPointerDown(event: PointerEvent) {
  const board = renderer.value
  if (!board || !(event.target instanceof HTMLCanvasElement)) {
    return
  }

  if (!board.heroAtClient(event.clientX, event.clientY)) {
    selectedUid.value = null
  }
}

watch(
  [renderer, () => replay.round],
  ([board, round], previous) => {
    if (previous && previous[1] !== round) {
      selectedUid.value = null
    }

    if (board) {
      loadRound(round)
    }
  },
  { immediate: true },
)

watch(insets, (value) => renderer.value?.setInsets(value), { immediate: true })

watch(renderer, (board, _, onCleanup) => {
  if (!board) {
    return
  }

  board.setInsets(insets.value)

  const onTap = (hit: HeroHit) => pick(hit.uid)
  const onHover = (hit: HeroHit | null) => {
    hovered.value = hit
  }

  board.events.on('heroTapped', onTap)
  board.events.on('heroHovered', onHover)

  onCleanup(() => {
    board.events.off('heroTapped', onTap)
    board.events.off('heroHovered', onHover)
  })
})

watch(selectedUid, () => sideEl.value?.scrollTo({ top: 0 }))

/* The screen underneath must not scroll while the replay covers it. The root, not the body: a closing dialog restores the body's own lock. */
useScrollLock(document.documentElement, true)
useRafFn(({ delta }) => tick(delta / 1000))
useEventListener(window, 'keydown', onKey, { capture: true })
useEventListener(window, 'pointerdown', onPointerDown)

onBeforeUnmount(() => {
  session?.dispose()
})
</script>

<template>
  <div class="replay">
    <div ref="host" class="board" />

    <ReplayHeroTooltip
      v-if="renderer && hovered && hoveredHero"
      :renderer="renderer"
      :hit="hovered"
      :hero="hoveredHero"
    />

    <div ref="topEl" class="top">
      <div class="scoreboard">
        <BaseStatus :team="0" :structures="structures[0]" :mode="match.mode" />

        <div class="center">
          <span class="eyebrow">{{ t('replay.title') }}</span>
          <span class="round">{{ t('hud.round', { round: replay.round, max: maxRounds }) }}</span>
          <span class="phase">{{ t('battle.timeLeft', { s: secondsLeft }) }}</span>
        </div>

        <BaseStatus :team="1" :structures="structures[1]" :mode="match.mode" :name="opponentName" />
      </div>

      <nav class="pips" :aria-label="t('matchDetails.roundByRound')">
        <button
          v-for="(verdict, i) in match.history"
          :key="i"
          type="button"
          class="pip"
          :class="verdict"
          :aria-pressed="replay.round === i + 1"
          :disabled="!match.replays[i]"
          @click="replay.selectRound(i + 1)"
        >
          {{ i + 1 }}
        </button>
      </nav>
    </div>

    <aside ref="sideEl" class="side">
      <HudPanel class="actions">
        <div class="controls">
          <button type="button" class="btn" @click="toggle()">
            <Pause v-if="playing" :size="14" />
            <Play v-else :size="14" />
            {{ over ? t('replay.restart') : playing ? t('replay.pause') : t('replay.play') }}
          </button>

          <div class="speeds" role="group" :aria-label="t('replay.speed')">
            <button
              v-for="s in SPEEDS"
              :key="s"
              type="button"
              class="speed"
              :aria-pressed="speed === s"
              @click="speed = s"
            >
              ×{{ s }}
            </button>
          </div>

          <button
            type="button"
            class="icon-btn"
            :aria-label="t('replay.restart')"
            @click="loadRound(replay.round)"
          >
            <RotateCcw :size="16" />
          </button>

          <button
            type="button"
            class="icon-btn close"
            :aria-label="t('replay.close')"
            @click="replay.close()"
          >
            <X :size="16" />
          </button>
        </div>
      </HudPanel>

      <ReplayHeroCard
        v-if="selected"
        :hero="selected"
        :status="selectedStatus"
        :large="wide"
        @close="selectedUid = null"
      />

      <HudPanel :title="t('summary.heroes')">
        <template #actions>
          <div class="meter-tabs" role="group" :aria-label="t('summary.heroes')">
            <button
              v-for="stat in METER_STATS"
              :key="stat"
              type="button"
              class="meter-tab"
              :aria-pressed="meter === stat"
              @click="meter = stat"
            >
              {{ t(`battle.${stat}`) }}
            </button>
          </div>
        </template>

        <ol v-if="meterRows.length" class="meter" :class="meter">
          <li v-for="row in meterRows" :key="row.uid">
            <button
              type="button"
              class="row"
              :class="[row.team === 0 ? 'ours' : 'theirs', { dead: row.dead }]"
              :aria-pressed="selectedUid === row.uid"
              @click="pick(row.uid)"
            >
              <HeroAvatar :hero-id="row.heroId" :team="row.team" :size="avatarSize" />

              <span class="track">
                <i :style="{ width: `${row.share * 100}%` }" />
                <span class="label">{{ text.heroName(row.heroId) }}</span>
              </span>

              <span class="value">{{ text.number(row.value) }}</span>
            </button>
          </li>
        </ol>

        <p v-else-if="meter === 'healing'" class="empty">{{ t('battle.noHealing') }}</p>
      </HudPanel>
    </aside>
  </div>
</template>

<style scoped>
.replay {
  --side: 0px;
  position: fixed;
  inset: 0;
  /* Above the social windows, below item tooltips portaled to the body. */
  z-index: 49;
  overflow: hidden;
  background: var(--board);
  pointer-events: auto;
}

.board {
  position: absolute;
  inset: 0;
}

.board :deep(canvas) {
  display: block;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.controls .close {
  margin-left: auto;
}

.speeds {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
}

.speed {
  min-width: 40px;
  padding: 5px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--chalk);
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}

.speed[aria-pressed='true'] {
  background: var(--gold);
  color: var(--ink);
}

.top {
  position: absolute;
  top: 0;
  left: 50%;
  translate: -50% 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.top > * {
  pointer-events: auto;
}

/* Equal side columns keep the round in the middle, right above the round buttons. */
.scoreboard {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 22px;
  padding: 8px 18px 10px;
  border-radius: 0 0 16px 16px;
  background: rgba(17, 24, 21, 0.9);
  border: 1px solid var(--edge);
  border-top: 0;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
}

.scoreboard > :first-child {
  justify-self: end;
}

.scoreboard > :last-child {
  justify-self: start;
}

.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 140px;
  gap: 2px;
}

.round {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.phase {
  font-family: var(--font-hand);
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  color: var(--theirs);
  font-variant-numeric: tabular-nums;
}

.side {
  position: absolute;
  top: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(320px, calc(100vw - 24px));
  overflow: auto;
  pointer-events: none;
}

.side > * {
  pointer-events: auto;
}

.meter-tabs {
  display: flex;
  gap: 2px;
  margin-left: auto;
  padding: 2px;
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.25);
}

.meter-tab {
  padding: 3px 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--chalk-dim);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.meter-tab[aria-pressed='true'] {
  background: rgba(255, 255, 255, 0.1);
  color: var(--chalk);
}

.meter {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  --team: var(--ours);
  --avatar: 22px;
  display: grid;
  grid-template-columns: var(--avatar) 1fr auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.row.theirs {
  --team: var(--theirs);
}

.row.dead {
  opacity: 0.5;
}

.row[aria-pressed='true'] .track {
  outline: 1px solid var(--gold);
}

.track {
  position: relative;
  height: 20px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.track i {
  position: absolute;
  inset: 0 auto 0 0;
  background: color-mix(in srgb, var(--team) 45%, transparent);
}

.healing .track i {
  background: color-mix(in srgb, var(--heal) 40%, transparent);
  box-shadow: inset 3px 0 0 var(--team);
}

.damageReceived .track i {
  background: color-mix(in srgb, var(--theirs) 35%, transparent);
  box-shadow: inset 3px 0 0 var(--team);
}

.label {
  position: relative;
  padding-left: 8px;
  line-height: 20px;
  white-space: nowrap;
}

.value {
  min-width: 3.5em;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--chalk-dim);
}

.empty {
  margin: 0;
  font-size: 12px;
  color: var(--chalk-faint);
}

.pips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  max-width: 100%;
}

.pip {
  --verdict: var(--chalk-faint);
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--verdict) 60%, transparent);
  background: color-mix(in srgb, var(--verdict) 22%, rgba(17, 24, 21, 0.9));
  color: var(--chalk);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.pip.win {
  --verdict: var(--heal);
}

.pip.loss {
  --verdict: var(--theirs);
}

.pip[aria-pressed='true'] {
  outline: 2px solid var(--gold);
  outline-offset: 1px;
}

.pip:disabled {
  cursor: default;
  opacity: 0.45;
}

@media (min-width: 1100px) {
  .replay {
    --side: clamp(380px, 26vw, 460px);
  }

  .top {
    max-width: calc(100% - 2 * var(--side) - 48px);
  }

  .scoreboard {
    gap: 28px;
    padding: 10px 22px 12px;
  }

  .phase {
    font-size: 32px;
  }

  .side {
    width: var(--side);
    gap: 14px;
  }

  .side :deep(.hud-panel) {
    padding: 16px 18px 18px;
    gap: 14px;
  }

  .side :deep(.hud-panel > .head .title) {
    font-size: 13px;
  }

  .controls .btn {
    min-height: 40px;
    padding: 8px 14px;
    font-size: 15px;
  }

  .speed {
    min-width: 44px;
    padding: 8px 10px;
    font-size: 15px;
  }

  .meter {
    gap: 10px;
  }

  .row {
    --avatar: 30px;
    gap: 10px;
    font-size: 15px;
  }

  .track {
    height: 28px;
  }

  .label {
    padding-left: 10px;
    line-height: 28px;
    font-size: 15px;
  }

  .value {
    font-size: 15px;
  }

  .pip {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .pips {
    gap: 6px;
  }
}

@media (max-width: 1099px) {
  .side {
    top: auto;
    left: 12px;
    right: 12px;
    width: auto;
    max-height: min(42vh, 380px);
  }

  .scoreboard {
    gap: 10px;
    padding: 6px 10px;
  }

  .scoreboard :deep(.who) {
    display: none;
  }

  .center {
    min-width: 0;
  }

  .phase {
    font-size: 20px;
  }
}
</style>
