import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Area, Dot, Label, Line, Plot, VLine, nearestIndex, scales } from '../components/Plot'
import { Legend, Readout, Seg, Slider, Stat, seriesColor } from '../components/ui'
import { clipLine } from '../lib/geom'
import { chi2Cdf, chi2Critical, chi2Pdf, clamp, fmt, gauss, mean, pearson, rng, std, type Pt } from '../lib/stats'

type Preset = 'pos' | 'neg' | 'none' | 'ring' | 'x' | 'outlier'

function makePreset(p: Preset): Pt[] {
  const r = rng(p.length * 13 + 5)
  const out: Pt[] = []
  if (p === 'ring') {
    for (let i = 0; i < 28; i++) {
      const t = (i / 28) * Math.PI * 2
      out.push({ x: 5 + Math.cos(t) * 3.2 + gauss(r) * 0.15, y: 5 + Math.sin(t) * 3.2 + gauss(r) * 0.15 })
    }
    return out
  }
  if (p === 'x') {
    for (let i = 0; i < 26; i++) {
      const x = 1 + (i % 13) * 0.65
      out.push({ x, y: i < 13 ? x + gauss(r) * 0.2 : 10 - x + gauss(r) * 0.2 })
    }
    return out
  }
  for (let i = 0; i < 24; i++) {
    const x = 1 + r() * 8
    const y = p === 'pos' ? 1 + 0.8 * x + gauss(r) * 0.9 : p === 'neg' ? 9 - 0.8 * x + gauss(r) * 0.9 : 1 + r() * 8
    if (p === 'outlier') out.push({ x: 1.5 + r() * 3, y: 1.5 + r() * 3 })
    else out.push({ x, y: clamp(y, 0.2, 9.8) })
  }
  if (p === 'outlier') out.push({ x: 9.3, y: 9.3 })
  return out
}

function strength(r: number) {
  const a = Math.abs(r)
  const s = a >= 0.8 ? 'strong' : a >= 0.5 ? 'moderate' : a >= 0.2 ? 'weak' : 'almost no'
  return `${s} ${a < 0.2 ? 'linear correlation' : r > 0 ? 'positive correlation' : 'negative correlation'}`
}

function CorrLab() {
  const W = 520
  const H = 380
  const [preset, setPreset] = useState<Preset>('pos')
  const [pts, setPts] = useState<Pt[]>(() => makePreset('pos'))
  const [drag, setDrag] = useState(-1)
  const [mode, setMode] = useState<'move' | 'remove'>('move')
  const sc = scales(W, H, [0, 10], [0, 10], undefined, true, true, true)
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const n = pts.length
  const r = n > 2 ? pearson(xs, ys) : NaN
  const mx = mean(xs)
  const my = mean(ys)
  const sa = std(xs)
  const sb = std(ys)
  const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / n
  const slope = cov / (sa * sa)
  return (
    <Lab
      title="Drag points, watch Pearson r"
      desc="Drag a point, or click empty space to add one. Dashed line: least-squares fit."
      controls={
        <>
          <Seg
            label="Start from"
            value={preset}
            onChange={(v) => {
              setPreset(v)
              setPts(makePreset(v))
            }}
            options={[
              { v: 'pos', label: 'Positive' },
              { v: 'neg', label: 'Negative' },
              { v: 'none', label: 'No relation' },
              { v: 'ring', label: 'Ring' },
              { v: 'x', label: 'X shape' },
              { v: 'outlier', label: 'One outlier' },
            ]}
          />
          <Seg label="Click does" value={mode} onChange={setMode} options={[{ v: 'move', label: 'Drag or add' }, { v: 'remove', label: 'Remove' }]} />
        </>
      }
      notes={[
        'Pick Ring or X shape: r is near 0 though B clearly depends on A. r only measures straight-line relations.',
        'Pick "One outlier", then drag the far point into the cloud: r collapses.',
        'Drag points onto a perfect line: r reaches exactly 1 or -1.',
      ]}
    >
      <Plot
        w={W}
        h={H}
        x={[0, 10]}
        y={[0, 10]}
        xLabel="attribute A"
        yLabel="attribute B"
        label="Scatter plot with correlation"
        cursor={drag >= 0 ? 'grabbing' : 'pointer'}
        onDown={(p) => {
          const i = nearestIndex(pts, p, sc, 12)
          if (mode === 'remove') {
            if (i >= 0 && pts.length > 3) setPts((a) => a.filter((_, k) => k !== i))
            return
          }
          if (i >= 0) setDrag(i)
          else setPts((a) => [...a, { x: clamp(p.x, 0, 10), y: clamp(p.y, 0, 10) }])
        }}
        onMove={(p) => drag >= 0 && setPts((a) => a.map((q, k) => (k === drag ? { x: clamp(p.x, 0, 10), y: clamp(p.y, 0, 10) } : q)))}
        onUp={() => setDrag(-1)}
      >
        {isFinite(slope) && (
          <Line
            pts={clipLine({ x: mx, y: my }, 1, slope, [0, 10], [0, 10])}
            color="var(--ink-3)"
            dash="6 5"
            width={1.5}
          />
        )}
        <Dot x={mx} y={my} r={6} shape={4} color="var(--ink-2)" />
        {pts.map((p, i) => (
          <Dot key={i} x={p.x} y={p.y} r={drag === i ? 7 : 5.5} color={seriesColor(0)} />
        ))}
      </Plot>
      <Readout>
        <Stat k="r" v={fmt(r, 3)} sub={isFinite(r) ? strength(r) : ''} />
        <Stat k="Covariance" v={fmt(cov, 3)} sub="divide by N" />
        <Stat k="Std A, std B" v={`${fmt(sa, 2)}, ${fmt(sb, 2)}`} />
        <Stat k="N" v={n} />
      </Readout>
    </Lab>
  )
}

