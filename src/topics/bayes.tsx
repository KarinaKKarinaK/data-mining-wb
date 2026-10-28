import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { HLine, Line, Plot, VLine } from '../components/Plot'
import { Legend, Readout, Seg, Slider, Stat, Toggle, seriesColor } from '../components/ui'
import { BUYS_COMPUTER, PLAY_TENNIS } from '../lib/datasets'
import { fmt } from '../lib/stats'

function DiagnosisLab() {
  const [prev, setPrev] = useState(0.008)
  const [sens, setSens] = useState(0.98)
  const [spec, setSpec] = useState(0.97)
  const post = (sens * prev) / (sens * prev + (1 - spec) * (1 - prev))
  const N = 1000
  const sick = Math.round(N * prev)
  const tp = Math.round(sick * sens)
  const fn = sick - tp
  const fp = Math.round((N - sick) * (1 - spec))
  const tn = N - sick - fp
  const kinds = [...Array(tp).fill(0), ...Array(fn).fill(2), ...Array(fp).fill(1), ...Array(tn).fill(-1)]
  const cols = 50
  return (
    <Lab
      title="A positive test: how worried should you be?"
      desc="1000 people, one square each. P(disease | +) is the share of sick people among all positives."
      controls={
        <>
          <Slider label="Prevalence P(disease)" value={prev} min={0.001} max={0.3} step={0.001} onChange={setPrev} fmt={(v) => `${(v * 100).toFixed(1)}%`} />
          <Slider label="Sensitivity P(+ | disease)" value={sens} min={0.5} max={1} step={0.01} onChange={setSens} fmt={(v) => v.toFixed(2)} />
          <Slider label="Specificity P(- | healthy)" value={spec} min={0.5} max={1} step={0.005} onChange={setSpec} fmt={(v) => v.toFixed(3)} />
        </>
      }
      notes={[
        'Defaults: an accurate test still gives only about 21% after a positive result, because the healthy majority makes more false alarms than the sick make true positives.',
        'Raise prevalence to 20%. The same test becomes far more convincing: the prior matters.',
        'Set specificity to 1.000: no false positives, so a positive means disease.',
      ]}
    >
      <svg viewBox={`0 0 ${cols * 11 + 4} ${Math.ceil(N / cols) * 11 + 4}`} className="plot" style={{ width: '100%', maxWidth: 640 }} role="img" aria-label="1000 people grid by disease and test result">
        {kinds.map((k, i) => (
          <rect key={i} x={2 + (i % cols) * 11} y={2 + Math.floor(i / cols) * 11} width={9} height={9} rx={2} fill={k < 0 ? 'var(--surface-3)' : seriesColor(k)} />
        ))}
      </svg>
      <Legend
        items={[
          { label: `Sick, test positive (${tp})`, color: seriesColor(0), shape: 1 },
          { label: `Healthy, test positive (${fp})`, color: seriesColor(1), shape: 1 },
          { label: `Sick, test negative (${fn})`, color: seriesColor(2), shape: 1 },
          { label: `Healthy, test negative (${tn})`, color: 'var(--surface-3)', shape: 1 },
        ]}
      />
      <Readout>
        <Stat k="P(+)" v={fmt(sens * prev + (1 - spec) * (1 - prev), 4)} sub="evidence" />
        <Stat k="P(disease | +)" v={fmt(post, 4)} sub="posterior" />
        <Stat k="From the grid" v={tp + fp ? `${tp} / ${tp + fp}` : '0 / 0'} sub="sick among positives" />
      </Readout>
    </Lab>
  )
}

const DATA = { buys: BUYS_COMPUTER, tennis: PLAY_TENNIS }
const DEFAULT_X = {
  buys: { age: 'youth', income: 'medium', student: 'yes', credit_rating: 'fair' } as Record<string, string>,
  tennis: { outlook: 'sunny', temperature: 'cool', humidity: 'high', windy: 'true' } as Record<string, string>,
}

