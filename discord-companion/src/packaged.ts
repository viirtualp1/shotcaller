import { isSea } from 'node:sea'

/** True inside the single-file installer, false when the bridge is started from source. */
export function isPackaged() {
  return isSea()
}
