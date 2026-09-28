import type { Container } from 'pixi.js'
import type { TeamId } from '@/content/ids'
import type { MapMirror } from '@/content/map'
import { BATTLE } from '@/content/rules'
import { seenFrom } from '@/domain/battle/mirror'

/**
 * Whose side the board is drawn from. Online, the guest fights as team 1: their board is turned so their base
 * sits where team 0's does and every lane stays where it is. Corner maps are transposed (x and y swapped),
 * maps with the bases left and right are flipped horizontally. Views receive teams as the viewer sees them,
 * 0 being the viewer's own, so colours and hit tests stay as they are.
 */
export class Perspective {
  constructor(
    readonly side: TeamId = 0,
    private readonly mirror: MapMirror = 'transpose',
  ) {}

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

  /** Turns the board so the viewer's base is where team 0's is drawn. */
  orient(board: Container) {
    if (!this.mirrored) {
      return
    }

    if (this.mirror === 'flipX') {
      board.scale.x = -1
      board.x = BATTLE.worldSize
    } else {
      this.transpose(board)
    }
  }

  /** Undoes the board's turn on a token inside it, so text, bars and icons read the right way round. */
  upright(token: Container) {
    if (!this.mirrored) {
      return
    }

    if (this.mirror === 'flipX') {
      token.scale.x = -1
    } else {
      this.transpose(token)
    }
  }

  /** Swapping x and y is its own inverse, so it both turns the board and puts a token back upright. */
  private transpose(node: Container) {
    node.rotation = Math.PI / 2
    node.scale.set(1, -1)
  }
}
