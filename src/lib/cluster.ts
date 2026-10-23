import { dist, rng, type Pt } from './stats'

export function initRandom(pts: Pt[], k: number, seed: number): Pt[] {
  const r = rng(seed)
  const idx = new Set<number>()
  while (idx.size < Math.min(k, pts.length)) idx.add(Math.floor(r() * pts.length))
  return [...idx].map((i) => ({ ...pts[i] }))
}

export function initPlusPlus(pts: Pt[], k: number, seed: number): Pt[] {
  const r = rng(seed)
  const cs: Pt[] = [{ ...pts[Math.floor(r() * pts.length)] }]
  while (cs.length < Math.min(k, pts.length)) {
    const d2 = pts.map((p) => Math.min(...cs.map((c) => dist(p, c) ** 2)))
    const total = d2.reduce((a, b) => a + b, 0)
    let t = r() * total
    let pick = 0
    for (let i = 0; i < d2.length; i++) {
      t -= d2[i]
      if (t <= 0) {
        pick = i
        break
      }
    }
    cs.push({ ...pts[pick] })
  }
  return cs
}

export function assign(pts: Pt[], cs: Pt[]): number[] {
  return pts.map((p) => {
    let best = 0
    let bd = Infinity
    cs.forEach((c, j) => {
      const d = dist(p, c)
      if (d < bd) {
        bd = d
        best = j
      }
    })
    return best
  })
}

export function update(pts: Pt[], labels: number[], cs: Pt[]): Pt[] {
  return cs.map((c, j) => {
    const mine = pts.filter((_, i) => labels[i] === j)
    if (!mine.length) return c
    return { x: mine.reduce((s, p) => s + p.x, 0) / mine.length, y: mine.reduce((s, p) => s + p.y, 0) / mine.length }
  })
}

export function sse(pts: Pt[], labels: number[], cs: Pt[]) {
  return pts.reduce((s, p, i) => s + dist(p, cs[labels[i]]) ** 2, 0)
}

export function kmeans(pts: Pt[], k: number, seed: number, maxIter = 100) {
  let cs = initPlusPlus(pts, k, seed)
  let labels = assign(pts, cs)
  for (let it = 0; it < maxIter; it++) {
    const next = update(pts, labels, cs)
    const nl = assign(pts, next)
    cs = next
    if (nl.every((l, i) => l === labels[i])) {
      labels = nl
      break
    }
    labels = nl
  }
  return { cs, labels, sse: sse(pts, labels, cs) }
}

export function bestKmeans(pts: Pt[], k: number, tries = 5) {
  let best = kmeans(pts, k, 1)
  for (let s = 2; s <= tries; s++) {
    const r = kmeans(pts, k, s)
    if (r.sse < best.sse) best = r
  }
  return best
}

export function kmedoids(pts: Pt[], k: number, seed: number, maxIter = 30) {
  const r = rng(seed)
  const med = new Set<number>()
  while (med.size < Math.min(k, pts.length)) med.add(Math.floor(r() * pts.length))
  let m = [...med]
  const cost = (ms: number[]) => pts.reduce((s, p) => s + Math.min(...ms.map((i) => dist(p, pts[i]))), 0)
  let best = cost(m)
  for (let it = 0; it < maxIter; it++) {
    let improved = false
    for (let a = 0; a < m.length; a++) {
      for (let o = 0; o < pts.length; o++) {
        if (m.includes(o)) continue
        const trial = [...m]
        trial[a] = o
        const c = cost(trial)
        if (c < best - 1e-12) {
          best = c
          m = trial
          improved = true
        }
      }
    }
    if (!improved) break
  }
  const cs = m.map((i) => pts[i])
  return { medoids: m, cs, labels: assign(pts, cs), cost: best }
}

export function silhouette(pts: Pt[], labels: number[]) {
  const ks = [...new Set(labels)].filter((l) => l >= 0)
  if (ks.length < 2) return { mean: 0, values: pts.map(() => 0) }
  const values = pts.map((p, i) => {
    if (labels[i] < 0) return 0
    const avg = (c: number) => {
      const others = pts.filter((_, j) => labels[j] === c && j !== i)
      return others.length ? others.reduce((s, q) => s + dist(p, q), 0) / others.length : 0
    }
    const own = pts.filter((_, j) => labels[j] === labels[i]).length
    if (own <= 1) return 0
    const a = avg(labels[i])
    const b = Math.min(...ks.filter((c) => c !== labels[i]).map(avg))
    return (b - a) / Math.max(a, b)
  })
  const valid = values.filter((_, i) => labels[i] >= 0)
  return { mean: valid.reduce((s, v) => s + v, 0) / valid.length, values }
}
