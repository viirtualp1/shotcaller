import assert from 'node:assert/strict'
import test from 'node:test'
import { pickBrowser } from './play.ts'

test('prefers Edge over Chrome', () => {
  const candidates = ['C:\\Edge\\msedge.exe', 'C:\\Chrome\\chrome.exe']

  assert.equal(
    pickBrowser(candidates, (file) => file.includes('Edge')),
    candidates[0],
  )

  assert.equal(
    pickBrowser(candidates, (file) => file.includes('Chrome')),
    candidates[1],
  )

  assert.equal(
    pickBrowser(candidates, () => false),
    null,
  )
})
