import { err, ok, type Result } from 'neverthrow'
import type { ItemId } from '@/content/ids'
import { isUpgraded, ITEM_SLOTS, STASH_SIZE, upgradeOf } from '@/content/items'
import type { DomainError } from '../errors'

/** A shop item that a second copy turns into its upgrade; upgrades merge no further. */
export const mergesWith = (item: ItemId, other: ItemId) => item === other && !isUpgraded(item)

/** A free slot takes the item. A full hero still takes a copy of something it already carries. */
export function heroCanEquip(carried: readonly ItemId[], item: ItemId) {
  return carried.length < ITEM_SLOTS || carried.some((owned) => mergesWith(item, owned))
}

export class Stash {
  private stored: ItemId[] = []

  constructor(readonly size: number = STASH_SIZE) {}

  get items() {
    return this.stored
  }

  get isFull() {
    return this.stored.length >= this.size
  }

  /** A full stash still takes a copy of an item it holds: the two merge into one. */
  accepts(item: ItemId) {
    return !this.isFull || this.stored.some((stored) => mergesWith(item, stored))
  }

  /** Returns the upgrade when the item merged with a copy already here. */
  put(item: ItemId): Result<ItemId | null, DomainError> {
    if (!this.accepts(item)) {
      return err({ code: 'stashFull' })
    }

    const copy = this.stored.findIndex((stored) => mergesWith(item, stored))
    if (copy >= 0 && !isUpgraded(item)) {
      const upgrade = upgradeOf(item)
      this.stored[copy] = upgrade

      return ok(upgrade)
    }

    this.stored.push(item)

    return ok(null)
  }

  take(index: number): Result<ItemId, DomainError> {
    const item = this.stored[index]
    if (!item) {
      return err({ code: 'itemNotFound' })
    }

    this.stored.splice(index, 1)

    return ok(item)
  }

  restore(items: readonly ItemId[]) {
    this.stored = items.slice(0, this.size)
  }
}
