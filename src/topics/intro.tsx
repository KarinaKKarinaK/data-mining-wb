import { useMemo, useState } from 'react'
import { Check, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { Dot, Line, Plot } from '../components/Plot'
import { Btn, Readout, Seg, Stat, seriesColor } from '../components/ui'
import { rng } from '../lib/stats'

const STAGES = [
  {
    name: 'Data sources',
    what: 'Raw data lives in databases, data warehouses, the web and files.',
    example: 'An online bookstore has an orders table, a customer table, web click logs and product reviews.',
  },
  {
    name: 'Preprocessing',
    what: 'Clean, integrate, select and transform the data so it is fit to mine.',
    example: 'Remove duplicate orders, fill missing ages, join orders with customers, keep only the last two years.',
  },
  {
    name: 'Data warehouse server',
    what: 'The prepared data is stored in one place that the mining engine can query quickly.',
    example: 'A single sales table with one row per order and the customer attributes attached.',
  },
  {
    name: 'Data mining engine',
    what: 'Algorithms search the data for patterns: classifiers, clusters, rules, outliers.',
    example: 'Association analysis finds that people who buy book A often buy book B.',
  },
  {
    name: 'Pattern evaluation',
    what: 'Keep only patterns that are interesting: valid on new data, useful, novel and understandable. Uses the knowledge base.',
    example: 'A rule that holds for 3 orders out of 2 million is dropped. A rule that holds for 40,000 orders is kept.',
  },
  {
    name: 'User interface',
    what: 'Present the knowledge so people can act on it: reports, charts, recommendations.',
    example: 'The product page shows "Customers who bought this also bought...".',
  },
]

function Pipeline() {
  const [i, setI] = useState(0)
  const W = 640
  const bw = 92
  const gap = (W - 20 - bw * STAGES.length) / (STAGES.length - 1)
  return (
    <Lab
      title="Walk through a data mining system"
      desc="Click a stage, or step through them in order. The example follows one online bookstore from raw tables to a recommendation."
      notes={[
        'Notice how much happens before the mining engine. In real projects preprocessing often takes most of the time.',
        'Pattern evaluation is where most patterns are thrown away. Mining finds many patterns, only a few are interesting.',
      ]}
    >
      <svg viewBox={`0 0 ${W} 120`} className="plot" role="img" aria-label="Pipeline of six stages">
        {STAGES.map((s, k) => {
          const x = 10 + k * (bw + gap)
          const on = k === i
          return (
            <g key={s.name} onClick={() => setI(k)} style={{ cursor: 'pointer' }}>
              {k > 0 && <line x1={x - gap + 2} x2={x - 4} y1={46} y2={46} stroke={k <= i ? 'var(--accent)' : 'var(--ink-4)'} strokeWidth={2} />}
              <rect x={x} y={20} width={bw} height={52} rx={10} fill={on ? 'rgba(143,140,245,0.16)' : 'var(--surface-2)'} stroke={on ? 'var(--accent)' : 'var(--line-2)'} />
              <text x={x + bw / 2} y={42} textAnchor="middle" fontSize={10.5} fill="var(--ink-3)" fontFamily="var(--mono)">
                {String(k + 1).padStart(2, '0')}
              </text>
              <text x={x + bw / 2} y={60} textAnchor="middle" fontSize={10.5} fill={on ? 'var(--ink)' : 'var(--ink-2)'}>
                {s.name.length > 15 ? s.name.split(' ').slice(0, 2).join(' ') : s.name}
              </text>
            </g>
          )
        })}
        <text x={10 + 4 * (bw + gap) + bw / 2} y={100} textAnchor="middle" fontSize={10.5} fill="var(--ink-3)">
          knowledge base
        </text>
        <line x1={10 + 3 * (bw + gap) + bw / 2} x2={10 + 4 * (bw + gap) + bw / 2} y1={76} y2={88} stroke="var(--ink-4)" strokeDasharray="3 3" />
      </svg>
      <div className="grid c2" style={{ marginTop: 12 }}>
        <div className="card tight">
          <span className="label">What happens</span>
          <h3 style={{ margin: '6px 0' }}>{STAGES[i].name}</h3>
          <p style={{ margin: 0 }}>{STAGES[i].what}</p>
        </div>
        <div className="card tight">
          <span className="label">Bookstore example</span>
          <p style={{ margin: '6px 0 0' }}>{STAGES[i].example}</p>
        </div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <Btn sm onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
          Previous stage
        </Btn>
        <Btn sm variant="primary" onClick={() => setI((v) => Math.min(STAGES.length - 1, v + 1))} disabled={i === STAGES.length - 1}>
          Next stage
        </Btn>
        <span className="label">
          Stage {i + 1} of {STAGES.length}
        </span>
      </div>
    </Lab>
  )
}

type Kind = 'relational' | 'transactional' | 'graph' | 'sequence' | 'timeseries' | 'spatial' | 'text'

function DataKinds() {
  const [kind, setKind] = useState<Kind>('relational')
  const ts = useMemo(() => {
    const r = rng(5)
    let v = 100
    return Array.from({ length: 40 }, (_, i) => {
      v += (r() - 0.48) * 6
      return { x: i, y: v }
    })
  }, [])
  const spatial = useMemo(() => {
    const r = rng(9)
    return Array.from({ length: 40 }, () => ({ x: r(), y: r() }))
  }, [])
  const info: Record<Kind, { title: string; desc: string; task: string }> = {
    relational: { title: 'Relational data', desc: 'Tables. Each row is a record (tuple), each column an attribute.', task: 'Classify customers, predict sales, cluster employees.' },
    transactional: { title: 'Transactional data', desc: 'Each record is one transaction holding a set of items.', task: 'Frequent itemsets and association rules (market baskets).' },
    graph: { title: 'Graph data', desc: 'Objects are nodes, relationships are edges.', task: 'Find communities, influential users, link strength.' },
    sequence: { title: 'Sequence data', desc: 'Ordered events, with or without exact times.', task: 'Similar DNA search, clickstream patterns.' },
    timeseries: { title: 'Time series', desc: 'Repeated measurements of the same thing over time.', task: 'Forecasting, finding similar stocks, anomaly alerts.' },
    spatial: { title: 'Spatial data', desc: 'Records with a location: coordinates, areas, road networks.', task: 'Hotspot detection, route analysis.' },
    text: { title: 'Text and multimedia', desc: 'Documents become term vectors (counts per word). Images, audio and video are stored as features.', task: 'Spam filtering, topic clustering, image search.' },
  }
  return (
    <Lab
      title="Kinds of data, side by side"
      desc="The same mining ideas apply to very different data. Pick a type to see what one looks like."
      controls={
        <>
          <Seg
            label="Data type"
            value={kind}
            onChange={setKind}
            options={[
              { v: 'relational', label: 'Relational' },
              { v: 'transactional', label: 'Transactions' },
              { v: 'graph', label: 'Graph' },
              { v: 'sequence', label: 'Sequence' },
              { v: 'timeseries', label: 'Time series' },
              { v: 'spatial', label: 'Spatial' },
              { v: 'text', label: 'Text' },
            ]}
          />
          <div>
            <span className="label">Typical tasks</span>
            <p style={{ marginTop: 6, fontSize: 14 }}>{info[kind].task}</p>
          </div>
        </>
      }
    >
      <h3 style={{ marginBottom: 6 }}>{info[kind].title}</h3>
      <p>{info[kind].desc}</p>
      {kind === 'relational' && (
        <Table
          head={['emp_id', 'name', 'age', 'branch', 'salary']}
          num={[2, 4]}
          rows={[
            ['E01', 'Chan', 34, 'Central', '42,000'],
            ['E02', 'Lee', 29, 'Kowloon', '38,500'],
            ['E03', 'Wong', 45, 'Central', '61,000'],
            ['E04', 'Ho', 31, 'Sha Tin', '40,200'],
          ]}
        />
      )}
      {kind === 'transactional' && (
        <Table
          head={['TID', 'Items']}
          rows={[
            ['T1', '{bread, butter, milk, cereal}'],
            ['T2', '{bread, eggs}'],
            ['T3', '{milk, cereal, bananas}'],
            ['T4', '{bread, butter, milk}'],
          ]}
        />
      )}
      {kind === 'graph' && (
        <svg viewBox="0 0 560 220" className="plot" role="img" aria-label="Small social network graph">
          {[
            [0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 5], [3, 5], [5, 6], [6, 7], [5, 7],
          ].map(([a, b], k) => {
            const P = [[80, 60], [70, 160], [170, 110], [270, 110], [360, 60], [380, 160], [470, 110], [500, 190]]
            return <line key={k} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} stroke="var(--ink-4)" strokeWidth={1.5} />
          })}
          {[[80, 60], [70, 160], [170, 110], [270, 110], [360, 60], [380, 160], [470, 110], [500, 190]].map(([x, y], k) => (
            <g key={k}>
              <circle cx={x} cy={y} r={k === 3 || k === 5 ? 14 : 10} fill={k < 3 ? 'var(--s1)' : k < 6 ? 'var(--s2)' : 'var(--s3)'} stroke="var(--surface)" strokeWidth={2} />
            </g>
          ))}
          <text x={270} y={142} textAnchor="middle" fill="var(--ink-3)" fontSize={11}>
            bridge users connect communities
          </text>
        </svg>
      )}
      {kind === 'sequence' && (
        <pre className="code" style={{ fontSize: 15, letterSpacing: '0.18em' }}>
          {'GGTTCCGCCTTCAGCCCCGCGCC\nGGTTCCGCATTCAGCCACGCGCC'}
        </pre>
      )}
      {kind === 'timeseries' && (
        <Plot w={560} h={200} x={[0, 39]} y={[80, 125]} xLabel="day" yLabel="price" label="Stock price over 40 days">
          <Line pts={ts} color={seriesColor(0)} />
        </Plot>
      )}
      {kind === 'spatial' && (
        <Plot w={560} h={220} x={[0, 1]} y={[0, 1]} xLabel="longitude (scaled)" yLabel="latitude" label="Locations on a map">
          {spatial.map((p, k) => (
            <Dot key={k} x={p.x} y={p.y} r={4} color={seriesColor(2)} />
          ))}
        </Plot>
      )}
      {kind === 'text' && (
        <Table
          head={['document', 'mining', 'data', 'goal', 'team', 'score']}
          num={[1, 2, 3, 4, 5]}
          rows={[
            ['doc 1: lecture notes', 6, 9, 0, 0, 0],
            ['doc 2: sports report', 0, 1, 5, 7, 4],
            ['doc 3: research paper', 4, 11, 0, 1, 0],
          ]}
        />
      )}
    </Lab>
  )
}

