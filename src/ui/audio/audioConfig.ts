/**
 * The one place for game audio: replace URLs or tune each clip here.
 * `volume` is multiplied by the player's Music or Effects setting.
 */
export const MUSIC_TRACKS = {
  preparation: {
    url: 'audio/music/preparation-peaceful-ville.mp3',
    volume: 1,
    fadeInMs: 1000,
  },
  battle: {
    url: 'audio/music/battle-theme-a.mp3',
    volume: 1,
    fadeInMs: 1000,
  },
  climax: {
    url: 'audio/music/determined-pursuit.wav',
    volume: 1,
    fadeInMs: 1000,
  },
} as const

export type MusicTrackId = keyof typeof MUSIC_TRACKS

export type AudioClip = {
  readonly urls: readonly string[]
  /** Relative to the player's Effects setting, from 0 to 1. */
  readonly volume: number
  readonly cooldownMs?: number
  readonly pitchSemitones?: number
}

const numberedUrls = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}_${String(index).padStart(3, '0')}.ogg`)

const JINGLE_URLS = ['HIT', 'NES', 'PIZZI', 'SAX', 'STEEL'].flatMap((group) =>
  Array.from(
    { length: 17 },
    (_, index) => `audio/jingles/jingles_${group}${String(index).padStart(2, '0')}.ogg`,
  ),
)

export const SOUND_EFFECTS = {
  towerCollapse: {
    urls: ['audio/sfx/tower-collapse.wav'],
    volume: 0.82,
    cooldownMs: 2200,
  },
  towerMiningImpact: {
    urls: numberedUrls('audio/sfx/impactMining', 5),
    volume: 0.54,
  },
  towerPlateImpact: {
    urls: numberedUrls('audio/sfx/impactPlate_heavy', 5),
    volume: 0.42,
  },
  enemyHeroDeath: {
    urls: numberedUrls('audio/sfx/impactBell_heavy', 5),
    volume: 0.62,
    cooldownMs: 200,
  },
  allyHeroDeath: {
    urls: numberedUrls('audio/sfx/impactPunch_heavy', 5),
    volume: 0.95,
    cooldownMs: 240,
    pitchSemitones: -2.5,
  },
  heal: {
    urls: ['audio/sfx/health-restore.wav'],
    volume: 0.5,
    cooldownMs: 2600,
  },
  roundWon: {
    urls: JINGLE_URLS,
    volume: 0.7,
  },
  roundDrawn: {
    urls: JINGLE_URLS,
    volume: 0.5,
  },
  matchWon: {
    urls: ['audio/sfx/fanfare.ogg'],
    volume: 0.88,
  },
  matchLost: {
    urls: ['audio/sfx/game-over.ogg'],
    volume: 0.88,
  },
} as const satisfies Readonly<Record<string, AudioClip>>

export type SoundEffect = keyof typeof SOUND_EFFECTS

export const AUDIO_TIMING = {
  musicFadeOutMs: 650,
  towerImpactDelayMs: 500,
  /** Small heals happen too often to deserve a musical cue. */
  minimumHealAmount: 65,
} as const
