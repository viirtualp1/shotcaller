import type { HeroId, ModeId, StarLevel } from '@/content/ids'
import type { Difficulty } from '@/content/rules'
import type { MatchRecord, ModeRatings } from '@/domain/profile/Profile'
import type { LiveMatch } from './liveMatch'

/** What other players see of a coach. */
export interface CoachCard {
  readonly id: string
  readonly name: string
  /** A hero id; null until the coach picks one. */
  readonly avatar: string | null
  /** The Google account picture, when the coach shows it instead of a hero. */
  readonly photo: string | null
  readonly rating: number
}

export interface OwnCard extends CoachCard {
  readonly friendCode: string
}

export type FriendStatus = 'friend' | 'incoming' | 'outgoing'

/** What an online coach is doing, as their friends see it. */
export type Activity = 'menu' | 'match' | 'duel'

export interface PresenceStatus {
  readonly activity: Activity
  /** The round being played, in a match or a duel. */
  readonly round: number | null
}

/** A finished match as a friend's profile shows it. */
export interface MatchSummary {
  readonly id: string
  readonly playedAt: string
  readonly mode: ModeId
  /** Against another coach rather than the computer; who it was stays private. */
  readonly duel: boolean
  readonly difficulty: Difficulty
  readonly verdict: 'win' | 'loss' | 'draw'
  readonly rounds: number
  readonly roundsWon: number
  readonly roundsLost: number
  readonly lineup: readonly { readonly heroId: HeroId; readonly stars: StarLevel }[]
  readonly mvp: HeroId | null
  readonly ratingBefore: number
  readonly ratingAfter: number
  readonly xp: number
}

export interface FriendProfile extends CoachCard {
  readonly ratings: ModeRatings
  readonly peakRating: number
  readonly xp: number
  /** Null for a coach who has not saved a profile yet. */
  readonly totals: {
    readonly matches: number
    readonly wins: number
    readonly losses: number
    readonly draws: number
    readonly bestWinStreak: number
  } | null
  /** Newest first. */
  readonly recent: readonly MatchSummary[]
}

/** Online status as friends see it. */
export interface Presence {
  /** Who is online and what they are doing. */
  onChange(listener: (online: ReadonlyMap<string, PresenceStatus>) => void): void
  /** Tells friends what this coach is doing now. */
  update(status: PresenceStatus): void
  leave(): void
}

export interface FriendEntry extends CoachCard {
  readonly status: FriendStatus
  /** When the request was sent, or when it was accepted. */
  readonly since: string
}

/** `cooldown`: they declined a request from us less than a week ago. */
export type FriendRequestResult = 'sent' | 'accepted' | 'friends' | 'notFound' | 'self' | 'limit' | 'cooldown'

/** Friends of the signed-in coach. Needs an email or Google account; guests have none. */
export interface FriendsService {
  card(): Promise<OwnCard>
  list(): Promise<FriendEntry[]>
  request(code: string): Promise<FriendRequestResult>
  /** Sends a request to a ranked coach without revealing their private friend code. */
  requestLeaderboard(coachId: string): Promise<FriendRequestResult>
  respond(coachId: string, accept: boolean): Promise<void>
  /** Unfriends, or takes back a request that was not answered yet. */
  remove(coachId: string): Promise<void>
  /** Ends any friendship and conversation and stops requests and messages both ways; they are not told. */
  block(coachId: string): Promise<void>
  unblock(coachId: string): Promise<void>
  blocked(): Promise<CoachCard[]>
  /** Publishes the Google picture for friends, or clears it when a hero is shown instead. */
  setPhoto(url: string | null): Promise<void>
  /** A friend's rank, totals and latest matches; null when they are not a friend (any more). */
  profile(coachId: string): Promise<FriendProfile | null>
  /** One of those matches in full, without the duel opponent's name; null when it is not there any more. */
  match(coachId: string, matchId: string): Promise<MatchRecord | null>
  /** Returns whether a friend is currently watching. */
  publishLiveMatch(snapshot: LiveMatch | null): Promise<boolean>
  /** A small heartbeat while nobody watches; null means the stored snapshot has expired. */
  keepLiveMatch(): Promise<boolean | null>
  liveMatch(coachId: string): Promise<LiveMatch | null>
  /** Calls back when a request arrives or is accepted. Returns a function that stops listening. */
  watch(onChange: () => void): () => void
  /** Marks the coach online with the given status. */
  presence(status: PresenceStatus): Presence
}

const CODE_LENGTH = 8

/** An https address of a Google account picture, or nothing. */
export const coachPhoto = (url: string | null | undefined): string | null =>
  url && url.length <= 2048 && url.startsWith('https://') ? url : null

/** Accepts any spacing, dashes or case a player may type or paste. */
export const normalizeFriendCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '')

export const isFriendCode = (input: string) => /^[A-HJ-NP-Z2-9]{8}$/.test(normalizeFriendCode(input))

export const formatFriendCode = (code: string) =>
  `${code.slice(0, CODE_LENGTH / 2)}-${code.slice(CODE_LENGTH / 2)}`
