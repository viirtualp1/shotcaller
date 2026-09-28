import type { CoachLevel } from '@/content/ids'
import type { LevelRules } from '@/content/modes'

/** Coach level and XP; every coach starts at level 1 of the mode's table. */
export class CoachProgression {
  constructor(
    private readonly levels: readonly LevelRules[],
    private currentLevel: CoachLevel = 1,
    private currentXp = 0,
  ) {}

  get level() {
    return this.currentLevel
  }

  get xp() {
    return this.currentXp
  }

  get maxLevel() {
    return this.levels.length
  }

  get rules() {
    return this.levels[Math.min(this.currentLevel, this.maxLevel) - 1]!
  }

  get xpToNext() {
    return this.rules.xpToNext
  }

  get isMaxLevel() {
    return this.currentLevel >= this.maxLevel
  }

  gain(xp: number) {
    if (this.isMaxLevel) {
      return
    }

    this.currentXp += xp

    while (!this.isMaxLevel && this.currentXp >= this.xpToNext) {
      this.currentXp -= this.xpToNext
      this.currentLevel++
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
