import type { CoachLevel } from '@/content/ids'
import { ROSTER } from '@/content/rules'

export class CoachProgression {
  constructor(
    private currentLevel: CoachLevel = ROSTER.startLevel,
    private currentXp = 0,
  ) {}

  get level() {
    return this.currentLevel
  }

  get xp() {
    return this.currentXp
  }

  get xpToNext() {
    return ROSTER.xpToNext[this.currentLevel]
  }

  get isMaxLevel() {
    return this.currentLevel >= ROSTER.maxLevel
  }

  gain(xp: number) {
    if (this.isMaxLevel) {
      return
    }

    this.currentXp += xp

    while (!this.isMaxLevel && this.currentXp >= this.xpToNext) {
      this.currentXp -= this.xpToNext
      this.currentLevel = (this.currentLevel + 1) as CoachLevel
    }

    if (this.isMaxLevel) {
      this.currentXp = 0
    }
  }

  restore(level: CoachLevel, xp: number) {
    this.currentLevel = level
    this.currentXp = xp
  }
}
