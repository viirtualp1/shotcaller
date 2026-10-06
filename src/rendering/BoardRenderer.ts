import gsap from 'gsap'
import mitt from 'mitt'
import { Application, Container, Graphics, Point, Sprite, Texture, type FederatedPointerEvent } from 'pixi.js'
// Shader and uniform code without eval, so the content security policy can forbid it.
import 'pixi.js/unsafe-eval'
import type { LaneId } from '@/content/ids'
import { BATTLE } from '@/content/rules'
import type { SandboxSettings } from '@/content/sandbox'
import type { Vec2 } from '@/core/math/vec2'
import type { LaneStances } from '@/domain/battle/contracts'
import type { BattleSimulation } from '@/simulation/BattleSimulation'
import type { LaneMap } from '@/simulation/map/LaneMap'
import { paintBoardArt, paintSurround, SURROUND_REACH } from './art/paintBoardArt'
import type { BoardLabels } from './labels'
import { BattleLayer } from './layers/BattleLayer'
import { EffectsLayer } from './layers/EffectsLayer'
import { OrdersLayer } from './layers/OrdersLayer'
import { PlanningLayer, type PlanningModel } from './layers/PlanningLayer'
import { TrainingCampsLayer } from './layers/TrainingCampsLayer'
import { fitMap, mapArea, WHOLE_BOARD, type Insets, type Rect } from './fitMap'
import { blendLens, clampLens, frameLens, IDENTITY_LENS, zoomLens, type LensState } from './lens'
import { Perspective } from './perspective'
import { boardResolution } from './quality'
import { loadRoleIcons, type RoleIcons } from './roleIcons'
import { PALETTE } from './theme'
import { TOKEN_RADIUS, type HeroHit } from './views/HeroToken'

/** A touch view of the map: zoomed in by hand, or following the heroes of one lane through the battle. */
export interface CameraState {
  readonly zoomed: boolean
  readonly follow: LaneId | null
}

export type BoardEvents = {
  heroPressed: { uid: string; clientX: number; clientY: number }
  heroTapped: HeroHit
  heroHovered: HeroHit | null
  lanePicked: LaneId
  /** Two fingers went down on the map: whatever one finger started gives way to the zoom. */
  pinchStarted: void
  cameraChanged: CameraState
}

export type { Insets } from './fitMap'

const LANE_PICK_DISTANCE = 80
const FULL_FPS = 60
const CAMERA_TWEEN = 0.45
/** How far a finger moves before a press on the map becomes a pan rather than a tap. */
const PAN_THRESHOLD = 8
/** Board units kept around the heroes of a followed lane. */
const FOLLOW_PADDING = 90
/* Heroes spread along a lane all stay in frame; the camera closes in as they meet. */
const FOLLOW_MIN_ZOOM = 1
const FOLLOW_MAX_ZOOM = 2.4
/** How quickly the camera catches up with a followed lane; higher is quicker. */
const FOLLOW_RATE = 3

interface ScreenPoint {
  x: number
  y: number
}

