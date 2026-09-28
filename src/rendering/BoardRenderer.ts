import gsap from 'gsap'
import mitt from 'mitt'
import { Application, Container, Point, Sprite, Texture, type FederatedPointerEvent } from 'pixi.js'
import type { LaneId } from '@/content/ids'
import { BATTLE } from '@/content/rules'
import type { Vec2 } from '@/core/math/vec2'
import type { BattleSimulation } from '@/simulation/BattleSimulation'
import { DEFAULT_LANE_MAP, type LaneMap } from '@/simulation/map/LaneMap'
import { paintBoardArt } from './art/paintBoardArt'
import type { BoardLabels } from './labels'
import { BattleLayer } from './layers/BattleLayer'
import { EffectsLayer } from './layers/EffectsLayer'
import { PlanningLayer, type PlanningModel } from './layers/PlanningLayer'
import { Perspective } from './perspective'
import { loadRoleIcons, type RoleIcons } from './roleIcons'
import { TOKEN_RADIUS, type HeroHit } from './views/HeroToken'

export type BoardEvents = {
  heroPressed: { uid: string; clientX: number; clientY: number }
  heroTapped: HeroHit
  heroHovered: HeroHit | null
  lanePicked: LaneId
}

export interface Insets {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

const LANE_PICK_DISTANCE = 80
const MAP_MARGIN = 12
const MIN_MAP_SIZE = 200
const CAMERA_TWEEN = 0.45

export class BoardRenderer {
  readonly events = mitt<BoardEvents>()
  private readonly camera = new Container()
  private readonly world = new Container()
  /** Holds everything placed in battle coordinates; mirrored when the viewer fights as team 1. */
  private readonly board = new Container()
  private readonly planning: PlanningLayer
  private readonly battle: BattleLayer
  private readonly effects: EffectsLayer
  private mode: 'planning' | 'battle' = 'planning'
  private insets: Insets = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }
  private clock = 0
  private pressedToken = false
  private placing = false
  private hovered: HeroHit | null = null
  /** Pixi only follows window resizes; this also catches the host changing size on its own. */
  private readonly hostObserver: ResizeObserver

  private constructor(
    private readonly app: Application,
    private readonly host: HTMLElement,
    private readonly map: LaneMap,
    labels: BoardLabels,
    icons: RoleIcons,
    perspective: Perspective,
  ) {
    /* The map is symmetric across its diagonal, so the art looks the same from either side. */
    const art = new Sprite(Texture.from(paintBoardArt(map, labels)))
    art.width = art.height = BATTLE.worldSize
    this.planning = new PlanningLayer(map, icons, perspective)
    this.battle = new BattleLayer(icons, perspective)
    this.effects = new EffectsLayer(labels, (strength) => this.shake(strength), perspective)
    perspective.transpose(this.board)
    this.board.addChild(this.planning, this.battle, this.effects)
    this.world.addChild(art, this.board)
    this.camera.addChild(this.world)
    app.stage.addChild(this.camera)

    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    app.stage.on('pointermove', (e) => this.onPointerMove(e))

    app.stage.on('pointerleave', () => {
      this.planning.setHover(null, null)
      this.setHovered(null)
    })

    app.stage.on('pointerdown', (e) => this.onPointerDown(e))
    app.stage.on('pointertap', (e) => this.onPointerTap(e))
    app.renderer.on('resize', () => this.fit(false))
    app.ticker.add((ticker) => this.onFrame(ticker.deltaMS / 1000))
    this.hostObserver = new ResizeObserver(() => app.queueResize())
    this.hostObserver.observe(host)
    this.fit(false)
  }

