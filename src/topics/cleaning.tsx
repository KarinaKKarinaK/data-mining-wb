import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Label, Line, Plot, Rect } from '../components/Plot'
import { Legend, Readout, Seg, Slider, Stat, Toggle, seriesColor } from '../components/ui'
import { fmt, mean, median, std } from '../lib/stats'

type Cust = { id: string; age: number; income: number | null; buys: 'yes' | 'no' }

const CUSTOMERS: Cust[] = [
  { id: 'C1', age: 23, income: 28, buys: 'no' },
  { id: 'C2', age: 41, income: null, buys: 'yes' },
  { id: 'C3', age: 35, income: 52, buys: 'yes' },
  { id: 'C4', age: 29, income: null, buys: 'no' },
  { id: 'C5', age: 52, income: 75, buys: 'yes' },
  { id: 'C6', age: 46, income: 64, buys: 'yes' },
  { id: 'C7', age: 31, income: 33, buys: 'no' },
  { id: 'C8', age: 38, income: null, buys: 'yes' },
  { id: 'C9', age: 26, income: 30, buys: 'no' },
  { id: 'C10', age: 58, income: 81, buys: 'yes' },
]

type Strategy = 'drop' | 'constant' | 'mean' | 'classmean' | 'model'

function MissingLab() {
  const [st, setSt] = useState<Strategy>('mean')
  const known = CUSTOMERS.filter((c) => c.income !== null) as (Cust & { income: number })[]
  const overall = mean(known.map((c) => c.income))
  const classMean = (b: string) => mean(known.filter((c) => c.buys === b).map((c) => c.income))
  const ax = known.map((c) => c.age)
  const ay = known.map((c) => c.income)
  const mx = mean(ax)
  const my = mean(ay)
  const slope = ax.reduce((s, x, i) => s + (x - mx) * (ay[i] - my), 0) / ax.reduce((s, x) => s + (x - mx) ** 2, 0)
  const icpt = my - slope * mx

  const rows = CUSTOMERS.map((c) => {
    if (c.income !== null) return { ...c, filled: c.income, imputed: false }
    if (st === 'drop') return { ...c, filled: null, imputed: false }
    const v = st === 'constant' ? 0 : st === 'mean' ? overall : st === 'classmean' ? classMean(c.buys) : icpt + slope * c.age
    return { ...c, filled: v, imputed: true }
  })
  const used = rows.filter((r) => r.filled !== null) as { filled: number; buys: string }[]
  const inc = used.map((r) => r.filled)
  const trueStd = std(known.map((c) => c.income))

  return (
    <Lab
      title="Five ways to fill a missing income"
      desc="Three of ten customers have no income (in thousands)."
      controls={
        <Seg
          label="Strategy"
          value={st}
          onChange={setSt}
          options={[
            { v: 'drop', label: 'Ignore the record' },
            { v: 'constant', label: 'Global constant (0)' },
            { v: 'mean', label: 'Attribute mean' },
            { v: 'classmean', label: 'Mean of same class' },
            { v: 'model', label: 'Predict from age' },
          ]}
        />
      }
      notes={[
        'Pick "Ignore the record": 30% of the rows go, along with their age and class.',
        'Pick "Attribute mean": the mean stays, but the std dev shrinks because every filled value sits in the middle.',
        'Pick "Mean of same class" or "Predict from age": the filled values use other attributes and look more plausible.',
      ]}
    >
      <Table
        head={['Customer', 'Age', 'Income', 'Buys']}
        num={[1, 2]}
        hl={(i) => rows[i].imputed || (st === 'drop' && rows[i].filled === null)}
        rows={rows.map((r) => [r.id, r.age, r.filled === null ? <span className="muted">dropped</span> : r.imputed ? <strong>{fmt(r.filled, 2)}</strong> : r.filled, r.buys])}
      />
      <Readout>
        <Stat k="Records used" v={used.length} />
        <Stat k="Mean income" v={fmt(mean(inc), 2)} sub={`known only: ${fmt(overall, 2)}`} />
        <Stat k="Std dev" v={fmt(std(inc), 2)} sub={`known only: ${fmt(trueStd, 2)}`} />
        <Stat k="Mean, buys = yes" v={fmt(mean(used.filter((r) => r.buys === 'yes').map((r) => r.filled)), 2)} />
      </Readout>
    </Lab>
  )
}

type BinMethod = 'depth' | 'width'
type Smooth = 'means' | 'medians' | 'boundaries'