export class BoardRenderer {
  readonly events = mitt<BoardEvents>()
  /** Shakes on impacts. */
  private readonly camera = new Container()
  /** Zooms and pans over the fitted map on touch screens. */
  private readonly lens = new Container()
  private readonly artTexture: Texture
  /** The chalk border of the whole board, shown when the board is framed whole. */
  private readonly frame = new Graphics()
  /** Forest past the board's edges for close-up screens; painted the first time one needs it. */
  private surround: Sprite | null = null
  /* Kept apart from the sprite: destroying the stage clears a sprite's texture, so the sprite cannot hand it back. */
  private surroundTexture: Texture | null = null
  private readonly world = new Container()
  /** Holds everything placed in battle coordinates; mirrored when the viewer fights as team 1. */
  private readonly board = new Container()
  private readonly orders: OrdersLayer
  private readonly training: TrainingCampsLayer
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
  /** The frame rate asked for; fingers moving the camera always get the full one. */
  private maxFPS = FULL_FPS
  private clock = 0
  private pressedToken = false
  private placing = false
  private hovered: HeroHit | null = null
  /** The fitted board in the lens's own space, which a zoomed view must not leave. */
  private boardRect: Rect = WHOLE_BOARD
  private follow: LaneId | null = null
  private reported: CameraState = {
    zoomed: false,
    follow: null,
  }
  /** Fingers on the map, in canvas pixels. */
  private readonly touches = new Map<number, ScreenPoint>()
  private gesture: { lens: LensState; points: ScreenPoint[] } | null = null
  /** The fingers moved the view, so lifting them is not a tap on the map. */
  private panned = false
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
    this.artTexture = Texture.from(paintBoardArt(map, labels, undefined, false))
    const art = new Sprite(this.artTexture)
    art.width = art.height = BATTLE.worldSize
    this.paintFrame()
    this.orders = new OrdersLayer(map, perspective)
    this.training = new TrainingCampsLayer(map, labels)
    this.planning = new PlanningLayer(map, icons, perspective)
    this.battle = new BattleLayer(icons, perspective)
    this.effects = new EffectsLayer(labels, (strength) => this.shake(strength), perspective)
    perspective.orient(this.board)
    this.board.addChild(this.training, this.orders, this.planning, this.battle, this.effects)
    this.world.addChild(art, this.frame, this.board)
    this.lens.addChild(this.world)
    this.camera.addChild(this.lens)
    app.stage.addChild(this.camera)

    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    app.stage.on('pointermove', (e) => this.onPointerMove(e))

    app.stage.on('pointerleave', () => this.clearHover())

    app.stage.on('pointerdown', (e) => this.onPointerDown(e))
    app.stage.on('pointertap', (e) => this.onPointerTap(e))
    /* Registered after Pixi's own listeners, so a press on a hero is known before a finger can start a pan. */
    app.canvas.addEventListener('pointerdown', this.onTouchDown)
    window.addEventListener('pointermove', this.onTouchMove)
    window.addEventListener('pointerup', this.onTouchUp)
    window.addEventListener('pointercancel', this.onTouchUp)
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

    app.ticker.maxFPS = FULL_FPS

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
    this.maxFPS = fps

    if (this.touches.size === 0) {
      this.app.ticker.maxFPS = fps
    }
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
    this.frame.visible = !closeUp

    if (closeUp) {
      this.showSurround()
    } else if (this.surround) {
      this.surround.visible = false
    }

