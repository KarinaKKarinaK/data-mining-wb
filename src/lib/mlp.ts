import { gauss, rng } from './stats'

export type Act = 'sigmoid' | 'tanh' | 'relu'

export const sig = (z: number) => 1 / (1 + Math.exp(-z))

export function act(a: Act, z: number) {
  if (a === 'sigmoid') return sig(z)
  if (a === 'tanh') return Math.tanh(z)
  return Math.max(0, z)
}

export function dact(a: Act, z: number) {
  if (a === 'sigmoid') {
    const s = sig(z)
    return s * (1 - s)
  }
  if (a === 'tanh') return 1 - Math.tanh(z) ** 2
  return z > 0 ? 1 : 0
}

export type Net = { W1: number[][]; b1: number[]; W2: number[]; b2: number; act: Act }

export function initNet(h: number, a: Act, seed: number): Net {
  const r = rng(seed)
  const s = a === 'relu' ? 1.2 : 1
  return {
    W1: Array.from({ length: h }, () => [gauss(r) * s, gauss(r) * s]),
    b1: Array.from({ length: h }, () => gauss(r) * 0.5),
    W2: Array.from({ length: h }, () => gauss(r) * s),
    b2: 0,
    act: a,
  }
}

export function forward(n: Net, x: number, y: number) {
  const z1 = n.W1.map((w, j) => w[0] * x + w[1] * y + n.b1[j])
  const h = z1.map((z) => act(n.act, z))
  const out = sig(h.reduce((s, v, j) => s + v * n.W2[j], n.b2))
  return { z1, h, out }
}

export function trainEpoch(n: Net, data: { x: number; y: number; label: number }[], lr: number, linearOnly: { w: number[] } | null) {
  const H = n.W1.length
  const gW1 = n.W1.map(() => [0, 0])
  const gb1 = n.b1.map(() => 0)
  const gW2 = n.W2.map(() => 0)
  let gb2 = 0
  let gL = [0, 0, 0]
  let loss = 0
  let correct = 0
  data.forEach((d) => {
    if (H === 0 && linearOnly) {
      const o = sig(linearOnly.w[0] + linearOnly.w[1] * d.x + linearOnly.w[2] * d.y)
      const e = o - d.label
      gL = [gL[0] + e, gL[1] + e * d.x, gL[2] + e * d.y]
      loss += -(d.label * Math.log(o + 1e-12) + (1 - d.label) * Math.log(1 - o + 1e-12))
      if ((o > 0.5 ? 1 : 0) === d.label) correct++
      return
    }
    const f = forward(n, d.x, d.y)
    const e = f.out - d.label
    loss += -(d.label * Math.log(f.out + 1e-12) + (1 - d.label) * Math.log(1 - f.out + 1e-12))
    if ((f.out > 0.5 ? 1 : 0) === d.label) correct++
    gb2 += e
    for (let j = 0; j < H; j++) {
      gW2[j] += e * f.h[j]
      const dh = e * n.W2[j] * dact(n.act, f.z1[j])
      gW1[j][0] += dh * d.x
      gW1[j][1] += dh * d.y
      gb1[j] += dh
    }
  })
  const m = data.length
  if (H === 0 && linearOnly) {
    linearOnly.w = linearOnly.w.map((w, i) => w - (lr * gL[i]) / m)
  } else {
    for (let j = 0; j < H; j++) {
      n.W2[j] -= (lr * gW2[j]) / m
      n.W1[j][0] -= (lr * gW1[j][0]) / m
      n.W1[j][1] -= (lr * gW1[j][1]) / m
      n.b1[j] -= (lr * gb1[j]) / m
    }
    n.b2 -= (lr * gb2) / m
  }
  return { loss: loss / m, acc: correct / m }
}
