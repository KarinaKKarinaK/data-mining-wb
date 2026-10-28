import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Heat, Line, Plot, Rect, VLine } from '../components/Plot'
import { Legend, Readout, Seg, Slider, Stat, Toggle, SERIES_HEX, seriesColor } from '../components/ui'
import { make2D, series, type LPt } from '../lib/datasets'
import { fmt, gauss, minkowski, rng, type Pt } from '../lib/stats'

type Metric = 'l1' | 'l2' | 'linf' | 'p'

const pOf = (m: Metric, p: number) => (m === 'l1' ? 1 : m === 'l2' ? 2 : m === 'linf' ? Infinity : p)

function neighbors(train: LPt[], q: Pt, k: number, p: number) {
  return train
    .map((t, i) => ({ i, d: minkowski([t.x, t.y], [q.x, q.y], p) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
}

function vote(train: LPt[], nb: { i: number; d: number }[], weighted: boolean, classes: number) {
  const score = Array(classes).fill(0)
  nb.forEach(({ i, d }) => {
    score[train[i].label] += weighted ? 1 / Math.max(d * d, 1e-9) : 1
  })
  let best = 0
  score.forEach((s, c) => {
    if (s > score[best]) best = c
  })
  return { best, score }
}

function ballPts(p: number) {
  const out: Pt[] = []
  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    if (!isFinite(p)) {
      const m = Math.max(Math.abs(c), Math.abs(s))
      out.push({ x: c / m, y: s / m })
    } else {
      out.push({ x: Math.sign(c) * Math.abs(c) ** (2 / p), y: Math.sign(s) * Math.abs(s) ** (2 / p) })
    }
  }
  return out
}

function MainLab() {
  const [data, setData] = useState<'blobs' | 'moons'>('blobs')
  const train = useMemo(() => (data === 'blobs' ? make2D('blobs', 90, 31, 0.06, 3) : make2D('moons', 120, 8, 0.18)), [data])
  const classes = data === 'blobs' ? 3 : 2
  const [q, setQ] = useState<Pt>({ x: 0.48, y: 0.55 })
  const [drag, setDrag] = useState(false)
  const [k, setK] = useState(5)
  const [metric, setMetric] = useState<Metric>('l2')
  const [p, setP] = useState(3)
  const [weighted, setWeighted] = useState(false)
  const [regions, setRegions] = useState(true)
  const pp = pOf(metric, p)
  const nb = neighbors(train, q, k, pp)
  const v = vote(train, nb, weighted, classes)
  const regionFn = useMemo(
    () => (x: number, y: number) => {
      const r = vote(train, neighbors(train, { x, y }, k, pp), weighted, classes)
      return { color: SERIES_HEX[r.best], opacity: 0.13 }
    },
    [train, k, pp, weighted, classes],
  )
  const radius = nb[nb.length - 1]?.d ?? 0
  const ball = ballPts(pp).map((b) => ({ x: Math.min(1, Math.max(0, q.x + b.x * radius)), y: Math.min(1, Math.max(0, q.y + b.y * radius)) }))
  return (
    <Lab
      title="Classify a point by its neighbors"
      desc="Drag the star. The shading shows the prediction at every location."
      controls={
        <>
          <Seg label="Dataset" value={data} onChange={setData} options={[{ v: 'blobs', label: 'Three blobs' }, { v: 'moons', label: 'Noisy moons' }]} />
          <Slider label="k (neighbors)" value={k} min={1} max={25} onChange={setK} />
          <Seg label="Distance" value={metric} onChange={setMetric} options={[{ v: 'l1', label: 'Manhattan' }, { v: 'l2', label: 'Euclidean' }, { v: 'linf', label: 'Max (L∞)' }, { v: 'p', label: 'Minkowski p' }]} />
          {metric === 'p' && <Slider label="p" value={p} min={1} max={8} step={0.5} onChange={setP} />}
          <Toggle on={weighted} onChange={setWeighted}>Weight votes by 1/d²</Toggle>
          <Toggle on={regions} onChange={setRegions}>Show decision regions</Toggle>
        </>
      }
      notes={[
        'k = 1 on Noisy moons: jagged islands around single noisy points (overfitting). k = 25: smooth borders, small pockets vanish (underfitting).',
        'Switch to Manhattan or Max. The dashed outline becomes a diamond or a square, so different points count as nearest.',
        'With an even k and two classes, turn on weighting to break ties.',
      ]}
    >
      <Plot
        w={480}
        h={456}
        x={[0, 1]}
        y={[0, 1]}
        xLabel="attribute 1"
        yLabel="attribute 2"
        label="Training points, query point and its nearest neighbors"
        cursor={drag ? 'grabbing' : 'crosshair'}
        onDown={(e) => {
          setQ({ x: e.x, y: e.y })
          setDrag(true)
        }}
        onMove={(e) => drag && setQ({ x: Math.min(1, Math.max(0, e.x)), y: Math.min(1, Math.max(0, e.y)) })}
        onUp={() => setDrag(false)}
      >
        {regions && <Heat res={40} fn={regionFn} />}
        <Line pts={ball} color="var(--ink-3)" width={1.2} dash="4 4" />
        {nb.map(({ i }) => (
          <Line key={'l' + i} pts={[q, train[i]]} color="var(--ink-2)" width={1} opacity={0.6} />
        ))}
        {train.map((t, i) => (
          <Dot key={i} x={t.x} y={t.y} r={nb.some((n) => n.i === i) ? 6 : 4} color={seriesColor(t.label)} shape={t.label} opacity={nb.some((n) => n.i === i) ? 1 : 0.75} />
        ))}
        <Dot x={q.x} y={q.y} r={8} color="var(--ink)" shape={6} stroke={seriesColor(v.best)} strokeWidth={2.5} />
      </Plot>
      <Legend items={Array.from({ length: classes }, (_, c) => ({ label: `Class ${c + 1}`, color: seriesColor(c), shape: c }))} />
      <Readout>
        <Stat k="Prediction" v={`Class ${v.best + 1}`} />
        {v.score.map((s, c) => (
          <Stat key={c} k={`Votes class ${c + 1}`} v={weighted ? fmt(s, 1) : s} />
        ))}
        <Stat k="k-th distance" v={fmt(radius, 3)} sub={metric === 'p' ? `p = ${p}` : metric.toUpperCase()} />
      </Readout>
    </Lab>
  )
}

function UnitBalls() {
  const [p, setP] = useState(3)
  return (
    <Lab
      title="What a circle looks like under each distance"
      desc="Every point on a curve is at distance 1 from the center."
      controls={<Slider label="Minkowski p" value={p} min={0.5} max={10} step={0.5} onChange={setP} />}
      notes={['Slide p from 1 to 10: diamond, circle, then nearly a square (L∞).', 'Go below p = 1: the shape caves in, because Minkowski with p < 1 breaks the triangle inequality.']}
    >
      <Plot w={380} h={380} x={[-1.3, 1.3]} y={[-1.3, 1.3]} xTicks={4} yTicks={4} label="Unit balls for several Minkowski p values">
        <Line pts={ballPts(1)} color={seriesColor(0)} width={1.5} dash="5 4" />
        <Line pts={ballPts(2)} color={seriesColor(1)} width={1.5} dash="5 4" />
        <Line pts={ballPts(Infinity)} color={seriesColor(2)} width={1.5} dash="5 4" />
        <Line pts={ballPts(p)} color="var(--ink)" width={2.5} />
      </Plot>
      <Legend
        items={[
          { label: 'p = 1', color: seriesColor(0) },
          { label: 'p = 2', color: seriesColor(1) },
          { label: 'p = ∞', color: seriesColor(2) },
          { label: `p = ${p}`, color: 'var(--ink)' },
        ]}
      />
    </Lab>
  )
}

const PEOPLE = (() => {
  const r = rng(12)
  return Array.from({ length: 40 }, () => {
    const age = 20 + r() * 45
    const income = 20000 + r() * 80000
    const label = age + gauss(r) * 4 > 40 ? 1 : 0
    return { age, income, label }
  })
})()

function ScalingLab() {
  const [scaled, setScaled] = useState(false)
  const [qa, setQa] = useState(32)
  const [qi, setQi] = useState(60000)
  const k = 5
  const aMin = Math.min(...PEOPLE.map((p) => p.age))
  const aMax = Math.max(...PEOPLE.map((p) => p.age))
  const iMin = Math.min(...PEOPLE.map((p) => p.income))
  const iMax = Math.max(...PEOPLE.map((p) => p.income))
  const f = (age: number, income: number) => (scaled ? [(age - aMin) / (aMax - aMin), (income - iMin) / (iMax - iMin)] : [age, income])
  const nb = PEOPLE.map((p, i) => ({ i, d: minkowski(f(p.age, p.income), f(qa, qi), 2) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
  const yes = nb.filter((n) => PEOPLE[n.i].label === 1).length
  return (
    <Lab
      title="Why you scale before measuring distance"
      desc="Class depends on age. In raw units, 1 year counts the same as 1 dollar of income."
      controls={
        <>
          <Toggle on={scaled} onChange={setScaled}>Min-max scale both attributes to [0, 1]</Toggle>
          <Slider label="Query age" value={qa} min={20} max={65} onChange={setQa} />
          <Slider label="Query income" value={qi} min={20000} max={100000} step={1000} onChange={setQi} fmt={(v) => v.toLocaleString()} />
        </>
      }
      notes={['Unscaled, the 5 neighbors share an income band but have any age, so the vote is close to random. Turn scaling on and they cluster around the query in both directions.']}
    >
      <Plot w={560} h={360} x={[18, 67]} y={[15000, 105000]} xLabel="age (years)" yLabel="income" yFmt={(v) => `${v / 1000}k`} label="Age vs income with the 5 nearest neighbors">
        {nb.map((n) => (
          <Line key={'n' + n.i} pts={[{ x: qa, y: qi }, { x: PEOPLE[n.i].age, y: PEOPLE[n.i].income }]} color="var(--ink-2)" width={1} opacity={0.7} />
        ))}
        {PEOPLE.map((p, i) => (
          <Dot key={i} x={p.age} y={p.income} r={nb.some((n) => n.i === i) ? 6 : 4} color={seriesColor(p.label)} shape={p.label} opacity={nb.some((n) => n.i === i) ? 1 : 0.6} />
        ))}
        <Dot x={qa} y={qi} r={8} color="var(--ink)" shape={6} />
      </Plot>
      <Legend items={[{ label: 'buys = no', color: seriesColor(0), shape: 0 }, { label: 'buys = yes', color: seriesColor(1), shape: 1 }, { label: 'query', color: 'var(--ink)', shape: 6 }]} />
      <Readout>
        <Stat k="Neighbors yes / no" v={`${yes} / ${k - yes}`} />
        <Stat k="Prediction" v={yes > k / 2 ? 'yes' : 'no'} />
        <Stat k="Age range of neighbors" v={`${Math.round(Math.min(...nb.map((n) => PEOPLE[n.i].age)))} to ${Math.round(Math.max(...nb.map((n) => PEOPLE[n.i].age)))}`} />
      </Readout>
    </Lab>
  )
}

function ChooseKLab() {
  const [k, setK] = useState(7)
  const all = useMemo(() => make2D('moons', 220, 19, 0.22), [])
  const split = useMemo(() => {
    const r = rng(5)
    return all.map(() => r() < 0.7)
  }, [all])
  const train = all.filter((_, i) => split[i])
  const val = all.filter((_, i) => !split[i])
  const curve = useMemo(() => {
    const acc = (set: LPt[], kk: number) => set.filter((s) => vote(train, neighbors(train, s, kk, 2), false, 2).best === s.label).length / set.length
    return Array.from({ length: 30 }, (_, i) => ({ k: i + 1, tr: acc(train, i + 1), va: acc(val, i + 1) }))
  }, [all])
  const best = curve.reduce((b, c) => (c.va > b.va ? c : b), curve[0])
  const reg = useMemo(() => {
    const rr = rng(9)
    return Array.from({ length: 40 }, () => {
      const x = rr() * 10
      return { x, y: Math.sin(x) * 2 + 5 + gauss(rr) * 0.6 }
    })
  }, [])
  const curveReg = Array.from({ length: 160 }, (_, i) => {
    const x = (i / 159) * 10
    const nn = [...reg].sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x)).slice(0, k)
    return { x, y: nn.reduce((s, p) => s + p.y, 0) / nn.length }
  })
  const cur = curve[k - 1]
  return (
    <Lab
      title="Choosing k with a validation set"
      desc="Moons data split 70 / 30. The right panel uses the same k for kNN regression."
      controls={<Slider label="k" value={k} min={1} max={30} onChange={setK} />}
      notes={[
        'k = 1: training accuracy is 100% because each point is its own neighbor. It tells you nothing.',
        `Validation accuracy peaks near k = ${best.k}. Pick k from that curve.`,
        'Regression at k = 1 copies the noise; at k = 30 the curve flattens.',
      ]}
    >
      <div className="grid c2">
        <div>
          <span className="label">Accuracy vs k</span>
          <Plot w={380} h={280} x={[1, 30]} y={[0.6, 1.01]} xLabel="k" yLabel="accuracy" xTicks={6} yTicks={4} label="Training and validation accuracy by k">
            <VLine x={k} color="var(--ink-4)" />
            <Line pts={curve.map((c) => ({ x: c.k, y: c.tr }))} color={seriesColor(0)} />
            <Line pts={curve.map((c) => ({ x: c.k, y: c.va }))} color={seriesColor(1)} />
            <Dot x={k} y={cur.tr} r={5} color={seriesColor(0)} />
            <Dot x={k} y={cur.va} r={5} color={seriesColor(1)} shape={1} />
          </Plot>
          <Legend items={[{ label: 'training', color: seriesColor(0) }, { label: 'validation', color: seriesColor(1), shape: 1 }]} />
        </div>
        <div>
          <span className="label">kNN regression: average y of the k nearest</span>
          <Plot w={380} h={280} x={[0, 10]} y={[1, 9]} xLabel="x" yLabel="y" xTicks={5} yTicks={4} label="kNN regression curve">
            {reg.map((p, i) => (
              <Dot key={i} x={p.x} y={p.y} r={3.5} color="var(--ink-3)" />
            ))}
            <Line pts={curveReg} color={seriesColor(2)} width={2.5} />
          </Plot>
        </div>
      </div>
      <Readout>
        <Stat k="Train accuracy" v={fmt(cur.tr, 3)} />
        <Stat k="Validation accuracy" v={fmt(cur.va, 3)} />
        <Stat k="Best k on validation" v={best.k} />
      </Readout>
    </Lab>
  )
}

function dtw(a: number[], b: number[]) {
  const n = a.length
  const m = b.length
  const D = Array.from({ length: n }, () => Array(m).fill(Infinity))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      const c = Math.abs(a[i] - b[j])
      if (i === 0 && j === 0) D[i][j] = c
      else D[i][j] = c + Math.min(i > 0 ? D[i - 1][j] : Infinity, j > 0 ? D[i][j - 1] : Infinity, i > 0 && j > 0 ? D[i - 1][j - 1] : Infinity)
    }
  const path: [number, number][] = [[n - 1, m - 1]]
  let i = n - 1
  let j = m - 1
  while (i > 0 || j > 0) {
    const opts: [number, number, number][] = []
    if (i > 0 && j > 0) opts.push([D[i - 1][j - 1], i - 1, j - 1])
    if (i > 0) opts.push([D[i - 1][j], i - 1, j])
    if (j > 0) opts.push([D[i][j - 1], i, j - 1])
    opts.sort((x, y) => x[0] - y[0])
    i = opts[0][1]
    j = opts[0][2]
    path.push([i, j])
  }
  return { D, cost: D[n - 1][m - 1], path: path.reverse() }
}

function DtwLab() {
  const [shift, setShift] = useState(4)
  const [amp, setAmp] = useState(1)
  const [noise, setNoise] = useState(1)
  const n = 28
  const a = useMemo(() => series(3, n, 0, 1).map((v, i) => Math.sin(i / 4) + (v - Math.sin(i / 4)) * noise), [noise])
  const b = useMemo(() => series(4, n, shift, amp).map((v, i) => amp * Math.sin((i + shift) / 4) + (v - amp * Math.sin((i + shift) / 4)) * noise), [shift, amp, noise])
  const { D, cost, path } = useMemo(() => dtw(a, b), [a, b])
  const euclid = Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0))
  const l1 = a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0)
  const maxD = D[n - 1][n - 1]
  return (
    <Lab
      title="Dynamic time warping"
      desc="Same shape, shifted in time. DTW stretches time so peaks match peaks."
      controls={
        <>
          <Slider label="Time shift of series B" value={shift} min={0} max={12} onChange={setShift} />
          <Slider label="Amplitude of B" value={amp} min={0.5} max={1.5} step={0.1} onChange={setAmp} />
          <Slider label="Noise" value={noise} min={0} max={2} step={0.25} onChange={setNoise} />
        </>
      }
      notes={['Shift 0 and noise 0: DTW equals L1 (both 0) and the path is the diagonal. With noise, DTW is a bit below L1.', 'Increase the shift: L1 grows fast, DTW stays small as the path bends.', 'Change the amplitude: DTW fixes timing, not height.']}
    >
      <span className="label">Series and DTW alignment (gray lines join matched points)</span>
      <Plot w={560} h={240} x={[0, n - 1]} y={[-4.2, 2.2]} xLabel="time" xTicks={7} yTicks={4} label="Two time series with DTW matches">
        {path.map(([i, j], k) => (
          <Line key={k} pts={[{ x: i, y: a[i] }, { x: j, y: b[j] - 2.4 }]} color="var(--ink-4)" width={1} />
        ))}
        <Line pts={a.map((v, i) => ({ x: i, y: v }))} color={seriesColor(0)} />
        <Line pts={b.map((v, i) => ({ x: i, y: v - 2.4 }))} color={seriesColor(1)} />
      </Plot>
      <Legend items={[{ label: 'series A', color: seriesColor(0) }, { label: 'series B (drawn lower)', color: seriesColor(1) }]} />
      <div className="grid c2" style={{ marginTop: 12 }}>
        <div>
          <span className="label">Cumulative cost matrix D(i, j) and warping path</span>
          <Plot w={300} h={300} x={[0, n]} y={[0, n]} xLabel="index in B" yLabel="index in A" xTicks={4} yTicks={4} label="DTW cost matrix with path">
            {D.flatMap((row, i) =>
              row.map((v, j) => <Rect key={i * n + j} x0={j} x1={j + 1} y0={i} y1={i + 1} color={SERIES_HEX[0]} opacity={0.08 + 0.8 * Math.min(1, v / (maxD * 1.6 + 1e-9))} />),
            )}
            <Line pts={path.map(([i, j]) => ({ x: j + 0.5, y: i + 0.5 }))} color="var(--ink)" width={2} />
          </Plot>
        </div>
        <div>
          <Formula title="DTW recurrence">
            <MB note="Cumulative cost of the cheapest alignment of the first i points of A with the first j points of B. Fill the table cell by cell; the last cell is the DTW distance." syms={[['D(i,j)', 'cheapest total cost to align A up to i with B up to j'], ['a_i', 'i-th value of series A'], ['b_j', 'j-th value of series B'], ['|a_i - b_j|', 'cost of matching these two points']]}>{'\\begin{aligned} D(i,j) = {} & |a_i - b_j| \\\\ & + \\min\\{D(i-1,j),\\, D(i,j-1), \\\\ & \\qquad D(i-1,j-1)\\} \\end{aligned}'}</MB>
            <p>The answer is the cost in the last cell. Steps go down, right or diagonal, so time never runs backward.</p>
          </Formula>
          <Readout>
            <Stat k="DTW cost" v={fmt(cost, 2)} />
            <Stat k="L1 distance" v={fmt(l1, 2)} sub="same index only" />
            <Stat k="Euclidean" v={fmt(euclid, 2)} />
          </Readout>
        </div>
      </div>
    </Lab>
  )
}

