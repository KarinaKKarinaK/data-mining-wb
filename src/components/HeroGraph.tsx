import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gauss, rng } from '../lib/stats'

// The mining pipeline as a node graph: records -> clean -> clusters -> rules.
// Each card opens its topic; pulses run along the links.

type Card = { id: string; to: string; x: number; y: number; w: number; h: number; title: string; sub: string }

const CARDS: Card[] = [
  { id: 'raw', to: '/learn/summary', x: 24, y: 36, w: 196, h: 128, title: 'Raw records', sub: 'missing, noisy, mixed units' },
  { id: 'clean', to: '/learn/transformation', x: 336, y: 24, w: 200, h: 128, title: 'Clean and scale', sub: 'min-max to [0, 1]' },
  { id: 'clusters', to: '/learn/kmeans', x: 28, y: 268, w: 220, h: 168, title: 'Clusters', sub: 'k-means, k = 3' },
  { id: 'rules', to: '/learn/apriori', x: 316, y: 292, w: 220, h: 132, title: 'Rules', sub: 'Apriori, min support 0.3' },
]

const LINKS = [
  { d: 'M220 100 C 270 100, 286 88, 336 88', mid: [278, 94] },
  { d: 'M436 152 C 436 210, 138 206, 138 268', mid: [287, 208] },
  { d: 'M248 352 C 282 352, 282 358, 316 358', mid: [282, 355] },
]

const COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)']

export default function HeroGraph() {
  const nav = useNavigate()
  const [hover, setHover] = useState<string | null>(null)
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const scatter = useMemo(() => {
    const r = rng(11)
    const centers = [
      [0.25, 0.3],
      [0.72, 0.28],
      [0.5, 0.75],
    ]
    return centers.flatMap(([cx, cy], k) =>
      Array.from({ length: 14 }, () => ({ x: cx + gauss(r) * 0.07, y: cy + gauss(r) * 0.07, k })),
    )
  }, [])

  const open = (c: Card) => nav(c.to)

  return (
    <svg className="hero-graph" viewBox="0 0 560 460" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Data mining pipeline: raw records, cleaning, clusters and rules">

      {LINKS.map((l, i) => (
        <g key={i}>
          <path d={l.d} className="hg-link" />
          <circle cx={l.mid[0]} cy={l.mid[1]} r="7" className="hg-junction" />
          <path d={`M${l.mid[0] - 3} ${l.mid[1]} h6 M${l.mid[0]} ${l.mid[1] - 3} v6`} className="hg-plus" />
          {!still && (
            <circle r="2.6" className="hg-pulse">
              <animateMotion dur="2.8s" begin={`${i * 0.9}s`} repeatCount="indefinite" path={l.d} />
            </circle>
          )}
        </g>
      ))}

      {CARDS.map((c) => (
        <g
          key={c.id}
          className={`hg-card${hover === c.id ? ' on' : ''}`}
          transform={`translate(${c.x} ${c.y})`}
          role="link"
          tabIndex={0}
          aria-label={`${c.title}: open the topic`}
          onClick={() => open(c)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open(c)}
          onMouseEnter={() => setHover(c.id)}
          onMouseLeave={() => setHover(null)}
        >
          <rect width={c.w} height={c.h} rx="12" className="hg-card-bg" />
          <circle cx="16" cy="19" r="3" className="hg-dot" />
          <text x="27" y="23" className="hg-title">
            {c.title}
          </text>
          <text x="16" y="41" className="hg-sub">
            {c.sub}
          </text>
          <CardBody id={c.id} w={c.w} h={c.h} scatter={scatter} />
        </g>
      ))}

      {/* endpoint nodes where links meet the cards */}
      {[
        [220, 100],
        [336, 88],
        [436, 152],
        [138, 268],
        [248, 352],
        [316, 358],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.2" className="hg-node" />
      ))}
    </svg>
  )
}

function CardBody({ id, w, h, scatter }: { id: string; w: number; h: number; scatter: { x: number; y: number; k: number }[] }) {
  if (id === 'raw') {
    const rows = [
      ['34', '52k', 'yes'],
      ['?', '61k', 'no'],
      ['29', '9999k', 'yes'],
      ['41', '48k', '?'],
    ]
    return (
      <g transform="translate(16 56)">
        {rows.map((r, i) => (
          <g key={i} transform={`translate(0 ${i * 17})`}>
            {r.map((v, j) => (
              <text key={j} x={j * 58} y={10} className={`hg-cell${v === '?' || v === '9999k' ? ' bad' : ''}`}>
                {v}
              </text>
            ))}
          </g>
        ))}
      </g>
    )
  }
  if (id === 'clean') {
    const vals = [0.18, 0.64, 0.41, 0.92, 0.27, 0.75, 0.5]
    const bw = (w - 32) / vals.length
    return (
      <g transform="translate(16 56)">
        {vals.map((v, i) => (
          <rect key={i} x={i * bw + 2} y={56 - v * 52} width={bw - 6} height={v * 52} rx="2" className="hg-bar" />
        ))}
        <line x1="0" x2={w - 32} y1="56.5" y2="56.5" className="hg-axis" />
      </g>
    )
  }
  if (id === 'clusters') {
    const pw = w - 32
    const ph = h - 64
    return (
      <g transform="translate(16 52)">
        {scatter.map((p, i) => (
          <circle key={i} cx={p.x * pw} cy={p.y * ph} r="2.3" fill={COLORS[p.k]} opacity="0.9" />
        ))}
        {[0, 1, 2].map((k) => {
          const pts = scatter.filter((p) => p.k === k)
          const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
          const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
          return <circle key={k} cx={cx * pw} cy={cy * ph} r="7" fill="none" stroke={COLORS[k]} strokeWidth="1.4" />
        })}
      </g>
    )
  }
  return (
    <g transform="translate(16 60)">
      <text y="10" className="hg-rule">
        {'{bread, butter} → {jam}'}
      </text>
      <text y="30" className="hg-metric">
        support 0.34 · conf 0.82
      </text>
      <text y="50" className="hg-metric">
        lift 1.9
      </text>
    </g>
  )
}
