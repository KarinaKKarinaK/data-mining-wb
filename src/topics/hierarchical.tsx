import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, HLine, Label, Line, Plot } from '../components/Plot'
import { Btn, Readout, Seg, Slider, Stat, seriesColor } from '../components/ui'
import { agglomerate, clustersAfter, labelsFromClusters, leafOrder, linkDist, stepsBelow, type Linkage, type Merge } from '../lib/d-cluster'
import { gauss, rng, fmt, type Pt } from '../lib/stats'
import { make2D, type Shape2D } from '../lib/datasets'

const LINKS: { v: Linkage; label: string }[] = [
  { v: 'single', label: 'Single' },
  { v: 'complete', label: 'Complete' },
  { v: 'average', label: 'Average' },
  { v: 'centroid', label: 'Centroid' },
  { v: 'ward', label: 'Ward' },
]

const NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const colorOf = (l: number) => (l < 8 ? seriesColor(l) : 'var(--ink-4)')

function Dendrogram({ n, merges, cut, labels, names, h = 260, upto }: { n: number; merges: Merge[]; cut: number; labels: number[]; names?: string[]; h?: number; upto?: number }) {
  const order = leafOrder(n, merges)
  const maxH = Math.max(...merges.map((m) => m.h), 1e-9)
  const pos = new Map<number, { x: number; h: number; lab: number }>()
  order.forEach((leaf, i) => pos.set(leaf, { x: i, h: 0, lab: labels[leaf] }))
  const segs: { pts: Pt[]; color: string }[] = []
  merges.forEach((m, k) => {
    const a = pos.get(m.a)!
    const b = pos.get(m.b)!
    const below = upto !== undefined ? k < upto : m.h <= cut
    const color = below ? colorOf(labels[m.members[0]]) : 'var(--ink-3)'
    segs.push({ pts: [{ x: a.x, y: a.h }, { x: a.x, y: m.h }, { x: b.x, y: m.h }, { x: b.x, y: b.h }], color })
    pos.set(m.id, { x: (a.x + b.x) / 2, h: m.h, lab: labels[m.members[0]] })
  })
  return (
    <Plot
      w={560}
      h={h}
      x={[-0.6, n - 0.4]}
      y={[0, maxH * 1.08]}
      yLabel="merge distance"
      label="Dendrogram"
      xTickValues={names ? order.map((leaf, i) => ({ v: i, label: names[leaf] })) : []}
      yFmt={(v) => fmt(v, 2)}
      yTicks={4}
    >
      {segs.map((s, i) => (
        <Line key={i} pts={s.pts} color={s.color} width={1.8} />
      ))}
      {upto === undefined && cut < maxH && <HLine y={cut} color="var(--ink)" label={`cut at ${fmt(cut, 3)}`} />}
    </Plot>
  )
}

const START: Pt[] = [
  { x: 0.12, y: 0.78 }, { x: 0.2, y: 0.86 }, { x: 0.24, y: 0.7 }, { x: 0.38, y: 0.8 },
  { x: 0.62, y: 0.82 }, { x: 0.72, y: 0.74 }, { x: 0.8, y: 0.86 }, { x: 0.15, y: 0.25 },
  { x: 0.28, y: 0.18 }, { x: 0.55, y: 0.32 }, { x: 0.66, y: 0.2 }, { x: 0.86, y: 0.3 },
]

