const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "5 minutes ago", "yesterday" and so on, in the given locale. */
export function relativeTime(iso: string, locale: string, now = Date.now()) {
  const seconds = (new Date(iso).getTime() - now) / 1000
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return format.format(Math.round(seconds / size), unit)
    }
  }

  return format.format(0, 'minute')
}

export const winRate = (wins: number, matches: number) => (matches ? Math.round((wins / matches) * 100) : 0)
