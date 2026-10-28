export type Itemset = string[]

export const key = (s: Itemset) => s.join(', ')
export const show = (s: Itemset) => `{${s.join(', ')}}`

export function parseTx(text: string): string[][] {
  return text
    .split('\n')
    .map((l) => [...new Set(l.split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean))].sort())
    .filter((t) => t.length > 0)
}

export const txText = (tx: string[][]) => tx.map((t) => t.join(', ')).join('\n')

export function count(tx: string[][], s: Itemset) {
  return tx.reduce((n, t) => (s.every((i) => t.includes(i)) ? n + 1 : n), 0)
}

export function itemCounts(tx: string[][]) {
  const m = new Map<string, number>()
  tx.forEach((t) => t.forEach((i) => m.set(i, (m.get(i) ?? 0) + 1)))
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

export type Cand = { set: Itemset; count: number | null; status: 'frequent' | 'infrequent' | 'pruned'; prunedBy?: Itemset }
export type Level = { k: number; cands: Cand[]; frequent: { set: Itemset; count: number }[] }

function subsetsMinusOne(s: Itemset) {
  return s.map((_, i) => s.filter((__, j) => j !== i))
}

export function apriori(tx: string[][], minCount: number): Level[] {
  const levels: Level[] = []
  const items = [...new Set(tx.flat())].sort()
  let cands: Itemset[] = items.map((i) => [i])
  let k = 1
  let prev = new Set<string>()
  while (cands.length) {
    const level: Level = { k, cands: [], frequent: [] }
    cands.forEach((c) => {
      if (k > 1) {
        const bad = subsetsMinusOne(c).find((s) => !prev.has(key(s)))
        if (bad) {
          level.cands.push({ set: c, count: null, status: 'pruned', prunedBy: bad })
          return
        }
      }
      const n = count(tx, c)
      const ok = n >= minCount
      level.cands.push({ set: c, count: n, status: ok ? 'frequent' : 'infrequent' })
      if (ok) level.frequent.push({ set: c, count: n })
    })
    levels.push(level)
    const L = level.frequent.map((f) => f.set)
    prev = new Set(L.map(key))
    const next: Itemset[] = []
    for (let a = 0; a < L.length; a++)
      for (let b = a + 1; b < L.length; b++) {
        const x = L[a]
        const y = L[b]
        if (x.slice(0, -1).every((v, i) => v === y[i]) && x[x.length - 1] !== y[y.length - 1]) {
          next.push([...x, y[y.length - 1]].sort())
        }
      }
    cands = next
    k++
  }
  return levels
}

export function allFrequent(levels: Level[]) {
  return levels.flatMap((l) => l.frequent)
}

export type Rule = { lhs: Itemset; rhs: Itemset; sup: number; conf: number; lift: number; count: number }

export function rules(tx: string[][], levels: Level[]): Rule[] {
  const n = tx.length
  const sup = new Map<string, number>()
  allFrequent(levels).forEach((f) => sup.set(key(f.set), f.count))
  const out: Rule[] = []
  allFrequent(levels)
    .filter((f) => f.set.length > 1)
    .forEach((f) => {
      const s = f.set
      const total = 1 << s.length
      for (let mask = 1; mask < total - 1; mask++) {
        const lhs = s.filter((_, i) => mask & (1 << i))
        const rhs = s.filter((_, i) => !(mask & (1 << i)))
        const cl = sup.get(key(lhs)) ?? count(tx, lhs)
        const cr = sup.get(key(rhs)) ?? count(tx, rhs)
        const conf = f.count / cl
        out.push({ lhs, rhs, sup: f.count / n, conf, lift: conf / (cr / n), count: f.count })
      }
    })
  return out
}

export function closedMaximal(levels: Level[]) {
  const fr = allFrequent(levels)
  return fr.map((f) => {
    const supers = fr.filter((g) => g.set.length === f.set.length + 1 && f.set.every((i) => g.set.includes(i)))
    return { ...f, closed: supers.every((g) => g.count < f.count), maximal: supers.length === 0 }
  })
}

export type FPNode = { id: number; item: string; count: number; parent: number; children: number[]; depth: number }

export function headerOrder(tx: string[][], minCount: number) {
  return itemCounts(tx).filter(([, c]) => c >= minCount)
}

export function orderTx(t: string[], order: string[]) {
  return t.filter((i) => order.includes(i)).sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

export function buildTree(paths: { items: string[]; count: number }[]) {
  const nodes: FPNode[] = [{ id: 0, item: 'null', count: 0, parent: -1, children: [], depth: 0 }]
  const links = new Map<string, number[]>()
  paths.forEach(({ items, count: c }) => {
    let cur = 0
    items.forEach((it) => {
      let child = nodes[cur].children.find((id) => nodes[id].item === it)
      if (child === undefined) {
        child = nodes.length
        nodes.push({ id: child, item: it, count: 0, parent: cur, children: [], depth: nodes[cur].depth + 1 })
        nodes[cur].children.push(child)
        links.set(it, [...(links.get(it) ?? []), child])
      }
      nodes[child].count += c
      cur = child
    })
  })
  return { nodes, links }
}

export function patternBase(nodes: FPNode[], ids: number[]) {
  return ids
    .map((id) => {
      const path: string[] = []
      let p = nodes[id].parent
      while (p > 0) {
        path.unshift(nodes[p].item)
        p = nodes[p].parent
      }
      return { items: path, count: nodes[id].count }
    })
    .filter((b) => b.items.length > 0)
}

export function condTree(base: { items: string[]; count: number }[], minCount: number) {
  const m = new Map<string, number>()
  base.forEach((b) => b.items.forEach((i) => m.set(i, (m.get(i) ?? 0) + b.count)))
  const order = [...m.entries()].filter(([, c]) => c >= minCount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([i]) => i)
  return { order, counts: m, ...buildTree(base.map((b) => ({ items: orderTx(b.items, order), count: b.count })).filter((b) => b.items.length)) }
}

export function fpgrowth(tx: string[][], minCount: number) {
  const out: { set: Itemset; count: number }[] = []
  const mine = (paths: { items: string[]; count: number }[], suffix: string[]) => {
    const m = new Map<string, number>()
    paths.forEach((p) => p.items.forEach((i) => m.set(i, (m.get(i) ?? 0) + p.count)))
    const order = [...m.entries()].filter(([, c]) => c >= minCount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([i]) => i)
    const { nodes, links } = buildTree(paths.map((p) => ({ items: orderTx(p.items, order), count: p.count })).filter((p) => p.items.length))
    ;[...order].reverse().forEach((it) => {
      const set = [...suffix, it].sort()
      out.push({ set, count: m.get(it)! })
      mine(patternBase(nodes, links.get(it) ?? []), [...suffix, it])
    })
  }
  mine(tx.map((t) => ({ items: t, count: 1 })), [])
  return out.sort((a, b) => a.set.length - b.set.length || key(a.set).localeCompare(key(b.set)))
}

export function layoutTree(nodes: FPNode[]) {
  const x = new Map<number, number>()
  let leaf = 0
  const walk = (id: number): number => {
    const n = nodes[id]
    if (!n.children.length) {
      x.set(id, leaf++)
      return x.get(id)!
    }
    const xs = n.children.map(walk)
    const v = (xs[0] + xs[xs.length - 1]) / 2
    x.set(id, v)
    return v
  }
  walk(0)
  const maxDepth = Math.max(...nodes.map((n) => n.depth))
  return { x, leaves: Math.max(1, leaf), maxDepth }
}