type Task = 'Classification' | 'Regression' | 'Clustering' | 'Outlier detection' | 'Association'
const TASKS: Task[] = ['Classification', 'Regression', 'Clustering', 'Outlier detection', 'Association']

const SCENARIOS: { s: string; a: Task; why: string }[] = [
  { s: 'A bank labels past loans as "repaid" or "defaulted" and wants to label new applicants.', a: 'Classification', why: 'Known class labels, the output is a category.' },
  { s: 'Predict next month\'s electricity use (in kWh) of each household.', a: 'Regression', why: 'The output is a number, not a category.' },
  { s: 'Group listeners by tempo, acousticness and skip rate, with no labels given.', a: 'Clustering', why: 'No labels, we look for natural groups.' },
  { s: 'Flag a credit card payment that looks unlike all of the holder\'s past payments.', a: 'Outlier detection', why: 'We look for objects far from every normal group.' },
  { s: 'Find that customers who buy pasta and tomatoes often also buy parmesan.', a: 'Association', why: 'Items that appear together in transactions.' },
  { s: 'Sort incoming emails into spam and not spam using a labeled archive.', a: 'Classification', why: 'Two classes, learned from labeled examples.' },
  { s: 'Split MRI pixels into regions without knowing the regions in advance.', a: 'Clustering', why: 'Image segmentation groups similar pixels without labels.' },
  { s: 'Estimate the selling price of a flat from its size, floor and district.', a: 'Regression', why: 'Price is a continuous number.' },
  { s: 'Spot a sensor that suddenly reports temperatures far outside the usual range.', a: 'Outlier detection', why: 'Rare readings that do not fit any normal pattern.' },
  { s: 'A supermarket wants rules for which products to place next to each other.', a: 'Association', why: 'Rules of the form item A then item B.' },
]

