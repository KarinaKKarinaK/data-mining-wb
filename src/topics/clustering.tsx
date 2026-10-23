import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Label, Line, Plot, Rect, Tip, VLine } from '../components/Plot'
import { Btn, Legend, Readout, Seg, Slider, Stat, Toggle, seriesColor } from '../components/ui'
import { bestKmeans, silhouette } from '../lib/cluster'
import { make2D, type Shape2D } from '../lib/datasets'
import { dist, fmt, minkowski, type Pt } from '../lib/stats'

function unitBall(p: number) {
  const out: Pt[] = []
  for (let i = 0; i <= 360; i++) {
    const t = (i / 360) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const n = minkowski([c, s], [0, 0], p)
    out.push({ x: c / n, y: s / n })
  }
  return out
}

function MinkowskiLab() {
  const [p, setP] = useState(2)
  const [inf, setInf] = useState(false)
  const [a, setA] = useState<Pt>({ x: -0.6, y: -0.4 })
  const [b, setB] = useState<Pt>({ x: 0.7, y: 0.5 })
  const [drag, setDrag] = useState<'a' | 'b' | null>(null)
  const pp = inf ? Infinity : p
  const ball = useMemo(() => unitBall(pp), [pp])
  const refs = useMemo(() => [unitBall(1), unitBall(2), unitBall(Infinity)], [])
  const dxy = (q: number) => minkowski([a.x, a.y], [b.x, b.y], q)
  return (
    <Lab
      title="Minkowski distance: what a circle looks like"
      desc="The curve is every point at distance 1 for the chosen p. Drag A and B."
      controls={
        <>
          <Slider label="p" value={p} min={0.5} max={8} step={0.1} onChange={(v) => { setP(v); setInf(false) }} fmt={(v) => (inf ? '∞' : v.toFixed(1))} />
          <Toggle on={inf} onChange={setInf}>p = ∞ (supremum)</Toggle>
          <div className="row">
            <Btn sm onClick={() => { setP(1); setInf(false) }}>Manhattan p = 1</Btn>
            <Btn sm onClick={() => { setP(2); setInf(false) }}>Euclidean p = 2</Btn>
          </div>
        </>
      }
      notes={[
        'p = 1 gives a diamond, p = 2 a circle, p = ∞ a square. A bigger p puts more weight on the single largest coordinate difference.',
        'Below p = 1 the shape caves in and the triangle inequality fails, so it is not a metric.',
        'Put A and B on a horizontal line: all three distances match, since only one coordinate differs.',
      ]}
    >
      <Plot
        w={460}
        h={420}
        x={[-1.3, 1.3]}
        y={[-1.2, 1.2]}
        xLabel="attribute 1"
        yLabel="attribute 2"
        label="Unit ball of the Minkowski distance"
        cursor={drag ? 'grabbing' : 'grab'}
        onDown={(e) => {
          if (Math.hypot(e.x - a.x, e.y - a.y) < 0.12) setDrag('a')
          else if (Math.hypot(e.x - b.x, e.y - b.y) < 0.12) setDrag('b')
        }}
        onMove={(e) => {
          if (!drag) return
          const q = { x: Math.max(-1.25, Math.min(1.25, e.x)), y: Math.max(-1.15, Math.min(1.15, e.y)) }
          if (drag === 'a') setA(q)
          else setB(q)
        }}
        onUp={() => setDrag(null)}
      >
        {refs.map((r, i) => (
          <Line key={i} pts={r} color="var(--ink-4)" width={1} dash="3 4" />
        ))}
        <Line pts={ball} color="var(--s1)" width={2.5} />
        <Dot x={0} y={0} r={3} color="var(--ink-2)" />
        <Line pts={[a, { x: b.x, y: a.y }, b]} color="var(--s4)" width={1.5} dash="4 3" />
        <Line pts={[a, b]} color="var(--s3)" width={1.5} />
        <Dot x={a.x} y={a.y} r={7} color="var(--s2)" />
        <Dot x={b.x} y={b.y} r={7} color="var(--s2)" shape={1} />
        <Label x={a.x} y={a.y} dx={10} dy={-8}>A</Label>
        <Label x={b.x} y={b.y} dx={10} dy={-8}>B</Label>
      </Plot>
      <Legend items={[{ label: `unit ball, p = ${inf ? '∞' : p.toFixed(1)}`, color: 'var(--s1)' }, { label: 'straight line (Euclidean)', color: 'var(--s3)' }, { label: 'city-block path (Manhattan)', color: 'var(--s4)' }]} />
      <Readout>
        <Stat k="Manhattan" v={fmt(dxy(1), 3)} sub="p = 1" />
        <Stat k="Euclidean" v={fmt(dxy(2), 3)} sub="p = 2" />
        <Stat k="Supremum" v={fmt(dxy(Infinity), 3)} sub="p = ∞" />
        <Stat k={`p = ${inf ? '∞' : p.toFixed(1)}`} v={fmt(dxy(pp), 3)} />
      </Readout>
    </Lab>
  )
}

