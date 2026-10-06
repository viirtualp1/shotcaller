import { useDocumentVisibility } from '@vueuse/core'
import { markRaw, onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BoardLabels } from '@/rendering/labels'
import type { ModeId, TeamId } from '@/content/ids'
import { MAPS } from '@/content/map'
import { DEFAULT_MODE } from '@/content/modes'
import type { BoardRenderer } from '@/rendering/BoardRenderer'
import { Perspective } from '@/rendering/perspective'
import { FONTS } from '@/rendering/theme'
import { laneMapFor } from '@/simulation/map/LaneMap'
import type { MessageSchema } from '../i18n'
import { useSettingsStore } from '../stores/settings'

const FULL_FPS = 60
/** Half the frames: animations stay smooth enough to follow and the phone stays cool. */
const SAVER_FPS = 30

async function loadFonts() {
  const faces = [`700 32px ${FONTS.hand}`, `700 11px ${FONTS.ui}`]
  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([
    Promise.all(faces.map((face) => document.fonts.load(face))).catch(() => undefined),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, 1500)
    }),
  ])

  clearTimeout(timer)
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
  /** While this is false the canvas keeps its last frame. Omitted, the board runs whenever the tab is visible. */
  running?: Ref<boolean>,
  /** Whether a calm moment allows fewer frames; the battery saver setting always does. */
  calm: () => boolean = () => false,
) {
  const renderer = shallowRef<BoardRenderer | null>(null)
  const labels = useBoardLabels()
  const settings = useSettingsStore()
  let disposed = false
  const visibility = useDocumentVisibility()
  watch([renderer, visibility, () => running?.value ?? true], ([board, state, on]) => {
    board?.setActive(state === 'visible' && on)
  })

  watch([renderer, () => settings.batterySaver || calm()], ([board, saving]) => {
    board?.setMaxFPS(saving ? SAVER_FPS : FULL_FPS)
  })

  onMounted(async () => {
    const [module] = await Promise.all([import('@/rendering/BoardRenderer'), loadFonts()])

    if (disposed || !host.value) {
      return
    }

    const created = await module.BoardRenderer.create(
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