function TaskSorter() {
  const [answers, setAnswers] = useState<(Task | null)[]>(() => SCENARIOS.map(() => null))
  const [i, setI] = useState(0)
  const correct = answers.filter((a, k) => a === SCENARIOS[k].a).length
  const done = answers.filter(Boolean).length
  const cur = answers[i]
  return (
    <Lab
      title="Which task is this?"
      desc="Read the scenario and pick the data mining task. You get the reason right away."
      notes={['The key question: is there a known label? If yes it is classification or regression. If no, it is clustering, outliers or association.', 'Then ask what the output is: a category (classification) or a number (regression).']}
    >
      <div className="card tight" style={{ minHeight: 86 }}>
        <span className="label">
          Scenario {i + 1} of {SCENARIOS.length}
        </span>
        <p style={{ margin: '8px 0 0', color: 'var(--ink)', fontSize: 16 }}>{SCENARIOS[i].s}</p>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        {TASKS.map((t) => {
          const picked = cur === t
          const right = t === SCENARIOS[i].a
          const style = cur
            ? right
              ? { borderColor: 'var(--good)', color: 'var(--ink)' }
              : picked
                ? { borderColor: 'var(--bad)' }
                : { opacity: 0.55 }
            : undefined
          return (
            <button
              key={t}
              type="button"
              className="btn"
              style={style}
              disabled={!!cur}
              onClick={() => setAnswers((a) => a.map((v, k) => (k === i ? t : v)))}
            >
              {t}
            </button>
          )
        })}
      </div>
      {cur && (
        <p style={{ marginTop: 12 }}>
          <strong style={{ color: cur === SCENARIOS[i].a ? 'var(--good)' : 'var(--bad)' }}>{cur === SCENARIOS[i].a ? 'Correct.' : `Not quite, it is ${SCENARIOS[i].a.toLowerCase()}.`}</strong> {SCENARIOS[i].why}
        </p>
      )}
      <div className="row" style={{ marginTop: 8 }}>
        <Btn sm onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
          Previous
        </Btn>
        <Btn sm variant="primary" onClick={() => setI((v) => Math.min(SCENARIOS.length - 1, v + 1))} disabled={i === SCENARIOS.length - 1}>
          Next scenario
        </Btn>
        <Btn
          sm
          variant="ghost"
          onClick={() => {
            setAnswers(SCENARIOS.map(() => null))
            setI(0)
          }}
        >
          Start over
        </Btn>
      </div>
      <Readout>
        <Stat k="Answered" v={`${done} / ${SCENARIOS.length}`} />
        <Stat k="Correct" v={correct} />
        <Stat k="Score" v={done ? `${Math.round((correct / done) * 100)}%` : '-'} />
      </Readout>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader
        group="Foundations"
        title="What data mining is"
        lede="Data mining is the search for interesting, previously unknown and useful patterns in large amounts of data. This page covers why it exists, the system around it, the kinds of data it works on and its five main tasks."
        minutes={15}
      />

      <Plain>
        <p>
          Think of gold mining. You dig through tons of rock to find a few nuggets. Data mining digs through millions of records to find a few patterns worth acting on: which customers are about to leave, which items sell together, which payment looks like fraud.
        </p>
        <p>The rock is cheap and everywhere. The nuggets are rare, and finding them by hand is impossible at this scale.</p>
      </Plain>

      <Section id="why" title="Why it exists" kicker="Motivation">
        <p>
          Data grows faster than anyone can read it. Society (news, social networks), business (web shops, transactions, stock trades) and science (sensors, genomes, simulations) all produce data at scales measured in petabytes and zettabytes. The usual phrase: we are drowning in data but starving for knowledge.
        </p>
        <p>
          Size prefixes in order: kilo, mega, giga, tera, peta, exa, zetta. Each step is 1000 times bigger.
        </p>
      </Section>

      <Section id="definition" title="What counts as data mining" kicker="Definition">
        <p>
          Data mining extracts patterns that are <strong>interesting</strong>: non-trivial, implicit, previously unknown and potentially useful. It works by automatic or semi-automatic means on large data. It draws on statistics, databases, algorithms, machine learning, visualization and pattern recognition.
        </p>
        <Table
          head={['Data mining', 'Not data mining']}
          rows={[
            ['Finding which products are often bought together', 'Looking up one customer\'s phone number'],
            ['Grouping customers by behavior without labels', 'Running SELECT * WHERE city = \'Hong Kong\''],
            ['Learning which transactions look fraudulent', 'Typing "Amazon" into a search engine'],
          ]}
        />
      </Section>

      <Pipeline />

      <Section id="data" title="What kinds of data" kicker="Data types">
        <p>Relational tables are the most common, but the same ideas extend to transactions, graphs, sequences, time series, spatial data, text and multimedia.</p>
      </Section>
      <DataKinds />

      <Section id="tasks" title="The five main tasks" kicker="Functionalities">
        <Table
          head={['Task', 'Labels?', 'Output', 'Example']}
          rows={[
            ['Classification', 'Yes', 'A category', 'Approve or reject a loan'],
            ['Regression', 'Yes', 'A number', 'Forecast next week\'s sales'],
            ['Clustering', 'No', 'Groups of similar objects', 'Customer segments'],
            ['Outlier detection', 'No', 'Objects far from every cluster', 'Fraudulent card payment'],
            ['Association analysis', 'No', 'Rules like A then B', 'Market basket rules'],
          ]}
        />
        <p style={{ marginTop: 12 }}>
          <strong>Supervised</strong> tasks (classification, regression) learn from a training set where the answer is known. <strong>Unsupervised</strong> tasks (clustering, outliers, association) have no answer column and look for structure.
        </p>
      </Section>
      <TaskSorter />

      <Section id="traps" title="Common mistakes">
        <Trap>
          <ul>
            <li>A simple search or query is not data mining. Nothing new is learned.</li>
            <li>Classification predicts a category, regression predicts a number. "Predict the price" is regression even though it is a prediction.</li>
            <li>Clustering has no class labels. If the question mentions a labeled training set, it is not clustering.</li>
            <li>An outlier is not always an error. In fraud detection the outlier is exactly what you want to find.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="A hospital has records of patients labeled with one of three treatments that worked. It wants to suggest a treatment for a new patient. Which task?">
          Classification. There is a labeled training set and the output is one of three categories.
        </Check>
        <Check q="Why is pattern evaluation needed if the mining engine already found patterns?">
          Mining produces far more patterns than are useful. Evaluation keeps only those that are valid on new data, novel, useful and understandable, using measures like support, confidence or accuracy and the knowledge base.
        </Check>
        <Check q="Give one example each of graph, sequence and time series data.">
          Graph: a social network of friendships. Sequence: a DNA string or a customer's ordered clicks. Time series: hourly temperature readings or daily stock prices.
        </Check>
      </Section>
    </>
  )
}