  static async create(
    host: HTMLElement,
    labels: BoardLabels,
    perspective = new Perspective(),
    map: LaneMap = DEFAULT_LANE_MAP,
  ) {
    const app = new Application()
    await app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    })

    const icons = await loadRoleIcons()
    host.appendChild(app.canvas)

    return new BoardRenderer(app, host, map, labels, icons, perspective)
  }

  /** Space covered by HUD panels; the map is fitted into what is left. */
  setInsets(insets: Insets) {
    const same = (Object.keys(insets) as (keyof Insets)[]).every(
      (k) => Math.abs(insets[k] - this.insets[k]) < 1,
    )

    if (same) {
      return
    }

    this.insets = insets

    /*
     * The HUD reports new insets as soon as the window changes size, while Pixi resizes the canvas a frame later.
     * Fitting then would aim the camera at the old canvas size, so resize first; the resize event refits the map.
     */
    if (this.canvasIsStale()) {
      this.app.resize()

      return
    }

    this.fit(true)
  }

  showPlanning(model: PlanningModel, placing: boolean) {
    if (this.mode === 'battle') {
      this.leaveBattle()
      this.setHovered(null)
    }

    this.mode = 'planning'
    this.placing = placing
    this.planning.visible = true
    this.planning.show(model)
  }

  showBattle(simulation: BattleSimulation) {
    this.mode = 'battle'
    this.planning.visible = false
    this.planning.setHover(null, null)
    this.setHovered(null)
    this.battle.attach(simulation)
    this.effects.attach(simulation.events)
  }

  laneAtClient(clientX: number, clientY: number) {
    const point = this.clientToWorld(clientX, clientY)
    return point ? this.map.nearestLane(point, LANE_PICK_DISTANCE) : null
  }

  tokenAtClient(clientX: number, clientY: number) {
    const point = this.clientToWorld(clientX, clientY)
    return point && this.mode === 'planning' ? this.planning.tokenAt(point) : null
  }

  /** Client-space box around a hero token for anchoring HTML overlays; null once the hero is gone. */
  heroBounds(uid: string) {
    const position = this.heroPosition(uid)
    if (!position) {
      return null
    }

    const canvas = this.app.canvas.getBoundingClientRect()
    const center = this.board.toGlobal(new Point(position.x, position.y))
    const radius = TOKEN_RADIUS * this.world.scale.x
    return new DOMRect(
      canvas.left + center.x - radius,
      canvas.top + center.y - radius,
      radius * 2,
      radius * 2,
    )
  }

  setDrag(draggedUid: string | null, dragging: boolean, dropLane: LaneId | null) {
    this.planning.setDrag(draggedUid, dragging, dropLane)
  }

  shake(strength: number) {
    gsap.killTweensOf(this.camera.position)

    gsap.fromTo(
      this.camera.position,
      {
        x: strength * (Math.random() - 0.5),
        y: strength * (Math.random() - 0.5),
      },
      {
        x: 0,
        y: 0,
        duration: 0.4,
        ease: 'elastic.out(2, 0.3)',
      },
    )
  }

  destroy() {
    this.hostObserver.disconnect()
    this.leaveBattle()
    this.events.all.clear()
    gsap.killTweensOf(this.world)
    gsap.killTweensOf(this.world.scale)
    gsap.killTweensOf(this.camera.position)

    this.app.destroy(
      { removeView: true },
      {
        children: true,
        texture: true,
      },
    )
  }

  private leaveBattle() {
    this.battle.detach()
    this.effects.detach()
  }

  private canvasIsStale() {
    const { width, height } = this.app.screen
    return width !== this.host.clientWidth || height !== this.host.clientHeight
  }

  private fit(animate: boolean) {
    /* A camera move still in flight would otherwise carry on towards a target computed for an older size. */
    gsap.killTweensOf(this.world)
    gsap.killTweensOf(this.world.scale)

    const { width, height } = this.app.screen
    const { top, right, bottom, left } = this.insets
    const availableWidth = Math.max(MIN_MAP_SIZE, width - left - right - MAP_MARGIN * 2)
    const availableHeight = Math.max(MIN_MAP_SIZE, height - top - bottom - MAP_MARGIN * 2)
    const size = Math.min(availableWidth, availableHeight)
    const scale = size / BATTLE.worldSize
    const x = left + MAP_MARGIN + (availableWidth - size) / 2
    const y = top + MAP_MARGIN + (availableHeight - size) / 2
    this.app.stage.hitArea = this.app.screen

    if (!animate) {
      this.world.position.set(x, y)
      this.world.scale.set(scale)

      return
    }

    gsap.to(this.world, {
      x,
      y,
      duration: CAMERA_TWEEN,
      ease: 'power2.inOut',
    })

    gsap.to(this.world.scale, {
      x: scale,
      y: scale,
      duration: CAMERA_TWEEN,
      ease: 'power2.inOut',
    })
  }

  private clientToWorld(clientX: number, clientY: number) {
    const rect = this.app.canvas.getBoundingClientRect()

    const inside =
      clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom

    if (!inside) {
      return null
    }

    return this.board.toLocal(new Point(clientX - rect.left, clientY - rect.top))
  }

  private heroAt(point: Vec2) {
    return this.mode === 'battle' ? this.battle.heroAt(point) : this.planning.heroAt(point)
  }

  private heroPosition(uid: string) {
    return this.mode === 'battle' ? this.battle.heroPosition(uid) : this.planning.tokenPosition(uid)
  }

  private setHovered(hit: HeroHit | null) {
    if (hit?.uid === this.hovered?.uid) {
      return
    }

    this.hovered = hit
    this.battle.setHovered(hit?.uid ?? null)
    this.events.emit('heroHovered', hit)
  }

  private onFrame(dt: number) {
    this.clock += dt
    this.effects.nextFrame()

    if (this.mode === 'battle') {
      this.battle.update(dt, this.clock)
    } else {
      this.planning.update(this.clock)
    }

    if (this.hovered && !this.heroPosition(this.hovered.uid)) {
      this.setHovered(null)
    }
  }

  private onPointerMove(e: FederatedPointerEvent) {
    const point = this.board.toLocal(e.global)
    const hit = this.heroAt(point)
    this.setHovered(hit)

    if (this.mode !== 'planning') {
      this.app.canvas.style.cursor = hit ? 'pointer' : 'default'

      return
    }

    const lane = this.placing ? this.map.nearestLane(point, LANE_PICK_DISTANCE) : null
    this.planning.setHover(lane, hit?.uid ?? null)
    const grabbable = hit?.team === 0
    this.app.canvas.style.cursor = grabbable ? 'grab' : hit || lane ? 'pointer' : 'default'
  }

  private onPointerDown(e: FederatedPointerEvent) {
    this.pressedToken = false

    if (this.mode !== 'planning') {
      return
    }

    const uid = this.planning.tokenAt(this.board.toLocal(e.global))
    if (!uid) {
      return
    }

    this.pressedToken = true

    this.events.emit('heroPressed', {
      uid,
      clientX: e.clientX,
      clientY: e.clientY,
    })
  }

  private onPointerTap(e: FederatedPointerEvent) {
    if (this.pressedToken) {
      return
    }

    const point = this.board.toLocal(e.global)
    const hit = this.heroAt(point)
    if (hit) {
      this.events.emit('heroTapped', hit)

      return
    }

    if (this.mode !== 'planning') {
      return
    }

    const lane = this.map.nearestLane(point, LANE_PICK_DISTANCE)
    if (lane) {
      this.events.emit('lanePicked', lane)
    }
  }
}
