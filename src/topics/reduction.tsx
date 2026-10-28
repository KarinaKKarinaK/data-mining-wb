import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Line, Plot, Rect, nearestIndex, scales } from '../components/Plot'
import { Btn, Legend, Readout, Seg, Slider, Stat, Toggle, seriesColor } from '../components/ui'
import { clipLine } from '../lib/geom'
import { clamp, covariance2, eig2, fmt, gauss, rng, type Pt } from '../lib/stats'

function CurseLab() {
  const [e, setE] = useState(-2)
  const [d, setD] = useState(10)
  const r = 10 ** e
  const l = r ** (1 / d)
  const curve = Array.from({ length: 100 }, (_, i) => ({ x: i + 1, y: r ** (1 / (i + 1)) }))
  return (
    <Lab
      title="How big a cube do you need?"
      desc="Edge of a sub-cube holding a fraction r of evenly spread data in d dimensions."
      controls={
        <>
          <Slider label="Fraction of data r" value={e} min={-3} max={-0.3} step={0.05} onChange={setE} fmt={(v) => `${fmt(10 ** v * 100, 2)}%`} />
          <Slider label="Dimensions d" value={d} min={1} max={100} onChange={setD} />
        </>
      }
      notes={[
        'Set r = 1% and d = 10: the edge is 0.63, so 1% of the data needs 63% of every attribute range.',
        'Set d = 1: the edge equals r. Each extra dimension pushes it toward 1.',
      ]}
    >
      <Plot w={560} h={280} x={[1, 100]} y={[0, 1]} xLabel="dimensions d" yLabel="edge length l" label="Edge length needed versus dimensions">
        <Line pts={curve} color={seriesColor(0)} />
        <Dot x={d} y={l} r={7} color={seriesColor(1)} shape={1} />
      </Plot>
      <Readout>
        <Stat k="r" v={`${fmt(r * 100, 2)}%`} />
        <Stat k="d" v={d} />
        <Stat k="Edge l" v={fmt(l, 3)} sub={`${fmt(l * 100, 1)}% of each range`} />
      </Readout>
    </Lab>
  )
}

const DIMS = [1, 2, 3, 5, 10, 20, 50, 100, 200, 500]

function ConcentrationLab() {
  const [di, setDi] = useState(1)
  const d = DIMS[di]
  const dists = useMemo(() => {
    const r = rng(3)
    const q = Array.from({ length: d }, () => r())
    return Array.from({ length: 300 }, () => {
      let s = 0
      for (let k = 0; k < d; k++) s += (r() - q[k]) ** 2
      return Math.sqrt(s)
    })
  }, [d])
  const mn = Math.min(...dists)
  const mx = Math.max(...dists)
  const nb = 25
  const counts = Array.from({ length: nb }, (_, b) => dists.filter((v) => Math.min(nb - 1, Math.floor((v / mx) * nb)) === b).length)
  return (
    <Lab
      title="Distances stop meaning much"
      desc="Distances from 300 random points to one query, divided by the largest."
      controls={<Slider label="Dimensions d" value={di} min={0} max={DIMS.length - 1} onChange={setDi} fmt={(i) => String(DIMS[i])} />}
      notes={[
        'Set d = 2: distances spread across the whole axis.',
        'Set d = 500: every point is about equally far, so the nearest neighbor barely differs from the farthest and kNN and clustering suffer.',
      ]}
    >
      <Plot w={560} h={250} x={[0, 1]} y={[0, Math.max(...counts) * 1.15]} xLabel="distance / largest distance" yLabel="points" label="Histogram of relative distances">
        {counts.map((c, b) => (
          <Rect key={b} x0={b / nb + 0.004} x1={(b + 1) / nb - 0.004} y0={0} y1={c} color={seriesColor(0)} rx={2} />
        ))}
      </Plot>
      <Readout>
        <Stat k="d" v={d} />
        <Stat k="Nearest" v={fmt(mn, 3)} />
        <Stat k="Farthest" v={fmt(mx, 3)} />
        <Stat k="(far - near) / near" v={fmt((mx - mn) / mn, 2)} />
      </Readout>
    </Lab>
  )
}

