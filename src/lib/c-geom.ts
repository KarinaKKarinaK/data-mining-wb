import type { Pt } from './stats'

export function clipSeg(p: Pt, q: Pt, x0: number, x1: number, y0: number, y1: number): Pt[] {
  const dx = q.x - p.x
  const dy = q.y - p.y
  let t0 = 0
  let t1 = 1
  const tests: [number, number][] = [
    [-dx, p.x - x0],
    [dx, x1 - p.x],
    [-dy, p.y - y0],
    [dy, y1 - p.y],
  ]
  for (const [a, b] of tests) {
    if (a === 0) {
      if (b < 0) return []
      continue
    }
    const t = b / a
    if (a < 0) {
      if (t > t1) return []
      if (t > t0) t0 = t
    } else {
      if (t < t0) return []
      if (t < t1) t1 = t
    }
  }
  return [
    { x: p.x + t0 * dx, y: p.y + t0 * dy },
    { x: p.x + t1 * dx, y: p.y + t1 * dy },
  ]
}

export function lineInBox(w0: number, w1: number, w2: number, lo: number, hi: number): Pt[] {
  const big = 1e4
  if (Math.abs(w2) > 1e-9) return clipSeg({ x: -big, y: (-w0 + w1 * big) / w2 }, { x: big, y: (-w0 - w1 * big) / w2 }, lo, hi, lo, hi)
  if (Math.abs(w1) > 1e-9) return clipSeg({ x: -w0 / w1, y: -big }, { x: -w0 / w1, y: big }, lo, hi, lo, hi)
  return []
}
