export type IdGenerator = () => string

export const randomIds: IdGenerator = () => globalThis.crypto.randomUUID()

export function sequentialIds(prefix = 'id') {
  let next = 0
  return () => `${prefix}-${++next}`
}
