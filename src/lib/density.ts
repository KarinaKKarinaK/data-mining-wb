import { dist, type Pt } from './stats'

export type PointType = 'core' | 'border' | 'noise'

export function neighbors(pts: Pt[], eps: number) {
  return pts.map((p, i) => pts.map((q, j) => (dist(p, q) <= eps ? j : -1)).filter((j) => j >= 0 && j !== i))
}

export function dbscan(pts: Pt[], eps: number, minPts: number) {
  const nb = neighbors(pts, eps)
  const core = nb.map((n) => n.length + 1 >= minPts)
  const labels = new Array(pts.length).fill(-1)
  let c = 0
  for (let i = 0; i < pts.length; i++) {
    if (!core[i] || labels[i] !== -1) continue
    labels[i] = c
    const queue = [i]
    while (queue.length) {
      const p = queue.shift()!
      if (!core[p]) continue
      for (const q of nb[p]) {
        if (labels[q] === -1) {
          labels[q] = c
          queue.push(q)
        }
      }
    }
    c++
  }
  const types: PointType[] = labels.map((l, i) => (core[i] ? 'core' : l >= 0 ? 'border' : 'noise'))
  return { labels, types, clusters: c, counts: nb.map((n) => n.length + 1) }
}

export function kDistances(pts: Pt[], k: number) {
  return pts.map((p, i) => {
    const d = pts.filter((_, j) => j !== i).map((q) => dist(p, q)).sort((a, b) => a - b)
    return d[Math.min(k, d.length) - 1] ?? 0
  })
}

export function knnIdx(pts: Pt[], i: number, k: number) {
  return pts
    .map((q, j) => ({ j, d: dist(pts[i], q) }))
    .filter((o) => o.j !== i)
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
}

export function lof(pts: Pt[], k: number) {
  const nn = pts.map((_, i) => knnIdx(pts, i, k))
  const kd = nn.map((n) => n[n.length - 1]?.d ?? 0)
  const lrd = nn.map((n, i) => {
    const r = n.reduce((s, o) => s + Math.max(kd[o.j], dist(pts[i], pts[o.j])), 0) / n.length
    return r > 0 ? 1 / r : Infinity
  })
  return nn.map((n, i) => {
    if (!isFinite(lrd[i])) return 1
    return n.reduce((s, o) => s + (isFinite(lrd[o.j]) ? lrd[o.j] : lrd[i]), 0) / n.length / lrd[i]
  })
}
