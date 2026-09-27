/** What a coach did with their gold over the whole match. */
export interface Ledger {
  heroesBought: number
  heroesSold: number
  promotions: number
  itemsBought: number
  itemsSold: number
  rerolls: number
  xpBought: number
  goldSpent: number
  goldFromSales: number
}

export const emptyLedger = (): Ledger => ({
  heroesBought: 0,
  heroesSold: 0,
  promotions: 0,
  itemsBought: 0,
  itemsSold: 0,
  rerolls: 0,
  xpBought: 0,
  goldSpent: 0,
  goldFromSales: 0,
})
