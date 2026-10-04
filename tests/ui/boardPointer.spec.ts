// @vitest-environment happy-dom
import mitt from 'mitt'
import { Point, type FederatedPointerEvent } from 'pixi.js'
import { describe, expect, it, vi } from 'vitest'
import { BoardRenderer, type BoardEvents } from '@/rendering/BoardRenderer'
import type { HeroHit } from '@/rendering/views/HeroToken'

interface PointerHandlers {
  onPointerMove(event: FederatedPointerEvent): void
  onPointerDown(event: FederatedPointerEvent): void
  onPointerTap(event: FederatedPointerEvent): void
}

/** Exercise input routing without starting a WebGL canvas or a battle. */
function board(mode: 'planning' | 'battle' = 'planning') {
  const canvas = document.createElement('canvas')

  const hit: HeroHit = {
    uid: 'hero',
    team: 0,
  }

  const planning = {
    heroAt: vi.fn(() => hit),
    tokenAt: vi.fn(() => hit.uid),
    setHover: vi.fn(),
  }

  const battle = {
    heroAt: vi.fn(() => hit),
    setHovered: vi.fn(),
  }

  const events = mitt<BoardEvents>()

  const renderer = Object.assign(Object.create(BoardRenderer.prototype), {
    app: { canvas },
    board: { toLocal: (point: Point) => point },
    map: { nearestLane: () => 'mid' },
    planning,
    battle,
    events,
    mode,
    placing: true,
    hovered: null,
    pressedToken: false,
  }) as PointerHandlers

  return {
    renderer,
    canvas,
    planning,
    battle,
    events,
    hit,
  }
}

function pointer(target: HTMLElement) {
  const nativeEvent = new PointerEvent('pointermove')
  target.dispatchEvent(nativeEvent)

  return {
    nativeEvent,
    global: new Point(100, 100),
    clientX: 100,
    clientY: 100,
  } as FederatedPointerEvent
}

describe('board input behind HTML cards', () => {
  it.each(['planning', 'battle'] as const)('clears %s hover when the pointer enters a card', (mode) => {
    const { renderer, canvas, planning, battle, events, hit } = board(mode)
    const hovered = vi.fn()
    events.on('heroHovered', hovered)
    renderer.onPointerMove(pointer(canvas))
    expect(hovered).toHaveBeenLastCalledWith(hit)

    const cardText = document.createElement('span')
    renderer.onPointerMove(pointer(cardText))

    expect(hovered).toHaveBeenLastCalledWith(null)
    expect(planning.setHover).toHaveBeenLastCalledWith(null, null)
    expect(battle.setHovered).toHaveBeenLastCalledWith(null)
    expect(canvas.style.cursor).toBe('default')
    expect(planning.heroAt.mock.calls.length + battle.heroAt.mock.calls.length).toBe(1)
  })

  it('does not select or place a hero through a card, while canvas presses still select heroes', () => {
    const { renderer, canvas, planning, events } = board()
    const pressed = vi.fn()
    const tapped = vi.fn()
    const lane = vi.fn()
    events.on('heroPressed', pressed)
    events.on('heroTapped', tapped)
    events.on('lanePicked', lane)
    const card = document.createElement('article')

    renderer.onPointerDown(pointer(card))
    renderer.onPointerTap(pointer(card))

    expect(planning.tokenAt).not.toHaveBeenCalled()
    expect(pressed).not.toHaveBeenCalled()
    expect(tapped).not.toHaveBeenCalled()
    expect(lane).not.toHaveBeenCalled()

    renderer.onPointerDown(pointer(canvas))

    expect(pressed).toHaveBeenCalledWith({
      uid: 'hero',
      clientX: 100,
      clientY: 100,
    })
  })

  it('keeps lane clicks on the canvas available while a hero is selected', () => {
    const { renderer, canvas, planning, events } = board()
    planning.heroAt.mockReturnValue(null as unknown as HeroHit)
    const lane = vi.fn()
    events.on('lanePicked', lane)

    renderer.onPointerTap(pointer(canvas))

    expect(lane).toHaveBeenCalledWith('mid')
  })
})
