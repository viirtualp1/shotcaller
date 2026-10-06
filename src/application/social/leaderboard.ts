import type { ModeId } from '@/content/ids'
import type { MatchRecord } from '@/domain/profile/Profile'
import type { CoachCard, CoachDossier } from './friends'

/** Public identity and server rating only; account and profile details are never included. */
export interface LeaderboardEntry extends CoachCard {
  readonly position: number
  /** Whether the coach lets anyone open their dossier; friends can open it either way. */
  readonly open: boolean
}

/** Reads without an account, so guests can browse standings and open profiles too. */
export interface LeaderboardService {
  read(mode: ModeId): Promise<LeaderboardEntry[]>
  /**
   * A coach's dossier: an open ranked profile, or a friend's. Null when the coach keeps it private, is off the
   * leaderboard, or blocked either way. Throws when the server has no dossiers yet.
   */
  profile(coachId: string): Promise<CoachDossier | null>
  /** One of the dossier's matches in full, without the duel opponent's name. */
  match(coachId: string, matchId: string): Promise<MatchRecord | null>
}
