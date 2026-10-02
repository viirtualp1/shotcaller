import { err, ok, type Result } from 'neverthrow'
import type { DomainError } from '../errors'

/** A coach's gold. An unlimited wallet, on the training ground, pays for anything and always holds the same. */
export class Wallet {
  constructor(
    private amount: number,
    private readonly unlimited = false,
  ) {}

  get gold() {
    return this.amount
  }

  spend(cost: number): Result<void, DomainError> {
    if (this.unlimited) {
      return ok(undefined)
    }

    if (cost > this.amount) {
      return err({ code: 'notEnoughGold' })
    }

    this.amount -= cost

    return ok(undefined)
  }

  earn(gold: number) {
    if (!this.unlimited) {
      this.amount += gold
    }
  }

  restore(gold: number) {
    if (!this.unlimited) {
      this.amount = gold
    }
  }
}
