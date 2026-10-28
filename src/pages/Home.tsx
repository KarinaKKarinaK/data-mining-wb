import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Dot, Line, Plot } from '../components/Plot'
import { seriesColor } from '../components/ui'
import { assign, initRandom, update } from '../lib/cluster'
import { make2D } from '../lib/datasets'
import type { Pt } from '../lib/stats'
import { GROUPS, TOPICS } from '../topics'

function HeroViz() {
  const [seed, setSeed] = useState(3)
  const pts = useMemo(() => make2D('blobs', 150, seed + 10, 0.06, 4).map(({ x, y }) => ({ x, y })), [seed])
  const [cs, setCs] = useState<Pt[]>(() => initRandom(pts, 4, seed))
  const [labels, setLabels] = useState<number[] | null>(null)
  const [trail, setTrail] = useState<Pt[][]>(() => cs.map((c) => [c]))
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setTick((t) => t + 1), 900)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (tick === 0) return
    if (tick % 14 === 0) {
      const s = seed + 1
      const np = make2D('blobs', 150, s + 10, 0.06, 4).map(({ x, y }) => ({ x, y }))
      const c = initRandom(np, 4, s)
      setSeed(s)
      setCs(c)
      setLabels(null)
      setTrail(c.map((p) => [p]))
      return
    }
    if (tick % 2 === 1) setLabels(assign(pts, cs))
    else if (labels) {
      const n = update(pts, labels, cs)
      setCs(n)
      setTrail((t) => n.map((p, j) => [...(t[j] ?? []), p]))
    }
  }, [tick])

  return (
    <Plot w={520} h={420} x={[0, 1]} y={[0, 1]} axes={false} grid={false} label="Live k-means animation">
      {pts.map((p, i) => (
        <Dot key={i} x={p.x} y={p.y} r={3.8} color={labels ? seriesColor(labels[i]) : 'var(--ink-4)'} shape={labels ? labels[i] : 0} />
      ))}
      {trail.map((t, j) => (
        <Line key={j} pts={t} color={seriesColor(j)} width={1.4} dash="3 3" />
      ))}
      {cs.map((c, j) => (
        <Dot key={'c' + j} x={c.x} y={c.y} r={9} color="var(--surface)" stroke={seriesColor(j)} strokeWidth={3} shape={j} />
      ))}
    </Plot>
  )
}

const MORE = [
  { to: '/practice/flashcards', t: 'Flashcards', d: 'By topic, with progress saved' },
  { to: '/practice/quiz', t: 'Practice quiz', d: 'Calculations and concepts with worked answers' },
  { to: '/playground', t: 'Playground', d: 'Paste a CSV, then cluster or classify it' },
  { to: '/examples', t: 'Real-world cases', d: 'Documented uses, with sources' },
  { to: '/projects', t: 'Project ideas', d: 'With datasets to use' },
  { to: '/datasets', t: 'Where to find data', d: 'Kaggle, Hugging Face, UCI, GitHub' },
]

export default function Home() {
  return (
    <div className="page">
      <section className="hero fade-in">
        <div>
          <h1>Data mining</h1>
          <p className="lede">Preprocessing, classification, clustering and association rules. Each topic has the idea, the formulas, a worked example and a lab you can change.</p>
          <div className="row" style={{ marginTop: 24 }}>
            <Link className="btn primary" to="/learn/intro">
              Start with topic 1
            </Link>
            <Link className="btn ghost" to="/guide">
              Study guide
            </Link>
          </div>
        </div>
        <div className="card hero-card">
          <div className="row" style={{ justifyContent: 'space-between', padding: '2px 4px 0' }}>
            <span className="label">k-means, k = 4</span>
            <Link to="/learn/kmeans" className="label" style={{ textDecoration: 'none' }}>
              Open lab
            </Link>
          </div>
          <HeroViz />
        </div>
      </section>

      {GROUPS.map((g) => (
        <section className="module" key={g}>
          <div className="module-head">
            <h2>{g}</h2>
            <span className="label">{TOPICS.filter((t) => t.group === g).length} topics</span>
          </div>
          {TOPICS.filter((t) => t.group === g).map((t, i) => (
            <Link className="topic-row" to={`/learn/${t.id}`} key={t.id} style={{ '--i': i } as CSSProperties}>
              <span className="tr-title">{t.title}</span>
              <span className="tr-blurb">{t.blurb}</span>
              <span className="tr-lec">{String(TOPICS.indexOf(t) + 1).padStart(2, '0')}</span>
            </Link>
          ))}
        </section>
      ))}

      <section className="module">
        <div className="module-head">
          <h2>Practice and explore</h2>
        </div>
        <div className="grid c3" style={{ marginTop: 14 }}>
          {MORE.map((c) => (
            <Link className="card link tight" to={c.to} key={c.to}>
              <h3 style={{ fontSize: 16 }}>{c.t}</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--ink-3)' }}>{c.d}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
