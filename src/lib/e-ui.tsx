import { useEffect, useState, type ReactNode } from 'react'
import { Btn, Stat, seriesColor } from '../components/ui'
import { layoutTree, parseTx, txText, type FPNode } from './e-assoc'

export function TxEditor({ tx, onChange, reset, children }: { tx: string[][]; onChange: (tx: string[][]) => void; reset: () => void; children?: ReactNode }) {
  const [text, setText] = useState(() => txText(tx))
  useEffect(() => {
    if (txText(parseTx(text)) !== txText(tx)) setText(txText(tx))
  }, [tx])
  const items = new Set(tx.flat())
  const avg = tx.length ? tx.reduce((s, t) => s + t.length, 0) / tx.length : 0
  return (
    <section className="card" style={{ margin: '28px 0', padding: 0, overflow: 'hidden' }}>
      <div className="lab-head">
        <div>
          <span className="label">Transaction database</span>
          <h3>Your baskets</h3>
          <p>One transaction per line, items separated by commas. Click an item chip to remove it. Every lab on this page uses this data.</p>
        </div>
      </div>
      <div className="grid c2" style={{ padding: 18, gap: 18 }}>
        <div className="stack">
          <textarea
            className="input"
            rows={Math.min(14, Math.max(6, tx.length + 1))}
            value={text}
            spellCheck={false}
            aria-label="Transactions, one per line"
            onChange={(e) => {
              setText(e.target.value)
              onChange(parseTx(e.target.value))
            }}
          />
          <div className="row">
            <Btn sm onClick={reset}>Reset to the default baskets</Btn>
          </div>
          <div className="readout" style={{ marginTop: 0 }}>
            <Stat k="Transactions" v={tx.length} />
            <Stat k="Distinct items" v={items.size} />
            <Stat k="Avg length" v={avg.toFixed(2)} />
          </div>
        </div>
        <div style={{ display: 'grid', gap: 6, alignContent: 'start', maxHeight: 340, overflowY: 'auto' }}>
          {tx.map((t, i) => (
            <div key={i} className="row" style={{ gap: 6 }}>
              <span className="mono muted" style={{ width: 34, fontSize: 12 }}>T{i + 1}</span>
              {t.map((it) => (
                <button
                  key={it}
                  type="button"
                  className="pill"
                  style={{ cursor: 'pointer', fontSize: 11.5 }}
                  title={`Remove ${it} from T${i + 1}`}
                  onClick={() => onChange(tx.map((x, j) => (j === i ? x.filter((y) => y !== it) : x)).filter((x) => x.length))}
                >
                  {it} <span className="muted">x</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      {children && <div style={{ borderTop: '1px solid var(--line)', padding: 18 }}>{children}</div>}
    </section>
  )
}

export function itemColor(order: string[], item: string) {
  const i = order.indexOf(item)
  return i >= 0 && i < 8 ? seriesColor(i) : 'var(--ink-3)'
}

export function TreeView({
  nodes,
  links,
  order,
  highlight,
  showLinks = true,
  label,
}: {
  nodes: FPNode[]
  links: Map<string, number[]>
  order: string[]
  highlight?: Set<number>
  showLinks?: boolean
  label: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const { x, leaves, maxDepth } = layoutTree(nodes)
  const gx = 92
  const gy = 70
  const W = Math.max(360, leaves * gx + 20)
  const H = maxDepth * gy + 60
  const px = (id: number) => 10 + gx / 2 + x.get(id)! * gx
  const py = (id: number) => 26 + nodes[id].depth * gy
  const path = (id: number) => {
    const out: string[] = []
    let p = id
    while (p > 0) {
      out.unshift(nodes[p].item)
      p = nodes[p].parent
    }
    return out
  }
  return (
    <div>
      <svg className="plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ maxHeight: 520, maxWidth: W * 1.25, margin: '0 auto' }}>
        {nodes.slice(1).map((n) => (
          <line key={'e' + n.id} x1={px(n.parent)} y1={py(n.parent) + 12} x2={px(n.id)} y2={py(n.id) - 12} stroke={highlight?.has(n.id) ? 'var(--ink)' : 'var(--ink-4)'} strokeWidth={highlight?.has(n.id) ? 2 : 1.2} />
        ))}
        {showLinks &&
          [...links.entries()].flatMap(([it, ids]) =>
            ids.slice(1).map((id, j) => {
              const a = ids[j]
              const mx = (px(a) + px(id)) / 2
              const my = Math.max(py(a), py(id)) + 30
              return <path key={'l' + it + id} d={`M${px(a) + 30},${py(a) + 6} Q${mx},${my} ${px(id) - 30},${py(id) + 6}`} fill="none" stroke={itemColor(order, it)} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.85} />
            }),
          )}
        {nodes.map((n) => {
          const lab = n.id === 0 ? 'null' : `${n.item}: ${n.count}`
          const w = Math.max(44, lab.length * 6.8 + 16)
          const hl = highlight?.has(n.id)
          return (
            <g key={n.id} transform={`translate(${px(n.id)},${py(n.id)})`} onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)}>
              <rect x={-w / 2} y={-12} width={w} height={24} rx={8} fill={hl ? 'var(--surface-3)' : 'var(--surface-2)'} stroke={n.id === 0 ? 'var(--ink-4)' : itemColor(order, n.item)} strokeWidth={hl ? 2.5 : 1.5} />
              <text y={4} textAnchor="middle" fontSize={11.5} fill="var(--ink)" fontFamily="var(--mono)">
                {lab}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="muted" style={{ fontSize: 13, minHeight: 20, margin: '6px 0 0' }}>
        {hover !== null && hover > 0 ? `Node ${nodes[hover].item}: ${nodes[hover].count}. Path from the root: ${path(hover).join(' > ')}.` : 'Hover a node to see its path from the root.'}
      </p>
    </div>
  )
}
