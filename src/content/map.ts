import type { LaneId, TeamId } from './ids'

type Point = readonly [number, number]

export const BASES: Readonly<Record<TeamId, Point>> = {
  0: [115, 885],
  1: [885, 115],
}

/** Lane waypoints from team 0's base to team 1's base. */
export const LANE_WAYPOINTS: Readonly<Record<LaneId, readonly Point[]>> = {
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
}

export const RIVER: readonly Point[] = [
  [20, 30],
  [170, 190],
  [330, 330],
  [500, 500],
  [670, 670],
  [830, 810],
  [980, 970],
]
