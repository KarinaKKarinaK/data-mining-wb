import { Section, TopicHeader } from '../components/Content'
import { RESOURCE_GROUPS } from '../content/resources'
import '../content/practice.css'

export default function Resources() {
  return (
    <div className="page">
      <TopicHeader group="Explore" title="Books, videos and tools" lede="Textbooks, free books, docs, visual explainers, videos and software." />
      {RESOURCE_GROUPS.map((g) => (
        <Section key={g.title} id={g.title.toLowerCase().replace(/\s+/g, '-')} title={g.title}>
          <div className="grid c3">
            {g.items.map((r) => (
              <div className="card res-card" key={r.url}>
                <a className="res-name" href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 16, color: 'var(--ink)' }}>
                  {r.name}
                </a>
                {r.by && <div className="by">{r.by}</div>}
                <p>{r.note}</p>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </div>
  )
}
