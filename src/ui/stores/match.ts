import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import type { Result } from 'neverthrow'
import { defineStore } from 'pinia'
import { computed, markRaw, ref, shallowRef } from 'vue'
import { BattleSession } from '@/application/BattleSession'
import { createMatch, restoreMatch } from '@/application/createMatch'
import { LocalStorageMatchRepository } from '@/application/persistence/MatchRepository'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import {
  toLiveBattleView,
  toMatchView,
  type HeroCardView,
  type LiveBattleView,
  type MatchView,
  type PlayerView,
} from '@/application/views'
import { LANE_IDS, type HeroId, type ItemId, type ModeId, type StarLevel, type TeamId } from '@/content/ids'
import { DUEL_BATTLE_SPEED, DUEL_PLANNING_SECONDS, DUEL_SUMMARY_SECONDS } from '@/content/rules'
import type { BattleSetup } from '@/domain/battle/contracts'
import { arrangeStrongestLineup } from '@/domain/coach/arrange'
import { LaneOptimizer } from '@/domain/coach/LaneOptimizer'
import type { DomainError } from '@/domain/errors'
import type { Match, MatchState, RemoteLink } from '@/domain/match/Match'
import type { PlayerState } from '@/domain/player/Player'
import type { RosterSlot } from '@/domain/roster/Roster'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import { useProfileStore } from './profile'
import { useSettingsStore } from './settings'

export type BattleSpeed = 1 | 2 | 4
export type ShopTab = 'heroes' | 'items'

type NoticeInput =
  | { readonly kind: 'error'; readonly error: DomainError }
  | { readonly kind: 'promoted'; readonly heroId: HeroId; readonly stars: StarLevel }
  | { readonly kind: 'itemBought'; readonly itemId: ItemId }
  | { readonly kind: 'timeUp' }
  | { readonly kind: 'arranged'; readonly changed: boolean }

export type Notice = NoticeInput & { readonly id: number }

const LIVE_REFRESH_SECONDS = 0.15

/** What the match needs from an online duel; the duel store provides it. */
export interface DuelBinding {
  readonly id: string
  readonly opponentName: string
  /** Sends this round's board and resolves with the other player's once both are in. */
  exchange(round: number, board: PlayerState): Promise<PlayerState>
  /** The result this device replayed, seen from its own side: 0 won, 1 lost, null a draw. */
  finish(winner: TeamId | null): void
}

/** A duel the server ended early, as `settleDuel` needs it. */
export interface SettledDuel {
  readonly id: string
  readonly seed: string
  readonly opponentName: string
  readonly won: boolean
}

/**
 * Wall-clock times of a duel round. Both devices follow them rather than their own frames, so one that lagged,
 * slept in a background tab or sat in the menu catches up instead of falling behind the other.
 */
interface DuelClock {
  readonly seed: string
  readonly round: number
  /** When this device got both boards and the round's battle began. */
  readonly battleStartedAt: number | null
  /** When planning runs out: this round's, or the next one's once the battle is over. */
  readonly planningEndsAt: number
}

const secondsFromNow = (seconds: number) => Date.now() + seconds * 1000

export interface LocatedHero {
  readonly hero: HeroCardView
  readonly slot: RosterSlot
}

export function locateHero(player: PlayerView, uid: string) {
  const onBench = player.bench.find((h) => h.uid === uid)
  if (onBench) {
    return {
      hero: onBench,
      slot: 'bench',
    }
  }

  for (const lane of LANE_IDS) {
    const hero = player.lanes[lane].heroes.find((h) => h.uid === uid)
    if (hero) {
      return {
        hero,
        slot: lane,
      }
    }
  }

  return null
}

