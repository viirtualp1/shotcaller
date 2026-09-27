export type IdGenerator = () => string

export const randomIds: IdGenerator = () => globalThis.crypto.randomUUID()

export function sequentialIds(prefix = 'id'): IdGenerator {
  let next = 0
  return () => `${prefix}-${++next}`
}
