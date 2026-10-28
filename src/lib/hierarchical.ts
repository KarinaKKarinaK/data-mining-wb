import { dist, type Pt } from './stats'

export type Linkage = 'single' | 'complete' | 'average' | 'centroid' | 'ward'

export type Merge = { a: number; b: number; id: number; h: number; members: number[] }

const centroid = (pts: Pt[], m: number[]) => ({
  x: m.reduce((s, i) => s + pts[i].x, 0) / m.length,
  y: m.reduce((s, i) => s + pts[i].y, 0) / m.length,
})

export function linkDist(pts: Pt[], A: number[], B: number[], link: Linkage) {
  if (link === 'centroid') return dist(centroid(pts, A), centroid(pts, B))
  if (link === 'ward') {
    const d = dist(centroid(pts, A), centroid(pts, B))
    return ((A.length * B.length) / (A.length + B.length)) * d * d
  }
  let mn = Infinity
  let mx = -Infinity
  let s = 0
  for (const i of A)
    for (const j of B) {
      const d = dist(pts[i], pts[j])
      if (d < mn) mn = d
      if (d > mx) mx = d
      s += d
    }
  if (link === 'single') return mn
  if (link === 'complete') return mx
  return s / (A.length * B.length)
}

export type Cl = { id: number; members: number[] }

export function agglomerate(pts: Pt[], link: Linkage) {
  let clusters: Cl[] = pts.map((_, i) => ({ id: i, members: [i] }))
  const merges: Merge[] = []
  let next = pts.length
  while (clusters.length > 1) {
    let bi = 0
    let bj = 1
    let bd = Infinity
    for (let i = 0; i < clusters.length; i++)
      for (let j = i + 1; j < clusters.length; j++) {
        const d = linkDist(pts, clusters[i].members, clusters[j].members, link)
        if (d < bd - 1e-12) {
          bd = d
          bi = i
          bj = j
        }
      }
    const members = [...clusters[bi].members, ...clusters[bj].members]
    merges.push({ a: clusters[bi].id, b: clusters[bj].id, id: next, h: bd, members })
    clusters = [...clusters.filter((_, k) => k !== bi && k !== bj), { id: next, members }]
    next++
  }
  return merges
}

export function clustersAfter(n: number, merges: Merge[], steps: number): Cl[] {
  let cl: Cl[] = Array.from({ length: n }, (_, i) => ({ id: i, members: [i] }))
  for (let s = 0; s < Math.min(steps, merges.length); s++) {
    const m = merges[s]
    cl = [...cl.filter((c) => c.id !== m.a && c.id !== m.b), { id: m.id, members: m.members }]
  }
  return cl
}

export function leafOrder(n: number, merges: Merge[]) {
  if (n === 0) return []
  if (!merges.length) return [0]
  const byId = new Map(merges.map((m) => [m.id, m]))
  const walk = (id: number): number[] => {
    const m = byId.get(id)
    return m ? [...walk(m.a), ...walk(m.b)] : [id]
  }
  return walk(merges[merges.length - 1].id)
}

export function labelsFromClusters(n: number, cl: Cl[], order: number[]) {
  const pos = new Map(order.map((leaf, i) => [leaf, i]))
  const sorted = [...cl].sort((p, q) => Math.min(...p.members.map((m) => pos.get(m) ?? 0)) - Math.min(...q.members.map((m) => pos.get(m) ?? 0)))
  const labels = new Array(n).fill(0)
  sorted.forEach((c, k) => c.members.forEach((m) => (labels[m] = k)))
  return labels
}

export function stepsBelow(merges: Merge[], h: number) {
  let s = 0
  while (s < merges.length && merges[s].h <= h) s++
  return s
}
