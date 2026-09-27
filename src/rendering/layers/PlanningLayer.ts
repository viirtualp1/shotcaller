import gsap from 'gsap'
import { Container, Graphics } from 'pixi.js'
import { HEROES } from '@/content/heroes'
import {
  LANE_IDS,
  TEAM_IDS,
  type HeroId,
  type ItemId,
  type LaneId,
  type StarLevel,
  type StructureSlot,
  type TeamId,
} from '@/content/ids'
import { STRUCTURES } from '@/content/units'
import type { Vec2 } from '@/core/math/vec2'
import type { PerTeam, StructureState } from '@/domain/battle/contracts'
import type { LaneMap } from '@/simulation/map/LaneMap'
import { stagingPosition } from '../layout'
import type { RoleIcons } from '../roleIcons'
import { PALETTE } from '../theme'
import { HeroToken, isOverToken } from '../views/HeroToken'
import { StructureView } from '../views/StructureView'

export interface TokenModel {
  readonly uid: string
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly items: readonly ItemId[]
}

export interface PlanningModel {
  readonly lineups: PerTeam<Readonly<Record<LaneId, readonly TokenModel[]>>>
  readonly structures: PerTeam<StructureState>
  readonly selectedUid: string | null
  readonly inspectedUid: string | null
}

interface PlacedToken {
  readonly token: HeroToken
  readonly team: TeamId
  readonly key: string
  position: Vec2
}

const LANE_HIGHLIGHT_WIDTH = 46
const tokenKey = (t: TokenModel) => `${t.heroId}:${t.stars}:${t.items.join(',')}`

export class PlanningLayer extends Container {
  private readonly highlight = new Graphics()
  private readonly structureLayer = new Container()
  private readonly tokenLayer = new Container()
  private readonly placed = new Map<string, PlacedToken>()
  private model: PlanningModel | null = null
  private structuresKey = ''
  private hoverLane: LaneId | null = null
  private hoverUid: string | null = null
  private dropLane: LaneId | null = null
  private dragging = false
  private draggedUid: string | null = null

  constructor(
    private readonly map: LaneMap,
    private readonly icons: RoleIcons,
  ) {
    super()
    this.addChild(this.highlight, this.structureLayer, this.tokenLayer)
  }

  show(model: PlanningModel) {
    this.model = model
    const structuresKey = JSON.stringify(model.structures)
    if (structuresKey !== this.structuresKey) {
      this.structuresKey = structuresKey
      this.rebuildStructures(model.structures)
    }

    this.syncTokens(model)
    this.drawHighlight()
  }

  setHover(lane: LaneId | null, uid: string | null) {
    if (lane === this.hoverLane && uid === this.hoverUid) {
      return
    }

    this.hoverLane = lane
    this.hoverUid = uid
    this.drawHighlight()
  }

  setDrag(draggedUid: string | null, dragging: boolean, dropLane: LaneId | null) {
    if (draggedUid !== this.draggedUid) {
      const previous = this.draggedUid ? this.placed.get(this.draggedUid) : undefined
      if (previous) {
        gsap.to(previous.token, {
          alpha: 1,
          duration: 0.15,
        })
      }

      const current = draggedUid ? this.placed.get(draggedUid) : undefined
      if (current) {
        gsap.to(current.token, {
          alpha: 0.3,
          duration: 0.15,
        })
      }

      this.draggedUid = draggedUid
    }

    this.dragging = dragging
    this.dropLane = dropLane
    this.drawHighlight()
  }

  heroAt(point: Vec2) {
    for (const [uid, p] of this.placed) {
      if (isOverToken(p.position, point)) {
        return {
          uid,
          team: p.team,
        }
      }
    }

    return null
  }

  /** Only the player's own tokens can be dragged or dropped onto. */
  tokenAt(point: Vec2) {
    const hit = this.heroAt(point)
    return hit?.team === 0 ? hit.uid : null
  }

  tokenPosition(uid: string) {
    const token = this.placed.get(uid)?.token
    return token
      ? {
          x: token.x,
          y: token.y,
        }
      : null
  }

  update(time: number) {
    const focused = new Set([this.model?.selectedUid, this.model?.inspectedUid])
    for (const [uid, p] of this.placed) {
      p.token.setEffects(
        {
          selected: focused.has(uid),
          hovered: uid === this.hoverUid,
        },
        time,
      )
    }
  }

  private syncTokens(model: PlanningModel) {
    const seen = new Set<string>()
    for (const team of TEAM_IDS) {
      for (const lane of LANE_IDS) {
        const tokens = model.lineups[team][lane]
        tokens.forEach((t, i) => {
          seen.add(t.uid)
          const position = stagingPosition(this.map, team, lane, i, tokens.length)
          const existing = this.placed.get(t.uid)
          if (existing && existing.key === tokenKey(t)) {
            existing.position = position

            gsap.to(existing.token, {
              x: position.x,
              y: position.y,
              duration: 0.35,
              ease: 'back.out(1.4)',
            })

            return
          }

          if (existing) {
            this.dismiss(t.uid, false)
          }

          this.place(t, team, position, Boolean(existing))
        })
      }
    }

    for (const uid of [...this.placed.keys()]) {
      if (!seen.has(uid)) {
        this.dismiss(uid, true)
      }
    }
  }

  private place(model: TokenModel, team: TeamId, position: Vec2, upgraded: boolean) {
    const token = new HeroToken({
      color: HEROES[model.heroId].color,
      team,
      icon: this.icons[HEROES[model.heroId].role],
      stars: model.stars,
      items: model.items,
    })

    token.position.set(position.x, position.y)
    this.tokenLayer.addChild(token)

    this.placed.set(model.uid, {
      token,
      team,
      key: tokenKey(model),
      position,
    })

    token.appear()

    if (upgraded) {
      token.pop(1.6)
    }
  }

  private dismiss(uid: string, animate: boolean) {
    const placed = this.placed.get(uid)
    if (!placed) {
      return
    }

    this.placed.delete(uid)
    gsap.killTweensOf(placed.token)

    const dispose = () => {
      if (!placed.token.destroyed) {
        placed.token.destroy({ children: true })
      }
    }

    if (animate) {
      placed.token.vanish(dispose)
    } else {
      dispose()
    }
  }

  private rebuildStructures(structures: PerTeam<StructureState>) {
    this.structureLayer.removeChildren().forEach((c) => c.destroy({ children: true }))

    for (const team of TEAM_IDS) {
      for (const slot of [...LANE_IDS, 'throne'] as StructureSlot[]) {
        const type = slot === 'throne' ? 'throne' : 'tower'
        const view = new StructureView(team, type)
        const at = slot === 'throne' ? this.map.base(team) : this.map.towerPosition(team, slot)
        view.position.set(at.x, at.y)
        view.show(structures[team][slot], STRUCTURES[type].hp, true)
        view.setAggro(false)
        this.structureLayer.addChild(view)
      }
    }
  }

  private drawHighlight() {
    const g = this.highlight.clear()
    const placing = this.dragging || Boolean(this.model?.selectedUid)
    if (!placing) {
      return
    }

    const target = this.dragging ? this.dropLane : this.hoverLane
    for (const lane of LANE_IDS) {
      const points = this.map.path(0, lane).points
      points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))

      g.stroke({
        width: LANE_HIGHLIGHT_WIDTH,
        color: PALETTE.gold,
        alpha: lane === target ? 0.28 : 0.08,
        cap: 'round',
        join: 'round',
      })
    }
  }
}
