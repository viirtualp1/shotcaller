export const TITLE_IDS = ["rookie","scout","tactician","vanguard","trailblazer","quartermaster","pathfinder","duelist","captain","artificer","marshal","ghostHunter","strategist","warcaller","champion","legendKeeper","grandmaster","thronebreaker","commander","shotcaller"] as const
export const FRAME_IDS = ["copper","fern","slate","ember","tide","ivory","amethyst","oak","steel","sunrise","jade","storm","rose","frost","laurel","obsidian","aurora","royal","celestial","sovereign"] as const
export type TitleId = (typeof TITLE_IDS)[number]
export type FrameId = (typeof FRAME_IDS)[number]

export const COACH_PATH_LEVELS = 40

export const FRAMES: Readonly<Record<FrameId, { color: string; pattern: 'solid' | 'dashed' | 'double' }>> = {
  copper: { color: '#be895f', pattern: 'solid' },
  fern: { color: '#7eb884', pattern: 'dashed' },
  slate: { color: '#90a7b0', pattern: 'double' },
  ember: { color: '#df8057', pattern: 'solid' },
  tide: { color: '#63b6c5', pattern: 'dashed' },
  ivory: { color: '#e3d4ac', pattern: 'double' },
  amethyst: { color: '#b498da', pattern: 'solid' },
  oak: { color: '#a1ae69', pattern: 'dashed' },
  steel: { color: '#bac9d0', pattern: 'double' },
  sunrise: { color: '#efba67', pattern: 'solid' },
  jade: { color: '#58cda0', pattern: 'dashed' },
  storm: { color: '#7b9ce0', pattern: 'double' },
  rose: { color: '#da97b0', pattern: 'solid' },
  frost: { color: '#9ad8e3', pattern: 'dashed' },
  laurel: { color: '#c1c36e', pattern: 'double' },
  obsidian: { color: '#a69aad', pattern: 'solid' },
  aurora: { color: '#b4e3c0', pattern: 'dashed' },
  royal: { color: '#d6a1ee', pattern: 'double' },
  celestial: { color: '#8fcaef', pattern: 'solid' },
  sovereign: { color: '#f3cd6b', pattern: 'dashed' },
}

/** One permanent cosmetic at every level; experience continues after the reward path. */
export const COACH_PATH = Array.from({ length: COACH_PATH_LEVELS }, (_, index) => ({
  level: index + 1,
  reward: index % 2 === 0
    ? { kind: 'title' as const, id: TITLE_IDS[Math.floor(index / 2)]! }
    : { kind: 'frame' as const, id: FRAME_IDS[Math.floor(index / 2)]! },
}))
