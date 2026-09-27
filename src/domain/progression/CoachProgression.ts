import type { CoachLevel } from '@/content/ids'
import { ROSTER } from '@/content/rules'

export class CoachProgression {
  constructor(
    private currentLevel: CoachLevel = ROSTER.startLevel,
    private currentXp = 0,
  ) {}

  get level(): CoachLevel {
    return this.currentLevel
  }

  get xp(): number {
    return this.currentXp
  }

  get xpToNext(): number {
    return ROSTER.xpToNext[this.currentLevel]
  }

  get isMaxLevel(): boolean {
    return this.currentLevel >= ROSTER.maxLevel
  }

  gain(xp: number): void {
    if (this.isMaxLevel) return
    this.currentXp += xp
    while (!this.isMaxLevel && this.currentXp >= this.xpToNext) {
      this.currentXp -= this.xpToNext
      this.currentLevel = (this.currentLevel + 1) as CoachLevel
    }
    if (this.isMaxLevel) this.currentXp = 0
  }

  restore(level: CoachLevel, xp: number): void {
    this.currentLevel = level
    this.currentXp = xp
  }
}
