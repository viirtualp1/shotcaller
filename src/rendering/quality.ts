/** Bound the backing canvas on high-DPI tablets and monitors without changing CSS geometry. */
export function boardResolution(width: number, height: number, pixelRatio: number) {
  const pixels = Math.max(1, width * height)
  return Math.max(1, Math.min(pixelRatio || 1, 2, Math.sqrt(2_000_000 / pixels)))
}
