import { useLocalStorage } from '@vueuse/core'
import type { Result } from 'neverthrow'
import { defineStore } from 'pinia'
import { computed, markRaw, ref, shallowRef } from 'vue'
import { BattleSession } from '@/application/BattleSession'
import { subscribeFeed, type FeedEntry } from '@/application/battleFeed'
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
import { LANE_IDS, type HeroId, type ItemId, type StarLevel } from '@/content/ids'
import type { BattleSetup } from '@/domain/battle/contracts'
import { arrangeStrongestLineup } from '@/domain/coach/arrange'
import { LaneOptimizer } from '@/domain/coach/LaneOptimizer'
import type { DomainError } from '@/domain/errors'
import type { Match } from '@/domain/match/Match'
import type { RosterSlot } from '@/domain/roster/Roster'
import { BattleSimulation } from '@/simulation/BattleSimulation'

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
const FEED_LENGTH = 6

export interface LocatedHero {
  readonly hero: HeroCardView
  readonly slot: RosterSlot
}

export function locateHero(player: PlayerView, uid: string): LocatedHero | null {
  const onBench = player.bench.find((h) => h.uid === uid)
  if (onBench) return { hero: onBench, slot: 'bench' }
  for (const lane of LANE_IDS) {
    const hero = player.lanes[lane].heroes.find((h) => h.uid === uid)
    if (hero) return { hero, slot: lane }
  }
  return null
}

