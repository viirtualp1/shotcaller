import { markRaw, onBeforeUnmount, onMounted, shallowRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BoardLabels } from '@/rendering/labels'
import type { ModeId, TeamId } from '@/content/ids'
import { MAPS } from '@/content/map'
import { DEFAULT_MODE } from '@/content/modes'
import { BoardRenderer } from '@/rendering/BoardRenderer'
import { Perspective } from '@/rendering/perspective'
import { FONTS } from '@/rendering/theme'
import { laneMapFor } from '@/simulation/map/LaneMap'
import type { MessageSchema } from '../i18n'

async function loadFonts() {
  const faces = [`700 32px ${FONTS.hand}`, `700 11px ${FONTS.ui}`]
  await Promise.all(faces.map((face) => document.fonts.load(face))).catch(() => undefined)
}

export function useBoardLabels(): BoardLabels {
  const { t } = useI18n<{ message: MessageSchema }>()
  return {
    laneName: (id) => t(`lanes.${id}`),
    baseName: (team) => t(team === 0 ? 'teams.ourBase' : 'teams.theirBase'),
    combatText: (kind) => t(`battle.${kind}`),
  }
}

/** `side` is the team the player fights as and `mode` the map; both are fixed for a renderer's lifetime. */
export function useBoardRenderer(
  host: Ref<HTMLElement | null>,
  side: TeamId = 0,
  mode: ModeId = DEFAULT_MODE,
) {
  const renderer = shallowRef<BoardRenderer | null>(null)
  const labels = useBoardLabels()
  let disposed = false

  onMounted(async () => {
    await loadFonts()

    if (disposed || !host.value) {
      return
    }

    const created = await BoardRenderer.create(
      host.value,
      labels,
      new Perspective(side, MAPS[mode].mirror),
      laneMapFor(mode),
    )

    if (disposed) {
      created.destroy()
    } else {
      renderer.value = markRaw(created)
    }
  })

  onBeforeUnmount(() => {
    disposed = true
    renderer.value?.destroy()
    renderer.value = null
  })

  return renderer
}
