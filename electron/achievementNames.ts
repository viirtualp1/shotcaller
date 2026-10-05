/** Steam's API names for achievements, as set up in Steamworks. */
const ACHIEVEMENT_NAME = /^[A-Z0-9_]{1,64}$/

const MAX_ACHIEVEMENTS = 100

/** The achievement names in a message from the game window; anything else in it is dropped. */
export function achievementNames(input: unknown) {
  if (!Array.isArray(input)) {
    return []
  }

  const names = input.filter(
    (name): name is string => typeof name === 'string' && ACHIEVEMENT_NAME.test(name),
  )

  return [...new Set(names)].slice(0, MAX_ACHIEVEMENTS)
}