    this.fit(true)
  }

  /** Follows the heroes of a lane while the battle runs; null goes back to the whole map. */
  setFollow(lane: LaneId | null) {
    this.follow = lane

    if (lane === null) {
      this.resetLens(true)
    } else {
      this.report(this.lens.scale.x)
    }
  }

  /** Back to the whole map, following nothing. */
  resetView() {
    this.follow = null
    this.resetLens(true)
  }

  showPlanning(model: PlanningModel, placing: boolean) {
    if (this.mode === 'battle') {
      this.leaveBattle()
      this.setHovered(null)
      /* Planning starts on the whole map; a followed lane is picked up again when the next battle starts. */
      this.resetLens(true)
    }

    this.mode = 'planning'
    this.placing = placing
    this.planning.visible = true
    this.planning.show(model)
  }

  showBattle(simulation: BattleSimulation) {
    /* Each phase starts on the whole map, unless the camera follows a lane. */
    if (this.mode === 'planning' && this.follow === null) {
      this.resetLens(true)
    }

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

  showTraining(settings: SandboxSettings | null, planning: boolean) {
    this.training.show(settings, planning)
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
    const radius = TOKEN_RADIUS * this.world.scale.x * this.lens.scale.x
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
    this.app.canvas.removeEventListener('pointerdown', this.onTouchDown)
    window.removeEventListener('pointermove', this.onTouchMove)
    window.removeEventListener('pointerup', this.onTouchUp)
    window.removeEventListener('pointercancel', this.onTouchUp)
    this.leaveBattle()
    this.events.all.clear()
    gsap.killTweensOf(this.world)
    gsap.killTweensOf(this.world.scale)
    gsap.killTweensOf(this.lens)
    gsap.killTweensOf(this.lens.scale)
    gsap.killTweensOf(this.camera.position)

    this.app.destroy(
      { removeView: true },
      {
        children: true,
        texture: false,
      },
    )

    this.artTexture.destroy(true)
    this.surroundTexture?.destroy(true)
  }

  /** The chalk border: a bold line with a faint one inside it. */
  private paintFrame() {
    const size = BATTLE.worldSize

    this.frame
      .roundRect(4, 4, size - 8, size - 8, 14)
      .stroke({
        width: 2,
        color: PALETTE.chalk,
        alpha: 0.35,
      })
      .roundRect(11, 11, size - 22, size - 22, 10)
      .stroke({
        width: 1,
        color: PALETTE.chalk,
        alpha: 0.12,
      })
  }

  private showSurround() {
    if (!this.surround) {
      this.surroundTexture = Texture.from(paintSurround(this.map))
      this.surround = new Sprite(this.surroundTexture)
      this.surround.position.set(-SURROUND_REACH, -SURROUND_REACH)
      this.surround.width = this.surround.height = BATTLE.worldSize + SURROUND_REACH * 2
      this.world.addChildAt(this.surround, 0)
    }

    this.surround.visible = true
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

    /* The art covers the whole board, so a zoomed view may look past the lanes as far as its edge. */
    this.boardRect = {
      x,
      y,
      width: WHOLE_BOARD.width * scale,
      height: WHOLE_BOARD.height * scale,
    }

    /* A zoomed view stays over the map as the space around it changes. */
    this.applyLens(this.lensState())

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

  private clearHover() {
    this.planning.setHover(null, null)
    this.setHovered(null)
    this.app.canvas.style.cursor = 'default'
  }

  private onFrame(dt: number) {
    this.clock += dt
    this.effects.nextFrame()
    this.orders.update(this.clock)

    if (this.mode === 'battle') {
      this.battle.update(dt, this.clock)
      this.followLane(dt)
    } else {
      this.planning.update(this.clock)
    }

    if (this.hovered && !this.heroPosition(this.hovered.uid)) {
      this.setHovered(null)
    }
  }

  private area() {
    return mapArea(this.app.screen.width, this.app.screen.height, this.insets)
  }

  private lensState(): LensState {
    return {
      x: this.lens.x,
      y: this.lens.y,
      scale: this.lens.scale.x,
    }
  }

  /** Puts the lens where asked, kept over the map. */
  private applyLens(lens: LensState) {
    const next = clampLens(lens, this.area(), this.boardRect)
    this.lens.position.set(next.x, next.y)
    this.lens.scale.set(next.scale)
    this.report(next.scale)
  }

  private resetLens(animate: boolean) {
    gsap.killTweensOf(this.lens)
    gsap.killTweensOf(this.lens.scale)
    this.report(IDENTITY_LENS.scale)

    if (!animate) {
      this.applyLens(IDENTITY_LENS)

      return
    }

    gsap.to(this.lens, {
      x: IDENTITY_LENS.x,
      y: IDENTITY_LENS.y,
      duration: CAMERA_TWEEN,
      ease: 'power2.inOut',
    })

    gsap.to(this.lens.scale, {
      x: IDENTITY_LENS.scale,
      y: IDENTITY_LENS.scale,
      duration: CAMERA_TWEEN,
      ease: 'power2.inOut',
    })
  }

  private report(scale: number) {
    const state: CameraState = {
      zoomed: scale > 1.01,
      follow: this.follow,
    }

    if (state.zoomed === this.reported.zoomed && state.follow === this.reported.follow) {
      return
    }

    this.reported = state
    this.events.emit('cameraChanged', state)
  }

  /** Eases the camera towards the heroes of the followed lane, or the lane itself once they are all down. */
  private followLane(dt: number) {
    if (this.follow === null || this.touches.size > 0) {
      return
    }

    const box = this.battle.laneHeroBounds(this.follow) ?? this.laneBounds(this.follow)

    const target = frameLens(
      this.boardToLens(box),
      this.area(),
      FOLLOW_PADDING * this.world.scale.x,
      FOLLOW_MIN_ZOOM,
      FOLLOW_MAX_ZOOM,
    )

    gsap.killTweensOf(this.lens)
    gsap.killTweensOf(this.lens.scale)
    this.applyLens(blendLens(this.lensState(), target, 1 - Math.exp(-dt * FOLLOW_RATE)))
  }

  private laneBounds(lane: LaneId): Rect {
    const points = this.map.path(0, lane).points
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const x = Math.min(...xs)
    const y = Math.min(...ys)

    return {
      x,
      y,
      width: Math.max(...xs) - x,
      height: Math.max(...ys) - y,
    }
  }

  /** A board-space box in the lens's own space; a turned board may swap its corners. */
  private boardToLens(box: Rect): Rect {
    const a = this.lens.toLocal(new Point(box.x, box.y), this.board)
    const b = this.lens.toLocal(new Point(box.x + box.width, box.y + box.height), this.board)

    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y),
    }
  }

  private canvasPoint(e: PointerEvent): ScreenPoint {
    const rect = this.app.canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  /** A gesture is measured from where the fingers are now, so a finger joining or leaving does not make the view jump. */
  private restartGesture() {
    this.gesture =
      this.touches.size > 0
        ? {
            lens: this.lensState(),
            points: [...this.touches.values()].map((p) => ({ ...p })),
          }
        : null
  }

  /** The view was moved by hand: it stops following a lane. */
  private takeOver() {
    gsap.killTweensOf(this.lens)
    gsap.killTweensOf(this.lens.scale)
    this.follow = null
    this.panned = true
  }

  private readonly onTouchDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      return
    }

    if (this.touches.size === 0) {
      this.panned = false
    }

    this.touches.set(e.pointerId, this.canvasPoint(e))
    this.restartGesture()
    this.app.ticker.maxFPS = FULL_FPS

    if (this.touches.size === 2) {
      this.events.emit('pinchStarted')
    }
  }

  private readonly onTouchMove = (e: PointerEvent) => {
    if (!this.touches.has(e.pointerId) || !this.gesture) {
      return
    }

    this.touches.set(e.pointerId, this.canvasPoint(e))
    const [first, second] = [...this.touches.values()]
    const [start, startSecond] = this.gesture.points
    if (!first || !start) {
      return
    }

    if (second && startSecond) {
      const spread = Math.hypot(second.x - first.x, second.y - first.y)
      const startSpread = Math.max(1, Math.hypot(startSecond.x - start.x, startSecond.y - start.y))

      const middle = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      }

      const startMiddle = {
        x: (start.x + startSecond.x) / 2,
        y: (start.y + startSecond.y) / 2,
      }

      const zoomed = zoomLens(this.gesture.lens, spread / startSpread, startMiddle.x, startMiddle.y)
      this.takeOver()

      this.applyLens({
        ...zoomed,
        x: zoomed.x + middle.x - startMiddle.x,
        y: zoomed.y + middle.y - startMiddle.y,
      })

      return
    }

    /* One finger on a hero during planning drags the hero; on a whole map there is nothing to pan. */
    const dragging = this.pressedToken && this.mode === 'planning'
    if (dragging || this.gesture.lens.scale <= 1.01) {
      return
    }

    const dx = first.x - start.x
    const dy = first.y - start.y
    if (!this.panned && Math.hypot(dx, dy) < PAN_THRESHOLD) {
      return
    }

    this.takeOver()

    this.applyLens({
      ...this.gesture.lens,
      x: this.gesture.lens.x + dx,
      y: this.gesture.lens.y + dy,
    })
  }

  private readonly onTouchUp = (e: PointerEvent) => {
    if (!this.touches.delete(e.pointerId)) {
      return
    }

    this.restartGesture()

    if (this.touches.size === 0) {
      this.app.ticker.maxFPS = this.maxFPS
    }
  }

  private onPointerMove(e: FederatedPointerEvent) {
    /* Pixi also receives pointer events over HTML overlays; those belong to the card, not the map. */
    if (e.nativeEvent.target !== this.app.canvas) {
      this.clearHover()

      return
    }

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

    if (e.nativeEvent.target !== this.app.canvas || this.mode !== 'planning') {
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
    if (e.nativeEvent.target !== this.app.canvas || this.pressedToken || this.panned) {
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
