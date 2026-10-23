import type { Pt } from './stats'

export function clipLine(p: Pt, dx: number, dy: number, xr: [number, number], yr: [number, number]): Pt[] {
  let lo = -Infinity
  let hi = Infinity
  const dims: [number, number, [number, number]][] = [
    [p.x, dx, xr],
    [p.y, dy, yr],
  ]
  for (const [o, d, [a, b]] of dims) {
    if (Math.abs(d) < 1e-12) {
      if (o < a || o > b) return []
      continue
    }
    const t1 = (a - o) / d
    const t2 = (b - o) / d
    lo = Math.max(lo, Math.min(t1, t2))
    hi = Math.min(hi, Math.max(t1, t2))
  }
  if (lo > hi) return []
  return [
    { x: p.x + dx * lo, y: p.y + dy * lo },
    { x: p.x + dx * hi, y: p.y + dy * hi },
  ]
}
