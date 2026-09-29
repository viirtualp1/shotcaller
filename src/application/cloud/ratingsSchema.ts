import { z } from 'zod'

const count = z.number().int().nonnegative()

/** A rating for every mode; one the server does not know yet reads as zero. */
export const modeRatingsSchema = z.object({
  threeLanes: count.catch(0),
  twoLanes: count.catch(0),
  oneLane: count.catch(0),
})

export const settledRatingsSchema = z.object({
  ratings: modeRatingsSchema,
  peaks: modeRatingsSchema,
})
