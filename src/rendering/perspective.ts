import type { Container } from 'pixi.js'
import type { TeamId } from '@/content/ids'
import { seenFrom } from '@/domain/battle/mirror'

/**
 * Whose side the board is drawn from. Online, the guest fights as team 1: their board is drawn transposed
 * (x and y swapped), which moves their base to the bottom-left corner and keeps every lane where it is.
 * Views receive teams as the viewer sees them, 0 being the viewer's own, so colours and hit tests stay as they are.
 */
export class Perspective {
  constructor(readonly side: TeamId = 0) {}

  get mirrored() {
    return this.side === 1
  }

  /** A battle team as the viewer sees it. */
  seen(team: TeamId) {
    return seenFrom(this.side, team)
  }

  /** A team as the viewer sees it, back in battle order; the swap is its own inverse. */
  inBattle(team: TeamId) {
    return this.seen(team)
  }

  /**
   * Transposes a container. On the board it mirrors the battle; on a token inside the board it undoes that,
   * so text, bars and icons read the right way round.
   */
  transpose(node: Container) {
    if (!this.mirrored) {
      return
    }

    node.rotation = Math.PI / 2
    node.scale.set(1, -1)
  }
}