function pcaPreset(kind: string): Pt[] {
  const r = rng(kind.length * 7 + 2)
  return Array.from({ length: 24 }, () => {
    const x = gauss(r)
    if (kind === 'round') return { x: 5 + x * 1.4, y: 5 + gauss(r) * 1.4 }
    if (kind === 'line') return { x: clamp(5 + x * 2, 0.3, 9.7), y: clamp(5 - x * 1.6 + gauss(r) * 0.15, 0.3, 9.7) }
    return { x: clamp(5 + x * 1.9, 0.3, 9.7), y: clamp(5 + x * 1.3 + gauss(r) * 0.6, 0.3, 9.7) }
  })
}

const clampPt = (p: Pt) => ({ x: clamp(p.x, 0, 10), y: clamp(p.y, 0, 10) })

function PcaLab() {
  const W = 460
  const H = 448
  const [kind, setKind] = useState('corr')
  const [pts, setPts] = useState<Pt[]>(() => pcaPreset('corr'))
  const [drag, setDrag] = useState(-1)
  const [proj, setProj] = useState(true)
  const sc = scales(W, H, [0, 10], [0, 10], undefined, true, true, true)
  const c = covariance2(pts)
  const { l1, l2, v1, v2 } = eig2(c.xx, c.xy, c.yy)
  const total = l1 + l2
  const mean = { x: c.mx, y: c.my }
  const along = (v: [number, number], t: number) => ({ x: mean.x + v[0] * t, y: mean.y + v[1] * t })
  const projected = pts.map((p) => along(v1, (p.x - mean.x) * v1[0] + (p.y - mean.y) * v1[1]))
  const angle = (Math.atan2(v1[1], v1[0]) * 180) / Math.PI
  return (
    <Lab
      title="PCA in two dimensions"
      desc="Drag the points. Arrows are 2 standard deviations long."
      controls={
        <>
          <Seg
            label="Start from"
            value={kind}
            onChange={(v) => {
              setKind(v)
              setPts(pcaPreset(v))
            }}
            options={[
              { v: 'corr', label: 'Correlated' },
              { v: 'line', label: 'Nearly a line' },
              { v: 'round', label: 'Round cloud' },
            ]}
          />
          <Toggle on={proj} onChange={setProj}>
            Show projection onto PC1
          </Toggle>
        </>
      }
      notes={[
        'Pick "Nearly a line": PC1 explains almost everything, so 1 dimension is enough.',
        'Pick "Round cloud": the eigenvalues are similar and dropping one loses about half.',
        'Drag a point far along PC2: the eigenvalue of PC2 grows, and so does the loss.',
      ]}
    >
      <Plot
        w={W}
        h={H}
        x={[0, 10]}
        y={[0, 10]}
        xLabel="attribute 1"
        yLabel="attribute 2"
        label="Points with principal components"
        cursor={drag >= 0 ? 'grabbing' : 'grab'}
        onDown={(p) => setDrag(nearestIndex(pts, p, sc, 12))}
        onMove={(p) => drag >= 0 && setPts((a) => a.map((q, k) => (k === drag ? { x: clamp(p.x, 0, 10), y: clamp(p.y, 0, 10) } : q)))}
        onUp={() => setDrag(-1)}
      >
        <Line pts={clipLine(mean, v1[0], v1[1], [0, 10], [0, 10])} color={seriesColor(0)} width={1} opacity={0.35} />
        {proj &&
          pts.map((p, i) => (
            <Line key={'p' + i} pts={[p, projected[i]]} color="var(--ink-4)" width={1} />
          ))}
        {proj && projected.map((p, i) => <Dot key={'q' + i} x={p.x} y={p.y} r={3} fill={false} color={seriesColor(0)} />)}
        <Line pts={[mean, clampPt(along(v1, 2 * Math.sqrt(l1)))]} color={seriesColor(0)} width={3} />
        <Line pts={[mean, clampPt(along(v2, 2 * Math.sqrt(Math.max(l2, 0))))]} color={seriesColor(1)} width={3} dash="5 4" />
        {pts.map((p, i) => (
          <Dot key={i} x={p.x} y={p.y} r={drag === i ? 7 : 5} color="var(--ink-2)" />
        ))}
        <Dot x={mean.x} y={mean.y} r={6} shape={4} color="var(--ink)" />
      </Plot>
      <Legend
        items={[
          { label: 'PC1', color: seriesColor(0), shape: 1 },
          { label: 'PC2', color: seriesColor(1), shape: 1 },
          { label: 'mean', color: 'var(--ink)', shape: 4 },
        ]}
      />
      <Readout>
        <Stat k="Eigenvalue 1" v={fmt(l1, 3)} />
        <Stat k="Eigenvalue 2" v={fmt(l2, 3)} />
        <Stat k="PC1 explains" v={`${fmt((l1 / total) * 100, 1)}%`} />
        <Stat k="Lost keeping PC1" v={`${fmt((l2 / total) * 100, 1)}%`} />
        <Stat k="PC1 direction" v={`(${fmt(v1[0], 2)}, ${fmt(v1[1], 2)})`} sub={`${fmt(angle, 1)} degrees`} />
      </Readout>
    </Lab>
  )
}

