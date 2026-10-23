import { entropy, gini, log2 } from './stats'
import type { Row } from './datasets'

export type SplitEval = {
  attr: string
  infoAfter: number
  gain: number
  splitInfo: number
  gainRatio: number
  giniAfter: number
  giniDrop: number
  parts: { value: string; counts: number[]; n: number }[]
}

export function counts(rows: Row[], target: string, classes: string[]) {
  return classes.map((c) => rows.filter((r) => r[target] === c).length)
}

export function evalSplit(rows: Row[], attr: string, target: string, classes: string[]): SplitEval {
  const n = rows.length
  const values = [...new Set(rows.map((r) => r[attr]))].sort()
  const parts = values.map((v) => {
    const sub = rows.filter((r) => r[attr] === v)
    return { value: v, counts: counts(sub, target, classes), n: sub.length }
  })
  const base = entropy(counts(rows, target, classes))
  const baseGini = gini(counts(rows, target, classes))
  const infoAfter = parts.reduce((s, p) => s + (p.n / n) * entropy(p.counts), 0)
  const giniAfter = parts.reduce((s, p) => s + (p.n / n) * gini(p.counts), 0)
  const splitInfo = -parts.reduce((s, p) => s + (p.n / n) * log2(p.n / n), 0)
  const gain = base - infoAfter
  return { attr, infoAfter, gain, splitInfo, gainRatio: splitInfo > 0 ? gain / splitInfo : 0, giniAfter, giniDrop: baseGini - giniAfter, parts }
}

export type LP = { x: number; y: number; label: number }

export type CNode =
  | { leaf: true; label: number; counts: number[] }
  | { leaf: false; f: 'x' | 'y'; t: number; left: CNode; right: CNode; counts: number[] }

function majority(c: number[]) {
  let b = 0
  c.forEach((v, i) => {
    if (v > c[b]) b = i
  })
  return b
}

export function growTree(pts: LP[], maxDepth: number, nClasses = 2, depth = 0): CNode {
  const c = Array.from({ length: nClasses }, (_, i) => pts.filter((p) => p.label === i).length)
  const pure = c.filter((v) => v > 0).length <= 1
  if (pure || depth >= maxDepth || pts.length < 2) return { leaf: true, label: majority(c), counts: c }
  const base = entropy(c)
  let best: { f: 'x' | 'y'; t: number; gain: number } | null = null
  for (const f of ['x', 'y'] as const) {
    const s = [...pts].sort((a, b) => a[f] - b[f])
    const left = Array(nClasses).fill(0)
    const right = [...c]
    for (let i = 0; i < s.length - 1; i++) {
      left[s[i].label]++
      right[s[i].label]--
      if (s[i][f] === s[i + 1][f]) continue
      const nl = i + 1
      const nr = s.length - nl
      const g = base - (nl / s.length) * entropy(left) - (nr / s.length) * entropy(right)
      if (!best || g > best.gain + 1e-12) best = { f, t: (s[i][f] + s[i + 1][f]) / 2, gain: g }
    }
  }
  if (!best || best.gain <= 1e-12) return { leaf: true, label: majority(c), counts: c }
  const bf = best.f
  const bt = best.t
  return {
    leaf: false,
    f: bf,
    t: bt,
    counts: c,
    left: growTree(pts.filter((p) => p[bf] <= bt), maxDepth, nClasses, depth + 1),
    right: growTree(pts.filter((p) => p[bf] > bt), maxDepth, nClasses, depth + 1),
  }
}

export function predictTree(n: CNode, p: { x: number; y: number }): number {
  let cur = n
  while (!cur.leaf) cur = p[cur.f] <= cur.t ? cur.left : cur.right
  return cur.label
}

export function treeSize(n: CNode): number {
  return n.leaf ? 1 : 1 + treeSize(n.left) + treeSize(n.right)
}

export function erf(x: number) {
  const s = Math.sign(x)
  const a = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * a)
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)
  return s * y
}

export const normCdf = (x: number, m: number, sd: number) => 0.5 * (1 + erf((x - m) / (sd * Math.SQRT2)))
export const normPdf = (x: number, m: number, sd: number) => Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))
