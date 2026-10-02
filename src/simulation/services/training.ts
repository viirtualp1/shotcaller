import type { Unit } from '../ecs/components'

/** Camp practice and lane combat have separate targets, including splash damage and summoned units. */
export function trainingTargetAllowed(source: Unit, target: Unit) {
  if (target.training?.goal === 'dummies' && !source.training) {
    return false
  }

  if (target.dummy) {
    return source.training?.goal === 'dummies' && source.training.lane === target.dummyLane
  }

  return source.training?.goal !== 'dummies'
}