const ATTRS = ['fever', 'cough', 'test-1', 'test-2', 'test-3', 'test-4', 'rash', 'fatigue', 'nausea', 'chills']

function BinaryLab() {
  const [i, setI] = useState([1, 0, 1, 0, 0, 0, 1, 0, 0, 0])
  const [j, setJ] = useState([1, 0, 1, 0, 1, 0, 0, 0, 0, 0])
  let q = 0
  let r = 0
  let s = 0
  let t = 0
  i.forEach((v, k) => {
    if (v && j[k]) q++
    else if (v) r++
    else if (j[k]) s++
    else t++
  })
  const flip = (arr: number[], set: (a: number[]) => void, k: number) => set(arr.map((v, m) => (m === k ? 1 - v : v)))
  const n = q + r + s + t
  return (
    <Lab
      title="Binary attributes: simple matching vs Jaccard"
      desc="Click cells to switch symptoms on and off for two patients."
      notes={[
        'Switch off every shared symptom. Simple matching stays high because 0-0 matches count; Jaccard falls.',
        'For rare positives, a shared 0 says almost nothing. That is why asymmetric binary data uses Jaccard.',
      ]}
    >
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Object</th>
              {ATTRS.map((a) => (
                <th key={a} className="num">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'patient i', v: i, set: setI },
              { name: 'patient j', v: j, set: setJ },
            ].map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                {row.v.map((v, k) => (
                  <td key={k} className="num" style={{ padding: 4 }}>
                    <button type="button" className={`btn sm${v ? ' primary' : ''}`} style={{ width: 34 }} onClick={() => flip(row.v, row.set, k)}>
                      {v}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid c2" style={{ marginTop: 14 }}>
        <Table
          head={['', 'j = 1', 'j = 0', 'sum']}
          num={[1, 2, 3]}
          rows={[
            ['i = 1', `q = ${q}`, `r = ${r}`, q + r],
            ['i = 0', `s = ${s}`, `t = ${t}`, s + t],
            ['sum', q + s, r + t, n],
          ]}
        />
        <div>
          <MB>{`\\text{SMC} = \\frac{q + t}{q + r + s + t} = \\frac{${q + t}}{${n}}`}</MB>
          <MB>{`\\text{Jaccard} = \\frac{q}{q + r + s} = \\frac{${q}}{${q + r + s}}`}</MB>
        </div>
      </div>
      <Readout>
        <Stat k="Simple matching" v={fmt((q + t) / n, 3)} sub="symmetric similarity" />
        <Stat k="Symmetric distance" v={fmt((r + s) / n, 3)} />
        <Stat k="Jaccard" v={q + r + s ? fmt(q / (q + r + s), 3) : 'n/a'} sub="asymmetric similarity" />
        <Stat k="Asymmetric distance" v={q + r + s ? fmt((r + s) / (q + r + s), 3) : 'n/a'} />
      </Readout>
    </Lab>
  )
}

const COLORS = ['red', 'blue', 'green']
const SIZES = ['small', 'medium', 'large', 'x-large']

type Obj = { color: string; size: number; weight: number; pet: number }

function MixedLab() {
  const [o1, setO1] = useState<Obj>({ color: 'red', size: 0, weight: 50, pet: 1 })
  const [o2, setO2] = useState<Obj>({ color: 'blue', size: 2, weight: 80, pet: 0 })
  const wMin = 40
  const wMax = 120
  const dColor = o1.color === o2.color ? 0 : 1
  const z = (r: number) => r / (SIZES.length - 1)
  const dSize = Math.abs(z(o1.size) - z(o2.size))
  const dWeight = Math.abs(o1.weight - o2.weight) / (wMax - wMin)
  const petCounts = !(o1.pet === 0 && o2.pet === 0)
  const dPet = o1.pet === o2.pet ? 0 : 1
  const rows = [
    ['color', 'nominal', '0 if equal, else 1', 1, dColor],
    ['size', 'ordinal', `rank to [0, 1]: |${fmt(z(o1.size), 2)} - ${fmt(z(o2.size), 2)}|`, 1, dSize],
    ['weight', 'numeric', `|${o1.weight} - ${o2.weight}| / (${wMax} - ${wMin})`, 1, dWeight],
    ['has_pet', 'asymmetric binary', petCounts ? '0 if equal, else 1' : 'both 0, so skipped', petCounts ? 1 : 0, dPet],
  ] as const
  const num = rows.reduce((s, r) => s + r[3] * r[4], 0)
  const den = rows.reduce((s, r) => s + r[3], 0)
  const editor = (o: Obj, set: (v: Obj) => void, name: string) => (
    <div className="stack">
      <span className="label">{name}</span>
      <Seg value={o.color} onChange={(v) => set({ ...o, color: v })} options={COLORS.map((c) => ({ v: c, label: c }))} />
      <Seg value={o.size} onChange={(v) => set({ ...o, size: v })} options={SIZES.map((c, k) => ({ v: k, label: c }))} />
      <Slider label="weight (kg)" value={o.weight} min={wMin} max={wMax} onChange={(v) => set({ ...o, weight: v })} />
      <Toggle on={!!o.pet} onChange={(v) => set({ ...o, pet: v ? 1 : 0 })}>has_pet</Toggle>
    </div>
  )
  return (
    <Lab
      title="Mixed attribute types in one distance"
      desc="Each attribute gives a dissimilarity in [0, 1]; the distance is their average."
      controls={
        <>
          {editor(o1, setO1, 'Object 1')}
          {editor(o2, setO2, 'Object 2')}
        </>
      }
      notes={['Turn has_pet off for both objects. The attribute drops out of the average (its indicator becomes 0), so a shared absence does not make the objects look closer.', 'Numeric values are divided by the range so a big-unit attribute cannot swamp the others.']}
    >
      <Table head={['Attribute', 'Type', 'Dissimilarity', 'Counts', 'd']} num={[3, 4]} rows={rows.map((r) => [r[0], r[1], r[2], r[3], fmt(r[4], 3)])} />
      <MB>{`d(1, 2) = \\frac{\\sum_f \\delta^{(f)} d^{(f)}}{\\sum_f \\delta^{(f)}} = \\frac{${fmt(num, 3)}}{${den}} = ${fmt(num / den, 3)}`}</MB>
      <Readout>
        <Stat k="Overall distance" v={fmt(num / den, 3)} />
        <Stat k="Attributes used" v={`${den} of 4`} />
      </Readout>
    </Lab>
  )
}

function SilhouetteLab() {
  const [shape, setShape] = useState<Shape2D>('blobs')
  const [k, setK] = useState(3)
  const [hover, setHover] = useState<number | null>(null)
  const pts = useMemo(() => make2D(shape, 120, 9, 0.06, 3).map(({ x, y }) => ({ x, y })), [shape])
  const res = useMemo(() => bestKmeans(pts, k, 4), [pts, k])
  const sil = useMemo(() => silhouette(pts, res.labels), [pts, res])
  const order = useMemo(
    () =>
      pts
        .map((_, i) => i)
        .sort((p, q) => (res.labels[p] - res.labels[q]) || (sil.values[q] - sil.values[p])),
    [pts, res, sil],
  )
  const detail = (i: number) => {
    const own = pts.filter((_, j) => res.labels[j] === res.labels[i] && j !== i)
    const a = own.length ? own.reduce((s, q) => s + dist(pts[i], q), 0) / own.length : 0
    const others = [...new Set(res.labels)].filter((c) => c !== res.labels[i])
    const b = Math.min(...others.map((c) => {
      const m = pts.filter((_, j) => res.labels[j] === c)
      return m.reduce((s, q) => s + dist(pts[i], q), 0) / m.length
    }))
    return { a, b }
  }
  const neg = sil.values.filter((v) => v < 0).length
  return (
    <Lab
      title="Silhouette plot: which points sit well?"
      desc="One bar per point, sorted within its cluster. Hover for a(i) and b(i)."
      controls={
        <>
          <Seg label="Dataset" value={shape} onChange={setShape} options={[{ v: 'blobs', label: 'Blobs' }, { v: 'varied', label: 'Uneven' }, { v: 'moons', label: 'Moons' }, { v: 'uniform', label: 'No structure' }]} />
          <Slider label="k" value={k} min={2} max={6} onChange={setK} />
        </>
      }
      notes={['Set k = 4 on Blobs. One true group gets split, and its bars shrink toward 0.', 'On Moons, look for negative bars: points that are closer on average to another cluster than to their own.']}
    >
      <div className="grid c2">
        <Plot
          w={360}
          h={320}
          x={[0, 1]}
          y={[0, 1]}
          axes={false}
          label="Points colored by cluster"
          onMove={(e) => {
            let best = -1
            let bd = 0.03
            pts.forEach((p, i) => {
              const d = Math.hypot(p.x - e.x, p.y - e.y)
              if (d < bd) {
                bd = d
                best = i
              }
            })
            setHover(best >= 0 ? best : null)
          }}
          onLeave={() => setHover(null)}
        >
          {pts.map((p, i) => (
            <Dot key={i} x={p.x} y={p.y} r={hover === i ? 7 : 4} color={seriesColor(res.labels[i])} shape={res.labels[i]} opacity={hover === null || hover === i ? 1 : 0.6} />
          ))}
          {hover !== null && <Tip x={pts[hover].x} y={pts[hover].y} lines={[`s = ${fmt(sil.values[hover], 3)}`, `a = ${fmt(detail(hover).a, 3)}`, `b = ${fmt(detail(hover).b, 3)}`]} />}
        </Plot>
        <Plot w={360} h={320} x={[-0.4, 1]} y={[0, pts.length]} xLabel="silhouette s(i)" yTicks={1} yTickValues={[]} label="Silhouette bars" pad={{ l: 14 }}>
          {order.map((i, row) => (
            <Rect key={i} x0={0} x1={sil.values[i]} y0={pts.length - row - 1} y1={pts.length - row - 0.15} color={seriesColor(res.labels[i])} opacity={hover === null || hover === i ? 1 : 0.45} onEnter={() => setHover(i)} onLeave={() => setHover(null)} />
          ))}
          <VLine x={0} dash="" color="var(--ink-3)" width={1} />
          <VLine x={sil.mean} color="var(--ink)" label={`mean ${fmt(sil.mean, 2)}`} />
        </Plot>
      </div>
      <Legend items={Array.from({ length: k }, (_, c) => ({ label: `Cluster ${c + 1}`, color: seriesColor(c), shape: c }))} />
      <Readout>
        <Stat k="Mean silhouette" v={fmt(sil.mean, 3)} />
        <Stat k="Negative points" v={neg} sub="probably misplaced" />
        <Stat k="SSE" v={fmt(res.sse, 3)} />
      </Readout>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader group="Clustering" title="Clustering basics" lede="Group objects so members are alike and groups differ, with no labels given. It all depends on how you measure alike." />

      <Plain>
        <p>
          Sort a pile of photos into albums with no album names given. What you call similar (same people, same place) decides the albums.
        </p>
        <p>
          Given n objects and a dissimilarity <M>{'d(i, j)'}</M>, find groups with small distances inside and large distances between.
        </p>
      </Plain>

      <Section id="good" title="What makes a clustering good">
        <ul>
          <li><strong>High intra-cluster similarity</strong>: members are close.</li>
          <li><strong>Low inter-cluster similarity</strong>: clusters are far apart.</li>
          <li>Quality depends on the similarity measure and the method.</li>
        </ul>
        <p>A good method scales, handles mixed attribute types and any cluster shape, needs few parameters, copes with noise, ignores input order, and gives results people can read.</p>
      </Section>

      <Section id="numeric" title="Distance for numeric attributes">
        <Formula title="Minkowski distance">
          <MB>{'d(i, j) = \\Big(\\sum_{f=1}^{p} |x_{if} - x_{jf}|^h\\Big)^{1/h}'}</MB>
          <p>
            <M>{'h = 1'}</M> is Manhattan, <M>{'h = 2'}</M> is Euclidean, <M>{'h \\to \\infty'}</M> is the supremum distance <M>{'\\max_f |x_{if} - x_{jf}|'}</M>. A metric is non-negative, zero only for identical objects, symmetric, and obeys the triangle inequality.
          </p>
        </Formula>
      </Section>
      <MinkowskiLab />

      <Section id="binary" title="Binary, nominal and ordinal attributes">
        <p>
          Count a 2 by 2 table: <M>{'q'}</M> both 1, <M>{'r'}</M> only i is 1, <M>{'s'}</M> only j is 1, <M>{'t'}</M> both 0.
        </p>
        <Formula title="Binary dissimilarity">
          <MB>{'d_{sym}(i, j) = \\frac{r + s}{q + r + s + t}, \\qquad d_{asym}(i, j) = \\frac{r + s}{q + r + s}, \\qquad sim_{Jaccard} = \\frac{q}{q + r + s}'}</MB>
          <p>Symmetric: both states matter equally. Asymmetric: the 1 is rare and meaningful (positive test), so 0-0 matches are ignored.</p>
        </Formula>
      </Section>
      <BinaryLab />

      <Formula title="Nominal and ordinal">
        <MB>{'d_{nominal}(i, j) = \\frac{p - m}{p}, \\qquad z_{if} = \\frac{r_{if} - 1}{M_f - 1}'}</MB>
        <p>
          Nominal: <M>{'m'}</M> matches out of <M>{'p'}</M> attributes. Ordinal: replace a value by its rank <M>{'r_{if}'}</M> of <M>{'M_f'}</M> states, scale to [0, 1], treat as numeric.
        </p>
      </Formula>
      <MixedLab />

      <Section id="methods" title="Families of clustering methods">
        <Table
          head={['Family', 'Idea', 'Examples', 'Finds']}
          rows={[
            ['Partitioning', 'Split into exactly k groups, improve by relocating objects', 'k-means, k-medoids', 'Round, similar-size clusters'],
            ['Hierarchical', 'Build a tree of merges (or splits)', 'AGNES, DIANA', 'A whole hierarchy, cut where you like'],
            ['Density-based', 'Grow clusters while the neighborhood is dense enough', 'DBSCAN, OPTICS', 'Any shape, marks noise'],
            ['Grid-based', 'Quantize the space into cells and cluster the cells', 'STING, CLIQUE', 'Fast, depends on grid size'],
          ]}
        />
      </Section>

      <Section id="quality" title="Judging a clustering">
        <p>
          Without labels, use an internal measure such as the silhouette. With known labels (only for testing a method), use external ones like purity.
        </p>
        <Formula title="Silhouette">
          <MB>{'s(i) = \\frac{b(i) - a(i)}{\\max\\{a(i), b(i)\\}} \\in [-1, 1]'}</MB>
          <p><M>{'a(i)'}</M>: mean distance to its own cluster. <M>{'b(i)'}</M>: smallest mean distance to another cluster.</p>
        </Formula>
      </Section>
      <SilhouetteLab />

      <Section id="worked" title="Worked example">
        <p>Objects i = (1, 0, 1, 1, 0, 0) and j = (1, 1, 0, 1, 0, 0), asymmetric binary attributes.</p>
        <ul>
          <li>q = 2 (attributes 1 and 4), r = 1 (attribute 3), s = 1 (attribute 2), t = 2.</li>
          <li>Asymmetric distance <M>{'= (r + s)/(q + r + s) = 2/4 = 0.5'}</M>. Jaccard similarity <M>{'= 2/4 = 0.5'}</M>.</li>
          <li>Had they been symmetric: <M>{'(r + s)/(q + r + s + t) = 2/6 = 0.333'}</M>. The two shared 0s made them look closer.</li>
        </ul>
        <p>Euclidean vs Manhattan for x = (1, 2) and y = (3, 5): Manhattan <M>{'= 2 + 3 = 5'}</M>, Euclidean <M>{'= \\sqrt{4 + 9} = 3.606'}</M>, supremum <M>{'= 3'}</M>.</p>
      </Section>

      <Trap>
        <ul>
          <li>Clustering is unsupervised. If the data has a class label, you are doing classification, not clustering.</li>
          <li>Standardize numeric attributes before computing distances, or the one with the biggest units decides everything.</li>
          <li>Jaccard ignores 0-0 matches. Use it only when 0 means "absent and uninteresting".</li>
          <li>The best possible SSE never goes up when k grows, but the mean silhouette can go down. Do not pick k by SSE alone.</li>
        </ul>
      </Trap>

      <Section id="check" title="Check yourself">
        <Check q="Why is simple matching a poor choice for comparing two shopping baskets?">
          Most products are in neither basket, so t is huge and every pair looks similar. Jaccard ignores those shared absences and compares only what was bought.
        </Check>
        <Check q="An ordinal attribute has states fair < good < excellent. What value does good get?">
          Rank r = 2 of M = 3 states, so <M>{'z = (2 - 1)/(3 - 1) = 0.5'}</M>.
        </Check>
        <Check q="Which family would you try first for clusters shaped like rings, and why?">
          Density-based (DBSCAN). It follows dense regions of any shape, while partitioning methods cut space into convex regions around centers.
        </Check>
        <Check q="A point has a(i) = 0.4 and b(i) = 0.3. What is its silhouette and what does it mean?">
          <M>{'s = (0.3 - 0.4)/0.4 = -0.25'}</M>. It is closer on average to another cluster, so it is probably in the wrong one.
        </Check>
      </Section>
    </>
  )
}
