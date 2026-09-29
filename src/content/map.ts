import type { LaneId, ModeId, TeamId, TowerSlot } from './ids'

export type Point = readonly [number, number]

/**
 * How the board turns for the player who fights as team 1, so their base is drawn where team 0's is:
 * corner maps swap x and y, left-to-right maps flip horizontally.
 */
export type MapMirror = 'transpose' | 'flipX'

/** Summoner's Rift has a jungle and a river, Twisted Treeline a jungle between two lanes, Howling Abyss a bridge. */
export type MapStyle = 'rift' | 'treeline' | 'abyss'

export interface TowerSpot {
  readonly lane: LaneId
  /** Share of the lane from the tower's own base. */
  readonly along: number
}

export interface MapDefinition {
  readonly style: MapStyle
  readonly mirror: MapMirror
  readonly bases: Readonly<Record<TeamId, Point>>
  /** Waypoints from team 0's base to team 1's base. */
  readonly lanes: Readonly<Partial<Record<LaneId, readonly Point[]>>>
  readonly towers: Readonly<Partial<Record<TowerSlot, TowerSpot>>>
  readonly river: readonly Point[] | null
  /** Where heal relics appear; empty on maps without them. */
  readonly relics: readonly Point[]
  /**
   * Solid deck of a bridge map. Units stay on it: the lane is `width` across, with a round platform
   * around each base. A shove cannot carry a body past the sides.
   */
  readonly deck?: {
    readonly width: number
    readonly platform: number
  }
  readonly laneLabels: Readonly<Partial<Record<LaneId, Point>>>
  readonly baseLabels: Readonly<Record<TeamId, Point>>
}

const RIFT: MapDefinition = {
  style: 'rift',
  mirror: 'transpose',
  bases: {
    0: [115, 885],
    1: [885, 115],
  },
  lanes: {
    top: [
      [115, 885],
      [95, 770],
      [95, 160],
      [160, 95],
      [770, 95],
      [885, 115],
    ],
    mid: [
      [115, 885],
      [885, 115],
    ],
    bot: [
      [115, 885],
      [230, 905],
      [840, 905],
      [905, 840],
      [905, 230],
      [885, 115],
    ],
  },
  towers: {
    top: {
      lane: 'top',
      along: 0.3,
    },
    mid: {
      lane: 'mid',
      along: 0.3,
    },
    bot: {
      lane: 'bot',
      along: 0.3,
    },
  },
  river: [
    [20, 30],
    [170, 190],
    [330, 330],
    [500, 500],
    [670, 670],
    [830, 810],
    [980, 970],
  ],
  relics: [],
  laneLabels: {
    top: [172, 168],
    mid: [455, 605],
    bot: [828, 832],
  },
  baseLabels: {
    0: [130, 972],
    1: [870, 30],
  },
}

/* Bases face each other across the jungle; one lane bends over it, the other under it. */
const TREELINE: MapDefinition = {
  style: 'treeline',
  mirror: 'flipX',
  bases: {
    0: [120, 500],
    1: [880, 500],
  },
  lanes: {
    top: [
      [120, 500],
      [165, 330],
      [295, 205],
      [500, 165],
      [705, 205],
      [835, 330],
      [880, 500],
    ],
    bot: [
      [120, 500],
      [165, 670],
      [295, 795],
      [500, 835],
      [705, 795],
      [835, 670],
      [880, 500],
    ],
  },
  towers: {
    top: {
      lane: 'top',
      along: 0.3,
    },
    bot: {
      lane: 'bot',
      along: 0.3,
    },
  },
  river: null,
  relics: [],
  laneLabels: {
    top: [500, 112],
    bot: [500, 890],
  },
  baseLabels: {
    0: [120, 640],
    1: [880, 640],
  },
}

/*
 * A single bridge across the whole diagonal, two towers a side and relics where the fights happen. The towers
 * stand close to home, so the middle of the bridge is out of their reach and the teams meet on even ground.
 */
const ABYSS: MapDefinition = {
  style: 'abyss',
  mirror: 'transpose',
  bases: {
    0: [80, 920],
    1: [920, 80],
  },
  lanes: {
    mid: [
      [80, 920],
      [920, 80],
    ],
  },
  towers: {
    mid: {
      lane: 'mid',
      along: 0.28,
    },
    inner: {
      lane: 'mid',
      along: 0.14,
    },
  },
  river: null,
  relics: [
    [440, 560],
    [560, 440],
  ],
  deck: {
    width: 124,
    platform: 170,
  },
  laneLabels: {
    mid: [405, 525],
  },
  baseLabels: {
    0: [205, 975],
    1: [795, 25],
  },
}

export const MAPS: Readonly<Record<ModeId, MapDefinition>> = {
  threeLanes: RIFT,
  twoLanes: TREELINE,
  oneLane: ABYSS,
}
