import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plain, TopicHeader } from '../components/Content'
import { PROJECTS, type Project } from '../content/projects'
import { Ext } from '../content/Rich'
import '../content/practice.css'
import { TOPICS } from '../topics'

const LEVELS: Project['level'][] = ['Starter', 'Intermediate', 'Advanced']

export default function Projects() {
  const [level, setLevel] = useState<Project['level'] | 'All'>('All')
  const [topic, setTopic] = useState('all')
  const list = PROJECTS.filter((p) => (level === 'All' || p.level === level) && (topic === 'all' || p.topics.includes(topic)))
  const used = TOPICS.filter((t) => PROJECTS.some((p) => p.topics.includes(t.id)))
  return (
    <div className="page">
      <TopicHeader
        group="Explore"
        title="Project ideas"
        lede="Portfolio-sized projects that use the course methods on real public data. Each has a dataset link, a plan, and a stretch goal for when the basics work."
      />
      <Plain title="How to make a project worth showing">
        <ul>
          <li>Start with a question a person would care about, not with an algorithm.</li>
          <li>Show the data first: summaries, missing values, one or two plots.</li>
          <li>Compare at least two methods and pick a metric that fits the question.</li>
          <li>End with what you would do differently with more time or data.</li>
        </ul>
      </Plain>
      <div className="row" style={{ margin: '18px 0 22px', justifyContent: 'space-between' }}>
        <div className="chips">
          {(['All', ...LEVELS] as const).map((l) => (
            <button key={l} type="button" className={`chip${level === l ? ' on' : ''}`} aria-pressed={level === l} onClick={() => setLevel(l)}>
              {l}
            </button>
          ))}
        </div>
        <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Filter by topic">
          <option value="all">Any topic</option>
          {used.map((t) => (
            <option key={t.id} value={t.id}>
              {t.short}
            </option>
          ))}
        </select>
      </div>
      <div className="grid c2">
        {list.map((p) => (
          <article className="card ex-card fade-in" key={p.title}>
            <div className="ex-meta">
              <span className="pill">{p.level}</span>
              {p.topics.map((t) => (
                <Link key={t} className="label" to={`/learn/${t}`}>
                  {TOPICS.find((x) => x.id === t)?.short ?? t}
                </Link>
              ))}
            </div>
            <h3>{p.title}</h3>
            <p style={{ color: 'var(--ink)' }}>{p.goal}</p>
            <ol style={{ fontSize: 14 }}>
              {p.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p>
              <strong>Stretch.</strong> {p.stretch}
            </p>
            <div className="ex-src">
              <Ext href={p.dataset.url}>{p.dataset.name}</Ext>
            </div>
          </article>
        ))}
      </div>
      {!list.length && <p className="muted">No projects match these filters.</p>}
    </div>
  )
}
