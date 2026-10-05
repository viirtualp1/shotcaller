// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReportReason } from '@/application/social/friends'
import ReportCoach from '@/ui/components/social/ReportCoach.vue'
import { i18n } from '@/ui/i18n'

const friends = reactive({
  report: vi.fn<(id: string, reason: ReportReason, details: string) => Promise<boolean>>(),
})

vi.mock('@/ui/stores/friends', () => ({ useFriendsStore: () => friends }))

let app: App
const close = vi.fn()

const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('button')]
const byText = (text: string) => buttons().find((button) => button.textContent?.trim() === text)

async function settle() {
  for (let i = 0; i < 4; i++) {
    await nextTick()
  }
}

const props = {
  coachId: 'coach-2',
  name: 'Flex',
  onClose: close,
}

beforeEach(() => {
  vi.clearAllMocks()

  app = createApp({ render: () => h(ReportCoach, props) }).use(i18n)
  app.mount(document.body.appendChild(document.createElement('div')))
})

afterEach(() => {
  app.unmount()
  document.body.innerHTML = ''
})

describe('reporting a player', () => {
  it('needs a reason, then sends it with the note and thanks the player', async () => {
    friends.report.mockResolvedValue(true)

    expect(byText('Send report')?.disabled).toBe(true)

    byText('Abuse in chat')!.click()

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
    friends.report.mockResolvedValue(false)

    byText('Cheating')!.click()
    await settle()
    byText('Send report')!.click()
    await settle()

    expect(document.querySelector('[role="alert"]')).not.toBeNull()
    expect(byText('Send report')?.disabled).toBe(false)
  })
})
