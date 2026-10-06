// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, ref, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReportReason, ReportResult } from '@/application/social/friends'
import ReportCoachDialog from '@/ui/components/social/ReportCoachDialog.vue'
import { i18n } from '@/ui/i18n'

const friends = reactive({
  report: vi.fn<(id: string, reason: ReportReason, details: string) => Promise<ReportResult>>(),
})

vi.mock('@/ui/stores/friends', () => ({ useFriendsStore: () => friends }))
vi.mock('@/ui/composables/useModal', () => ({ useModal: () => undefined }))

let app: App
const open = ref(true)

const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('button')]
const byText = (text: string) => buttons().find((button) => button.textContent?.trim() === text)

async function settle() {
  for (let i = 0; i < 4; i++) {
    await nextTick()
  }
}

async function choose(reason: ReportReason) {
  const select = document.querySelector('select')!
  select.value = reason
  select.dispatchEvent(new Event('change'))
  await settle()
}

beforeEach(async () => {
  vi.clearAllMocks()
  open.value = true

  app = createApp({
    render: () =>
      h(ReportCoachDialog, {
        coachId: 'coach-2',
        name: 'Flex',
        open: open.value,
        'onUpdate:open': (value: boolean) => {
          open.value = value
        },
      }),
  }).use(i18n)

  app.mount(document.body.appendChild(document.createElement('div')))
  await settle()
})

afterEach(() => {
  app.unmount()
  document.body.innerHTML = ''
})

describe('reporting a player', () => {
  it('warns about false reports', () => {
    expect(document.body.textContent).toContain('can get your own account restricted')
  })

  it('needs a reason, then sends it with the note and thanks the player', async () => {
    friends.report.mockResolvedValue('sent')

    expect(byText('Send report')?.disabled).toBe(true)

    await choose('abuse')

    const note = document.querySelector('textarea')!
    note.value = 'Insults after the duel'
    note.dispatchEvent(new Event('input'))
    await settle()
    byText('Send report')!.click()
    await settle()

    expect(friends.report).toHaveBeenCalledWith('coach-2', 'abuse', 'Insults after the duel')
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Moderators will review')
  })

  it('offers to try again when the report does not go through', async () => {
    friends.report.mockResolvedValue('failed')

    await choose('cheating')
    byText('Send report')!.click()
    await settle()

    expect(document.querySelector('[role="alert"]')).not.toBeNull()
    expect(byText('Send report')?.disabled).toBe(false)
  })

  it('tells a coach who lost the right to report and does not offer to resend', async () => {
    friends.report.mockResolvedValue('restricted')

    await choose('other')
    byText('Send report')!.click()
    await settle()

    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'earlier reports turned out to be false',
    )

    expect(byText('Send report')?.disabled).toBe(true)
  })
})