const HAND = [
  { id: 'A', x: 1, y: 1, c: 'red' },
  { id: 'B', x: 2, y: 3, c: 'red' },
  { id: 'C', x: 4, y: 2, c: 'blue' },
  { id: 'D', x: 5, y: 5, c: 'blue' },
  { id: 'E', x: 3, y: 4, c: 'red' },
  { id: 'F', x: 6, y: 3, c: 'blue' },
]

function HandExample() {
  const q = { x: 4, y: 4 }
  const rows = HAND.map((h) => ({ ...h, d: Math.hypot(h.x - q.x, h.y - q.y), d1: Math.abs(h.x - q.x) + Math.abs(h.y - q.y) })).sort((a, b) => a.d - b.d)
  return (
    <>
      <p>
        Six training points, query <M>{'q = (4, 4)'}</M>, Euclidean distance, <M>{'k = 3'}</M>. Sort by distance and take the top three.
      </p>
      <Table
        head={['Rank', 'Point', 'Coordinates', 'Class', 'Euclidean to q', 'Manhattan to q']}
        num={[0, 4, 5]}
        hl={(i) => i < 3}
        rows={rows.map((r, i) => [i + 1, r.id, `(${r.x}, ${r.y})`, r.c, fmt(r.d, 3), r.d1])}
      />
      <p style={{ marginTop: 12 }}>
        Nearest three: E (red), D (blue), C (blue), so q is <strong>blue</strong>. With <M>{'k = 1'}</M> it is red. Manhattan gives the same three. With k = 4, B and F tie at 2.236, so state your tie rule.
      </p>
    </>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader group="Classification" title="Nearest neighbors" lede="No training at all: store the data, then answer a new record with the classes of its most similar stored records." />

      <Plain>
        <p>
          To judge a restaurant in a new city, ask the 5 people whose taste is most like yours and go with the majority.
        </p>
      </Plain>

      <Section id="algorithm" title="The algorithm">
        <ol>
          <li>Store all training records. This is called a <strong>lazy learner</strong>: no model is built in advance.</li>
          <li>For a new record, compute its distance to every stored record.</li>
          <li>Take the k records with the smallest distance.</li>
          <li>Classification: majority class among them. Regression: average of their values.</li>
        </ol>
        <Formula title="Distances">
          <MB note="Minkowski distance between two records with n numeric attributes. p = 1 gives Manhattan, p = 2 gives Euclidean." syms={[['d_p(x, y)', 'distance between records x and y'], ['x_i, y_i', 'value of attribute i in each record'], ['n', 'number of attributes'], ['p', 'order of the distance, p \u2265 1']]}>{'d_p(x, y) = \\Big(\\sum_{i=1}^{n} |x_i - y_i|^p\\Big)^{1/p}'}</MB>
          <p>
            <M>{'p = 1'}</M> Manhattan, <M>{'p = 2'}</M> Euclidean (most common), <M>{'p \\to \\infty'}</M> the largest single difference <M>{'\\max_i |x_i - y_i|'}</M>.
          </p>
        </Formula>
      </Section>

      <MainLab />
      <UnitBalls />

      <Section id="by-hand" title="Worked by hand">
        <HandExample />
      </Section>

      <Section id="weights" title="Weighted votes">
        <p>
          A plain vote gives the 5th neighbor as much say as the 1st. Weighting by inverse squared distance lets close neighbors count more. You can also weight <strong>attributes</strong> inside the distance.
        </p>
        <MB note="Distance-weighted vote: each of the k neighbors votes with weight 1 over its squared distance, and the class with the largest total weight wins." syms={[['w_i', 'weight of neighbor i'], ['d(q, x_i)', 'distance from the query to neighbor i'], ['q', 'the query record'], ['N_k(q)', 'the k nearest neighbors of q'], ['y_i', 'class of neighbor i'], ['\\hat{y}', 'predicted class'], ['\\arg\\max_c', 'the class c with the largest sum']]}>{'w_i = \\frac{1}{d(q, x_i)^2}, \\qquad \\hat{y} = \\arg\\max_c \\sum_{i \\in N_k(q),\\, y_i = c} w_i'}</MB>
      </Section>

      <Section id="preprocessing" title="Preprocessing matters">
        <p>
          kNN trusts the distance completely. Attributes with large ranges dominate, so normalize first (min-max or z-score). Irrelevant attributes add noise, and in high dimensions all points end up about equally far apart.
        </p>
      </Section>
      <ScalingLab />

      <Section id="k" title="Choosing k">
        <p>Small k follows every noisy point (high variance); large k blurs over other classes (high bias). Choose k by validation; with two classes an odd k avoids ties.</p>
      </Section>
      <ChooseKLab />

      <Section id="dtw" title="Distance for time series">
        <p>
          Heartbeats or speech can have the same shape but be out of step. Euclidean distance compares position i with position i and punishes the shift. DTW finds the cheapest alignment, letting one point match several of the other.
        </p>
      </Section>
      <DtwLab />

      <Section id="pros-cons" title="Strengths and weaknesses">
        <Table
          head={['Strength', 'Weakness']}
          rows={[
            ['No training time', 'Prediction is slow: distance to every stored record'],
            ['Decision boundaries of any shape', 'Sensitive to attribute scale and irrelevant attributes'],
            ['Works for classification and regression', 'Needs a good k and a meaningful distance'],
            ['Easy to update: just add records', 'Struggles in high dimensions'],
          ]}
        />
        <Trap>
          <ul>
            <li>Training accuracy with k = 1 is always 100% (if no duplicate points have different classes). Never use it to choose k.</li>
            <li>Normalize before computing distances, and use the training data's min and max (or mean and std) for the test data too.</li>
            <li>Nominal attributes need their own distance, for example 0 if equal and 1 if different.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="Why is kNN called a lazy learner?">It does no work at training time beyond storing the data. All computation happens when a query arrives.</Check>
        <Check q="Points (0, 0) and (3, 4). What are the Manhattan, Euclidean and max distances?">Manhattan 3 + 4 = 7. Euclidean sqrt(9 + 16) = 5. Max distance max(3, 4) = 4.</Check>
        <Check q="Income ranges up to 100,000 and age up to 70. What goes wrong with raw Euclidean distance?">Income differences are thousands of times larger than age differences, so the neighbors are chosen almost only by income. Scale both to a common range first.</Check>
        <Check q="What does DTW allow that Euclidean distance does not?">It lets one point of a series match several consecutive points of the other, so series that are shifted or stretched in time can still be compared fairly.</Check>
      </Section>
    </>
  )
}
