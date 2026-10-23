import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dot, Line, Plot } from '../components/Plot'
import { Pill, seriesColor } from '../components/ui'
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

const STEPS = [
  { n: '01', t: 'Read it in plain words', d: 'Every idea starts with an everyday explanation, then the formula the exam expects.' },
  { n: '02', t: 'Change the numbers', d: 'Each algorithm is a lab. Drag points, move sliders, and watch the result update.' },
  { n: '03', t: 'Test yourself', d: 'Flashcards and practice quizzes with worked explanations for every answer.' },
]

export default function Home() {
  const labs = TOPICS.length
  return (
    <div className="page">
      <section className="hero fade-in">
        <div>
          <Pill>Private study resource for COMP 4331</Pill>
          <h1 style={{ marginTop: 18 }}>
            Data mining,
            <br />
            <span className="grad-text">one experiment at a time.</span>
          </h1>
          <p className="lede">
            The full course as interactive labs: preprocessing, classification, clustering and association rules. Every formula comes with a chart you can play with.
          </p>
          <div className="row" style={{ marginTop: 22 }}>
            <Link className="btn primary" to="/course">
              Start with the course guide
            </Link>
            <Link className="btn" to="/learn/kmeans">
              Open a lab
            </Link>
          </div>
          <div className="hero-stats">
            <div>
              <div className="mono big">{labs}</div>
              <span className="label">topics</span>
            </div>
            <div>
              <div className="mono big">5</div>
              <span className="label">modules</span>
            </div>
            <div>
              <div className="mono big">70+</div>
              <span className="label">interactive labs</span>
            </div>
          </div>
        </div>
        <div className="card hero-card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Live: k-means, k = 4</span>
            <Link to="/learn/kmeans" className="label">
              Try it
            </Link>
          </div>
          <HeroViz />
        </div>
      </section>

      <section className="section">
        <span className="label">How it works</span>
        <h2>Three moves per topic</h2>
        <div className="grid c3" style={{ marginTop: 18 }}>
          {STEPS.map((s) => (
            <div className="card step" key={s.n}>
              <span className="step-n mono">{s.n}</span>
              <h3>{s.t}</h3>
              <p style={{ marginTop: 8 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {GROUPS.map((g) => (
        <section className="section" key={g}>
          <span className="label">Module</span>
          <h2>{g}</h2>
          <div className="grid c3" style={{ marginTop: 18 }}>
            {TOPICS.filter((t) => t.group === g).map((t) => (
              <Link className="card link" to={`/learn/${t.id}`} key={t.id}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="label">{t.short}</span>
                  {t.lecture && <span className="label">{t.lecture}</span>}
                </div>
                <h3 style={{ margin: '10px 0 6px' }}>{t.title}</h3>
                <p style={{ margin: 0, fontSize: 14 }}>{t.blurb}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="section">
        <span className="label">Beyond the lectures</span>
        <h2>Practice and explore</h2>
        <div className="grid c3" style={{ marginTop: 18 }}>
          {[
            { to: '/practice/flashcards', t: 'Flashcards', d: 'Flip, shuffle and track what you know, by topic.' },
            { to: '/practice/quiz', t: 'Practice quiz', d: 'Multiple choice and calculation questions with explanations.' },
            { to: '/playground', t: 'Dataset playground', d: 'Pick a dataset, pick an algorithm, compare results.' },
            { to: '/examples', t: 'Real-world cases', d: 'Where these methods changed products and science, with sources.' },
            { to: '/projects', t: 'Project ideas', d: 'Portfolio projects with datasets and the methods to use.' },
            { to: '/datasets', t: 'Where to find data', d: 'Kaggle, UCI, GitHub collections and open government data.' },
          ].map((c) => (
            <Link className="card link" to={c.to} key={c.to}>
              <h3>{c.t}</h3>
              <p style={{ margin: '8px 0 0', fontSize: 14 }}>{c.d}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
