import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plain, Section, Table, TopicHeader } from '../components/Content'
import { Ext } from '../content/Rich'
import { SOURCES, STARTERS } from '../content/sources'
import '../content/practice.css'
import { TOPICS } from '../topics'

export default function Datasets() {
  const kinds = [...new Set(SOURCES.map((s) => s.kind))]
  const [kind, setKind] = useState('All')
  const list = kind === 'All' ? SOURCES : SOURCES.filter((s) => s.kind === kind)
  return (
    <div className="page">
      <TopicHeader group="Explore" title="Where to find data" lede="Where to search for data, plus starter datasets matched to course topics." />

      <Plain title="Before you download">
        <ul>
          <li>Read the license and the data description. Know what every column means.</li>
          <li>Check the size. Start with a sample if the file is over a few hundred MB.</li>
          <li>Look for how the data was collected. Bias in collection becomes bias in the model.</li>
        </ul>
      </Plain>

      <Section id="sources" title="Sources">
        <div className="chips" style={{ margin: '4px 0 18px' }}>
          {['All', ...kinds].map((k) => (
            <button key={k} type="button" className={`chip${kind === k ? ' on' : ''}`} aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k}
            </button>
          ))}
        </div>
        <div className="grid c3">
          {list.map((s) => (
            <div className="card res-card fade-in" key={s.url}>
              <span className="label">{s.kind}</span>
              <h3 style={{ margin: '8px 0 0', fontSize: 17 }}>
                <a className="res-name" href={s.url} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
              </h3>
              <p>{s.good}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="starters" title="Starter datasets by topic">
        <p>Small, well documented, and matched to topics.</p>
        <Table
          head={['Dataset', 'Size', 'Good for', 'Why']}
          rows={STARTERS.map((d) => [
            <Ext href={d.url}>{d.name}</Ext>,
            d.size,
            <span style={{ whiteSpace: 'normal', display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
              {d.topics.map((t) => (
                <Link key={t} to={`/learn/${t}`}>
                  {TOPICS.find((x) => x.id === t)?.short ?? t}
                </Link>
              ))}
            </span>,
            <span style={{ whiteSpace: 'normal', display: 'block', minWidth: 240 }}>{d.why}</span>,
          ])}
        />
      </Section>

      <Section id="load" title="Load one in Python">
        <pre className="code">{`import pandas as pd
df = pd.read_csv('your_file.csv')
df.info()
df.describe()`}</pre>
        <p style={{ marginTop: 12 }}>
          UCI datasets load with the <code>ucimlrepo</code> package; Iris and other small ones ship in <code>sklearn.datasets</code>.
        </p>
      </Section>
    </div>
  )
}