function makeBins(vals: number[], k: number, method: BinMethod) {
  const s = [...vals].sort((a, b) => a - b)
  const n = s.length
  if (method === 'depth') {
    return Array.from({ length: k }, (_, b) => {
      const items = s.slice(Math.round((b * n) / k), Math.round(((b + 1) * n) / k))
      return { lo: items[0], hi: items[items.length - 1], items }
    })
  }
  const min = s[0]
  const max = s[n - 1]
  const w = (max - min) / k
  return Array.from({ length: k }, (_, b) => ({
    lo: min + b * w,
    hi: min + (b + 1) * w,
    items: s.filter((v) => (w === 0 ? b === 0 : Math.min(k - 1, Math.floor((v - min) / w)) === b)),
  }))
}

function smoothBin(items: number[], how: Smooth) {
  if (!items.length) return []
  if (how === 'means') return items.map(() => mean(items))
  if (how === 'medians') return items.map(() => median(items))
  const lo = items[0]
  const hi = items[items.length - 1]
  return items.map((v) => (v - lo <= hi - v ? lo : hi))
}

function BinningLab() {
  const [text, setText] = useState('4, 8, 15, 21, 21, 24, 25, 28, 34')
  const [k, setK] = useState(3)
  const [method, setMethod] = useState<BinMethod>('depth')
  const [how, setHow] = useState<Smooth>('means')
  const vals = useMemo(
    () =>
      text
        .split(/[\s,;]+/)
        .filter((s) => s.trim() !== '')
        .map(Number)
        .filter((v) => isFinite(v)),
    [text],
  )
  const ok = vals.length >= 2
  const bins = ok ? makeBins(vals, Math.min(k, vals.length), method) : []
  const sm = bins.map((b) => smoothBin(b.items, how))
  const lo = ok ? Math.min(...vals) : 0
  const hi = ok ? Math.max(...vals) : 1
  const pad = (hi - lo) * 0.06 || 1
  const flat = bins.flatMap((b, i) => b.items.map((v, j) => ({ v, s: sm[i][j], b: i })))
  const sse = flat.reduce((acc, p) => acc + (p.v - p.s) ** 2, 0)

  return (
    <Lab
      title="Binning to smooth noise"
      desc="Edit the values to try your own."
      controls={
        <>
          <label className="ctl">
            <span className="ctl-head">Values (comma separated)</span>
            <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <Slider label="Number of bins" value={k} min={1} max={6} onChange={setK} />
          <Seg label="Partitioning" value={method} onChange={setMethod} options={[{ v: 'depth', label: 'Equal depth' }, { v: 'width', label: 'Equal width' }]} />
          <Seg label="Smoothing by" value={how} onChange={setHow} options={[{ v: 'means', label: 'Means' }, { v: 'medians', label: 'Medians' }, { v: 'boundaries', label: 'Boundaries' }]} />
        </>
      }
      notes={[
        'The default is the textbook price example: 3 equal-depth bins by means give 9 / 22 / 29.',
        'Switch to equal width: bins get different sizes because the values are not spread evenly.',
        'Pick boundaries: each value moves to the closer edge of its bin (ties go low).',
      ]}
    >
      {ok ? (
        <>
          <Plot w={560} h={230} x={[lo - pad, hi + pad]} y={[-0.6, 1.6]} xLabel="value" yTickValues={[{ v: 1, label: 'raw' }, { v: 0, label: 'smooth' }]} label="Raw values and smoothed values by bin">
            {bins.map((b, i) =>
              b.items.length ? <Rect key={i} x0={method === 'width' ? b.lo : b.lo - pad * 0.3} x1={method === 'width' ? b.hi : b.hi + pad * 0.3} y0={-0.4} y1={1.4} color={seriesColor(i)} opacity={0.1} rx={6} /> : null,
            )}
            {flat.map((p, i) => (
              <Line key={'l' + i} pts={[{ x: p.v, y: 1 }, { x: p.s, y: 0 }]} color={seriesColor(p.b)} width={1} opacity={0.6} />
            ))}
            {flat.map((p, i) => (
              <Dot key={'r' + i} x={p.v} y={1} r={5} color={seriesColor(p.b)} shape={p.b} />
            ))}
            {flat.map((p, i) => (
              <Dot key={'s' + i} x={p.s} y={0} r={5} color={seriesColor(p.b)} shape={p.b} />
            ))}
            {bins.map((b, i) => (b.items.length ? <Label key={'t' + i} x={(b.items[0] + b.items[b.items.length - 1]) / 2} y={1.4} anchor="middle" dy={-4}>{`bin ${i + 1}`}</Label> : null))}
          </Plot>
          <Legend items={bins.map((_, i) => ({ label: `Bin ${i + 1}`, color: seriesColor(i), shape: i }))} />
          <Table
            head={['Bin', 'Range', 'Values', `Smoothed by ${how}`]}
            rows={bins.map((b, i) => [
              i + 1,
              method === 'width' ? `[${fmt(b.lo, 2)}, ${fmt(b.hi, 2)}${i === bins.length - 1 ? ']' : ')'}` : `${b.items[0] ?? '-'} to ${b.items[b.items.length - 1] ?? '-'}`,
              b.items.length ? b.items.join(', ') : <span className="muted">empty</span>,
              sm[i].length ? sm[i].map((v) => Number(fmt(v, 2))).join(', ') : '-',
            ])}
          />
          <Readout>
            <Stat k="Values" v={vals.length} />
            <Stat k="Bins used" v={bins.filter((b) => b.items.length).length} />
            <Stat k="Squared change" v={fmt(sse, 2)} />
          </Readout>
        </>
      ) : (
        <p className="muted">Enter at least two numbers.</p>
      )}
    </Lab>
  )
}