export const useMatchStore = defineStore('match', () => {
  const repository = new LocalStorageMatchRepository()
  const duelRepository = new LocalStorageMatchRepository(STORAGE_KEYS.duel)
  const optimizer = new LaneOptimizer()
  const profile = useProfileStore()
  const settings = useSettingsStore()
  let match: Match | null = null
  let session: BattleSession | null = null
  let liveCountdown = 0
  let noticeSeq = 0

  const view = shallowRef<MatchView | null>(null)
  const live = shallowRef<LiveBattleView | null>(null)
  const simulation = shallowRef<BattleSimulation | null>(null)
  const notice = shallowRef<Notice | null>(null)
  /** The match against the computer saved on this device, for the start screen. */
  const saved = shallowRef<MatchState | null>(repository.load())
  const savedRound = computed(() => saved.value?.round ?? null)
  const selectedUid = ref<string | null>(null)
  const selectedItem = ref<number | null>(null)
  /** An opponent hero opened for a read-only look. */
  const inspectedUid = ref<string | null>(null)
  const shopTab = ref<ShopTab>('heroes')
  const rerolls = ref(0)
  const speed = useLocalStorage<BattleSpeed>(STORAGE_KEYS.speed, 2)
  /** Set while this match is an online duel. */
  const duel = shallowRef<DuelBinding | null>(null)
  /** The board is sent and the other player's has not arrived yet; planning is locked meanwhile. */
  const awaiting = ref(false)

  const duelClock = useLocalStorage<DuelClock | null>(STORAGE_KEYS.duelClock, null, {
    serializer: StorageSerializers.object,
  })

  const phase = computed(() => view.value?.phase ?? null)
  const isDuel = computed(() => duel.value !== null)
  const isPlanning = computed(() => phase.value === 'planning' && !awaiting.value)

  /** When the duel's planning runs out, the summary included; null outside a duel and during its battle. */
  const planningEndsAt = computed(() =>
    duel.value && duelClock.value && (phase.value === 'planning' || phase.value === 'summary')
      ? duelClock.value.planningEndsAt
      : null,
  )

  const selected = computed(() =>
    view.value && selectedUid.value ? locateHero(view.value.human, selectedUid.value) : null,
  )

  const inspected = computed(() =>
    view.value && inspectedUid.value ? locateHero(view.value.opponent, inspectedUid.value) : null,
  )

  const hasSelection = computed(
    () => selectedUid.value !== null || selectedItem.value !== null || inspectedUid.value !== null,
  )

  /** A hero or item card is on screen: stash items can only be picked while planning. */
  const showsCard = computed(
    () =>
      selected.value !== null ||
      inspected.value !== null ||
      (selectedItem.value !== null && isPlanning.value),
  )

  function refresh() {
    view.value = match ? toMatchView(match) : null

    if (selectedUid.value && !selected.value) {
      selectedUid.value = null
    }

    if (inspectedUid.value && !inspected.value) {
      inspectedUid.value = null
    }

    if (selectedItem.value !== null && !view.value?.human.stash[selectedItem.value]) {
      selectedItem.value = null
    }

    persist()
  }

  function persist() {
    if (!match) {
      return
    }

    if (duel.value) {
      if (match.phase === 'finished') {
        duelRepository.clear()
      } else {
        duelRepository.save(match.snapshot())
      }

      return
    }

    if (match.phase === 'finished') {
      repository.clear()
      saved.value = null

      return
    }

    const state = match.snapshot()
    repository.save(state)
    saved.value = state
  }

  function notify(input: NoticeInput) {
    notice.value = {
      ...input,
      id: ++noticeSeq,
    }
  }

  function apply<T>(result: Result<T, DomainError>) {
    refresh()

    if (result.isOk()) {
      return result.value
    }

    notify({
      kind: 'error',
      error: result.error,
    })

    return undefined
  }

  function clearSelection() {
    selectedUid.value = null
    selectedItem.value = null
    inspectedUid.value = null
  }

  function newMatch(mode: ModeId = settings.mode) {
    disposeBattle()
    profile.forgetLast()
    duel.value = null

    match = createMatch({
      difficulty: settings.difficulty,
      mode,
    })

    clearSelection()
    shopTab.value = 'heroes'
    refresh()
  }

  function continueMatch() {
    const state = repository.load()
    if (!state) {
      return newMatch()
    }

    disposeBattle()
    profile.forgetLast()
    duel.value = null
    match = restoreMatch(state, { difficulty: settings.difficulty })
    clearSelection()
    refresh()

    if (match.phase === 'battle' && match.pendingBattle) {
      launchBattle(match.pendingBattle)
    }
  }

  /** Starts an online duel; the solo match stays saved and can be continued later. */
  function startDuel(binding: DuelBinding, link: RemoteLink, mode: ModeId) {
    disposeBattle()
    profile.forgetLast()
    duel.value = binding
    awaiting.value = false

    match = createMatch({
      link,
      mode,
    })

    duelClock.value = {
      seed: link.seed,
      round: 1,
      battleStartedAt: null,
      planningEndsAt: secondsFromNow(DUEL_PLANNING_SECONDS),
    }

    clearSelection()
    shopTab.value = 'heroes'
    refresh()
  }

  /** The duel saved on this device, if it belongs to the given seed. */
  function savedDuel(seed: string) {
    const state = duelRepository.load()

    return state?.link?.seed === seed ? state : null
  }

  function resumeDuel(binding: DuelBinding, state: MatchState) {
    disposeBattle()
    profile.forgetLast()
    duel.value = binding
    awaiting.value = false
    match = restoreMatch(state)

    /* A clock saved for this round lets a battle interrupted by a reload pick up where it would be by now. */
    const clock = duelClock.value
    if (!clock || clock.seed !== state.link?.seed || clock.round !== state.round) {
      duelClock.value = {
        seed: state.link?.seed ?? '',
        round: state.round,
        battleStartedAt: state.phase === 'battle' ? Date.now() : null,
        planningEndsAt: secondsFromNow(
          DUEL_PLANNING_SECONDS + (state.phase === 'summary' ? DUEL_SUMMARY_SECONDS : 0),
        ),
      }
    }

    clearSelection()
    refresh()

    if (match.phase === 'battle' && match.pendingBattle) {
      launchBattle(match.pendingBattle)
    }
  }

  /** Sends the board and fights once the other one arrives. */
  async function fightDuel(timedOut: boolean) {
    const binding = duel.value
    const current = match
    if (!binding || !current || current.phase !== 'planning' || awaiting.value) {
      return
    }

    if (current.human.roster.boardCount === 0) {
      if (!timedOut) {
        notify({
          kind: 'error',
          error: { code: 'emptyBoard' },
        })

        return
      }

      arrangeStrongestLineup(current.human, optimizer)
    }

    awaiting.value = true
    clearSelection()
    refresh()

    try {
      const theirs = await binding.exchange(current.round, current.human.snapshot())
      if (match !== current) {
        return
      }

      apply(current.receiveOpponent(theirs))
      const setup = apply(current.startBattle({ allowEmptyBoard: true }))
      if (setup) {
        startDuelBattle()
        launchBattle(setup)
      }
    } catch {
      /* The duel store explains what went wrong and ends the duel when it cannot go on. */
    } finally {
      if (match === current) {
        awaiting.value = false
      }
    }
  }

  function buy(slot: number) {
    if (!match || !isPlanning.value) {
      return
    }

    const purchase = apply(match.human.buy(slot))
    for (const hero of purchase?.promoted ?? []) {
      notify({
        kind: 'promoted',
        heroId: hero.heroId,
        stars: hero.stars,
      })
    }
  }

  function buyItem(itemId: ItemId) {
    if (!match || !isPlanning.value) {
      return
    }

    if (apply(match.human.buyItem(itemId)) !== undefined) {
      notify({
        kind: 'itemBought',
        itemId,
      })
    }
  }

  function sell(uid: string) {
    if (!match || !isPlanning.value) {
      return
    }

    if (selectedUid.value === uid) {
      selectedUid.value = null
    }

    apply(match.human.sell(uid))
  }

  function sellItem(index: number) {
    if (!match || !isPlanning.value) {
      return
    }

    selectedItem.value = null
    apply(match.human.sellItem(index))
  }

  function equip(index: number, uid: string) {
    if (!match || !isPlanning.value) {
      return
    }

    selectedItem.value = null
    apply(match.human.equip(index, uid))
  }

  function unequip(uid: string, itemIndex: number) {
    if (match && isPlanning.value) {
      apply(match.human.unequip(uid, itemIndex))
    }
  }

  function reroll() {
    if (!match || !isPlanning.value) {
      return
    }

    if (apply(match.human.reroll()) !== undefined) {
      rerolls.value++
    }
  }

  function buyXp() {
    if (match && isPlanning.value) {
      apply(match.human.buyXp())
    }
  }

  function move(uid: string, slot: RosterSlot) {
    if (!match || !isPlanning.value) {
      return
    }

    selectedUid.value = null
    apply(match.human.move(uid, slot))
  }

  /** Clicking a hero equips the selected item, swaps with the selected hero or toggles selection. */
  function select(uid: string) {
    if (selectedItem.value !== null) {
      return equip(selectedItem.value, uid)
    }

    inspectedUid.value = null
    const current = selected.value
    const human = view.value?.human
    const target = human ? locateHero(human, uid) : null
    if (
      match &&
      isPlanning.value &&
      current &&
      target &&
      current.hero.uid !== uid &&
      current.slot !== target.slot
    ) {
      selectedUid.value = null
      apply(match.human.swap(current.hero.uid, uid))

      return
    }

    selectedUid.value = selectedUid.value === uid ? null : uid
  }

  function inspect(uid: string) {
    selectedUid.value = null
    selectedItem.value = null
    inspectedUid.value = inspectedUid.value === uid ? null : uid
  }

  function selectItem(index: number) {
    selectedUid.value = null
    inspectedUid.value = null
    selectedItem.value = selectedItem.value === index ? null : index
  }

  function placeSelected(slot: RosterSlot) {
    if (selectedUid.value) {
      move(selectedUid.value, slot)
    }
  }

  function autoArrange() {
    if (!match || !isPlanning.value) {
      return
    }

    const layout = () => JSON.stringify(match!.human.roster.lineup())
    const before = layout()
    arrangeStrongestLineup(match.human, optimizer)
    clearSelection()
    refresh()

    notify({
      kind: 'arranged',
      changed: layout() !== before,
    })
  }

  function startBattle() {
    if (!match) {
      return
    }

    if (duel.value) {
      void fightDuel(false)

      return
    }

    const setup = apply(match.startBattle())
    if (setup) {
      launchBattle(setup)
    }
  }

  /** The planning timer ran out: place whoever is on the bench if the map is empty and fight anyway. */
  function startBattleOnTimeout() {
    /* A duel's clock also covers the summary: a coach still reading it is taken back to the shop. */
    if (duel.value && phase.value === 'summary') {
      nextRound()
    }

    if (!match || !isPlanning.value) {
      return
    }

    if (duel.value) {
      notify({ kind: 'timeUp' })
      void fightDuel(true)

      return
    }

    if (match.human.roster.boardCount === 0) {
      arrangeStrongestLineup(match.human, optimizer)
    }

    const setup = apply(match.startBattle({ allowEmptyBoard: true }))
    if (!setup) {
      return
    }

    notify({ kind: 'timeUp' })
    launchBattle(setup)
  }

  const liveView = (sim: BattleSimulation) => toLiveBattleView(sim, match?.side ?? 0)

  function launchBattle(setup: BattleSetup) {
    const sim = markRaw(new BattleSimulation(setup))
    session = new BattleSession(sim)
    simulation.value = sim
    clearSelection()
    live.value = liveView(sim)
  }

  /** Keeps the start of a battle already under way, so a board sent again after a reload does not restart it. */
  function startDuelBattle() {
    const clock = duelClock.value
    if (clock) {
      duelClock.value = {
        ...clock,
        battleStartedAt: clock.battleStartedAt ?? Date.now(),
      }
    }
  }

  /** Both devices end the battle at the same moment, so the next planning runs out for both at once. */
  function scheduleNextPlanning(battleSeconds: number) {
    const clock = duelClock.value
    if (!clock) {
      return
    }

    const endedAt = (clock.battleStartedAt ?? Date.now()) + (battleSeconds / DUEL_BATTLE_SPEED) * 1000

    duelClock.value = {
      ...clock,
      planningEndsAt: endedAt + (DUEL_SUMMARY_SECONDS + DUEL_PLANNING_SECONDS) * 1000,
    }
  }

  function tick(realSeconds: number) {
    if (!session || phase.value !== 'battle') {
      return
    }

    const startedAt = duel.value ? duelClock.value?.battleStartedAt : null
    if (startedAt) {
      session.catchUp(((Date.now() - startedAt) / 1000) * DUEL_BATTLE_SPEED)
    } else {
      session.advance(realSeconds, speed.value)
    }

    liveCountdown -= realSeconds

    if (liveCountdown <= 0 || session.isOver) {
      liveCountdown = LIVE_REFRESH_SECONDS
      live.value = liveView(session.simulation)
    }

    if (session.isOver) {
      finishBattle()
    }
  }

  function skipBattle() {
    if (!session || phase.value !== 'battle') {
      return
    }

    session.finish()
    finishBattle()
  }

  function finishBattle() {
    if (!match || !session) {
      return
    }

    live.value = liveView(session.simulation)

    if (duel.value) {
      scheduleNextPlanning(session.simulation.elapsed)
    }

    apply(match.finishBattle(session.simulation.outcome()))

    if (match.phase !== 'finished') {
      return
    }

    const binding = duel.value
    binding?.finish(match.result?.winner ?? null)
    profile.record(match, binding)
  }

  /**
   * Counts a duel that ended before its last battle: given up, or claimed after a coach went silent.
   * The one on screen is finished in place and shows its report; one saved here is finished from the save,
   * and one played elsewhere is still recorded, only without stats.
   */
  function settleDuel(ended: SettledDuel) {
    const loser: TeamId = ended.won ? 1 : 0

    const info = {
      id: ended.id,
      opponentName: ended.opponentName,
    }

    if (match && duel.value?.id === ended.id) {
      if (match.phase === 'finished') {
        return
      }

      disposeBattle()
      awaiting.value = false
      apply(match.forfeit(loser))
      profile.record(match, info)

      return
    }

    const saved = savedDuel(ended.seed)

    const settled = saved
      ? restoreMatch(saved)
      : createMatch({
          link: {
            seed: ended.seed,
            side: 0,
          },
        })

    if (saved) {
      duelRepository.clear()
    }

    if (settled.forfeit(loser).isOk()) {
      profile.record(settled, info)
    }
  }

  function nextRound() {
    if (!match) {
      return
    }

    disposeBattle()
    apply(match.nextRound())

    const clock = duelClock.value
    if (duel.value && clock) {
      duelClock.value = {
        ...clock,
        round: match.round,
        battleStartedAt: null,
      }
    }
  }

  function leaveToMenu() {
    disposeBattle()

    if (duel.value) {
      duelRepository.clear()
      duelClock.value = null
    }

    duel.value = null
    awaiting.value = false
    match = null
    view.value = null
    saved.value = repository.load()
  }

  function disposeBattle() {
    session?.dispose()
    session = null
    simulation.value = null
    live.value = null
  }

  return {
    view,
    live,
    simulation,
    notice,
    saved,
    savedRound,
    selectedUid,
    selectedItem,
    selected,
    inspectedUid,
    inspected,
    hasSelection,
    showsCard,
    shopTab,
    rerolls,
    speed,
    phase,
    isPlanning,
    isDuel,
    duel,
    awaiting,
    planningEndsAt,
    newMatch,
    continueMatch,
    startDuel,
    savedDuel,
    resumeDuel,
    settleDuel,
    leaveToMenu,
    buy,
    buyItem,
    sell,
    sellItem,
    equip,
    unequip,
    reroll,
    buyXp,
    move,
    select,
    inspect,
    selectItem,
    clearSelection,
    placeSelected,
    autoArrange,
    startBattle,
    startBattleOnTimeout,
    tick,
    skipBattle,
    nextRound,
  }
})
