import type { PerTeam, TeamBattleStats } from '@/domain/battle/contracts'
import { emptyStructureState } from '@/domain/match/structures'
import type { SimulationEmitter } from './events'

const emptyStats = (): TeamBattleStats => ({
  heroKills: 0,
  creepKills: 0,
  structureDamage: emptyStructureState(),
})

export class BattleStatsRecorder {
  private readonly perTeam: [TeamBattleStats, TeamBattleStats] = [emptyStats(), emptyStats()]

  constructor(events: SimulationEmitter) {
    events.on('heroKilled', ({ killer }) => this.perTeam[killer.team].heroKills++)
    events.on('creepKilled', ({ killer }) => this.perTeam[killer.team].creepKills++)
    events.on('structureDamaged', ({ structure, amount, attackerTeam }) => {
      this.perTeam[attackerTeam].structureDamage[structure.structure?.lane ?? 'throne'] += amount
    })
  }

  snapshot(): PerTeam<TeamBattleStats> {
    const copy = (s: TeamBattleStats): TeamBattleStats => ({
      ...s,
      structureDamage: { ...s.structureDamage },
    })
    return [copy(this.perTeam[0]), copy(this.perTeam[1])]
  }
}
