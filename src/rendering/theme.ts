import type { TeamId } from '@/content/ids'

export const PALETTE = {
  board: 0x1c2824,
  boardEdge: 0x18221f,
  boardCenter: 0x24342e,
  chalk: 0xece8dc,
  chalkDim: 0xa8b4ac,
  ink: 0x15201c,
  gold: 0xf4c55b,
  mana: 0x8fb8ff,
  heal: 0x7fe0b4,
  damage: 0xff7060,
  frost: 0x8fd6ff,
  river: 0x78b4d2,
  treeLine: 0x96c896,
  treeFill: 0x3c6446,
  abyssCenter: 0x141d22,
  abyssEdge: 0x0c1215,
  bridge: 0x2a3833,
} as const

export const TEAM_COLORS: Readonly<Record<TeamId, number>> = {
  0: 0x6cc4ff,
  1: 0xff7060,
}

export const FONTS = {
  hand: 'Caveat, "Segoe Print", "Comic Sans MS", cursive',
  ui: 'Onest, "Segoe UI", system-ui, sans-serif',
} as const

export const cssColor = (value: number, alpha = 1) => {
  const r = (value >> 16) & 0xff
  const g = (value >> 8) & 0xff
  const b = value & 0xff
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
