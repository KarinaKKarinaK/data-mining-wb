import { gauss, rng, type Pt } from './stats'

export type LPt = Pt & { label: number }

export type Shape2D = 'blobs' | 'moons' | 'circles' | 'aniso' | 'varied' | 'uniform' | 'lines'

export const SHAPES: { id: Shape2D; name: string }[] = [
  { id: 'blobs', name: 'Blobs' },
  { id: 'varied', name: 'Uneven blobs' },
  { id: 'aniso', name: 'Stretched' },
  { id: 'moons', name: 'Moons' },
  { id: 'circles', name: 'Rings' },
  { id: 'lines', name: 'Parallel lines' },
  { id: 'uniform', name: 'No structure' },
]

export function make2D(shape: Shape2D, n = 150, seed = 7, noise = 0.06, k = 3): LPt[] {
  const r = rng(seed)
  const out: LPt[] = []
  const per = Math.max(1, Math.floor(n / k))
  if (shape === 'blobs' || shape === 'varied' || shape === 'aniso') {
    const centers = [
      [0.27, 0.7], [0.72, 0.72], [0.5, 0.27], [0.2, 0.25], [0.8, 0.28], [0.5, 0.75],
    ]
    for (let c = 0; c < k; c++) {
      const [cx, cy] = centers[c % centers.length]
      const sd = shape === 'varied' ? [0.035, 0.09, 0.055, 0.07, 0.04, 0.06][c % 6] : 0.06
      const cnt = shape === 'varied' ? Math.round(per * [0.6, 1.4, 1, 0.8, 1.2, 1][c % 6]) : per
      for (let i = 0; i < cnt; i++) {
        let x = gauss(r) * sd
        let y = gauss(r) * sd
        if (shape === 'aniso') {
          const nx = x * 1.9 + y * 0.9
          const ny = x * 0.25 + y * 0.45
          x = nx
          y = ny
        }
        out.push({ x: cx + x, y: cy + y, label: c })
      }
    }
  } else if (shape === 'moons') {
    for (let i = 0; i < n; i++) {
      const top = i % 2 === 0
      const t = r() * Math.PI
      const x = top ? Math.cos(t) : 1 - Math.cos(t)
      const y = top ? Math.sin(t) : 0.5 - Math.sin(t)
      out.push({ x: 0.2 + x * 0.3 + gauss(r) * noise * 0.5, y: 0.38 + y * 0.42 + gauss(r) * noise * 0.5, label: top ? 0 : 1 })
    }
  } else if (shape === 'circles') {
    for (let i = 0; i < n; i++) {
      const outer = i % 2 === 0
      const t = r() * Math.PI * 2
      const rad = outer ? 0.38 : 0.16
      out.push({ x: 0.5 + Math.cos(t) * rad + gauss(r) * noise * 0.4, y: 0.5 + Math.sin(t) * rad + gauss(r) * noise * 0.4, label: outer ? 0 : 1 })
    }
  } else if (shape === 'lines') {
    for (let i = 0; i < n; i++) {
      const c = i % 3
      const t = r()
      out.push({ x: 0.1 + t * 0.8 + gauss(r) * 0.015, y: 0.22 + c * 0.28 + t * 0.12 + gauss(r) * 0.015, label: c })
    }
  } else {
    for (let i = 0; i < n; i++) out.push({ x: 0.05 + r() * 0.9, y: 0.05 + r() * 0.9, label: 0 })
  }
  return out
}

export function addOutliers(pts: LPt[], count: number, seed = 3): LPt[] {
  const r = rng(seed)
  const extra: LPt[] = []
  for (let i = 0; i < count; i++) extra.push({ x: r() < 0.5 ? 0.02 + r() * 0.1 : 0.88 + r() * 0.1, y: 0.02 + r() * 0.96, label: -1 })
  return [...pts, ...extra]
}

