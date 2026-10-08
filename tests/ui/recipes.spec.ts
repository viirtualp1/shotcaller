// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { useMatchStore } from '@/ui/stores/match'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('recipe confirmation', () => {
  it('waits for confirmation, supports cancellation and rejects changed ingredients', async () => {
    const match = useMatchStore()
    match.startSandbox('oneLane')
    await nextTick()
    match.buyItem('broadsword')
    match.buyItem('gloves')
    match.requestCombine({ index: 0 }, { index: 1 })
    expect(match.pendingRecipe?.result).toBe('tempestBlade')
    expect(match.view!.human.stash).toHaveLength(2)
    match.pendingRecipe = null
    expect(match.view!.human.stash).toHaveLength(2)
    match.requestCombine({ index: 0 }, { index: 1 })
    match.sellItem(0)
    match.confirmCombine()
    expect(match.view!.human.stash.map((item) => item.itemId)).toEqual(['gloves'])
    match.buyItem('broadsword')
    match.requestCombine({ index: 0 }, { index: 1 })
    match.confirmCombine()
    expect(match.view!.human.stash.map((item) => item.itemId)).toEqual(['tempestBlade'])
  })

  it('closes a pending recipe when the match leaves planning', async () => {
    const match = useMatchStore()
    match.startSandbox('oneLane')
    await nextTick()
    match.buyItem('broadsword')
    match.buyItem('gloves')
    match.requestCombine({ index: 0 }, { index: 1 })
    match.leaveToMenu()
    await nextTick()
    expect(match.pendingRecipe).toBeNull()
  })
})
