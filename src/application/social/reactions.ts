/** Quick reactions in a duel, like a chat wheel: a fixed set, so nothing but these can ever be sent. */
export const REACTIONS = [
  {
    id: 'gg',
    emoji: '🤝',
  },
  {
    id: 'nice',
    emoji: '👍',
  },
  {
    id: 'wow',
    emoji: '😮',
  },
  {
    id: 'lol',
    emoji: '😂',
  },
  {
    id: 'oops',
    emoji: '😅',
  },
  {
    id: 'grr',
    emoji: '😤',
  },
  {
    id: 'fire',
    emoji: '🔥',
  },
  {
    id: 'hmm',
    emoji: '🤔',
  },
] as const

export type ReactionId = (typeof REACTIONS)[number]['id']

export const REACTION_IDS: readonly ReactionId[] = REACTIONS.map((reaction) => reaction.id)

export const isReactionId = (value: unknown): value is ReactionId =>
  typeof value === 'string' && (REACTION_IDS as readonly string[]).includes(value)

export const reactionEmoji = (id: ReactionId) => REACTIONS.find((reaction) => reaction.id === id)!.emoji

/** A reaction on its way to the other player and back from them. */
export interface ReactionLink {
  send(reaction: ReactionId): void
  leave(): void
}
