import { dist, mean, std, type Pt } from './stats'

export type Linkage = 'single' | 'complete' | 'average'

export function agglomerative(pts: Pt[], k: number, linkage: Linkage) {
  const n = pts.length
  const D = pts.map((p) => pts.map((q) => dist(p, q)))
  const size = new Array<number>(n).fill(1)
  const alive = new Array<boolean>(n).fill(true)
  const owner = pts.map((_, i) => i)
  let groups = n
  while (groups > Math.max(1, k)) {
    let a = -1
    let b = -1
    let best = Infinity
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue
      for (let j = i + 1; j < n; j++) {
        if (alive[j] && D[i][j] < best) {
          best = D[i][j]
          a = i
          b = j
        }
      }
    }
    for (let m = 0; m < n; m++) {
      if (!alive[m] || m === a || m === b) continue
      const v = linkage === 'single' ? Math.min(D[a][m], D[b][m]) : linkage === 'complete' ? Math.max(D[a][m], D[b][m]) : (D[a][m] * size[a] + D[b][m] * size[b]) / (size[a] + size[b])
      D[a][m] = v
      D[m][a] = v
    }
    size[a] += size[b]
    alive[b] = false
    for (let i = 0; i < n; i++) if (owner[i] === b) owner[i] = a
    groups--
  }
  const ids = [...new Set(owner)]
  const sizes = ids.map((id) => owner.filter((o) => o === id).length)
  const rank = ids.map((id, i) => ({ id, s: sizes[i] })).sort((x, y) => y.s - x.s).map((x) => x.id)
  return owner.map((o) => rank.indexOf(o))
}

export function knnPredict(train: (Pt & { label: number })[], p: Pt, k: number) {
  const near = train
    .map((t) => ({ d: dist(t, p), l: t.label }))
    .sort((x, y) => x.d - y.d)
    .slice(0, k)
  const votes = new Map<number, number>()
  near.forEach((v) => votes.set(v.l, (votes.get(v.l) ?? 0) + 1))
  let best = -1
  let bv = -1
  ;[...votes.entries()].forEach(([l, c]) => {
    if (c > bv || (c === bv && near.findIndex((v) => v.l === l) < near.findIndex((v) => v.l === best))) {
      bv = c
      best = l
    }
  })
  return { label: best, share: near.length ? bv / near.length : 0 }
}

export type Scaling = 'none' | 'minmax' | 'z'

export function scale(pts: Pt[], how: Scaling): Pt[] {
  if (how === 'none' || !pts.length) return pts
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  if (how === 'minmax') {
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    return pts.map((p) => ({ x: x1 > x0 ? (p.x - x0) / (x1 - x0) : 0, y: y1 > y0 ? (p.y - y0) / (y1 - y0) : 0 }))
  }
  const [mx, sx, my, sy] = [mean(xs), std(xs), mean(ys), std(ys)]
  return pts.map((p) => ({ x: sx ? (p.x - mx) / sx : 0, y: sy ? (p.y - my) / sy : 0 }))
}

export function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return { pts: [] as (Pt & { label: number })[], xName: 'x', yName: 'y', classes: [] as string[], error: 'Paste some rows first.' }
  const split = (l: string) => l.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''))
  const first = split(lines[0])
  const isNum = (v: string) => v !== '' && !isNaN(Number(v))
  const header = !first.some(isNum) || first.filter(isNum).length < 2
  const rows = (header ? lines.slice(1) : lines).map(split)
  if (!rows.length) return { pts: [], xName: 'x', yName: 'y', classes: [], error: 'Only a header row found.' }
  const numCols = rows[0].map((_, j) => j).filter((j) => rows.every((r) => isNum(r[j] ?? '')))
  if (numCols.length < 2) return { pts: [], xName: 'x', yName: 'y', classes: [], error: 'Need at least two numeric columns.' }
  const [cx, cy] = numCols
  const labelCol = rows[0].map((_, j) => j).find((j) => !numCols.includes(j))
  const classes = labelCol === undefined ? [] : [...new Set(rows.map((r) => r[labelCol] ?? ''))]
  const pts = rows.map((r) => ({ x: Number(r[cx]), y: Number(r[cy]), label: labelCol === undefined ? 0 : classes.indexOf(r[labelCol] ?? '') }))
  return { pts, xName: header ? first[cx] : 'column 1', yName: header ? first[cy] : 'column 2', classes, error: '' }
}
