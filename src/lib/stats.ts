export type Pt = { x: number; y: number }

export function rng(seed = 1) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gauss(r: () => number) {
  let u = 0
  while (u === 0) u = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())
}

export const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
export const mean = (a: number[]) => (a.length ? sum(a) / a.length : NaN)

export function variance(a: number[], ddof = 0) {
  const m = mean(a)
  return sum(a.map((v) => (v - m) ** 2)) / (a.length - ddof)
}
export const std = (a: number[], ddof = 0) => Math.sqrt(variance(a, ddof))

export function quantile(a: number[], q: number) {
  const s = [...a].sort((x, y) => x - y)
  if (!s.length) return NaN
  const h = (s.length - 1) * q
  const lo = Math.floor(h)
  return s[lo] + (h - lo) * ((s[Math.min(lo + 1, s.length - 1)] ?? s[lo]) - s[lo])
}
export const median = (a: number[]) => quantile(a, 0.5)

export function modes(a: number[]) {
  const c = new Map<number, number>()
  a.forEach((v) => c.set(v, (c.get(v) ?? 0) + 1))
  const top = Math.max(...c.values())
  return [...c.entries()].filter(([, n]) => n === top && top > 1).map(([v]) => v).sort((x, y) => x - y)
}

export function pearson(x: number[], y: number[]) {
  const mx = mean(x)
  const my = mean(y)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my)
    sxx += (x[i] - mx) ** 2
    syy += (y[i] - my) ** 2
  }
  return sxy / Math.sqrt(sxx * syy)
}

export const log2 = (v: number) => Math.log(v) / Math.LN2

export function entropy(counts: number[]) {
  const n = sum(counts)
  if (!n) return 0
  return -sum(counts.filter((c) => c > 0).map((c) => (c / n) * log2(c / n)))
}

export function gini(counts: number[]) {
  const n = sum(counts)
  if (!n) return 0
  return 1 - sum(counts.map((c) => (c / n) ** 2))
}

export function minkowski(a: number[], b: number[], p: number) {
  if (!isFinite(p)) return Math.max(...a.map((v, i) => Math.abs(v - b[i])))
  return sum(a.map((v, i) => Math.abs(v - b[i]) ** p)) ** (1 / p)
}

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

export function covariance2(pts: Pt[]) {
  const mx = mean(pts.map((p) => p.x))
  const my = mean(pts.map((p) => p.y))
  let xx = 0
  let xy = 0
  let yy = 0
  pts.forEach((p) => {
    xx += (p.x - mx) ** 2
    xy += (p.x - mx) * (p.y - my)
    yy += (p.y - my) ** 2
  })
  const n = pts.length
  return { mx, my, xx: xx / n, xy: xy / n, yy: yy / n }
}

export function eig2(a: number, b: number, d: number) {
  const tr = a + d
  const det = a * d - b * b
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det))
  const l1 = tr / 2 + disc
  const l2 = tr / 2 - disc
  let v1: [number, number] = Math.abs(b) > 1e-12 ? [l1 - d, b] : a >= d ? [1, 0] : [0, 1]
  const n = Math.hypot(v1[0], v1[1])
  v1 = [v1[0] / n, v1[1] / n]
  return { l1, l2, v1, v2: [-v1[1], v1[0]] as [number, number] }
}

export function chi2Cdf(x: number, k: number) {
  if (x <= 0) return 0
  return lowerGamma(k / 2, x / 2) / gammaFn(k / 2)
}

function gammaFn(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z))
  const g = 7
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i)
  const t = z + g + 0.5
  return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * x
}

function lowerGamma(s: number, x: number) {
  let term = 1 / s
  let total = term
  for (let n = 1; n < 500; n++) {
    term *= x / (s + n)
    total += term
    if (term < total * 1e-14) break
  }
  return total * Math.exp(-x + s * Math.log(x))
}

export function chi2Critical(alpha: number, k: number) {
  let lo = 0
  let hi = 200
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (1 - chi2Cdf(mid, k) > alpha) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function chi2Pdf(x: number, k: number) {
  if (x <= 0) return 0
  return (x ** (k / 2 - 1) * Math.exp(-x / 2)) / (2 ** (k / 2) * gammaFn(k / 2))
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const range = (n: number) => Array.from({ length: n }, (_, i) => i)

export function fmt(v: number, d = 3) {
  if (!isFinite(v)) return v > 0 ? '∞' : v < 0 ? '-∞' : 'n/a'
  const s = v.toFixed(d)
  return /^-0\.?0*$/.test(s) ? s.slice(1) : s
}
