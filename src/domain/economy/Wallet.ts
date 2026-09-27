import { err, ok, type Result } from 'neverthrow'
import type { DomainError } from '../errors'

export class Wallet {
  constructor(private amount: number) {}

  get gold(): number {
    return this.amount
  }

  spend(cost: number): Result<void, DomainError> {
    if (cost > this.amount) return err({ code: 'notEnoughGold' })
    this.amount -= cost
    return ok(undefined)
  }

  earn(gold: number): void {
    this.amount += gold
  }

  restore(gold: number): void {
    this.amount = gold
  }
}
