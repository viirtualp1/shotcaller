import seedrandom from 'seedrandom'

export type RngState = seedrandom.State.Arc4

export interface Rng {
  next(): number
  range(min: number, max: number): number
  chance(probability: number): boolean
  state(): RngState
}

/** Always seeds explicitly: seedrandom's own autoseed probes Node's crypto module, which bundlers stub out. */
export function createRng(seed: string = globalThis.crypto.randomUUID(), restored?: RngState): Rng {
  const prng = seedrandom(seed, { state: restored ?? true })
  return {
    next: () => prng(),
    range: (min, max) => min + (max - min) * prng(),
    chance: (probability) => prng() < probability,
    state: () => prng.state() as RngState,
  }
}

export function weightedPick<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T | undefined {
  const total = items.reduce((sum, item) => sum + weight(item), 0)
  if (total <= 0) return undefined
  let roll = rng.next() * total
  for (const item of items) {
    roll -= weight(item)
    if (roll < 0) return item
  }
  return items[items.length - 1]
}
