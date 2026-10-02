import type { ModeId } from '@/content/ids'
import type { CoachCard } from './friends'

/** Public identity and server rating only; account and profile details are never included. */
export interface LeaderboardEntry extends CoachCard {
  readonly position: number
}

export interface LeaderboardService {
  read(mode: ModeId): Promise<LeaderboardEntry[]>
}
