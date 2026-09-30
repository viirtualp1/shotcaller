import gsap from 'gsap'
import mitt from 'mitt'
import { Application, Container, Point, Sprite, Texture, type FederatedPointerEvent } from 'pixi.js'
import type { LaneId } from '@/content/ids'
import { BATTLE } from '@/content/rules'
import type { Vec2 } from '@/core/math/vec2'
import type { LaneStances } from '@/domain/battle/contracts'
import type { BattleSimulation } from '@/simulation/BattleSimulation'
import type { LaneMap } from '@/simulation/map/LaneMap'
import { paintBoardArt } from './art/paintBoardArt'
import type { BoardLabels } from './labels'
import { BattleLayer } from './layers/BattleLayer'
import { EffectsLayer } from './layers/EffectsLayer'
import { OrdersLayer } from './layers/OrdersLayer'
import { PlanningLayer, type PlanningModel } from './layers/PlanningLayer'
import { fitMap, WHOLE_BOARD, type Insets } from './fitMap'
import { Perspective } from './perspective'
import { boardResolution } from './quality'
import { loadRoleIcons, type RoleIcons } from './roleIcons'
import { TOKEN_RADIUS, type HeroHit } from './views/HeroToken'

export type BoardEvents = {
  heroPressed: { uid: string; clientX: number; clientY: number }
  heroTapped: HeroHit
  heroHovered: HeroHit | null
  lanePicked: LaneId
}

export type { Insets } from './fitMap'

const LANE_PICK_DISTANCE = 80
const CAMERA_TWEEN = 0.45

export class BoardRenderer {
  readonly events = mitt<BoardEvents>()
  private readonly camera = new Container()
  private readonly artTexture: Texture
  private readonly world = new Container()
  /** Holds everything placed in battle coordinates; mirrored when the viewer fights as team 1. */
  private readonly board = new Container()
  private readonly orders: OrdersLayer
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
  private closeUp = false
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
    /* Every map is symmetric along its mirror, so the art looks the same from either side. */
    this.artTexture = Texture.from(paintBoardArt(map, labels))
    const art = new Sprite(this.artTexture)
    art.width = art.height = BATTLE.worldSize
    this.orders = new OrdersLayer(map, perspective)
    this.planning = new PlanningLayer(map, icons, perspective)
    this.battle = new BattleLayer(icons, perspective)
    this.effects = new EffectsLayer(labels, (strength) => this.shake(strength), perspective)
    perspective.orient(this.board)
    this.board.addChild(this.orders, this.planning, this.battle, this.effects)
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

  static async create(host: HTMLElement, labels: BoardLabels, perspective: Perspective, map: LaneMap) {
    const app = new Application()
    await app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: boardResolution(host.clientWidth, host.clientHeight, window.devicePixelRatio),
    })

    app.ticker.maxFPS = 60

    const icons = await loadRoleIcons()
    host.appendChild(app.canvas)

    return new BoardRenderer(app, host, map, labels, icons, perspective)
  }

  setActive(active: boolean) {
    if (active) {
      this.app.start()
    } else {
      this.app.stop()
    }
  }

  setMaxFPS(fps: number) {
    this.app.ticker.maxFPS = fps
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

  /** Frames the lanes instead of the whole board: small screens have no room for the empty edges. */
  setCloseUp(closeUp: boolean) {
    if (closeUp === this.closeUp) {
      return
    }

    this.closeUp = closeUp
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

  /** The viewer's own lane orders; they stay on the map through planning and battle until changed. */
  showOrders(stances: LaneStances) {
    this.orders.show(stances)
  }

  laneAtClient(clientX: number, clientY: number) {
    const point = this.clientToWorld(clientX, clientY)
    return point ? this.map.nearestLane(point, LANE_PICK_DISTANCE) : null
  }

  tokenAtClient(clientX: number, clientY: number) {
    const point = this.clientToWorld(clientX, clientY)
    return point && this.mode === 'planning' ? this.planning.tokenAt(point) : null
  }

  heroAtClient(clientX: number, clientY: number) {
    const point = this.clientToWorld(clientX, clientY)
    return point ? this.heroAt(point) : null
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
        texture: false,
      },
    )

    this.artTexture.destroy(true)
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
    const focus = this.closeUp ? this.map.contentBounds() : WHOLE_BOARD
    const { x, y, scale } = fitMap(width, height, this.insets, focus)
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
    this.orders.update(this.clock)

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
