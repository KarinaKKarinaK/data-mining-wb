import { type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import HeroGraph from '../components/HeroGraph'
import { GROUPS, TOPICS } from '../topics'

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
          <p className="lede">{TOPICS.length} topics, from cleaning raw records to mining association rules. Learn each method's formula, work it by hand, then test it in a live lab.</p>
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
          <HeroGraph />
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
