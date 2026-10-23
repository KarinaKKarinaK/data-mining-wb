import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TopicHeader } from '../components/Content'
import { EXAMPLES, METHODS, type Method } from '../content/examples'
import { Ext } from '../content/Rich'
import '../content/practice.css'
import { TOPICS } from '../topics'

export default function Examples() {
  const [filter, setFilter] = useState<Method | 'All'>('All')
  const list = filter === 'All' ? EXAMPLES : EXAMPLES.filter((e) => e.methods.includes(filter))
  return (
    <div className="page">
      <TopicHeader
        group="Explore"
        title="Data mining in the real world"
        lede="Cases where these methods changed a business, a science, or went wrong in public. Each one links to a source so you can read the full story."
      />
      <div className="chips" style={{ marginBottom: 22 }}>
        {(['All', ...METHODS] as const).map((m) => (
          <button key={m} type="button" className={`chip${filter === m ? ' on' : ''}`} aria-pressed={filter === m} onClick={() => setFilter(m)}>
            {m}
            {m !== 'All' && <span className="muted"> {EXAMPLES.filter((e) => e.methods.includes(m)).length}</span>}
          </button>
        ))}
      </div>
      <div className="grid c2">
        {list.map((e) => (
          <article className="card ex-card fade-in" key={e.title}>
            <div className="ex-meta">
              <span className="label">{e.year}</span>
              {e.methods.map((m) => (
                <span className="pill" key={m}>
                  {m}
                </span>
              ))}
            </div>
            <h3>{e.title}</h3>
            <p>{e.what}</p>
            <p style={{ color: 'var(--ink)' }}>
              <strong>Takeaway.</strong> {e.lesson}
            </p>
            <div className="row" style={{ fontSize: 13, gap: 6 }}>
              <span className="muted">Related:</span>
              {e.topics.map((t, i) => (
                <span key={t}>
                  <Link to={`/learn/${t}`}>{TOPICS.find((x) => x.id === t)?.short ?? t}</Link>
                  {i < e.topics.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
            <div className="ex-src">
              {e.sources.map((s) => (
                <Ext key={s.url} href={s.url}>
                  {s.label}
                </Ext>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
