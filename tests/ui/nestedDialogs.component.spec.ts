// @vitest-environment happy-dom
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { createApp, h, nextTick, reactive, ref, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReportCoachDialog from '@/ui/components/social/ReportCoachDialog.vue'
import { i18n } from '@/ui/i18n'

const friends = reactive({ report: vi.fn(async () => 'sent' as const) })

vi.mock('@/ui/stores/friends', () => ({ useFriendsStore: () => friends }))
vi.mock('@/ui/composables/useModal', () => ({ useModal: () => undefined }))

let app: App
const parent = ref(true)
const child = ref(false)

async function settle() {
  for (let i = 0; i < 6; i++) {
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

const sheets = () => [...document.querySelectorAll<HTMLElement>('[role="dialog"]')]

beforeEach(async () => {
  parent.value = true
  child.value = false

  /* A coach's profile with the report dialog inside it, as CoachProfileDialog has it. */
  app = createApp({
    render: () =>
      h(
        DialogRoot,
        {
          open: parent.value,
          'onUpdate:open': (value: boolean) => (parent.value = value),
        },
        () =>
          h(DialogPortal, () => [
            h(DialogOverlay, { class: 'overlay' }),
            h(
              DialogContent,
              {
                class: 'sheet',
                'aria-describedby': undefined,
              },
              () => [
                h(DialogTitle, () => 'Profile'),
                h(
                  'button',
                  {
                    id: 'report',
                    onClick: () => (child.value = true),
                  },
                  'Report',
                ),
                h(ReportCoachDialog, {
                  coachId: 'coach-2',
                  name: 'Flex',
                  open: child.value,
                  'onUpdate:open': (value: boolean) => (child.value = value),
                }),
              ],
            ),
          ]),
      ),
  }).use(i18n)

  app.mount(document.body.appendChild(document.createElement('div')))
  await settle()

  document.querySelector<HTMLButtonElement>('#report')!.click()
  await settle()
})

afterEach(() => {
  app.unmount()
  document.body.innerHTML = ''
})

describe('a dialog opened from a dialog', () => {
  it('opens on top of the first one', () => {
    expect(child.value).toBe(true)
    expect(sheets()).toHaveLength(2)
  })

  it('closes alone on Escape, leaving the dialog under it open', async () => {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }),
    )

    await settle()

    expect(child.value).toBe(false)
    expect(parent.value).toBe(true)
  })

  it('closes alone from its own close button', async () => {
    document.querySelector<HTMLButtonElement>('.report [aria-label="Close"]')!.click()
    await settle()

    expect(child.value).toBe(false)
    expect(parent.value).toBe(true)
  })

  it('closes alone when the backdrop around it is pressed', async () => {
    const overlays = document.querySelectorAll<HTMLElement>('.overlay')
    const top = overlays[overlays.length - 1]!
    top.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    top.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    top.click()
    await settle()

    expect(child.value).toBe(false)
    expect(parent.value).toBe(true)
  })
})