function StepperLab() {
  const [pts, setPts] = useState<Pt[]>(START)
  const [link, setLink] = useState<Linkage>('single')
  const [step, setStep] = useState(0)
  const [drag, setDrag] = useState<number | null>(null)
  const n = pts.length
  const merges = useMemo(() => agglomerate(pts, link), [pts, link])
  const cl = useMemo(() => clustersAfter(n, merges, step), [n, merges, step])
  const multi = cl.filter((c) => c.members.length > 1).sort((a, b) => a.id - b.id)
  const colorIdx = new Map(multi.map((c, i) => [c.id, i]))
  const labelOf = new Array(n).fill(-1)
  cl.forEach((c) => c.members.forEach((m) => (labelOf[m] = c.members.length > 1 ? colorIdx.get(c.id)! : -1)))
  const sorted = [...cl].sort((a, b) => Math.min(...a.members) - Math.min(...b.members))
  const name = (c: { members: number[] }) => [...c.members].sort((a, b) => a - b).map((m) => NAMES[m]).join('')
  const next = merges[step]
  const isNext = (c: { id: number }) => !!next && (c.id === next.a || c.id === next.b)
  const mat = sorted.map((a) => sorted.map((b) => (a === b ? null : linkDist(pts, a.members, b.members, link))))
  return (
    <Lab
      title="Agglomerative clustering, one merge at a time"
      desc="Start with every point as its own cluster. Each step merges the two closest clusters. The table shows the current cluster distances; the two highlighted clusters merge next. Drag points to change the data."
      controls={
        <>
          <Seg label="Linkage" value={link} onChange={(v) => { setLink(v); setStep(0) }} options={LINKS} />
          <div className="row">
            <Btn variant="primary" onClick={() => setStep((s) => Math.min(n - 1, s + 1))} disabled={step >= n - 1}>Merge next</Btn>
            <Btn onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Btn>
          </div>
          <Slider label="Merges done" value={step} min={0} max={n - 1} onChange={setStep} />
          <Btn sm variant="ghost" onClick={() => { setPts(START); setStep(0) }}>Reset points</Btn>
        </>
      }
      notes={[
        'Step through with Single, then switch to Complete. The first merges are the same (two single points have one distance), later ones differ.',
        'Drag point D toward E and F. With single linkage, one close pair is enough to join two groups.',
        'Watch the merge distances in the dendrogram: they never go down for single, complete, average and Ward. Centroid linkage can produce a lower merge than the one before (an inversion).',
      ]}
    >
      <Plot
        w={560}
        h={330}
        x={[0, 1]}
        y={[0, 1]}
        axes={false}
        label="Points colored by current cluster"
        cursor={drag !== null ? 'grabbing' : 'grab'}
        onDown={(e) => {
          const i = pts.findIndex((p) => Math.hypot(p.x - e.x, p.y - e.y) < 0.04)
          if (i >= 0) setDrag(i)
        }}
        onMove={(e) => drag !== null && setPts((ps) => ps.map((p, i) => (i === drag ? { x: Math.min(0.98, Math.max(0.02, e.x)), y: Math.min(0.98, Math.max(0.02, e.y)) } : p)))}
        onUp={() => setDrag(null)}
      >
        {multi.map((c) => {
          const cx = c.members.reduce((s, m) => s + pts[m].x, 0) / c.members.length
          const cy = c.members.reduce((s, m) => s + pts[m].y, 0) / c.members.length
          return c.members.map((m) => <Line key={`${c.id}-${m}`} pts={[{ x: cx, y: cy }, pts[m]]} color={colorOf(colorIdx.get(c.id)!)} width={1.2} opacity={0.6} />)
        })}
        {pts.map((p, i) => (
          <Dot key={i} x={p.x} y={p.y} r={7} color={labelOf[i] >= 0 ? colorOf(labelOf[i]) : 'var(--ink-3)'} shape={labelOf[i] >= 0 ? labelOf[i] : 0} />
        ))}
        {pts.map((p, i) => (
          <Label key={'l' + i} x={p.x} y={p.y} dx={10} dy={4}>{NAMES[i]}</Label>
        ))}
        {next &&
          cl.filter(isNext).map((c) => c.members.map((m) => <Dot key={'n' + m} x={pts[m].x} y={pts[m].y} r={11} fill={false} color="var(--ink)" />))}
      </Plot>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="t">
          <thead>
            <tr>
              <th />
              {sorted.map((c) => (
                <th key={c.id} className="num">{name(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a, i) => (
              <tr key={a.id}>
                <td style={{ fontFamily: 'var(--mono)' }}>{name(a)}</td>
                {mat[i].map((d, j) => {
                  const hit = isNext(a) && isNext(sorted[j]) && d !== null
                  return (
                    <td key={j} className="num" style={hit ? { background: 'rgba(143,140,245,0.22)', color: 'var(--ink)' } : undefined}>
                      {d === null ? '' : fmt(d, 3)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Readout>
        <Stat k="Clusters" v={cl.length} />
        <Stat k="Next merge" v={next ? `${name(cl.find((c) => c.id === next.a)!)} + ${name(cl.find((c) => c.id === next.b)!)}` : 'done'} />
        <Stat k="At distance" v={next ? fmt(next.h, 3) : '-'} />
      </Readout>
      <div style={{ marginTop: 12 }}>
        <span className="label">Dendrogram so far</span>
        <Dendrogram n={n} merges={merges} cut={0} upto={step} labels={labelOf.map((l) => (l >= 0 ? l : 99))} names={NAMES} h={230} />
      </div>
    </Lab>
  )
}

function CutLab() {
  const [shape, setShape] = useState<Shape2D>('blobs')
  const [link, setLink] = useState<Linkage>('average')
  const [frac, setFrac] = useState(0.5)
  const pts = useMemo(() => make2D(shape, 40, 13, 0.06, 3).map(({ x, y }) => ({ x, y })), [shape])
  const merges = useMemo(() => agglomerate(pts, link), [pts, link])
  const maxH = Math.max(...merges.map((m) => m.h))
  const cut = frac * maxH
  const steps = stepsBelow(merges, cut)
  const order = useMemo(() => leafOrder(pts.length, merges), [pts, merges])
  const cl = clustersAfter(pts.length, merges, steps)
  const labels = labelsFromClusters(pts.length, cl, order)
  return (
    <Lab
      title="Cut the dendrogram to get clusters"
      desc="Every horizontal cut through the tree gives one flat clustering: the branches it crosses become the clusters. Move the cut and watch the scatter."
      controls={
        <>
          <Seg label="Dataset" value={shape} onChange={setShape} options={[{ v: 'blobs', label: 'Blobs' }, { v: 'varied', label: 'Uneven' }, { v: 'moons', label: 'Moons' }, { v: 'uniform', label: 'No structure' }]} />
          <Seg label="Linkage" value={link} onChange={setLink} options={LINKS} />
          <Slider label="Cut height (share of tallest merge)" value={frac} min={0} max={1} step={0.01} onChange={setFrac} fmt={(v) => `${Math.round(v * 100)}%`} />
        </>
      }
      notes={[
        'A long vertical gap in the tree means a natural number of clusters: you can move the cut a lot without changing the result.',
        'On Moons, compare Single with Ward. Single follows each moon; Ward prefers compact, equal-size groups.',
        'Cutting at 0% gives n clusters, at 100% one cluster. Hierarchical clustering does not need k in advance.',
      ]}
    >
      <Dendrogram n={pts.length} merges={merges} cut={cut} labels={labels} />
      <Plot w={560} h={300} x={[0, 1]} y={[0, 1]} axes={false} label="Clusters at the selected cut">
        {pts.map((p, i) => (
          <Dot key={i} x={p.x} y={p.y} r={5} color={colorOf(labels[i])} shape={labels[i]} />
        ))}
      </Plot>
      <Readout>
        <Stat k="Clusters" v={cl.length} sub={cl.length > 8 ? 'beyond 8 shown in gray' : undefined} />
        <Stat k="Cut height" v={fmt(cut, 3)} />
        <Stat k="Merges applied" v={`${steps} of ${merges.length}`} />
      </Readout>
    </Lab>
  )
}

function ChainLab() {
  const [count, setCount] = useState(6)
  const pts = useMemo(() => {
    const r = rng(5)
    const out: Pt[] = []
    for (let i = 0; i < 18; i++) out.push({ x: 0.18 + gauss(r) * 0.05, y: 0.5 + gauss(r) * 0.08 })
    for (let i = 0; i < 18; i++) out.push({ x: 0.82 + gauss(r) * 0.05, y: 0.5 + gauss(r) * 0.08 })
    for (let i = 0; i < count; i++) out.push({ x: 0.3 + (0.4 * (i + 0.5)) / count, y: 0.5 + gauss(r) * 0.006 })
    return out
  }, [count])
  const views = (['single', 'complete'] as Linkage[]).map((l) => {
    const m = agglomerate(pts, l)
    const cl = clustersAfter(pts.length, m, pts.length - 2)
    return { l, labels: labelsFromClusters(pts.length, cl, leafOrder(pts.length, m)) }
  })
  return (
    <Lab
      title="The chaining effect of single linkage"
      desc="Two clear groups joined by a thin bridge of points. Both methods are asked for 2 clusters."
      controls={<Slider label="Points on the bridge" value={count} min={0} max={14} onChange={setCount} />}
      notes={['With a dense bridge, single linkage walks along it link by link and cannot separate the two groups. It ends with one huge cluster and a straggler.', 'Complete linkage looks at the farthest pair, so a bridge does not fool it. Remove the bridge (0 points) and both agree.']}
    >
      <div className="grid c2">
        {views.map((v) => (
          <div key={v.l}>
            <span className="label">{v.l} linkage, 2 clusters</span>
            <Plot w={360} h={240} x={[0, 1]} y={[0.2, 0.8]} axes={false} label={`${v.l} linkage result`}>
              {pts.map((p, i) => (
                <Dot key={i} x={p.x} y={p.y} r={4.5} color={colorOf(v.labels[i])} shape={v.labels[i]} />
              ))}
            </Plot>
          </div>
        ))}
      </div>
    </Lab>
  )
}

function WorkedLab() {
  const [link, setLink] = useState<Linkage>('single')
  const vals = [1, 2, 4, 8, 13]
  const names = ['a', 'b', 'c', 'd', 'e']
  const pts = vals.map((v) => ({ x: v, y: 0 }))
  const merges = useMemo(() => agglomerate(pts, link), [link])
  const nm = (m: number[]) => `{${[...m].sort((x, y) => x - y).map((i) => names[i]).join(', ')}}`
  return (
    <Lab
      title="Worked by hand: five values on a line"
      desc="Points a = 1, b = 2, c = 4, d = 8, e = 13. The table lists every merge and the distance it happens at."
      controls={<Seg label="Linkage" value={link} onChange={setLink} options={LINKS.filter((l) => l.v !== 'ward' && l.v !== 'centroid')} />}
      notes={['Single: {a, b} at 1, then c joins at 2 (distance from c to b), then d at 4, then e at 5.', 'Complete: c joins {a, b} at 3 (distance from c to a), then {d, e} forms at 5, and the last merge happens at 12 (from a to e).', 'Average: c joins {a, b} at (3 + 2) / 2 = 2.5.']}
    >
      <Table
        head={['Step', 'Merge', 'New cluster', 'Distance']}
        num={[0, 3]}
        rows={merges.map((m, i) => [i + 1, `${nm(clustersAfter(5, merges, i).find((c) => c.id === m.a)!.members)} + ${nm(clustersAfter(5, merges, i).find((c) => c.id === m.b)!.members)}`, nm(m.members), fmt(m.h, 3)])}
      />
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader group="Clustering" title="Hierarchical clustering" lede="Instead of one flat split into k groups, build a whole tree of groups. You choose the number of clusters afterwards by cutting the tree." minutes={25} />

      <Plain>
        <p>
          Think of a family tree read upside down. Each person starts alone. The two closest relatives join first, then families join into clans, clans into tribes, until everyone is one big family. Stop reading the tree at any level and you get a grouping.
        </p>
        <p>
          The tree is called a <strong>dendrogram</strong>. The height where two branches join is the distance at which those clusters merged.
        </p>
      </Plain>

      <Section id="two-ways" title="Two directions" kicker="AGNES and DIANA">
        <ul>
          <li><strong>Agglomerative (bottom-up, AGNES)</strong>: start with n singleton clusters, repeatedly merge the closest pair, stop with one cluster.</li>
          <li><strong>Divisive (top-down, DIANA)</strong>: start with one cluster holding everything, repeatedly split a cluster (for example the one with the largest diameter), stop when every object is alone.</li>
        </ul>
        <p>Neither needs k as input, but both need a rule for the distance between two clusters, called the linkage.</p>
        <Formula title="Linkage: distance between clusters A and B">
          <MB>{'d_{single} = \\min_{a \\in A, b \\in B} d(a, b) \\qquad d_{complete} = \\max_{a \\in A, b \\in B} d(a, b)'}</MB>
          <MB>{'d_{average} = \\frac{1}{|A||B|}\\sum_{a \\in A}\\sum_{b \\in B} d(a, b) \\qquad d_{centroid} = d(m_A, m_B)'}</MB>
          <MB>{'d_{Ward} = \\frac{|A||B|}{|A| + |B|}\\lVert m_A - m_B \\rVert^2 \\;\\text{(increase in SSE caused by the merge)}'}</MB>
        </Formula>
      </Section>
      <StepperLab />

      <Section id="cut" title="Reading and cutting a dendrogram" kicker="From tree to clusters">
        <p>Draw a horizontal line across the dendrogram. Every vertical branch it crosses is one cluster. A higher cut gives fewer, bigger clusters.</p>
      </Section>
      <CutLab />

      <Section id="linkage" title="How the linkage changes the result" kicker="Single vs complete">
        <Table
          head={['Linkage', 'Tends to give', 'Weak spot']}
          rows={[
            ['Single', 'Long, chained clusters; can follow curved shapes', 'Chaining through noise or bridges'],
            ['Complete', 'Compact clusters of similar diameter', 'Sensitive to outliers, may split big clusters'],
            ['Average', 'A compromise between the two', 'More computation per pair'],
            ['Ward', 'Compact, similar-size clusters (like k-means)', 'Assumes round clusters'],
          ]}
        />
      </Section>
      <ChainLab />

      <Section id="worked" title="Worked example" kicker="Exam style">
        <p>Exams give a small distance matrix and ask you to run single or complete linkage and draw the dendrogram. After each merge, recompute only the row of the new cluster: with single linkage take the minimum of the two old rows, with complete linkage the maximum.</p>
      </Section>
      <WorkedLab />

      <Section id="cost" title="Cost and limits" kicker="Know these">
        <ul>
          <li>The distance matrix needs <M>{'O(n^2)'}</M> memory. The naive algorithm takes <M>{'O(n^3)'}</M> time (n merges, each scanning the matrix).</li>
          <li>Merges are greedy and final. A bad early merge can never be undone.</li>
          <li>Extensions such as BIRCH (summary tree of cluster features) and Chameleon (dynamic modeling of closeness) scale to bigger data.</li>
        </ul>
      </Section>

      <Trap>
        <ul>
          <li>The dendrogram height is the merge distance, not the number of points.</li>
          <li>Single linkage uses the closest pair; complete uses the farthest pair. Swapping them is the most common exam slip.</li>
          <li>After merging, update the matrix with min (single) or max (complete) of the two old rows. Do not recompute from the original points unless the question asks for average or centroid linkage.</li>
        </ul>
      </Trap>

      <Section id="check" title="Check yourself">
        <Check q="Distances: d(A, C) = 3 and d(B, C) = 5. After merging A and B, what is the distance to C under single and complete linkage?">
          Single: min(3, 5) = 3. Complete: max(3, 5) = 5.
        </Check>
        <Check q="Why does hierarchical clustering not need k?">
          It builds the full tree of merges. You pick k afterwards by where you cut the dendrogram.
        </Check>
        <Check q="Which linkage would you avoid on data with a few noisy points between two groups?">
          Single linkage. Noise points act as a bridge and chain the groups together.
        </Check>
        <Check q="Why is the naive algorithm O(n^3)?">
          There are n - 1 merges, and before each one the algorithm scans an n by n distance matrix for the smallest entry.
        </Check>
      </Section>
    </>
  )
}
