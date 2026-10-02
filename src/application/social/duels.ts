import type { ModeId, TeamId } from '@/content/ids'
import type { CoachCard } from './friends'
import type { ReactionId, ReactionLink } from './reactions'

export type DuelStatus =
  'invited' | 'declined' | 'cancelled' | 'expired' | 'active' | 'finished' | 'disputed' | 'abandoned'

export type DuelEnding = 'result' | 'forfeit' | 'timeout'

export interface Duel {
  readonly id: string
  /** The inviting coach; fights as team 0. */
  readonly host: string
  readonly guest: string
  readonly status: DuelStatus
  /** Picked by the inviting coach. */
  readonly mode: ModeId
  /** Set once the invite is accepted; both devices derive the battles from it. */
  readonly seed: string | null
  /** The round both coaches are planning now. */
  readonly round: number
  readonly roundOpenedAt: string | null
  /** The last round each side sent a board for. */
  readonly boardRounds: readonly [number, number]
  readonly winner: string | null
  readonly endedBy: DuelEnding | null
  readonly createdAt: string
}

/** An open invite or active duel, with the other coach's card. */
export interface DuelEntry {
  readonly duel: Duel
  readonly opponent: CoachCard
}

export type DuelFailure = 'busy' | 'gone' | 'rateLimited' | 'forbidden' | 'tooEarly' | 'wrongRound' | 'failed'

export class DuelError extends Error {
  constructor(readonly reason: DuelFailure) {
    super(`Duel request failed: ${reason}`)
  }
}

/** How long an invite waits for an answer. */
export const INVITE_SECONDS = 60

/** How long a round may run before a waiting coach can claim the win; the server has the final say. */
export const ROUND_TIMEOUT_SECONDS = 180

/** Online duels of the signed-in coach. Every call rejects with a DuelError. */
export interface DuelService {
  /** Joins or renews a short-lived queue entry; returns the match once paired. */
  findMatch(mode: ModeId, balance: string): Promise<string | null>
  /** Cancels searching, or returns a duel that was paired just before cancellation. */
  leaveQueue(): Promise<string | null>
  invite(friendId: string, mode: ModeId): Promise<string>
  respond(duelId: string, accept: boolean): Promise<void>
  cancel(duelId: string): Promise<void>
  /** Open invites and active duels. */
  mine(): Promise<DuelEntry[]>
  /** Any duel of this coach, however it ended; null if there is none with this id. */
  find(duelId: string): Promise<Duel | null>
  /** Sends this side's board; resolves with the other side's once it is in, or null until then. */
  submitBoard(duelId: string, round: number, board: unknown): Promise<unknown>
  /** The other side's board for a round, once this side has sent its own. */
  opponentBoard(duelId: string, round: number): Promise<unknown>
  /** Takes this side's board back while the other side has not sent theirs; false once both are in. */
  withdrawBoard(duelId: string, round: number): Promise<boolean>
  /** The result this device replayed: the winning side, null for a draw, and whether the throne fell. */
  report(duelId: string, winningSide: TeamId | null, byThrone: boolean): Promise<void>
  forfeit(duelId: string): Promise<void>
  claim(duelId: string): Promise<void>
  /** Calls back when an invite arrives or a duel changes. Returns a function that stops listening. */
  watch(onChange: (duel: Duel) => void): () => void
  /** Calls back when the other side's board for a round becomes readable. */
  /** Quick reactions with the other player; nothing is stored. */
  reactions(duelId: string, onReaction: (reaction: ReactionId) => void): ReactionLink
}

/** The team a coach fights as in a duel. */
export const sideOf = (duel: Duel, coachId: string): TeamId => (duel.host === coachId ? 0 : 1)

export const opponentIdOf = (duel: Duel, coachId: string) => (duel.host === coachId ? duel.guest : duel.host)
