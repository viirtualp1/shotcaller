import assert from 'node:assert/strict'
import test from 'node:test'
import { GAME_LAUNCH, GAME_URL } from './play.ts'

test('opens the game in the system default browser', () => {
  assert.deepEqual(GAME_LAUNCH, ['/c', 'start', '', GAME_URL])
})