export const useMatchStore = defineStore('match', () => {
  const repository = new LocalStorageMatchRepository()
  const optimizer = new LaneOptimizer()
  let match: Match | null = null
  let session: BattleSession | null = null
  let stopFeed: (() => void) | null = null
  let liveCountdown = 0
  let noticeSeq = 0

  const view = shallowRef<MatchView | null>(null)
  const live = shallowRef<LiveBattleView | null>(null)
  const feed = shallowRef<readonly FeedEntry[]>([])
  const simulation = shallowRef<BattleSimulation | null>(null)
  const notice = shallowRef<Notice | null>(null)
  const savedRound = ref<number | null>(repository.load()?.round ?? null)
  const selectedUid = ref<string | null>(null)
  const selectedItem = ref<number | null>(null)
  /** An opponent hero opened for a read-only look. */
  const inspectedUid = ref<string | null>(null)
  const shopTab = ref<ShopTab>('heroes')
  const rerolls = ref(0)
  const speed = useLocalStorage<BattleSpeed>(STORAGE_KEYS.speed, 2)

  const phase = computed(() => view.value?.phase ?? null)
  const isPlanning = computed(() => phase.value === 'planning')
  const selected = computed(() =>
    view.value && selectedUid.value ? locateHero(view.value.human, selectedUid.value) : null,
  )
  const inspected = computed(() =>
    view.value && inspectedUid.value ? locateHero(view.value.opponent, inspectedUid.value) : null,
  )
  const hasSelection = computed(
    () => selectedUid.value !== null || selectedItem.value !== null || inspectedUid.value !== null,
  )

  function refresh(): void {
    view.value = match ? toMatchView(match) : null
    if (selectedUid.value && !selected.value) selectedUid.value = null
    if (inspectedUid.value && !inspected.value) inspectedUid.value = null
    if (selectedItem.value !== null && !view.value?.human.stash[selectedItem.value]) selectedItem.value = null
    persist()
  }

  function persist(): void {
    if (!match) return
    if (match.phase === 'finished') {
      repository.clear()
      savedRound.value = null
      return
    }
    repository.save(match.snapshot())
    savedRound.value = match.round
  }

  function notify(input: NoticeInput): void {
    notice.value = { ...input, id: ++noticeSeq }
  }

  function apply<T>(result: Result<T, DomainError>): T | undefined {
    refresh()
    if (result.isOk()) return result.value
    notify({ kind: 'error', error: result.error })
    return undefined
  }

  function clearSelection(): void {
    selectedUid.value = null
    selectedItem.value = null
    inspectedUid.value = null
  }

  function newMatch(): void {
    disposeBattle()
    match = createMatch()
    clearSelection()
    shopTab.value = 'heroes'
    refresh()
  }

  function continueMatch(): void {
    const state = repository.load()
    if (!state) return newMatch()
    disposeBattle()
    match = restoreMatch(state)
    clearSelection()
    refresh()
    if (match.phase === 'battle' && match.pendingBattle) launchBattle(match.pendingBattle)
  }

  function buy(slot: number): void {
    if (!match || !isPlanning.value) return
    const purchase = apply(match.human.buy(slot))
    for (const hero of purchase?.promoted ?? [])
      notify({ kind: 'promoted', heroId: hero.heroId, stars: hero.stars })
  }

  function buyItem(itemId: ItemId): void {
    if (!match || !isPlanning.value) return
    if (apply(match.human.buyItem(itemId)) !== undefined) notify({ kind: 'itemBought', itemId })
  }

  function sell(uid: string): void {
    if (!match || !isPlanning.value) return
    if (selectedUid.value === uid) selectedUid.value = null
    apply(match.human.sell(uid))
  }

  function sellItem(index: number): void {
    if (!match || !isPlanning.value) return
    selectedItem.value = null
    apply(match.human.sellItem(index))
  }

  function equip(index: number, uid: string): void {
    if (!match || !isPlanning.value) return
    selectedItem.value = null
    apply(match.human.equip(index, uid))
  }

  function unequip(uid: string, itemIndex: number): void {
    if (match && isPlanning.value) apply(match.human.unequip(uid, itemIndex))
  }

  function reroll(): void {
    if (!match || !isPlanning.value) return
    if (apply(match.human.reroll()) !== undefined) rerolls.value++
  }

  function buyXp(): void {
    if (match && isPlanning.value) apply(match.human.buyXp())
  }

  function move(uid: string, slot: RosterSlot): void {
    if (!match || !isPlanning.value) return
    selectedUid.value = null
    apply(match.human.move(uid, slot))
  }

  /** Clicking a hero equips the selected item, swaps with the selected hero or toggles selection. */
  function select(uid: string): void {
    if (selectedItem.value !== null) return equip(selectedItem.value, uid)
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

  function inspect(uid: string): void {
    selectedUid.value = null
    selectedItem.value = null
    inspectedUid.value = inspectedUid.value === uid ? null : uid
  }

  function selectItem(index: number): void {
    selectedUid.value = null
    inspectedUid.value = null
    selectedItem.value = selectedItem.value === index ? null : index
  }

  function placeSelected(slot: RosterSlot): void {
    if (selectedUid.value) move(selectedUid.value, slot)
  }

  function autoArrange(): void {
    if (!match || !isPlanning.value) return
    const layout = () => JSON.stringify(match!.human.roster.lineup())
    const before = layout()
    arrangeStrongestLineup(match.human, optimizer)
    clearSelection()
    refresh()
    notify({ kind: 'arranged', changed: layout() !== before })
  }

  function startBattle(): void {
    if (!match) return
    const setup = apply(match.startBattle())
    if (setup) launchBattle(setup)
  }

  /** The planning timer ran out: place whoever is on the bench if the map is empty and fight anyway. */
  function startBattleOnTimeout(): void {
    if (!match || !isPlanning.value) return
    if (match.human.roster.boardCount === 0) arrangeStrongestLineup(match.human, optimizer)
    const setup = apply(match.startBattle({ allowEmptyBoard: true }))
    if (!setup) return
    notify({ kind: 'timeUp' })
    launchBattle(setup)
  }

  function launchBattle(setup: BattleSetup): void {
    const sim = markRaw(new BattleSimulation(setup))
    session = new BattleSession(sim)
    simulation.value = sim
    clearSelection()
    feed.value = []
    stopFeed = subscribeFeed(sim.events, (entry) => (feed.value = [...feed.value, entry].slice(-FEED_LENGTH)))
    live.value = toLiveBattleView(sim)
  }

  function tick(realSeconds: number): void {
    if (!session || phase.value !== 'battle') return
    session.advance(realSeconds, speed.value)
    liveCountdown -= realSeconds
    if (liveCountdown <= 0 || session.isOver) {
      liveCountdown = LIVE_REFRESH_SECONDS
      live.value = toLiveBattleView(session.simulation)
    }
    if (session.isOver) finishBattle()
  }

  function skipBattle(): void {
    if (!session || phase.value !== 'battle') return
    session.finish()
    finishBattle()
  }

  function finishBattle(): void {
    if (!match || !session) return
    live.value = toLiveBattleView(session.simulation)
    apply(match.finishBattle(session.simulation.outcome()))
  }

  function nextRound(): void {
    if (!match) return
    disposeBattle()
    apply(match.nextRound())
  }

  function leaveToMenu(): void {
    disposeBattle()
    match = null
    view.value = null
    savedRound.value = repository.load()?.round ?? null
  }

  function disposeBattle(): void {
    stopFeed?.()
    stopFeed = null
    session?.dispose()
    session = null
    simulation.value = null
    live.value = null
    feed.value = []
  }

  return {
    view,
    live,
    feed,
    simulation,
    notice,
    savedRound,
    selectedUid,
    selectedItem,
    selected,
    inspectedUid,
    inspected,
    hasSelection,
    shopTab,
    rerolls,
    speed,
    phase,
    isPlanning,
    newMatch,
    continueMatch,
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