export const IRIS_COLUMNS = ['sepal_length', 'sepal_width', 'petal_length', 'petal_width'] as const
export const IRIS_CLASSES = ['setosa', 'versicolor', 'virginica']
const IRIS_RAW =
  '5.1,3.5,1.4,.2;4.9,3,1.4,.2;4.7,3.2,1.3,.2;4.6,3.1,1.5,.2;5,3.6,1.4,.2;5.4,3.9,1.7,.4;4.6,3.4,1.4,.3;5,3.4,1.5,.2;4.4,2.9,1.4,.2;4.9,3.1,1.5,.1;5.4,3.7,1.5,.2;4.8,3.4,1.6,.2;4.8,3,1.4,.1;4.3,3,1.1,.1;5.8,4,1.2,.2;5.7,4.4,1.5,.4;5.4,3.9,1.3,.4;5.1,3.5,1.4,.3;5.7,3.8,1.7,.3;5.1,3.8,1.5,.3;5.4,3.4,1.7,.2;5.1,3.7,1.5,.4;4.6,3.6,1,.2;5.1,3.3,1.7,.5;4.8,3.4,1.9,.2;5,3,1.6,.2;5,3.4,1.6,.4;5.2,3.5,1.5,.2;5.2,3.4,1.4,.2;4.7,3.2,1.6,.2;4.8,3.1,1.6,.2;5.4,3.4,1.5,.4;5.2,4.1,1.5,.1;5.5,4.2,1.4,.2;4.9,3.1,1.5,.2;5,3.2,1.2,.2;5.5,3.5,1.3,.2;4.9,3.6,1.4,.1;4.4,3,1.3,.2;5.1,3.4,1.5,.2;5,3.5,1.3,.3;4.5,2.3,1.3,.3;4.4,3.2,1.3,.2;5,3.5,1.6,.6;5.1,3.8,1.9,.4;4.8,3,1.4,.3;5.1,3.8,1.6,.2;4.6,3.2,1.4,.2;5.3,3.7,1.5,.2;5,3.3,1.4,.2;' +
  '7,3.2,4.7,1.4;6.4,3.2,4.5,1.5;6.9,3.1,4.9,1.5;5.5,2.3,4,1.3;6.5,2.8,4.6,1.5;5.7,2.8,4.5,1.3;6.3,3.3,4.7,1.6;4.9,2.4,3.3,1;6.6,2.9,4.6,1.3;5.2,2.7,3.9,1.4;5,2,3.5,1;5.9,3,4.2,1.5;6,2.2,4,1;6.1,2.9,4.7,1.4;5.6,2.9,3.6,1.3;6.7,3.1,4.4,1.4;5.6,3,4.5,1.5;5.8,2.7,4.1,1;6.2,2.2,4.5,1.5;5.6,2.5,3.9,1.1;5.9,3.2,4.8,1.8;6.1,2.8,4,1.3;6.3,2.5,4.9,1.5;6.1,2.8,4.7,1.2;6.4,2.9,4.3,1.3;6.6,3,4.4,1.4;6.8,2.8,4.8,1.4;6.7,3,5,1.7;6,2.9,4.5,1.5;5.7,2.6,3.5,1;5.5,2.4,3.8,1.1;5.5,2.4,3.7,1;5.8,2.7,3.9,1.2;6,2.7,5.1,1.6;5.4,3,4.5,1.5;6,3.4,4.5,1.6;6.7,3.1,4.7,1.5;6.3,2.3,4.4,1.3;5.6,3,4.1,1.3;5.5,2.5,4,1.3;5.5,2.6,4.4,1.2;6.1,3,4.6,1.4;5.8,2.6,4,1.2;5,2.3,3.3,1;5.6,2.7,4.2,1.3;5.7,3,4.2,1.2;5.7,2.9,4.2,1.3;6.2,2.9,4.3,1.3;5.1,2.5,3,1.1;5.7,2.8,4.1,1.3;' +
  '6.3,3.3,6,2.5;5.8,2.7,5.1,1.9;7.1,3,5.9,2.1;6.3,2.9,5.6,1.8;6.5,3,5.8,2.2;7.6,3,6.6,2.1;4.9,2.5,4.5,1.7;7.3,2.9,6.3,1.8;6.7,2.5,5.8,1.8;7.2,3.6,6.1,2.5;6.5,3.2,5.1,2;6.4,2.7,5.3,1.9;6.8,3,5.5,2.1;5.7,2.5,5,2;5.8,2.8,5.1,2.4;6.4,3.2,5.3,2.3;6.5,3,5.5,1.8;7.7,3.8,6.7,2.2;7.7,2.6,6.9,2.3;6,2.2,5,1.5;6.9,3.2,5.7,2.3;5.6,2.8,4.9,2;7.7,2.8,6.7,2;6.3,2.7,4.9,1.8;6.7,3.3,5.7,2.1;7.2,3.2,6,1.8;6.2,2.8,4.8,1.8;6.1,3,4.9,1.8;6.4,2.8,5.6,2.1;7.2,3,5.8,1.6;7.4,2.8,6.1,1.9;7.9,3.8,6.4,2;6.4,2.8,5.6,2.2;6.3,2.8,5.1,1.5;6.1,2.6,5.6,1.4;7.7,3,6.1,2.3;6.3,3.4,5.6,2.4;6.4,3.1,5.5,1.8;6,3,4.8,1.8;6.9,3.1,5.4,2.1;6.7,3.1,5.6,2.4;6.9,3.1,5.1,2.3;5.8,2.7,5.1,1.9;6.8,3.2,5.9,2.3;6.7,3.3,5.7,2.5;6.7,3,5.2,2.3;6.3,2.5,5,1.9;6.5,3,5.2,2;6.2,3.4,5.4,2.3;5.9,3,5.1,1.8'

