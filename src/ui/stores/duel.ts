import { useIntervalFn, useNow } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, shallowRef, watch } from 'vue'
import { parseRemoteBoard } from '@/application/persistence/snapshot'
import {
  DuelError,
  INVITE_SECONDS,
  ROUND_TIMEOUT_SECONDS,
  sideOf,
  type Duel,
  type DuelEntry,
  type DuelFailure,
  type DuelService,
} from '@/application/social/duels'
import { opponentOf, type TeamId } from '@/content/ids'
import type { PlayerState } from '@/domain/player/Player'
import { useCloudStore } from './cloud'
import { useMatchStore, type DuelBinding } from './match'

/** Realtime should bring the other board; this is the safety net if a message is lost. */
const BOARD_POLL_MS = 5000

export type DuelNotice =
  | { readonly kind: 'failure'; readonly reason: DuelFailure }
  | { readonly kind: 'declined' | 'expired' | 'cancelled'; readonly name: string }
  | { readonly kind: 'ended'; readonly how: 'forfeit' | 'timeout' | 'disputed'; readonly won: boolean }
  | { readonly kind: 'badBoard' }

interface PendingBoard {
  readonly duelId: string
  readonly round: number
  readonly resolve: (board: PlayerState) => void
  readonly reject: (error: Error) => void
}

const secondsSince = (iso: string | null, now: number) => (iso ? (now - Date.parse(iso)) / 1000 : 0)

