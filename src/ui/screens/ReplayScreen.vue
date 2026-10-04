<script setup lang="ts">
import {
  useElementBounding,
  useEventListener,
  useMediaQuery,
  useRafFn,
  useScrollLock,
  useWindowSize,
} from '@vueuse/core'
import { Pause, Play, RotateCcw, X } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { BattleSession } from '@/application/BattleSession'
import { MODES } from '@/content/modes'
import { LIVE_MATCH_INTERVAL, type LiveMatch } from '@/application/social/liveMatch'
import { BATTLE } from '@/content/rules'
import type { PerTeam, StructureState } from '@/domain/battle/contracts'
import { fromSide, seenFrom } from '@/domain/battle/mirror'
import { freshStructures } from '@/domain/match/structures'
import type { MatchRecord } from '@/domain/profile/Profile'
import { replayRoundHeroes, replaySetup } from '@/domain/replay/setup'
import type { Insets } from '@/rendering/BoardRenderer'
import type { HeroHit } from '@/rendering/views/HeroToken'
import { BattleSimulation, type HeroStatus } from '@/simulation/BattleSimulation'
import { useBoardRenderer } from '../composables/useBoardRenderer'
import { useFighterLabels } from '../composables/useFighterLabels'
import { useGameText } from '../composables/useGameText'
import BaseStatus from '../components/hud/BaseStatus.vue'
import HudPanel from '../components/common/HudPanel.vue'
import ReplayHeroCard from '../components/replay/ReplayHeroCard.vue'
import ReplayHeroTooltip from '../components/replay/ReplayHeroTooltip.vue'
import HeroAvatar from '../components/common/HeroAvatar.vue'
import type { MeterStat } from '../components/battle/DamageMeter.vue'
import FighterLabel from '../components/battle/FighterLabel.vue'
import MeterTabs from '../components/battle/MeterTabs.vue'
import { useChatStore } from '../stores/chat'
import { useModalsStore } from '../stores/modals'
import { useReplayStore } from '../stores/replay'

const SPEEDS = [1, 2, 4] as const
type Speed = (typeof SPEEDS)[number]

const LIVE_REFRESH_SECONDS = 0.15
/** A snapshot is half a polling interval old on average by the time it arrives. */
const LIVE_LEAD = LIVE_MATCH_INTERVAL / 2000
/** Further behind the player than this, a live battle jumps ahead instead of speeding up. */
const LIVE_SEEK_SECONDS = 4
/** How fast the rest of a battle plays once the player's round has already ended. */
const LIVE_FINISH_SPEED = 4
const avatarSize = 36
let session: BattleSession | null = null
let sinceRefresh = 0

const props = defineProps<{
  match: MatchRecord
}>()

const replay = useReplayStore()
const chat = useChatStore()
const modals = useModalsStore()
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

const playing = ref(false)
const speed = ref<Speed>(1)
const elapsed = ref(0)
const over = ref(false)
const meter = ref<MeterStat>('damageDealt')
const meterTeam = ref<0 | 1>(0)
const selectedUid = ref<string | null>(null)
const hovered = shallowRef<HeroHit | null>(null)
const structures = shallowRef<PerTeam<StructureState>>(tapeStructures(replay.round))
const statuses = shallowRef<ReadonlyMap<string, HeroStatus>>(new Map())

const cast = computed(() => replayRoundHeroes(props.match, replay.round) ?? [])
const fighterLabel = useFighterLabels(cast)
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
    .filter((row) => row.team === meterTeam.value && (meter.value !== 'healing' || row.value > 0))
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
  return (
    props.match.replays[round - 1]?.structures ?? [
      freshStructures(props.match.mode),
      freshStructures(props.match.mode),
    ]
  )
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
  renderer.value?.showOrders(props.match.replays[round - 1]?.stances?.[0] ?? {})
  refreshLive()
  previous?.dispose()
}

function pick(uid: string) {
  selectedUid.value = selectedUid.value === uid ? null : uid
}

