import { err, ok, type Result } from 'neverthrow'
import type { ItemId } from '@/content/ids'
import { STASH_SIZE } from '@/content/items'
import type { DomainError } from '../errors'

export class Stash {
  private stored: ItemId[] = []

  constructor(readonly size: number = STASH_SIZE) {}

  get items(): readonly ItemId[] {
    return this.stored
  }

  get isFull(): boolean {
    return this.stored.length >= this.size
  }

  put(item: ItemId): Result<void, DomainError> {
    if (this.isFull) return err({ code: 'stashFull' })
    this.stored.push(item)
    return ok(undefined)
  }

  take(index: number): Result<ItemId, DomainError> {
    const item = this.stored[index]
    if (!item) return err({ code: 'itemNotFound' })
    this.stored.splice(index, 1)
    return ok(item)
  }

  restore(items: readonly ItemId[]): void {
    this.stored = items.slice(0, this.size)
  }
}
