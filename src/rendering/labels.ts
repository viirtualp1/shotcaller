import type { LaneId, TeamId } from '@/content/ids'

/** Localised strings the renderer needs; supplied by the UI so rendering stays i18n-agnostic. */
export interface BoardLabels {
  laneName(id: LaneId): string
  baseName(team: TeamId): string
}
