import { useLocalStorage } from '@vueuse/core'
import { driver, type Side } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useI18n } from 'vue-i18n'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import type { MessageSchema } from '../i18n'
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
  readonly before?: () => void
}

/**
 * Coach-mark tour: dims the screen, cuts a hole around one widget at a time
 * and explains what it is for. Targets are `[data-tour]` attributes in the HUD.
 */
export function useTutorial() {
  const { t } = useI18n<{ message: MessageSchema }>()
  const store = useMatchStore()
  const pause = usePauseStore()
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
      before: () => (store.shopTab = 'heroes'),
    },
    {
      key: 'economy',
      target: '[data-tour="economy"]',
      side: 'left',
    },
    {
      key: 'bench',
      target: '[data-tour="bench"]',
      side: 'right',
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
    },
    {
      key: 'items',
      target: '[data-tour="shop-items"]',
      side: 'left',
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
      ...(stop.before ? { onHighlightStarted: stop.before } : {}),
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