/** Online duels with friends: invites, the running duel and how it ends. */
export const useDuelStore = defineStore('duel', () => {
  const cloud = useCloudStore()
  const matchStore = useMatchStore()
  const now = useNow({ scheduler: (tick) => useIntervalFn(tick, 1000) })

  /** An invite waiting for this coach's answer. */
  const incoming = shallowRef<DuelEntry | null>(null)
  /** This coach's invite waiting for the friend's answer. */
  const outgoing = shallowRef<DuelEntry | null>(null)
  /** The duel being played. */
  const active = shallowRef<DuelEntry | null>(null)
  /** A duel still running on the server that this device can pick up again after a reload. */
  const resumable = shallowRef<DuelEntry | null>(null)
  const notice = shallowRef<DuelNotice | null>(null)

  let service: DuelService | null = null
  let userId: string | null = null
  let stops: (() => void)[] = []
  let stopBoards: (() => void) | null = null
  let pending: PendingBoard | null = null
  let generation = 0

  const mySide = computed(() => (active.value && userId ? sideOf(active.value.duel, userId) : 0))

  /** The other coach has sent their board for the round being planned. */
  const opponentReady = computed(() => {
    const entry = active.value
    const round = matchStore.view?.round
    if (!entry || round === undefined) {
      return false
    }

    return entry.duel.boardRounds[opponentOf(mySide.value)] >= round
  })

  /** Waiting on a coach who went quiet for longer than a round may take. */
  const canClaim = computed(() => {
    const entry = active.value
    if (!entry || !matchStore.awaiting || opponentReady.value) {
      return false
    }

    return secondsSince(entry.duel.roundOpenedAt, now.value.getTime()) > ROUND_TIMEOUT_SECONDS
  })

  /** The clock ticks once a second, so it can lag a fresh invite by a moment; the count never starts above the limit. */
  const inviteSecondsLeft = (entry: DuelEntry | null) => {
    if (!entry) {
      return 0
    }

    const left = Math.ceil(INVITE_SECONDS - secondsSince(entry.duel.createdAt, now.value.getTime()))

    return Math.min(INVITE_SECONDS, Math.max(0, left))
  }

  const busy = computed(() => active.value !== null || outgoing.value !== null)

  /** The resumable duel was saved on this device; otherwise it can only be given up. */
  const canResume = computed(() => {
    const seed = resumable.value?.duel.seed

    return seed ? matchStore.savedDuel(seed) !== null : false
  })

  function fail(error: unknown) {
    notice.value = {
      kind: 'failure',
      reason: error instanceof DuelError ? error.reason : 'failed',
    }
  }

  /** Invites time out on the server; the dialogs close on their own a little after. */
  watch(now, () => {
    if (incoming.value && inviteSecondsLeft(incoming.value) === 0) {
      incoming.value = null
    }

    if (outgoing.value && inviteSecondsLeft(outgoing.value) === 0) {
      notice.value = {
        kind: 'expired',
        name: outgoing.value.opponent.name,
      }

      outgoing.value = null
    }
  })

  async function load() {
    if (!service || !userId) {
      return
    }

    const me = userId
    const entries = await service.mine()

    incoming.value = entries.find((e) => e.duel.status === 'invited' && e.duel.guest === me) ?? null
    outgoing.value = entries.find((e) => e.duel.status === 'invited' && e.duel.host === me) ?? null

    /* A duel running elsewhere (another tab or device) is offered, never ended on its own. */
    const running = entries.find((e) => e.duel.status === 'active') ?? null
    resumable.value = running && running.duel.id !== active.value?.duel.id ? running : null
  }

  function rejectPending(reason: string) {
    pending?.reject(new Error(reason))
    pending = null
  }

  function stopDuel() {
    stopBoards?.()
    stopBoards = null
    rejectPending('duel stopped')
    active.value = null
  }

  function checkBoard(raw: unknown) {
    const board = parseRemoteBoard(raw)
    const mine = new Set(matchStore.view ? matchStore.view.human.bench.map((h) => h.uid) : [])

    for (const lane of Object.values(matchStore.view?.human.lanes ?? {})) {
      for (const hero of lane.heroes) {
        mine.add(hero.uid)
      }
    }

    const theirs = board ? [...board.roster.bench, ...Object.values(board.roster.lanes).flat()] : []
    if (!board || theirs.some((hero) => mine.has(hero.uid))) {
      return null
    }

    return board
  }

  /** The other board is unusable: say so, keep our result on record and leave the duel. */
  function rejectBoard(duelId: string) {
    notice.value = { kind: 'badBoard' }
    void service?.report(duelId, mySide.value).catch(() => undefined)
    stopDuel()
    matchStore.leaveToMenu()
  }

  function deliver(raw: unknown) {
    const waiting = pending
    if (!waiting) {
      return
    }

    pending = null
    const board = checkBoard(raw)

    if (board) {
      waiting.resolve(board)
    } else {
      waiting.reject(new Error('bad board'))
      rejectBoard(waiting.duelId)
    }
  }

  async function exchange(duelId: string, round: number, board: PlayerState) {
    if (!service) {
      throw new DuelError('failed')
    }

    let theirs: unknown

    try {
      theirs = await service.submitBoard(duelId, round, board)
    } catch (error) {
      fail(error)

      throw error
    }

    if (theirs !== null) {
      const accepted = checkBoard(theirs)
      if (!accepted) {
        rejectBoard(duelId)

        throw new Error('bad board')
      }

      return accepted
    }

    return new Promise<PlayerState>((resolve, reject) => {
      pending = {
        duelId,
        round,
        resolve,
        reject,
      }
    })
  }

  useIntervalFn(async () => {
    const waiting = pending
    if (!waiting || !service) {
      return
    }

    const theirs = await service.opponentBoard(waiting.duelId, waiting.round).catch(() => null)
    if (theirs !== null && pending === waiting) {
      deliver(theirs)
    }
  }, BOARD_POLL_MS)

  function report(duelId: string, winner: TeamId | null) {
    const side = mySide.value
    const winningSide = winner === null ? null : winner === 0 ? side : opponentOf(side)
    void service?.report(duelId, winningSide).catch(() => undefined)
  }

  function binding(entry: DuelEntry): DuelBinding {
    return {
      id: entry.duel.id,
      opponentName: entry.opponent.name,
      exchange: (round, board) => exchange(entry.duel.id, round, board),
      finish: (winner) => report(entry.duel.id, winner),
    }
  }

  function watchBoards(entry: DuelEntry) {
    stopBoards?.()

    stopBoards =
      service?.watchBoards(entry.duel.id, (round, side) => {
        if (pending && pending.duelId === entry.duel.id && pending.round === round && side !== mySide.value) {
          /* Realtime only says a board arrived; it is fetched through the checked function. */
          void service?.opponentBoard(entry.duel.id, round).then(
            (theirs) => theirs !== null && deliver(theirs),
            () => undefined,
          )
        }
      }) ?? null
  }

  function begin(entry: DuelEntry) {
    if (!entry.duel.seed || !userId) {
      return
    }

    outgoing.value = null
    incoming.value = null
    resumable.value = null
    active.value = entry
    watchBoards(entry)

    matchStore.startDuel(binding(entry), {
      seed: entry.duel.seed,
      side: sideOf(entry.duel, userId),
    })
  }

  /** Picks up the duel saved on this device; a board already sent is sent again and the wait goes on. */
  function resume() {
    const entry = resumable.value
    const state = entry?.duel.seed ? matchStore.savedDuel(entry.duel.seed) : null
    if (!entry || !state || !userId) {
      return
    }

    resumable.value = null
    active.value = entry
    watchBoards(entry)
    matchStore.resumeDuel(binding(entry), state)

    const sent = entry.duel.boardRounds[sideOf(entry.duel, userId)]
    if (matchStore.phase === 'planning' && sent >= (matchStore.view?.round ?? Infinity)) {
      matchStore.startBattle()
    }
  }

  function end(duel: Duel) {
    const won = duel.winner === userId
    const inMatch = matchStore.isDuel && matchStore.phase !== 'finished'

    if (duel.status === 'disputed') {
      notice.value = {
        kind: 'ended',
        how: 'disputed',
        won: false,
      }
    } else if (duel.endedBy === 'forfeit' || duel.endedBy === 'timeout') {
      notice.value = {
        kind: 'ended',
        how: duel.endedBy,
        won,
      }
    }

    stopDuel()

    if (inMatch && duel.endedBy !== 'result') {
      matchStore.leaveToMenu()
    }
  }

  function onDuel(duel: Duel) {
    if (outgoing.value?.duel.id === duel.id) {
      const opponent = outgoing.value.opponent

      if (duel.status === 'active') {
        begin({
          duel,
          opponent,
        })
      } else if (duel.status === 'declined' || duel.status === 'expired' || duel.status === 'cancelled') {
        notice.value = {
          kind: duel.status,
          name: opponent.name,
        }

        outgoing.value = null
      }

      return
    }

    if (incoming.value?.duel.id === duel.id && duel.status !== 'invited') {
      incoming.value = null

      return
    }

    if (active.value?.duel.id === duel.id) {
      active.value = {
        ...active.value,
        duel,
      }

      if (duel.status === 'finished' || duel.status === 'disputed') {
        end(duel)
      }

      return
    }

    if (duel.status === 'invited' && duel.guest === userId) {
      void load().catch(() => undefined)
    }
  }

  async function invite(friendId: string) {
    if (!service || busy.value) {
      return
    }

    try {
      await service.invite(friendId)
      await load()
    } catch (error) {
      fail(error)
    }
  }

  async function cancelInvite() {
    const entry = outgoing.value
    outgoing.value = null

    if (entry) {
      await service?.cancel(entry.duel.id).catch(fail)
    }
  }

  async function answer(accepted: boolean) {
    const entry = incoming.value
    incoming.value = null

    if (!entry || !service) {
      return
    }

    try {
      await service.respond(entry.duel.id, accepted)

      if (!accepted) {
        return
      }

      const started = (await service.mine()).find((e) => e.duel.id === entry.duel.id)
      if (started) {
        begin(started)
      }
    } catch (error) {
      fail(error)
    }
  }

  async function forfeit() {
    const entry = active.value ?? resumable.value
    stopDuel()
    resumable.value = null
    matchStore.leaveToMenu()

    if (entry) {
      await service?.forfeit(entry.duel.id).catch(fail)
    }
  }

  async function claim() {
    const entry = active.value
    if (entry) {
      await service?.claim(entry.duel.id).catch(fail)
    }
  }

  function disconnect() {
    generation++

    for (const stop of stops) {
      stop()
    }

    stops = []
    stopDuel()
    service = null
    userId = null
    incoming.value = null
    outgoing.value = null
    resumable.value = null

    if (matchStore.isDuel) {
      matchStore.leaveToMenu()
    }
  }

  async function connectAs(id: string) {
    const attempt = generation
    const cloudClient = await cloud.connect()
    if (attempt !== generation) {
      return
    }

    userId = id
    service = cloudClient.duels(id)
    stops = [service.watch(onDuel)]
    await load().catch(() => undefined)
  }

  watch(
    () => (cloud.signedIn ? cloud.account?.id : null),
    (id) => {
      disconnect()

      if (id) {
        void connectAs(id)
      }
    },
    { immediate: true },
  )

  return {
    incoming,
    outgoing,
    active,
    resumable,
    canResume,
    notice,
    busy,
    opponentReady,
    canClaim,
    inviteSecondsLeft,
    invite,
    cancelInvite,
    answer,
    resume,
    forfeit,
    claim,
  }
})
