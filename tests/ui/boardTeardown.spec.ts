// @vitest-environment happy-dom
import mitt from 'mitt'
import { describe, expect, it, vi } from 'vitest'
import { BoardRenderer, type BoardEvents } from '@/rendering/BoardRenderer'

/** Tear a board down without starting a WebGL canvas: only what `destroy` touches is filled in. */
function board() {
  const surround: { texture: object | null } = { texture: {} }
  const surroundTexture = { destroy: vi.fn() }
  const artTexture = { destroy: vi.fn() }

  const renderer = Object.assign(Object.create(BoardRenderer.prototype), {
    hostObserver: { disconnect: vi.fn() },
    app: {
      canvas: document.createElement('canvas'),
      /* Like Pixi, destroying the stage with its children clears every sprite's texture. */
      destroy: vi.fn(() => (surround.texture = null)),
    },
    battle: { detach: vi.fn() },
    effects: { detach: vi.fn() },
    events: mitt<BoardEvents>(),
    world: { scale: {} },
    lens: { scale: {} },
    camera: { position: {} },
    artTexture,
    surround,
    surroundTexture,
  }) as BoardRenderer

  return {
    renderer,
    artTexture,
    surroundTexture,
  }
}

describe('board teardown', () => {
  it('frees the forest around a close-up board after the stage is gone', () => {
    const { renderer, artTexture, surroundTexture } = board()

    expect(() => renderer.destroy()).not.toThrow()
    expect(artTexture.destroy).toHaveBeenCalled()
    expect(surroundTexture.destroy).toHaveBeenCalled()
  })
})
