export type DomainError =
  | { readonly code: 'notEnoughGold' }
  | { readonly code: 'benchFull' }
  | { readonly code: 'boardFull'; readonly capacity: number }
  | { readonly code: 'slotEmpty' }
  | { readonly code: 'maxLevel' }
  | { readonly code: 'heroNotFound' }
  | { readonly code: 'emptyBoard' }
  | { readonly code: 'wrongPhase' }
  | { readonly code: 'opponentNotReady' }
  | { readonly code: 'stashFull' }
  | { readonly code: 'itemSlotsFull' }
  | { readonly code: 'itemNotFound' }
  | { readonly code: 'laneClosed' }
  | { readonly code: 'invalidBoard' }
  | { readonly code: 'talentUnavailable' }

export type DomainErrorCode = DomainError['code']
