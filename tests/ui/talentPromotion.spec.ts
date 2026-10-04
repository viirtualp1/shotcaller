// @vitest-environment happy-dom
import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMatchStore } from '@/ui/stores/match'

vi.mock('@/ui/stores/profile', () => ({
  useProfileStore: () => ({ forgetLast: vi.fn() }),
}))

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => disposePinia(getActivePinia()!))

describe('promotion information', () => {
  it('opens the promoted hero for its talent choice and keeps both talents on the third star', () => {
    const match = useMatchStore()
    match.startSandbox()
    match.recruit('archer')
    match.recruit('archer')
    expect(match.showsCard).toBe(false)
    match.recruit('archer')

    expect(match.selected?.hero).toMatchObject({
      heroId: 'archer',
      stars: 2,
      pendingTalent: true,
    })

    const first = match.selectedUid!
    match.chooseTalent(first, 0)
    match.clearSelection()

    for (let i = 0; i < 3; i++) {
      match.recruit('archer')
    }

    expect(match.selectedUid).not.toBe(first)
    match.chooseTalent(match.selectedUid!, 1)
    match.clearSelection()

    for (let i = 0; i < 3; i++) {
      match.recruit('archer')
    }

    expect(match.view?.human.bench).toHaveLength(1)

    expect(match.view?.human.bench[0]).toMatchObject({
      stars: 3,
      pendingTalent: false,
    })

    expect(match.showsCard).toBe(false)
  })
})
