import { useEventListener } from '@vueuse/core'
import { defineStore } from 'pinia'
import { reactive, ref, shallowRef } from 'vue'
import type { HeroId, ItemId, LaneId, StarLevel } from '@/content/ids'
import { useHaptics } from '../composables/useHaptics'
import { useBoardStore } from './board'
import { useMatchStore } from './match'

export type DragPayload =
  | { readonly kind: 'hero'; readonly uid: string; readonly heroId: HeroId; readonly stars: StarLevel }
  | { readonly kind: 'item'; readonly index: number; readonly itemId: ItemId }

export type DropTarget =
  | { readonly kind: 'lane'; readonly lane: LaneId }
  | { readonly kind: 'bench' }
  | { readonly kind: 'sell' }
  | { readonly kind: 'hero'; readonly uid: string }

const DRAG_THRESHOLD = 6
const LANE_IDS = new Set<string>(['top', 'mid', 'bot'])

/** Parses `data-drop` attributes: "bench", "sell", "hero:<uid>" or "lane:<id>". */
function parseDropAttribute(value: string): DropTarget | null {
  const [kind, id] = value.split(':')
  if (kind === 'bench') {
    return { kind: 'bench' }
  }

  if (kind === 'sell') {
    return { kind: 'sell' }
  }

  if (kind === 'hero' && id) {
    return {
      kind: 'hero',
      uid: id,
    }
  }

  if (kind === 'lane' && id && LANE_IDS.has(id)) {
    return {
      kind: 'lane',
      lane: id as LaneId,
    }
  }

  return null
}

function accepts(payload: DragPayload, target: DropTarget) {
  if (payload.kind === 'hero') {
    return target.kind !== 'hero'
  }

  return target.kind === 'hero' || target.kind === 'sell'
}

/**
 * Drag and drop that spans HTML panels and the Pixi board. Sources call `press`;
 * targets are either `[data-drop]` elements or lanes and hero tokens on the canvas.
 */
export const useDragStore = defineStore('drag', () => {
  const match = useMatchStore()
  const board = useBoardStore()
  const haptics = useHaptics()
  const payload = shallowRef<DragPayload | null>(null)
  const target = shallowRef<DropTarget | null>(null)
  const active = ref(false)

  const pointer = reactive({
    x: 0,
    y: 0,
  })

  let origin = {
    x: 0,
    y: 0,
  }

  let stops: (() => void)[] = []

  function press(next: DragPayload, clientX: number, clientY: number) {
    end()

    if (!match.isPlanning) {
      if (next.kind === 'hero') {
        match.select(next.uid)
      }

      return
    }

    payload.value = next

    origin = {
      x: clientX,
      y: clientY,
    }

    pointer.x = clientX
    pointer.y = clientY

    stops = [
      useEventListener(window, 'pointermove', onMove),
      useEventListener(window, 'pointerup', onUp),
      useEventListener(window, 'pointercancel', end),
    ]
  }

  function onMove(e: PointerEvent) {
    pointer.x = e.clientX
    pointer.y = e.clientY

    if (!active.value && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < DRAG_THRESHOLD) {
      return
    }

    if (!active.value) {
      haptics.buzz('pickUp')
    }

    active.value = true
    target.value = resolve(e.clientX, e.clientY)
    const current = payload.value
    const lane = target.value?.kind === 'lane' ? target.value.lane : null
    board.renderer?.setDrag(current?.kind === 'hero' ? current.uid : null, true, lane)
  }

  function onUp() {
    const current = payload.value
    if (current) {
      if (active.value) {
        drop(current, target.value)
      } else {
        click(current)
      }
    }

    end()
  }

  function end() {
    for (const stop of stops) {
      stop()
    }

    stops = []
    payload.value = null
    target.value = null
    active.value = false
    board.renderer?.setDrag(null, false, null)
  }

  function resolve(x: number, y: number): DropTarget | null {
    const current = payload.value
    if (!current) {
      return null
    }

    const element = document
      .elementsFromPoint(x, y)
      .find((el): el is HTMLElement => el instanceof HTMLElement && el.dataset.drop !== undefined)

    const fromDom = element ? parseDropAttribute(element.dataset.drop ?? '') : null
    if (fromDom) {
      return accepts(current, fromDom) ? fromDom : null
    }

    const renderer = board.renderer
    if (!renderer) {
      return null
    }

    if (current.kind === 'item') {
      const uid = renderer.tokenAtClient(x, y)
      return uid
        ? {
            kind: 'hero',
            uid,
          }
        : null
    }

    const lane = renderer.laneAtClient(x, y)
    return lane
      ? {
          kind: 'lane',
          lane,
        }
      : null
  }

  function drop(current: DragPayload, where: DropTarget | null) {
    if (where) {
      haptics.buzzIfAccepted('drop', () => place(current, where))
    }
  }

  function place(current: DragPayload, where: DropTarget) {
    if (current.kind === 'hero') {
      if (where.kind === 'lane') {
        match.move(current.uid, where.lane)
      } else if (where.kind === 'bench') {
        match.move(current.uid, 'bench')
      } else if (where.kind === 'sell') {
        match.sell(current.uid)
      }

      return
    }

    if (where.kind === 'hero') {
      match.equip(current.index, where.uid)
    } else if (where.kind === 'sell') {
      match.sellItem(current.index)
    }
  }

  function click(current: DragPayload) {
    if (current.kind === 'hero') {
      match.select(current.uid)
    } else {
      match.selectItem(current.index)
    }
  }

  return {
    payload,
    target,
    active,
    pointer,
    press,
    end,
  }
})