const PEOPLE = [
  { name: 'Chan', age: 42, born: 1984, height: 172, salary: 41000 },
  { name: 'Lee', age: 42, born: 1990, height: 165, salary: 38000 },
  { name: 'Wong', age: -3, born: 2010, height: 150, salary: 0 },
  { name: 'Ho', age: 29, born: 1997, height: -170, salary: 39000 },
  { name: 'Ng', age: 35, born: 1991, height: 180, salary: -10 },
  { name: 'Tam', age: 130, born: 1896, height: 160, salary: 20000 },
  { name: 'Yip', age: 51, born: 1975, height: 168, salary: 52000 },
]

const RULES = [
  { id: 'age', label: 'Age between 0 and 120', test: (p: (typeof PEOPLE)[number]) => p.age >= 0 && p.age <= 120 },
  { id: 'born', label: 'Age matches birth year (2026)', test: (p: (typeof PEOPLE)[number]) => Math.abs(2026 - p.born - p.age) <= 1 },
  { id: 'height', label: 'Height is positive', test: (p: (typeof PEOPLE)[number]) => p.height > 0 },
  { id: 'salary', label: 'Salary is not negative', test: (p: (typeof PEOPLE)[number]) => p.salary >= 0 },
]

function RulesLab() {
  const [on, setOn] = useState<Record<string, boolean>>({ age: true, born: true, height: true, salary: true })
  const problems = PEOPLE.map((p) => RULES.filter((r) => on[r.id] && !r.test(p)).map((r) => r.label))
  const bad = problems.filter((x) => x.length).length
  return (
    <Lab
      title="Catch inconsistencies with domain rules"
      desc="Turn rules on and off to see which records each one catches."
      controls={
        <div className="stack">
          {RULES.map((r) => (
            <div key={r.id}>
              <Toggle on={on[r.id]} onChange={(v) => setOn((o) => ({ ...o, [r.id]: v }))}>
                {r.label}
              </Toggle>
            </div>
          ))}
        </div>
      }
      notes={[
        'Turn off "Age matches birth year": Lee now passes, though 42 and 1990 cannot both be right. Cross-attribute rules catch what ranges miss.',
        'A rule finds the problem, not the fix. Is Lee 42 or born in 1984? That may need an outside source.',
      ]}
    >
      <Table
        head={['Name', 'Age', 'Born', 'Height (cm)', 'Salary', 'Problems']}
        num={[1, 2, 3, 4]}
        hl={(i) => problems[i].length > 0}
        rows={PEOPLE.map((p, i) => [p.name, p.age, p.born, p.height, p.salary.toLocaleString('en-US'), problems[i].length ? problems[i].join('; ') : <span className="muted">none</span>])}
      />
      <Readout>
        <Stat k="Records" v={PEOPLE.length} />
        <Stat k="Flagged" v={bad} />
        <Stat k="Clean" v={PEOPLE.length - bad} />
      </Readout>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader
        group="Preprocessing"
        title="Data cleaning"
        lede="Real data has missing, wrong and contradictory values. No quality data, no quality results."
      />

      <Plain>
        <p>
          A sign-up sheet has blank phone numbers (missing), an age of 230 (noise), a birthday that does not fit the age (inconsistent) and two people listed twice (redundant). Cleaning fixes these before you use the sheet.
        </p>
      </Plain>

      <Section id="dirty" title="Four kinds of dirty data">
        <Table
          head={['Problem', 'Example', 'Typical cause']}
          rows={[
            ['Incomplete', 'occupation = " "', 'Not applicable when collected, human or software error'],
            ['Noisy', 'salary = -10', 'Faulty instruments, typing errors, transmission errors'],
            ['Inconsistent', 'age 42, born 1990', 'Data from different sources'],
            ['Redundant', 'the same customer twice', 'Integrating several sources'],
          ]}
        />
        <p style={{ marginTop: 12 }}>
          Preprocessing has four parts: <strong>cleaning</strong>, <strong>integration</strong>, <strong>transformation</strong> and <strong>reduction</strong>.
        </p>
      </Section>

      <Section id="missing" title="Missing values">
        <ul>
          <li><strong>Ignore the record.</strong> Usually only when the class label is missing. Wastes the other values.</li>
          <li><strong>Fill in by hand.</strong> Accurate but often impossible at scale.</li>
          <li><strong>Global constant</strong> such as "unknown". The miner may treat it as a real, shared value.</li>
          <li><strong>Attribute mean</strong> (or median for skewed data).</li>
          <li><strong>Attribute mean of the same class.</strong> Smarter when classes differ.</li>
          <li><strong>Most probable value</strong> from a model, such as regression, a decision tree or Bayes.</li>
        </ul>
      </Section>
      <MissingLab />

      <Section id="noise" title="Noise and binning">
        <p>
          Noise is random error in a measured value. <strong>Binning</strong> smooths it: sort, split into bins, and replace each value by its bin mean, median or nearest boundary. Regression and clustering can also smooth noise.
        </p>
        <Formula title="Bin sizes">
          <MB>{'\\text{equal width: } w = \\frac{\\max - \\min}{k} \\qquad \\text{equal depth: about } \\frac{N}{k} \\text{ values per bin}'}</MB>
          <p>One outlier can leave most equal-width bins nearly empty. Equal-depth bins always hold the same number of values.</p>
        </Formula>
      </Section>
      <BinningLab />

      <Section id="worked" title="Worked example">
        <p>Prices sorted: 4, 8, 15, 21, 21, 24, 25, 28, 34. Three equal-depth bins.</p>
        <Table
          head={['Bin', 'Values', 'By means', 'By medians', 'By boundaries']}
          rows={[
            ['1', '4, 8, 15', '9, 9, 9', '8, 8, 8', '4, 4, 15'],
            ['2', '21, 21, 24', '22, 22, 22', '21, 21, 21', '21, 21, 24'],
            ['3', '25, 28, 34', '29, 29, 29', '28, 28, 28', '25, 25, 34'],
          ]}
        />
        <p style={{ marginTop: 10 }}>
          Bin 1 mean: <M>{'(4 + 8 + 15)/3 = 9'}</M>. For boundaries, 8 is 4 away from 4 and 7 away from 15, so it becomes 4.
        </p>
      </Section>

      <Section id="inconsistent" title="Inconsistencies">
        <p>
          Some can be fixed with <strong>metadata</strong> (type, range, meaning) and domain knowledge, such as "height cannot be negative". Others need an outside source, like checking an address against another database.
        </p>
      </Section>
      <RulesLab />

      <Section id="traps" title="Common mistakes">
        <Trap>
          <ul>
            <li>Mean imputation keeps the mean but always lowers the standard deviation. Do not report the new std as if it were real.</li>
            <li>A global constant like 0 or "unknown" can create a fake pattern: all those records look alike to the algorithm.</li>
            <li>Equal-depth binning needs the data sorted first.</li>
            <li>Never use the class label of a test record to fill its missing values. That leaks the answer.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="Smooth 5, 10, 11, 13, 15, 35, 50, 55, 72 with 3 equal-depth bins by means.">
          Bins: (5, 10, 11), (13, 15, 35), (50, 55, 72). Means: 8.67, 21, 59. Smoothed: 8.67, 8.67, 8.67, 21, 21, 21, 59, 59, 59.
        </Check>
        <Check q="When is ignoring a record a reasonable choice?">
          When the class label is missing in a classification task, or when very few records have missing values. It is a poor choice when many records have a few missing attributes.
        </Check>
        <Check q="Why can filling with the class mean be better than the overall mean?">
          If the classes differ on that attribute (buyers earn more than non-buyers), the class mean is closer to the true value. The overall mean ignores that information.
        </Check>
      </Section>
    </>
  )
}
