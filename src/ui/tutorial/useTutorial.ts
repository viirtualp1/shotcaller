import { useLocalStorage } from '@vueuse/core'
import { driver, type Side } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useI18n } from 'vue-i18n'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import type { MessageSchema } from '../i18n'
import { useDockStore, type DockTab } from '../stores/dock'
import { useMatchStore } from '../stores/match'
import { usePauseStore } from '../stores/pause'

interface TourStop {
  readonly key:
    | 'welcome'
    | 'board'
    | 'shop'
    | 'economy'
    | 'bench'
    | 'place'
    | 'tracker'
    | 'items'
    | 'scoreboard'
    | 'fight'
  readonly target?: string
  readonly side?: Side
  /** On phones and tablets the widget lives in this tab of the dock. */
  readonly dock?: DockTab
}

/** Tab switches render on the next frames; wait for the widget so the spotlight lands on it. */
const APPEAR_TIMEOUT_MS = 800

async function appeared(selector: string | undefined) {
  const deadline = performance.now() + APPEAR_TIMEOUT_MS

  while (selector && !document.querySelector(selector) && performance.now() < deadline) {
    await new Promise(requestAnimationFrame)
  }
}

/**
 * Coach-mark tour: dims the screen, cuts a hole around one widget at a time
 * and explains what it is for. Targets are `[data-tour]` attributes in the HUD.
 */
export function useTutorial() {
  const { t } = useI18n<{ message: MessageSchema }>()
  const store = useMatchStore()
  const pause = usePauseStore()
  const dock = useDockStore()
  const completed = useLocalStorage(STORAGE_KEYS.tutorialCompleted, false)

  const stops: readonly TourStop[] = [
    { key: 'welcome' },
    {
      key: 'board',
      target: '[data-tour="board"]',
      side: 'right',
    },
    {
      key: 'shop',
      target: '[data-tour="shop"]',
      side: 'left',
      dock: 'shop',
    },
    {
      key: 'economy',
      target: '[data-tour="economy"]',
      side: 'left',
      dock: 'shop',
    },
    {
      key: 'bench',
      target: '[data-tour="bench"]',
      side: 'right',
      dock: 'heroes',
    },
    {
      key: 'place',
      target: '[data-tour="board"]',
      side: 'right',
    },
    {
      key: 'tracker',
      target: '[data-tour="tracker"]',
      side: 'right',
      dock: 'lanes',
    },
    {
      key: 'items',
      target: '[data-tour="shop-items"]',
      side: 'left',
      dock: 'shop',
    },
    {
      key: 'scoreboard',
      target: '[data-tour="scoreboard"]',
      side: 'bottom',
    },
    {
      key: 'fight',
      target: '[data-tour="fight"]',
      side: 'top',
    },
  ]

  function toStep(stop: TourStop) {
    return {
      ...(stop.target ? { element: stop.target } : {}),
      popover: {
        title: t(`tutorial.${stop.key}.title`),
        description: t(`tutorial.${stop.key}.text`),
        ...(stop.side
          ? {
              side: stop.side,
              align: 'start' as const,
            }
          : {}),
      },
    }
  }

  /** Opens the panel the next stop points at before driver.js looks for it. */
  async function goTo(index: number, move: () => void) {
    const stop = stops[index]

    if (stop?.dock) {
      dock.tab = stop.dock
    }

    if (stop?.key === 'shop') {
      store.shopTab = 'heroes'
    }

    await appeared(stop?.target)
    move()
  }

  function start() {
    store.clearSelection()
    pause.set('tutorial', true)

    const tour = driver({
      steps: stops.map(toStep),
      showProgress: true,
      progressText: t('tutorial.progress', {
        current: '{{current}}',
        total: '{{total}}',
      }),
      nextBtnText: t('tutorial.next'),
      prevBtnText: t('tutorial.prev'),
      doneBtnText: t('tutorial.done'),
      popoverClass: 'tour-popover',
      overlayColor: '#050807',
      overlayOpacity: 0.74,
      stagePadding: 6,
      stageRadius: 12,
      smoothScroll: true,
      overlayClickBehavior: () => undefined,
      onNextClick: (_element, _step, { driver: tour }) =>
        goTo((tour.getActiveIndex() ?? 0) + 1, tour.moveNext),
      onPrevClick: (_element, _step, { driver: tour }) =>
        goTo((tour.getActiveIndex() ?? 0) - 1, tour.movePrevious),
      onDestroyed: () => {
        completed.value = true
        pause.set('tutorial', false)
      },
    })

    tour.drive()
  }

  return {
    start,
    completed,
  }
}
