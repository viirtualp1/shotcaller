/** What other players see of a coach. */
export interface CoachCard {
  readonly id: string
  readonly name: string
  /** A hero id; null until the coach picks one. */
  readonly avatar: string | null
  readonly rating: number
}

export interface OwnCard extends CoachCard {
  readonly friendCode: string
}

export type FriendStatus = 'friend' | 'incoming' | 'outgoing'

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
  respond(coachId: string, accept: boolean): Promise<void>
  /** Unfriends, or takes back a request that was not answered yet. */
  remove(coachId: string): Promise<void>
  /** Ends any friendship and conversation and stops requests and messages both ways; they are not told. */
  block(coachId: string): Promise<void>
  unblock(coachId: string): Promise<void>
  blocked(): Promise<CoachCard[]>
  /** Calls back when a request arrives or is accepted. Returns a function that stops listening. */
  watch(onChange: () => void): () => void
  /** Marks the coach online and reports who else is. Returns a function that goes offline. */
  presence(onChange: (online: ReadonlySet<string>) => void): () => void
}

const CODE_LENGTH = 8

/** Accepts any spacing, dashes or case a player may type or paste. */
export const normalizeFriendCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '')

export const isFriendCode = (input: string) => /^[A-HJ-NP-Z2-9]{8}$/.test(normalizeFriendCode(input))

export const formatFriendCode = (code: string) =>
  `${code.slice(0, CODE_LENGTH / 2)}-${code.slice(CODE_LENGTH / 2)}`
