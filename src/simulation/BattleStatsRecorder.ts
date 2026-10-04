import { opponentOf } from '@/content/ids'
import type { PerTeam, TeamBattleStats } from '@/domain/battle/contracts'
import { emptyStructureState } from '@/domain/match/structures'
import type { SimulationEmitter } from './events'

const emptyStats = () => ({
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
      if (structure.structure) {
        this.perTeam[attackerTeam].structureDamage[structure.structure.slot] += amount
      }
    })

    /* A repair under Hold takes back the enemy's damage to that building this round, never more than it did. */
    events.on('repaired', ({ structure, amount, reclaims }) => {
      if (!reclaims || !structure.structure) {
        return
      }

      const damage = this.perTeam[opponentOf(structure.team)].structureDamage
      const slot = structure.structure.slot
      damage[slot] = Math.max(0, damage[slot] - amount)
    })
  }

  snapshot(): PerTeam<TeamBattleStats> {
    const copy = (s: TeamBattleStats) => ({
      ...s,
      structureDamage: { ...s.structureDamage },
    })

    return [copy(this.perTeam[0]), copy(this.perTeam[1])]
  }
}