const ATTRS = ['revenue', 'expenses', 'profit', 'employees', 'rating']

function RedundancyLab() {
  const data = useMemo(() => {
    const r = rng(31)
    return Array.from({ length: 60 }, () => {
      const employees = 5 + r() * 95
      const revenue = employees * (8 + r() * 4) + gauss(r) * 60
      const expenses = revenue * (0.55 + r() * 0.3)
      const profit = revenue - expenses
      const rating = 3 + gauss(r) * 0.8
      return { revenue, expenses, profit, employees, rating } as Record<string, number>
    })
  }, [])
  const [t, setT] = useState(0.8)
  const [sel, setSel] = useState<[number, number]>([0, 1])
  const R = ATTRS.map((a) => ATTRS.map((b) => pearson(data.map((d) => d[a]), data.map((d) => d[b]))))
  const flagged: string[] = []
  ATTRS.forEach((a, i) => ATTRS.forEach((b, j) => j > i && Math.abs(R[i][j]) >= t && flagged.push(`${a} / ${b}`)))
  const cell = 64
  const [a, b] = sel
  const xs = data.map((d) => d[ATTRS[a]])
  const ys = data.map((d) => d[ATTRS[b]])
  const pad = (v: number[]) => {
    const lo = Math.min(...v)
    const hi = Math.max(...v)
    const p = (hi - lo) * 0.06 || 1
    return [lo - p, hi + p] as [number, number]
  }
  return (
    <Lab
      title="Find redundant attributes"
      desc="60 companies. Click a matrix cell to plot that pair."
      controls={<Slider label="Flag pairs with |r| at least" value={t} min={0.3} max={0.99} step={0.01} onChange={setT} fmt={(v) => fmt(v, 2)} />}
      notes={[
        'Click revenue vs expenses: strongly correlated, so keeping both adds little.',
        'Profit = revenue - expenses, so it is redundant even though its r with each alone is not 1.',
        'Look at the rating row: r near 0 everywhere, so it carries separate information.',
      ]}
    >
      <div className="grid c2">
        <svg viewBox={`0 0 ${cell * 5 + 90} ${cell * 5 + 30}`} className="plot" style={{ maxWidth: 420 }} role="img" aria-label="Correlation matrix">
          {ATTRS.map((n, i) => (
            <text key={'r' + n} x={84} y={30 + i * cell + cell / 2 + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)">
              {n}
            </text>
          ))}
          {ATTRS.map((n, j) => (
            <text key={'c' + n} x={90 + j * cell + cell / 2} y={18} textAnchor="middle" fontSize={10.5} fill="var(--ink-3)">
              {n.slice(0, 8)}
            </text>
          ))}
          {R.map((row, i) =>
            row.map((v, j) => {
              const on = (sel[0] === j && sel[1] === i) || (sel[0] === i && sel[1] === j)
              return (
                <g key={i + '-' + j} onClick={() => i !== j && setSel([j, i])} style={{ cursor: i !== j ? 'pointer' : 'default' }}>
                  <rect x={90 + j * cell + 1} y={30 + i * cell + 1} width={cell - 2} height={cell - 2} rx={6} fill={v >= 0 ? 'var(--s1)' : 'var(--s2)'} opacity={0.08 + Math.abs(v) * 0.75} stroke={on ? 'var(--ink)' : 'none'} strokeWidth={2} />
                  <text x={90 + j * cell + cell / 2} y={30 + i * cell + cell / 2 + 4} textAnchor="middle" fontSize={12} fill="var(--ink)" fontFamily="var(--mono)">
                    {fmt(v, 2)}
                  </text>
                </g>
              )
            }),
          )}
        </svg>
        <Plot w={360} h={320} x={pad(xs)} y={pad(ys)} xLabel={ATTRS[a]} yLabel={ATTRS[b]} label="Scatter of the selected pair">
          {xs.map((x, i) => (
            <Dot key={i} x={x} y={ys[i]} r={3.6} color={seriesColor(0)} />
          ))}
        </Plot>
      </div>
      <Legend items={[{ label: 'positive r', color: 'var(--s1)', shape: 1 }, { label: 'negative r', color: 'var(--s2)', shape: 1 }]} />
      <Readout>
        <Stat k="Selected r" v={fmt(R[b][a], 3)} sub={`${ATTRS[a]} vs ${ATTRS[b]}`} />
        <Stat k="Flagged pairs" v={flagged.length} sub={flagged.join(', ') || 'none'} />
      </Readout>
    </Lab>
  )
}