type SampleMethod = 'wor' | 'wr' | 'strat'

function draw(n: number, minority: number, size: number, method: SampleMethod, seed: number) {
  const r = rng(seed)
  const counts = new Array(n).fill(0)
  if (method === 'wr') {
    for (let i = 0; i < size; i++) counts[Math.floor(r() * n)]++
  } else if (method === 'wor') {
    const idx = Array.from({ length: n }, (_, i) => i)
    for (let i = 0; i < size; i++) {
      const j = i + Math.floor(r() * (n - i))
      ;[idx[i], idx[j]] = [idx[j], idx[i]]
      counts[idx[i]]++
    }
  } else {
    const groups = [Array.from({ length: n - minority }, (_, i) => i), Array.from({ length: minority }, (_, i) => n - minority + i)]
    const take = [size - Math.max(1, Math.round((size * minority) / n)), Math.max(1, Math.round((size * minority) / n))]
    groups.forEach((g, gi) => {
      const pool = [...g]
      for (let i = 0; i < Math.min(take[gi], pool.length); i++) {
        const j = i + Math.floor(r() * (pool.length - i))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
        counts[pool[i]]++
      }
    })
  }
  return counts
}

function SamplingLab() {
  const N = 100
  const [minority, setMinority] = useState(8)
  const [size, setSize] = useState(10)
  const [method, setMethod] = useState<SampleMethod>('wor')
  const [seed, setSeed] = useState(1)
  const counts = draw(N, minority, size, method, seed)
  const isMin = (i: number) => i >= N - minority
  const got = counts.reduce((s, c, i) => s + (isMin(i) ? c : 0), 0)
  const zeroRate = useMemo(() => {
    let z = 0
    for (let s = 1; s <= 400; s++) {
      const c = draw(N, minority, size, method, s * 97)
      if (c.every((v, i) => !isMin(i) || v === 0)) z++
    }
    return z / 400
  }, [minority, size, method])
  return (
    <Lab
      title="Sampling a skewed population"
      desc="100 customers, a few in class B. Does B survive the sample?"
      controls={
        <>
          <Seg label="Method" value={method} onChange={setMethod} options={[{ v: 'wor', label: 'Random, no replacement' }, { v: 'wr', label: 'Random, with replacement' }, { v: 'strat', label: 'Stratified' }]} />
          <Slider label="Class B in population" value={minority} min={2} max={40} onChange={setMinority} fmt={(v) => `${v}%`} />
          <Slider label="Sample size" value={size} min={5} max={50} onChange={setSize} />
          <Btn onClick={() => setSeed((s) => s + 1)}>Draw a new sample</Btn>
        </>
      }
      notes={[
        'Set B to 4% and sample 10: random sampling often picks no B (see "Samples with no B").',
        'Switch to stratified: each class is sampled separately, so B always appears.',
        'Switch to with replacement: a customer can be picked twice, shown as a count.',
      ]}
    >
      <svg viewBox="0 0 500 250" className="plot" style={{ maxWidth: 620 }} role="img" aria-label="Population grid with sampled customers highlighted">
        {counts.map((c, i) => {
          const x = (i % 20) * 25
          const y = Math.floor(i / 20) * 50
          return (
            <g key={i}>
              <rect x={x + 2} y={y + 2} width={21} height={46} rx={5} fill={isMin(i) ? 'var(--s2)' : 'var(--s1)'} opacity={c ? 0.95 : 0.16} />
              {c > 1 && (
                <text x={x + 12.5} y={y + 30} textAnchor="middle" fontSize={12} fill="var(--bg)" fontFamily="var(--mono)">
                  {c}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <Legend
        items={[
          { label: 'class A', color: 'var(--s1)', shape: 1 },
          { label: 'class B (minority)', color: 'var(--s2)', shape: 1 },
        ]}
      />
      <Readout>
        <Stat k="B in population" v={`${minority}%`} />
        <Stat k="B in this sample" v={`${got} of ${size}`} sub={`${fmt((got / size) * 100, 1)}%`} />
        <Stat k="Samples with no B" v={`${fmt(zeroRate * 100, 1)}%`} sub="over 400 random draws" />
      </Readout>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader
        group="Preprocessing"
        title="Data reduction and PCA"
        lede="A smaller version of the data that gives almost the same mining results: fewer attributes, fewer records, or both."
      />

      <Plain>
        <p>
          You can recognize a face from a thumbnail, so most of a photo's pixels are redundant. Reduction keeps the thumbnail: the same answer at a fraction of the size.
        </p>
      </Plain>

      <Section id="curse" title="The curse of dimensionality">
        <p>
          As the number of attributes d grows, data becomes sparse and distances lose meaning. Fewer dimensions also remove noise, save time and space, and allow plots.
        </p>
        <Formula>
          <MB note="Edge length of a sub-cube that holds a fraction r of evenly spread data. As the number of dimensions grows it heads to 1, so a small neighborhood covers almost the whole range." syms={[['\\ell', 'edge length, as a share of each attribute range'], ['r', 'fraction of the data inside the sub-cube'], ['d', 'number of dimensions']]}>{'\\ell = r^{1/d}'}</MB>
          <p>
            Edge length of a sub-cube that holds a fraction <M>{'r'}</M> of uniformly spread data in <M>{'d'}</M> dimensions. With <M>{'d = 10'}</M> and <M>{'r = 0.01'}</M>: <M>{'\\ell = 0.01^{0.1} = 0.63'}</M>.
          </p>
        </Formula>
      </Section>
      <CurseLab />
      <ConcentrationLab />

      <Section id="pca" title="Principal component analysis">
        <Plain title="The idea">
          <p>
            Turn your head until the point cloud looks as wide as possible: that direction is PC1. PCA rotates the axes so each captures the most remaining spread, then keeps the first few.
          </p>
        </Plain>
        <Formula>
          <MB note="PCA: build the covariance matrix of the centered data, then find its eigenvectors. Each eigenvector is a principal direction and its eigenvalue is the variance along it." syms={[['\\mathbf{C}', 'covariance matrix'], ['\\mathbf{x}_k', 'record k as a vector'], ['\\bar{\\mathbf{x}}', 'mean vector'], ['N', 'number of records'], ['^T', 'transpose'], ['\\mathbf{v}', 'eigenvector: a principal direction'], ['\\lambda', 'eigenvalue: variance along that direction']]}>{'\\mathbf{C} = \\frac{1}{N}\\sum_{k}(\\mathbf{x}_k - \\bar{\\mathbf{x}})(\\mathbf{x}_k - \\bar{\\mathbf{x}})^T, \\qquad \\mathbf{C}\\mathbf{v} = \\lambda \\mathbf{v}'}</MB>
          <p>
            Each eigenvector <M>{'\\mathbf{v}'}</M> is a principal direction and its eigenvalue <M>{'\\lambda'}</M> is the variance along it. Sort by decreasing <M>{'\\lambda'}</M> and keep the first <M>{'k'}</M>.
          </p>
          <MB note="The share of the total variance kept when you keep only the first k principal components. Use it to choose k." syms={[['\\lambda_i', 'eigenvalue of component i, largest first'], ['k', 'components kept'], ['d', 'all components (number of attributes)']]}>{'\\text{proportion of variance explained} = \\frac{\\lambda_1 + \\dots + \\lambda_k}{\\lambda_1 + \\dots + \\lambda_d}'}</MB>
          <p>A common rule: keep the smallest k that explains at least 80% or 90%.</p>
        </Formula>
      </Section>
      <PcaLab />

      <Section id="pca-worked" title="Worked example">
        <p>Eigenvalues of a covariance matrix: 4.2, 2.1, 0.9, 0.5, 0.3. How many components to explain at least 90%?</p>
        <Table
          head={['k', 'Cumulative λ', 'Proportion']}
          num={[0, 1, 2]}
          rows={[
            [1, '4.2', '0.525'],
            [2, '6.3', '0.788'],
            [3, '7.2', '0.900'],
            [4, '7.7', '0.963'],
            [5, '8.0', '1.000'],
          ]}
        />
        <p style={{ marginTop: 10 }}>Total is 8.0. k = 3 reaches exactly 0.900, so keep 3 components.</p>
      </Section>

      <Section id="subset" title="Feature subset selection">
        <p>
          Remove <strong>redundant</strong> attributes (purchase price and sales tax paid say the same thing) and <strong>irrelevant</strong> ones (student ID does not predict GPA). With d attributes there are <M>{'2^d'}</M> subsets, too many to try, so we search greedily.
        </p>
        <Table
          head={['Step', 'Forward selection', 'Backward elimination']}
          rows={[
            ['Start', '{ }', '{A1, A2, A3, A4, A5, A6}'],
            ['1', '{A1}', '{A1, A3, A4, A5, A6}'],
            ['2', '{A1, A4}', '{A1, A4, A5, A6}'],
            ['3', '{A1, A4, A6}', '{A1, A4, A6}'],
          ]}
        />
        <p style={{ marginTop: 10 }}>
          Forward adds the best remaining attribute each step; backward removes the worst. "Best" means highest correlation with the target or best model accuracy. The two can be combined.
        </p>
      </Section>

      <Section id="numerosity" title="Numerosity reduction">
        <ul>
          <li><strong>Parametric</strong>: fit a model (such as linear regression) and store only its parameters, plus outliers.</li>
          <li><strong>Histograms</strong>: store bucket counts instead of values.</li>
          <li><strong>Clustering</strong>: store cluster centroids and sizes.</li>
          <li><strong>Data cube aggregation</strong>: keep quarterly sales as annual totals if that is all the analysis needs.</li>
          <li><strong>Sampling</strong>: simple random sampling with or without replacement, or stratified sampling, which samples each group separately and works well for skewed data.</li>
        </ul>
      </Section>
      <SamplingLab />

      <Section id="traps" title="Common mistakes">
        <Trap>
          <ul>
            <li>Normalize (z-score) before PCA when attributes have different units, or the attribute with the biggest numbers becomes PC1.</li>
            <li>PCA components are new attributes (combinations of the old ones). Feature selection keeps original attributes. Do not mix up the two.</li>
            <li>PCA finds directions of high variance, not directions that separate classes.</li>
            <li>The sign of an eigenvector is arbitrary. v and -v describe the same component.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="d = 3 and r = 0.001. Edge length?">0.001^(1/3) = 0.1.</Check>
        <Check q="Eigenvalues 6, 3, 1. Proportion explained by the first two?">(6 + 3) / 10 = 0.9.</Check>
        <Check q="Why is stratified sampling better for skewed classes?">Simple random sampling may miss a rare class completely. Stratified sampling takes a planned share from each class, so every class appears in proportion.</Check>
        <Check q="Why is feature subset selection done greedily?">With d attributes there are 2^d subsets. That is over a million for d = 20, too many to evaluate.</Check>
      </Section>
    </>
  )
}
