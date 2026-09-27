export interface Vec2 {
  x: number
  y: number
}

export const vec2 = (x: number, y: number) => ({
  x,
  y,
})

export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y)

export function direction(from: Vec2, to: Vec2) {
  const d = distance(from, to)
  return d > 1e-6
    ? {
        x: (to.x - from.x) / d,
        y: (to.y - from.y) / d,
      }
    : {
        x: 0,
        y: 0,
      }
}

export const offset = (origin: Vec2, dir: Vec2, length: number) => ({
  x: origin.x + dir.x * length,
  y: origin.y + dir.y * length,
})

export function stepTowards(position: Vec2, target: Vec2, maxStep: number) {
  const d = distance(position, target)
  if (d < 1e-6) {
    return
  }

  const k = Math.min(1, maxStep / d)
  position.x += (target.x - position.x) * k
  position.y += (target.y - position.y) * k
}

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