function ChiLab() {
  const [rowNames, setRowNames] = useState(['fiction', 'non-fiction', 'poetry', 'comics'])
  const [colNames, setColNames] = useState(['male', 'female', 'other', 'unknown'])
  const [nr, setNr] = useState(2)
  const [nc, setNc] = useState(2)
  const [obs, setObs] = useState<number[][]>([
    [250, 200, 30, 20],
    [50, 1000, 40, 25],
    [30, 60, 20, 10],
    [45, 40, 15, 12],
  ])
  const [alpha, setAlpha] = useState(0.001)
  const O = obs.slice(0, nr).map((r) => r.slice(0, nc))
  const rowT = O.map((r) => r.reduce((s, v) => s + v, 0))
  const colT = Array.from({ length: nc }, (_, j) => O.reduce((s, r) => s + r[j], 0))
  const N = rowT.reduce((s, v) => s + v, 0)
  const E = O.map((_, i) => colT.map((c) => (rowT[i] * c) / N))
  const contrib = O.map((r, i) => r.map((o, j) => (E[i][j] > 0 ? (o - E[i][j]) ** 2 / E[i][j] : 0)))
  const chi = contrib.flat().reduce((s, v) => s + v, 0)
  const df = (nr - 1) * (nc - 1)
  const crit = chi2Critical(alpha, df)
  const pRaw = 1 - chi2Cdf(chi, df)
  const p = isFinite(pRaw) ? Math.max(0, pRaw) : 0
  const reject = chi > crit
  const xmax = Math.max(crit * 1.8, df + 4 * Math.sqrt(2 * df), 8)
  const curve = Array.from({ length: 160 }, (_, i) => {
    const x = 0.04 + (i / 159) * (xmax - 0.04)
    return { x, y: chi2Pdf(x, df) }
  })
  const ymax = Math.min(Math.max(...curve.filter((q) => q.x > 0.4).map((q) => q.y)) * 1.25, 1.2)
  const tail = curve.filter((q) => q.x >= crit)
  const setCell = (i: number, j: number, v: number) => setObs((o) => o.map((r, a) => (a === i ? r.map((x, b) => (b === j ? Math.max(0, Math.round(v) || 0) : x)) : r)))
  return (
    <Lab
      title="Chi-square test, cell by cell"
      desc="Type observed counts. Expected counts are in brackets."
      controls={
        <>
          <Slider label="Rows" value={nr} min={2} max={4} onChange={setNr} />
          <Slider label="Columns" value={nc} min={2} max={4} onChange={setNc} />
          <Seg label="Significance level α" value={alpha} onChange={setAlpha} options={[0.1, 0.05, 0.01, 0.001].map((a) => ({ v: a, label: String(a) }))} />
        </>
      }
      notes={[
        'The default is the textbook reading example: χ² = 507.94 (507.93 when each term is rounded first), far above 10.828, so dependent.',
        'Make the rows proportional (100, 200 and 50, 100): χ² drops to 0.',
        'Lower α: the critical value moves right and rejecting needs stronger evidence.',
      ]}
    >
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Observed (expected)</th>
              {colNames.slice(0, nc).map((c, j) => (
                <th key={j}>
                  <input className="input" style={{ width: 92, padding: '3px 6px', fontSize: 12 }} value={c} onChange={(e) => setColNames((n) => n.map((x, k) => (k === j ? e.target.value : x)))} />
                </th>
              ))}
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {O.map((row, i) => (
              <tr key={i}>
                <td>
                  <input className="input" style={{ width: 104, padding: '3px 6px', fontSize: 12 }} value={rowNames[i]} onChange={(e) => setRowNames((n) => n.map((x, k) => (k === i ? e.target.value : x)))} />
                </td>
                {row.map((v, j) => (
                  <td key={j}>
                    <input className="input num" type="number" min={0} value={v} onChange={(e) => setCell(i, j, Number(e.target.value))} />
                    <span className="mono muted" style={{ marginLeft: 6, fontSize: 12 }}>
                      ({fmt(E[i][j], 1)})
                    </span>
                  </td>
                ))}
                <td className="num">{rowT[i]}</td>
              </tr>
            ))}
            <tr>
              <td className="muted">Total</td>
              {colT.map((c, j) => (
                <td key={j} className="num">
                  {c}
                </td>
              ))}
              <td className="num">{N}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 10, fontSize: 13.5 }}>
        Contributions <M>{'(o-e)^2/e'}</M>: {contrib.map((r, i) => r.map((v, j) => `${rowNames[i]}/${colNames[j]} ${fmt(v, 2)}`).join(', ')).join(' | ')}
      </p>
      <Plot w={560} h={230} x={[0, xmax]} y={[0, ymax]} xLabel="χ² value" yLabel="density" label="Chi-square distribution with rejection region">
        <Area pts={tail} base={0} color={seriesColor(1)} opacity={0.35} />
        <Line pts={curve.filter((q) => q.y <= ymax)} color="var(--ink-2)" />
        <VLine x={crit} color={seriesColor(1)} label={`critical ${fmt(crit, 3)}`} />
        {chi <= xmax ? <VLine x={chi} color={seriesColor(0)} dash="0" width={2.5} label={`χ² ${fmt(chi, 2)}`} /> : <Label x={xmax} y={ymax * 0.6} anchor="end" color="var(--ink)">{`your χ² = ${fmt(chi, 2)} is far to the right`}</Label>}
      </Plot>
      <Readout>
        <Stat k="Chi-square" v={fmt(chi, 2)} />
        <Stat k="df" v={df} sub="(r-1)(c-1)" />
        <Stat k={`Critical at ${alpha}`} v={fmt(crit, 3)} />
        <Stat k="p-value" v={p < 0.0001 ? '< 0.0001' : fmt(p, 4)} />
        <Stat k="Decision" v={reject ? 'Dependent' : 'No evidence'} sub={reject ? 'reject independence' : 'cannot reject independence'} />
      </Readout>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader
        group="Preprocessing"
        title="Integration, correlation and chi-square"
        lede="Combining data sources into one: match entities, resolve conflicting values, and find attributes that say the same thing twice."
      />

      <Plain>
        <p>
          Two shops merge customer lists. One says <code>customer_id</code>, the other <code>cust_num</code>; one uses kilograms, the other pounds; and one list has both "age" and "birth year". Integration untangles this into one table.
        </p>
      </Plain>

      <Section id="issues" title="Three integration problems">
        <Table
          head={['Problem', 'Example', 'How to handle it']}
          rows={[
            ['Entity identification', 'Is customer_id 234 the same as cust_num 234?', 'Use metadata: name, meaning, type, range of each attribute'],
            ['Data value conflicts', 'kg vs pounds, one branch total vs region total', 'Convert to one unit and one level of detail'],
            ['Redundancy', 'Duplicate records, annual income derivable from other columns', 'Correlation analysis, chi-square test, deduplication'],
          ]}
        />
      </Section>

      <Section id="corr" title="Correlation for numeric attributes">
        <Formula>
          <MB note="Pearson correlation: how strongly two numeric attributes move together along a straight line, from -1 to +1. Use it to spot a redundant attribute before merging." syms={[['r_{A,B}', 'correlation of A and B'], ['a_i, b_i', 'values of A and B in record i'], ['N', 'number of records'], ['\\bar{A}, \\bar{B}', 'means of A and B'], ['\\sigma_A, \\sigma_B', 'standard deviations of A and B']]}>{'r_{A,B} = \\frac{\\sum_{i=1}^{N} a_i b_i - N\\bar{A}\\bar{B}}{N\\,\\sigma_A \\sigma_B} = \\frac{\\sum (a_i - \\bar{A})(b_i - \\bar{B})}{N\\,\\sigma_A \\sigma_B}, \\qquad -1 \\le r_{A,B} \\le 1'}</MB>
          <p>
            <M>{'r > 0'}</M>: A up, B up. <M>{'r < 0'}</M>: A up, B down. <M>{'r = 0'}</M>: no linear relation. A large <M>{'|r|'}</M> suggests one attribute is redundant.
          </p>
        </Formula>
      </Section>
      <CorrLab />
      <RedundancyLab />

      <Section id="chi" title="Chi-square test for categorical attributes">
        <Plain title="The idea">
          <p>
            If gender had nothing to do with reading taste, men and women would read fiction in the same proportion. The test computes each cell under that assumption (expected count) and measures how far the real counts are.
          </p>
        </Plain>
        <Formula>
          <MB note="Chi-square test for two nominal attributes. Compare each observed count with the count expected if the attributes were independent; a large total means they are related." syms={[['e_{ij}', 'expected count in cell (i, j) if independent'], ['o_{ij}', 'observed count in cell (i, j)'], ['count(A = a_i)', 'row total: records with value a_i of A'], ['count(B = b_j)', 'column total: records with value b_j of B'], ['N', 'total number of records'], ['r, c', 'number of rows and columns'], ['df', 'degrees of freedom']]}>{'e_{ij} = \\frac{count(A = a_i) \\times count(B = b_j)}{N} \\qquad \\chi^2 = \\sum_{i=1}^{r}\\sum_{j=1}^{c}\\frac{(o_{ij} - e_{ij})^2}{e_{ij}} \\qquad df = (r-1)(c-1)'}</MB>
          <p>If <M>{'\\chi^2'}</M> exceeds the critical value for your α and df, reject independence.</p>
        </Formula>
      </Section>
      <ChiLab />

      <Section id="worked" title="Worked example">
        <p>1500 people: 250 men and 200 women prefer fiction, 50 men and 1000 women prefer non-fiction.</p>
        <Table
          head={['', 'male', 'female', 'total']}
          num={[1, 2, 3]}
          rows={[
            ['fiction', '250 (90)', '200 (360)', 450],
            ['non-fiction', '50 (210)', '1000 (840)', 1050],
            ['total', 300, 1200, 1500],
          ]}
        />
        <p style={{ marginTop: 10 }}>
          Expected fiction/male: <M>{'\\frac{300 \\times 450}{1500} = 90'}</M>. Then
        </p>
        <MB note="The chi-square sum for the reading example: one term per cell, each the squared gap between observed and expected count divided by the expected count." syms={[['250, 50, 200, 1000', 'observed counts'], ['90, 210, 360, 840', 'expected counts if gender and reading were independent'], ['\\chi^2', 'the test statistic, compared with the critical value']]}>{'\\chi^2 = \\frac{(250-90)^2}{90} + \\frac{(50-210)^2}{210} + \\frac{(200-360)^2}{360} + \\frac{(1000-840)^2}{840} = 284.44 + 121.90 + 71.11 + 30.48 = 507.93'}</MB>
        <p>
          df = 1. The critical value at 0.001 is 10.828. Since 507.93 &gt; 10.828, reject independence: gender and reading preference are related.
        </p>
      </Section>

      <Section id="traps" title="Common mistakes">
        <Trap>
          <ul>
            <li>Independent implies uncorrelated, but uncorrelated does not imply independent. A ring or an X shape has r = 0 and strong dependence.</li>
            <li>Correlation does not mean causation. Ice cream sales and drownings are correlated because both rise in summer.</li>
            <li>Chi-square uses counts, never percentages. Convert first.</li>
            <li>Remember the df. With df = 1 the 0.05 critical value is 3.841, with df = 2 it is 5.991.</li>
            <li>In scipy, <code>chi2_contingency</code> applies a continuity correction on 2 x 2 tables by default. Pass <code>correction=False</code> to match the hand formula.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="A and B have r = -0.95. What does that tell you?">
          A strong negative linear relationship: high A goes with low B. One of them is likely redundant for mining.
        </Check>
        <Check q="A 3 x 4 contingency table. How many degrees of freedom?">(3 - 1)(4 - 1) = 6.</Check>
        <Check q="Row total 40, column total 60, N = 200. Expected count?">40 x 60 / 200 = 12.</Check>
        <Check q="χ² = 2.1 with df = 1 at α = 0.05. Conclusion?">2.1 &lt; 3.841, so we cannot reject independence. There is no significant evidence the attributes are related.</Check>
      </Section>
    </>
  )
}