function NaiveBayesLab() {
  const [ds, setDs] = useState<'buys' | 'tennis'>('buys')
  const data = DATA[ds]
  const [x, setX] = useState<Record<string, string>>(DEFAULT_X.buys)
  const [laplace, setLaplace] = useState(false)
  const [logs, setLogs] = useState(false)
  const classes = [...new Set(data.rows.map((r) => r[data.target]))].sort().reverse()
  const values = (a: string) => [...new Set(data.rows.map((r) => r[a]))].sort()
  const res = useMemo(
    () =>
      classes.map((c) => {
        const rows = data.rows.filter((r) => r[data.target] === c)
        const prior = rows.length / data.rows.length
        const conds = data.columns.map((a) => {
          const n = rows.filter((r) => r[a] === x[a]).length
          const num = n + (laplace ? 1 : 0)
          const den = rows.length + (laplace ? values(a).length : 0)
          return { a, num, den, p: num / den }
        })
        const like = conds.reduce((s, q) => s * q.p, 1)
        const logSum = Math.log(prior) + conds.reduce((s, q) => s + Math.log(q.p), 0)
        return { c, n: rows.length, prior, conds, like, score: like * prior, logSum }
      }),
    [data, x, laplace],
  )
  const total = res.reduce((s, r) => s + r.score, 0)
  const best = res.reduce((b, r) => (r.logSum > b.logSum ? r : b), res[0])
  const hasZero = res.some((r) => r.conds.some((q) => q.num === 0))
  return (
    <Lab
      title="Naive Bayes calculator"
      desc="Pick a new record. Every factor the classifier multiplies is in the table."
      controls={
        <>
          <Seg label="Dataset" value={ds} onChange={(v) => { setDs(v); setX(DEFAULT_X[v]) }} options={[{ v: 'buys', label: 'buys_computer' }, { v: 'tennis', label: 'play tennis' }]} />
          {data.columns.map((a) => (
            <label className="ctl" key={a}>
              <span className="ctl-head">{a}</span>
              <select className="input" value={x[a]} onChange={(e) => setX((o) => ({ ...o, [a]: e.target.value }))}>
                {values(a).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <Toggle on={laplace} onChange={setLaplace}>Laplace correction</Toggle>
          <Toggle on={logs} onChange={setLogs}>Show log probabilities</Toggle>
        </>
      }
      notes={[
        'The default buys_computer record is the textbook example: 0.028 vs 0.007, so it predicts yes.',
        'Play tennis, outlook = overcast: no "no" day was overcast, so the whole no product is 0. Turn on Laplace correction.',
        'Turn on the log view: products become sums and the larger sum wins.',
      ]}
    >
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Term</th>
              {res.map((r) => (
                <th key={r.c} className="num">
                  {data.target} = {r.c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Prior P(C)</td>
              {res.map((r) => (
                <td key={r.c} className="num">
                  {logs ? fmt(Math.log(r.prior), 3) : `${r.n}/${data.rows.length} = ${fmt(r.prior, 3)}`}
                </td>
              ))}
            </tr>
            {data.columns.map((a, i) => (
              <tr key={a}>
                <td>
                  P({a} = {x[a]} | C)
                </td>
                {res.map((r) => (
                  <td key={r.c} className="num" style={{ color: r.conds[i].num === 0 ? 'var(--bad)' : undefined }}>
                    {logs ? (r.conds[i].p > 0 ? fmt(Math.log(r.conds[i].p), 3) : '-∞') : `${r.conds[i].num}/${r.conds[i].den} = ${fmt(r.conds[i].p, 3)}`}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="hl">
              <td>{logs ? 'Sum of logs' : 'P(X | C) P(C)'}</td>
              {res.map((r) => (
                <td key={r.c} className="num">
                  {logs ? (isFinite(r.logSum) ? fmt(r.logSum, 3) : '-∞') : r.score < 0.001 && r.score > 0 ? r.score.toExponential(3) : fmt(r.score, 4)}
                </td>
              ))}
            </tr>
            <tr>
              <td>P(C | X) after normalizing</td>
              {res.map((r) => (
                <td key={r.c} className="num">
                  {total ? fmt(r.score / total, 3) : 'n/a'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <Readout>
        <Stat k="Prediction" v={`${data.target} = ${best.c}`} />
        <Stat k="Zero counts" v={hasZero ? 'yes' : 'none'} sub={hasZero ? 'turn on Laplace' : undefined} />
        <Stat k="Correction" v={laplace ? 'Laplace' : 'off'} sub={laplace ? '+1 top, +values bottom' : undefined} />
      </Readout>
    </Lab>
  )
}

function UnderflowLab() {
  const [n, setN] = useState(120)
  const [p, setP] = useState(0.01)
  let prod = 1
  for (let i = 0; i < n; i++) prod *= p
  const log10 = n * Math.log10(p)
  const ymin = Math.min(-350, 400 * Math.log10(p))
  const pts = Array.from({ length: 81 }, (_, i) => ({ x: i * 5, y: i * 5 * Math.log10(p) }))
  return (
    <Lab
      title="Why real implementations add logs"
      desc="Multiply enough small P(word | class) values and the product rounds to exactly 0."
      controls={
        <>
          <Slider label="Number of words" value={n} min={1} max={400} onChange={setN} />
          <Slider label="P(word | class)" value={p} min={0.001} max={0.2} step={0.001} onChange={setP} fmt={(v) => v.toFixed(3)} />
        </>
      }
      notes={['With p = 0.01, push to 162 words: the product becomes 0 and both classes tie. The log sum (n times log p) keeps working.']}
    >
      <Plot w={560} h={240} x={[0, 400]} y={[ymin, 0]} xLabel="number of words" yLabel="log10 of the product" yTicks={4} label="Log of the product falls linearly with the number of words">
        <HLine y={-323.3} color="var(--bad)" label="smallest positive double, about 1e-323" />
        <Line pts={pts} color={seriesColor(0)} />
        <VLine x={n} color="var(--ink-3)" />
      </Plot>
      <Readout>
        <Stat k="Product in floating point" v={prod === 0 ? '0 (underflow)' : prod.toExponential(3)} />
        <Stat k="Exact log10" v={fmt(log10, 2)} />
        <Stat k="Sum of ln p" v={fmt(n * Math.log(p), 2)} />
      </Readout>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader group="Classification" title="Bayes rule and naive Bayes" lede="Predict the class with the highest probability given the record. Naive Bayes adds one simplification that makes it cheap." />

      <Plain>
        <p>
          A doctor starts with a belief (how common is the disease?) and a test result updates it. Bayes rule is the recipe: weigh the prior by how likely the evidence is under each option, then rescale to sum to 1.
        </p>
      </Plain>

      <Section id="bayes-rule" title="Bayes rule">
        <Formula title="Conditional probability and Bayes rule">
          <MB note="Left: the chance of A once you know B happened. Right: Bayes rule, which turns how likely the record is under a class into how likely the class is given the record." syms={[['P(A \\mid B)', 'probability of A given that B happened'], ['A \\cap B', 'A and B both happen'], ['C', 'a class'], ['X', 'the record (its attribute values)'], ['P(C)', 'prior: share of records in class C'], ['P(X \\mid C)', 'likelihood: how typical X is for class C'], ['P(C \\mid X)', 'posterior: probability of class C given X'], ['P(X)', 'evidence: overall probability of X']]}>{'P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)} \\qquad P(C \\mid X) = \\frac{P(X \\mid C)\\,P(C)}{P(X)}'}</MB>
          <p>
            <M>{'P(C)'}</M> is the prior, <M>{'P(X \\mid C)'}</M> the likelihood, <M>{'P(C \\mid X)'}</M> the posterior. <M>{'P(X)'}</M> is the same for every class, so to predict you only compare <M>{'P(X \\mid C)P(C)'}</M>.
          </p>
          <MB note="The total probability of the record: add its likelihood under each class, weighted by how common that class is. This is the denominator of Bayes rule." syms={[['P(X)', 'overall probability of record X'], ['C_i', 'the i-th class'], ['P(X \\mid C_i)', 'probability of X within class C_i'], ['P(C_i)', 'prior of class C_i']]}>{'P(X) = \\sum_i P(X \\mid C_i) P(C_i) \\quad \\text{(the classes are mutually exclusive and cover everything)}'}</MB>
        </Formula>
      </Section>
      <DiagnosisLab />

      <Section id="naive" title="The naive assumption">
        <p>
          Estimating <M>{'P(x_1, \\dots, x_n \\mid C)'}</M> directly needs a count for every combination of values, and most never appear. Naive Bayes assumes the attributes are <strong>conditionally independent given the class</strong>:
        </p>
        <Formula title="Naive Bayes">
          <MB note="Naive Bayes treats the attributes as independent within a class, so the likelihood is a product of one probability per attribute. Predict the class with the largest prior times that product." syms={[['x_k', 'value of the k-th attribute in the record'], ['n', 'number of attributes'], ['C_i', 'the i-th class'], ['\\prod', 'multiply over k = 1 to n'], ['P(C_i)', 'prior: share of records in class C_i'], ['\\arg\\max_i', 'the class i that gives the largest value']]}>{'P(X \\mid C_i) = \\prod_{k=1}^{n} P(x_k \\mid C_i) \\qquad \\text{predict } \\arg\\max_i \\; P(C_i)\\prod_{k} P(x_k \\mid C_i)'}</MB>
          <p>
            For a categorical attribute, <M>{'P(x_k \\mid C_i)'}</M> is the number of class-<M>{'C_i'}</M> records with value <M>{'x_k'}</M> divided by the number of class-<M>{'C_i'}</M> records.
          </p>
        </Formula>
        <p>
          This is not plain independence. Shoe size and reading ability are dependent in children, but given age they are roughly independent. Even when the assumption fails, the predicted class is often right.
        </p>
      </Section>
      <NaiveBayesLab />

      <Section id="laplace" title="Zero counts and Laplace correction">
        <p>A value that never appears with a class gets probability 0 and wipes out that class's whole product.</p>
        <Formula title="Laplace correction">
          <MB note="Smoothed estimate of one conditional probability. Use it when some value never appears with a class, so no factor is 0." syms={[['n_{x_k, C_i}', 'number of class C_i records with value x_k'], ['n_{C_i}', 'number of class C_i records'], ['|\\text{values of } A_k|', 'number of distinct values of attribute A_k']]}>{'P(x_k \\mid C_i) = \\frac{n_{x_k, C_i} + 1}{n_{C_i} + |\\text{values of } A_k|}'}</MB>
          <p>Add 1 to every count and the number of distinct values to the denominator, so the probabilities still sum to 1. Priors are usually left unchanged.</p>
        </Formula>
      </Section>

      <Section id="worked" title="Worked example">
        <p>buys_computer, new record X = (age = youth, income = medium, student = yes, credit_rating = fair).</p>
        <Table
          head={['', 'buys = yes (9 records)', 'buys = no (5 records)']}
          num={[1, 2]}
          rows={[
            ['P(C)', '9/14 = 0.643', '5/14 = 0.357'],
            ['P(age = youth | C)', '2/9 = 0.222', '3/5 = 0.600'],
            ['P(income = medium | C)', '4/9 = 0.444', '2/5 = 0.400'],
            ['P(student = yes | C)', '6/9 = 0.667', '1/5 = 0.200'],
            ['P(credit_rating = fair | C)', '6/9 = 0.667', '2/5 = 0.400'],
            ['P(X | C)', '0.044', '0.019'],
            ['P(X | C) P(C)', '0.028', '0.007'],
          ]}
        />
        <p style={{ marginTop: 10 }}>0.028 is larger than 0.007, so naive Bayes predicts buys_computer = yes. Normalizing gives P(yes | X) = 0.028 / 0.035 = 0.80.</p>
      </Section>

      <Section id="underflow" title="Underflow and log probabilities">
        <p>
          Hundreds of small factors underflow to 0. Compare <M>{'\\log P(C) + \\sum_k \\log P(x_k \\mid C)'}</M> instead; log is increasing, so the same class wins.
        </p>
      </Section>
      <UnderflowLab />

      <Section id="comments" title="Strengths and weaknesses">
        <Table
          head={['Strengths', 'Weaknesses']}
          rows={[
            ['Training is one pass of counting, so it is very fast', 'The independence assumption is often false (symptoms of one disease are correlated)'],
            ['Works well with many attributes, such as words in text', 'Probability estimates can be poorly calibrated even when the class is right'],
            ['Handles missing values by skipping that attribute', 'Zero counts need smoothing'],
            ['Good baseline for spam filtering and text classification', 'Continuous attributes need a distribution assumption (often Gaussian) or discretization'],
          ]}
        />
        <Trap>
          <ul>
            <li>You do not need P(X) to predict. Only divide by it if the question asks for the actual posterior probabilities.</li>
            <li>Laplace adds the number of distinct values of that attribute to the denominator, not the number of classes.</li>
            <li>Multiply by the prior. Comparing only P(X | C) ignores how common each class is.</li>
            <li>One zero conditional makes the whole product zero. Look for it before you calculate.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="A test has sensitivity 0.9 and specificity 0.9. The disease affects 1% of people. P(disease | positive)?">
          <M>{'\\frac{0.9 \\times 0.01}{0.9 \\times 0.01 + 0.1 \\times 0.99} = \\frac{0.009}{0.108} = 0.083'}</M>. Only about 8%.
        </Check>
        <Check q="An attribute has 3 values. In class yes (10 records) one value never appears. What is its probability with Laplace correction?">(0 + 1) / (10 + 3) = 1/13 = 0.077.</Check>
        <Check q="What exactly does naive Bayes assume?">That the attributes are independent of each other given the class, so P(X | C) is the product of P(x_k | C) over the attributes.</Check>
        <Check q="Why sum logs instead of multiplying probabilities?">The product of many small numbers underflows to 0. Log turns the product into a sum that stays in range, and since log is increasing the largest sum belongs to the same class as the largest product.</Check>
      </Section>
    </>
  )
}