function tick(seconds: number) {
  if (!session || over.value) {
    return
  }

  if (replay.liveFriend) {
    const snapshot = replay.live
    if (!snapshot) {
      return
    }

    session.advance(seconds, livePace(snapshot))
  } else if (playing.value) {
    session.advance(seconds, speed.value)
  } else {
    return
  }

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

/**
 * A live battle plays like a replay, at the player's speed. Snapshots only steer it: a little faster when it falls
 * behind where the player probably is, slower when it gets ahead, and a jump only when it is far behind.
 */
function livePace(snapshot: LiveMatch) {
  const simulation = session!.simulation
  const rate = snapshot.speed ?? 1
  if (snapshot.phase !== 'battle') {
    return LIVE_FINISH_SPEED
  }

  const age = Math.min((Date.now() - replay.liveReceivedAt) / 1000, (LIVE_MATCH_INTERVAL * 2) / 1000)
  const estimate = Math.min(BATTLE.duration, snapshot.elapsed + (age + LIVE_LEAD) * rate)
  const drift = estimate - simulation.elapsed

  if (drift > LIVE_SEEK_SECONDS) {
    session!.catchUp(estimate - LIVE_LEAD, 90)

    return rate
  }

  return Math.max(0, Math.min(rate * 2 + 0.5, rate + drift * 0.5))
}

function toggle() {
  if (replay.liveFriend) {
    return
  }

  if (over.value) {
    playing.value = true
    loadRound(replay.round)

    return
  }

  playing.value = !playing.value
}

function onKey(event: KeyboardEvent) {
  if (
    event.defaultPrevented ||
    chat.windowOpen ||
    modals.anyOpen ||
    (event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable="true"]'))
  ) {
    return
  }

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

/*
 * A live match brings a fresh record every few seconds. Watched directly next to the shallow renderer ref, each one
 * restarted the battle; this key only changes when the round or its tape really does.
 */
const tapeKey = computed(() => `${replay.round}:${props.match.replays[replay.round - 1]?.seed ?? ''}`)

watch(
  [renderer, tapeKey],
  ([board], previous) => {
    if (previous?.[1] && !previous[1].startsWith(`${replay.round}:`)) {
      selectedUid.value = null
    }

    if (board) {
      loadRound(replay.round)
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
          <span class="eyebrow" :class="{ live: replay.liveFriend }">{{
            t(replay.liveFriend ? 'replay.liveTitle' : 'replay.title')
          }}</span>

          <span class="round">{{
            t('hud.round', { round: replay.live?.round ?? replay.round, max: maxRounds })
          }}</span>

          <!-- Status words stay short here: the header has to fit one line on a phone. -->
          <span v-if="replay.liveFriend && replay.liveStatus !== 'watching'" class="phase note">{{
            t(`replay.liveBadge.${replay.liveStatus}`)
          }}</span>

          <span v-else-if="replay.liveFriend && replay.live?.phase !== 'battle' && over" class="phase note">{{
            t('replay.waitingRound')
          }}</span>

          <span v-else class="phase">{{ t('battle.timeLeft', { s: secondsLeft }) }}</span>
        </div>

        <BaseStatus :team="1" :structures="structures[1]" :mode="match.mode" :name="opponentName" />
      </div>

      <nav class="pips" :aria-label="t('matchDetails.roundByRound')">
        <button
          v-for="(_, i) in match.replays"
          :key="i"
          type="button"
          class="pip"
          :class="match.history[i]"
          :aria-pressed="replay.round === i + 1"
          :disabled="Boolean(replay.liveFriend)"
          @click="replay.selectRound(i + 1)"
        >
          {{ i + 1 }}
        </button>
      </nav>
    </div>

    <aside ref="sideEl" class="side">
      <HudPanel class="actions">
        <div class="controls">
          <button v-if="!replay.liveFriend" type="button" class="btn" @click="toggle()">
            <Pause v-if="playing" :size="14" />
            <Play v-else :size="14" />
            {{ over ? t('replay.restart') : playing ? t('replay.pause') : t('replay.play') }}
          </button>

          <div v-if="!replay.liveFriend" class="speeds" role="group" :aria-label="t('replay.speed')">
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
            v-if="!replay.liveFriend"
            type="button"
            class="speed reset"
            :aria-label="t('replay.restart')"
            @click="loadRound(replay.round)"
          >
            <RotateCcw />
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

      <HudPanel>
        <div class="speeds" role="group" :aria-label="t('replay.statsTeam')">
          <button type="button" class="speed" :aria-pressed="meterTeam === 0" @click="meterTeam = 0">
            {{ t('replay.friendTeam') }}
          </button>

          <button type="button" class="speed" :aria-pressed="meterTeam === 1" @click="meterTeam = 1">
            {{ t('replay.opponentTeam') }}
          </button>
        </div>

        <MeterTabs v-model="meter" />

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
                <FighterLabel v-bind="fighterLabel(row)" class="label" />
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
  /* Social controls and dialogs remain available while watching. */
  z-index: 38;
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
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.25);
}

.speed {
  min-width: 40px;
  padding: 5px 8px;
  border: 0;
  border-radius: var(--radius);
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

.reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
}

/* The icon is as tall as a line of text, so the button lines up with the speed buttons beside it. */
.reset :deep(svg) {
  width: 1em;
  height: 1lh;
}

.top {
  position: absolute;
  top: env(safe-area-inset-top, 0px);
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
  border-radius: 0 0 var(--radius) var(--radius);
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

/* A fixed cap, not a percentage: the header sizes itself to its content, so a share of it would resolve to nothing. */
.center > * {
  max-width: 260px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.eyebrow.live {
  color: var(--theirs);
}

.eyebrow.live::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  vertical-align: 1px;
  background: currentColor;
  animation: live-dot 1.4s ease-in-out infinite;
}

@keyframes live-dot {
  50% {
    opacity: 0.3;
  }
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

.phase.note {
  font-size: 18px;
  color: var(--chalk-dim);
}

.side {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top, 0px));
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
  --avatar: 36px;
  display: grid;
  grid-template-columns: var(--avatar) 1fr auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13.5px;
  font-weight: 700;
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
  height: 36px;
  border-radius: var(--radius);
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
}

.label {
  position: relative;
  padding-left: 12px;
  line-height: 36px;
  overflow: hidden;
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
  border-radius: var(--radius);
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

  .side :deep(.tab) {
    padding: 8px 10px;
    font-size: 15px;
  }

  .meter {
    gap: 10px;
  }

  .row {
    font-size: 15px;
  }

  .label {
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
  /* Pinned at the middle the header could only use half of a phone's width, and its text wrapped. */
  .top {
    left: 8px;
    right: 8px;
    translate: none;
  }

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

  .center > * {
    max-width: 44vw;
  }

  .phase {
    font-size: 20px;
  }

  .phase.note {
    font-size: 15px;
  }
}
</style>