export const IRIS: { f: number[]; label: number }[] = IRIS_RAW.split(';').map((row, i) => ({
  f: row.split(',').map(Number),
  label: Math.floor(i / 50),
}))

export type Row = Record<string, string>

export const BUYS_COMPUTER: { columns: string[]; target: string; rows: Row[] } = {
  columns: ['age', 'income', 'student', 'credit_rating'],
  target: 'buys_computer',
  rows: [
    ['youth', 'high', 'no', 'fair', 'no'],
    ['youth', 'high', 'no', 'excellent', 'no'],
    ['middle_aged', 'high', 'no', 'fair', 'yes'],
    ['senior', 'medium', 'no', 'fair', 'yes'],
    ['senior', 'low', 'yes', 'fair', 'yes'],
    ['senior', 'low', 'yes', 'excellent', 'no'],
    ['middle_aged', 'low', 'yes', 'excellent', 'yes'],
    ['youth', 'medium', 'no', 'fair', 'no'],
    ['youth', 'low', 'yes', 'fair', 'yes'],
    ['senior', 'medium', 'yes', 'fair', 'yes'],
    ['youth', 'medium', 'yes', 'excellent', 'yes'],
    ['middle_aged', 'medium', 'no', 'excellent', 'yes'],
    ['middle_aged', 'high', 'yes', 'fair', 'yes'],
    ['senior', 'medium', 'no', 'excellent', 'no'],
  ].map(([age, income, student, credit_rating, buys_computer]) => ({ age, income, student, credit_rating, buys_computer })),
}

export const PLAY_TENNIS: { columns: string[]; target: string; rows: Row[] } = {
  columns: ['outlook', 'temperature', 'humidity', 'windy'],
  target: 'play',
  rows: [
    ['sunny', 'hot', 'high', 'false', 'no'],
    ['sunny', 'hot', 'high', 'true', 'no'],
    ['overcast', 'hot', 'high', 'false', 'yes'],
    ['rainy', 'mild', 'high', 'false', 'yes'],
    ['rainy', 'cool', 'normal', 'false', 'yes'],
    ['rainy', 'cool', 'normal', 'true', 'no'],
    ['overcast', 'cool', 'normal', 'true', 'yes'],
    ['sunny', 'mild', 'high', 'false', 'no'],
    ['sunny', 'cool', 'normal', 'false', 'yes'],
    ['rainy', 'mild', 'normal', 'false', 'yes'],
    ['sunny', 'mild', 'normal', 'true', 'yes'],
    ['overcast', 'mild', 'high', 'true', 'yes'],
    ['overcast', 'hot', 'normal', 'false', 'yes'],
    ['rainy', 'mild', 'high', 'true', 'no'],
  ].map(([outlook, temperature, humidity, windy, play]) => ({ outlook, temperature, humidity, windy, play })),
}

export const GROCERIES: string[][] = [
  ['coffee', 'croissant', 'cookie'],
  ['coffee', 'croissant'],
  ['milk tea', 'egg tart'],
  ['coffee', 'croissant', 'cookie', 'water'],
  ['milk tea', 'egg tart', 'cookie'],
  ['sandwich', 'water'],
  ['coffee', 'croissant', 'cookie'],
  ['milk tea', 'egg tart', 'sandwich'],
  ['coffee', 'water'],
  ['sandwich', 'water', 'cookie'],
]

export function series(seed: number, n = 40, shift = 0, amp = 1) {
  const r = rng(seed)
  return Array.from({ length: n }, (_, i) => amp * Math.sin((i + shift) / 4) + gauss(r) * 0.12)
}
