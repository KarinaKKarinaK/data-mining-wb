import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, HLine, Label, Line, Plot, Tip } from '../components/Plot'
import { Btn, Legend, Readout, Seg, Slider, Stat, Toggle, seriesColor } from '../components/ui'
import { bestKmeans } from '../lib/cluster'
import { dbscan, kDistances, type PointType } from '../lib/d-cluster'
import { make2D, type Shape2D } from '../lib/datasets'
import { fmt, rng, type Pt } from '../lib/stats'

const ring = (c: Pt, r: number): Pt[] => Array.from({ length: 49 }, (_, i) => ({ x: c.x + r * Math.cos((i / 48) * Math.PI * 2), y: c.y + r * Math.sin((i / 48) * Math.PI * 2) }))

function useData(shape: Shape2D, noise: number) {
  return useMemo(() => {
    const base = make2D(shape, 220, 17, 0.06, 3).map(({ x, y }) => ({ x, y }))
    const r = rng(29)
    const extra = Array.from({ length: noise }, () => ({ x: 0.03 + r() * 0.94, y: 0.03 + r() * 0.94 }))
    return [...base, ...extra]
  }, [shape, noise])
}

function Mark({ p, type, label, r = 4.2 }: { p: Pt; type: PointType; label: number; r?: number }) {
  if (type === 'noise') return <Dot x={p.x} y={p.y} r={r * 0.85} shape={4} color="var(--ink-4)" ring={false} />
  const c = label < 8 ? seriesColor(label) : 'var(--ink-3)'
  return type === 'core' ? <Dot x={p.x} y={p.y} r={r} color={c} shape={label} /> : <Dot x={p.x} y={p.y} r={r} color={c} shape={label} fill={false} />
}

const DATASETS = [
  { v: 'moons' as Shape2D, label: 'Moons' },
  { v: 'circles' as Shape2D, label: 'Rings' },
  { v: 'blobs' as Shape2D, label: 'Blobs' },
  { v: 'varied' as Shape2D, label: 'Uneven blobs' },
]

function DbscanLab() {
  const [shape, setShape] = useState<Shape2D>('moons')
  const [noise, setNoise] = useState(15)
  const [eps, setEps] = useState(0.06)
  const [minPts, setMinPts] = useState(5)
  const [circles, setCircles] = useState(false)
  const [added, setAdded] = useState<Pt[]>([])
  const [hover, setHover] = useState<number | null>(null)
  const base = useData(shape, noise)
  const pts = useMemo(() => [...base, ...added], [base, added])
  const res = useMemo(() => dbscan(pts, eps, minPts), [pts, eps, minPts])
  const count = (t: PointType) => res.types.filter((x) => x === t).length
  const near = (e: Pt) => {
    let best = -1
    let bd = 0.02
    pts.forEach((p, i) => {
      const d = Math.hypot(p.x - e.x, p.y - e.y)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    return best
  }
  return (
    <Lab
      title="DBSCAN with two knobs: eps and MinPts"
      desc="Filled marks are core points, rings are border points, gray crosses are noise. Hover a point to see its eps-neighborhood. Click empty space to add a point."
      controls={
        <>
          <Seg label="Dataset" value={shape} onChange={(v) => { setShape(v); setAdded([]) }} options={DATASETS} />
          <Slider label="Random noise points" value={noise} min={0} max={40} onChange={setNoise} />
          <Slider label="eps (neighborhood radius)" value={eps} min={0.01} max={0.2} step={0.005} onChange={setEps} fmt={(v) => v.toFixed(3)} />
          <Slider label="MinPts (including the point)" value={minPts} min={2} max={15} onChange={setMinPts} />
          <Toggle on={circles} onChange={setCircles}>Draw eps circles around core points</Toggle>
          <Btn sm variant="ghost" onClick={() => setAdded([])} disabled={!added.length}>Remove added points</Btn>
        </>
      }
      notes={[
        'On Moons, DBSCAN finds both moons without being told how many clusters there are. Shrink eps until a moon breaks apart, then grow it until the moons merge.',
        'Raise MinPts: more points fail the core test, so borders and noise grow. Lower it to 2 and almost every point becomes core, so noise points form tiny clusters.',
        'Try Uneven blobs. One eps cannot fit a tight and a loose cluster at the same time. This is the main weakness that OPTICS addresses.',
        'Click a few times between two clusters to build a bridge of points and watch them merge.',
      ]}
    >
      <Plot
        w={480}
        h={480}
        x={[0, 1]}
        y={[0, 1]}
        axes={false}
        label="DBSCAN result with core, border and noise points"
        onDown={(e) => {
          if (near(e) < 0) setAdded((a) => [...a, { x: e.x, y: e.y }])
        }}
        onMove={(e) => {
          const i = near(e)
          setHover(i >= 0 ? i : null)
        }}
        onLeave={() => setHover(null)}
        cursor="crosshair"
      >
        {circles && pts.map((p, i) => (res.types[i] === 'core' ? <Line key={'c' + i} pts={ring(p, eps)} color={seriesColor(res.labels[i])} width={0.8} opacity={0.25} /> : null))}
        {pts.map((p, i) => (
          <Mark key={i} p={p} type={res.types[i]} label={res.labels[i]} />
        ))}
        {hover !== null && (
          <>
            <Line pts={ring(pts[hover], eps)} color="var(--ink)" width={1.5} dash="4 3" />
            <Tip x={pts[hover].x} y={pts[hover].y} lines={[res.types[hover], `neighbors incl. itself: ${res.counts[hover]}`, res.labels[hover] >= 0 ? `cluster ${res.labels[hover] + 1}` : 'no cluster']} />
          </>
        )}
      </Plot>
      <Legend
        items={[
          { label: 'core (filled)', color: 'var(--s1)', shape: 0 },
          { label: 'border (ring marks)', color: 'var(--ink-2)', shape: 0 },
          { label: 'noise', color: 'var(--ink-4)', shape: 4 },
        ]}
      />
      <Readout>
        <Stat k="Clusters" v={res.clusters} />
        <Stat k="Core" v={count('core')} />
        <Stat k="Border" v={count('border')} />
        <Stat k="Noise" v={count('noise')} />
      </Readout>
    </Lab>
  )
}

function CompareLab() {
  const [shape, setShape] = useState<Shape2D>('moons')
  const [eps, setEps] = useState(0.07)
  const [minPts, setMinPts] = useState(5)
  const [k, setK] = useState(2)
  const pts = useData(shape, 10)
  const db = useMemo(() => dbscan(pts, eps, minPts), [pts, eps, minPts])
  const km = useMemo(() => bestKmeans(pts, k, 4), [pts, k])
  return (
    <Lab
      title="Same data, DBSCAN vs k-means"
      desc="k-means splits space into convex regions around centroids. DBSCAN follows dense regions of any shape and leaves sparse points out."
      controls={
        <>
          <Seg label="Dataset" value={shape} onChange={setShape} options={DATASETS} />
          <Slider label="DBSCAN eps" value={eps} min={0.02} max={0.2} step={0.005} onChange={setEps} fmt={(v) => v.toFixed(3)} />
          <Slider label="DBSCAN MinPts" value={minPts} min={2} max={15} onChange={setMinPts} />
          <Slider label="k-means k" value={k} min={2} max={6} onChange={setK} />
        </>
      }
      notes={['On Rings, no k gives k-means the inner and outer ring. DBSCAN gets them with one setting.', 'On Blobs, both do well. k-means also assigns every noise point to some cluster, because it has no notion of noise.']}
    >
      <div className="grid c2">
        <div>
          <span className="label">DBSCAN: {db.clusters} clusters, {db.types.filter((t) => t === 'noise').length} noise</span>
          <Plot w={340} h={340} x={[0, 1]} y={[0, 1]} axes={false} label="DBSCAN result">
            {pts.map((p, i) => (
              <Mark key={i} p={p} type={db.types[i]} label={db.labels[i]} r={3.6} />
            ))}
          </Plot>
        </div>
        <div>
          <span className="label">k-means: k = {k}, SSE {fmt(km.sse, 2)}</span>
          <Plot w={340} h={340} x={[0, 1]} y={[0, 1]} axes={false} label="k-means result">
            {pts.map((p, i) => (
              <Dot key={i} x={p.x} y={p.y} r={3.6} color={seriesColor(km.labels[i])} shape={km.labels[i]} />
            ))}
            {km.cs.map((c, j) => (
              <Dot key={'c' + j} x={c.x} y={c.y} r={8} color="var(--surface)" stroke={seriesColor(j)} strokeWidth={2.5} shape={j} />
            ))}
          </Plot>
        </div>
      </div>
    </Lab>
  )
}

function KDistLab() {
  const [shape, setShape] = useState<Shape2D>('moons')
  const [minPts, setMinPts] = useState(5)
  const [eps, setEps] = useState(0.06)
  const pts = useData(shape, 15)
  const kd = useMemo(() => kDistances(pts, minPts - 1).sort((a, b) => b - a), [pts, minPts])
  const above = kd.filter((d) => d > eps).length
  const max = kd[0] ?? 1
  return (
    <Lab
      title="Picking eps with the sorted k-distance plot"
      desc={<>For every point, take the distance to its (MinPts - 1)th nearest other point and sort these values from largest to smallest. A point is core exactly when its value is at most eps.</>}
      controls={
        <>
          <Seg label="Dataset" value={shape} onChange={setShape} options={DATASETS} />
          <Slider label="MinPts" value={minPts} min={2} max={15} onChange={setMinPts} />
          <Slider label="eps" value={eps} min={0.01} max={0.2} step={0.005} onChange={setEps} fmt={(v) => v.toFixed(3)} />
        </>
      }
      notes={['The curve is flat for points inside clusters and shoots up for noise. Put eps at the knee where it starts to rise.', 'Points to the left of where the curve crosses the eps line are not core. Most of them become noise, a few become border points.']}
    >
      <Plot w={560} h={300} x={[0, kd.length]} y={[0, max * 1.05]} xLabel="points sorted by k-distance" yLabel={`distance to neighbor ${minPts - 1}`} label="Sorted k-distance plot" yFmt={(v) => fmt(v, 2)}>
        <Line pts={kd.map((d, i) => ({ x: i, y: d }))} color="var(--s1)" />
        <HLine y={eps} color="var(--s2)" dash="5 4" label={`eps = ${eps.toFixed(3)}`} />
      </Plot>
      <Readout>
        <Stat k="Points" v={kd.length} />
        <Stat k="Not core at this eps" v={above} />
        <Stat k="Core" v={kd.length - above} />
      </Readout>
    </Lab>
  )
}

const TINY: Pt[] = [
  { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 },
  { x: 6, y: 6 }, { x: 6, y: 7 }, { x: 7, y: 6 }, { x: 4.5, y: 4 },
]

function WorkedLab() {
  const [eps, setEps] = useState(1)
  const [minPts, setMinPts] = useState(3)
  const res = useMemo(() => dbscan(TINY, eps, minPts), [eps, minPts])
  const names = TINY.map((_, i) => `P${i + 1}`)
  const nbrs = TINY.map((p, i) => TINY.map((q, j) => (j !== i && Math.hypot(p.x - q.x, p.y - q.y) <= eps + 1e-9 ? names[j] : '')).filter(Boolean))
  return (
    <Lab
      title="Worked by hand: nine points"
      desc="Euclidean distance. MinPts counts the point itself. Change eps or MinPts and the classification table updates."
      controls={
        <>
          <Seg label="eps" value={eps} onChange={setEps} options={[{ v: 1, label: '1' }, { v: 1.5, label: '1.5' }, { v: 2, label: '2' }]} />
          <Seg label="MinPts" value={minPts} onChange={setMinPts} options={[3, 4, 5].map((v) => ({ v, label: String(v) }))} />
        </>
      }
      notes={['With eps = 1 and MinPts = 3: P1 to P4 are core, P5 is border (only P4 is nearby, but P4 is core). P6 is core and P7, P8 are its border points. P9 is noise.', 'With MinPts = 4 only P4 stays core. P2, P3 and P5 lie within eps of P4 and become border points. P1 is 1.414 from P4, so it becomes noise, and so do P6, P7 and P8.']}
    >
      <div className="grid c2">
        <Plot w={340} h={340} x={[0, 8]} y={[0, 8]} label="Nine points with eps circles" xTicks={8} yTicks={8}>
          {TINY.map((p, i) => (
            <Line key={'r' + i} pts={ring(p, eps)} color="var(--ink-4)" width={0.8} opacity={0.5} />
          ))}
          {TINY.map((p, i) => (
            <Mark key={i} p={p} type={res.types[i]} label={res.labels[i]} r={6} />
          ))}
          {TINY.map((p, i) => (
            <Label key={'l' + i} x={p.x} y={p.y} dx={9} dy={-7}>{names[i]}</Label>
          ))}
        </Plot>
        <Table
          head={['Point', 'Neighbors within eps', 'Count', 'Type', 'Cluster']}
          num={[2]}
          rows={TINY.map((_, i) => [names[i], nbrs[i].join(', ') || 'none', res.counts[i], res.types[i], res.labels[i] >= 0 ? `C${res.labels[i] + 1}` : '-'])}
        />
      </div>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader group="Clustering" title="Density-based clustering" lede="DBSCAN grows clusters through crowded regions and stops where the crowd thins out. It finds clusters of any shape, decides the number of clusters itself, and labels the leftovers as noise." minutes={25} />

      <Plain>
        <p>
          Picture a festival seen from above. Wherever people stand close together you see a crowd, whatever its shape: a line at a food stall, a circle around a stage. Someone standing alone in the field belongs to no crowd. DBSCAN finds crowds the same way: a point is in a crowd if enough others are within arm's reach.
        </p>
        <p>
          Arm's reach is <strong>eps</strong> (the radius). Enough others is <strong>MinPts</strong> (the minimum number of points in the neighborhood).
        </p>
      </Plain>

      <Section id="defs" title="The definitions" kicker="Vocabulary">
        <Formula title="Neighborhood and core point">
          <MB>{'N_{eps}(p) = \\{\\, q \\in D \\mid d(p, q) \\le eps \\,\\}, \\qquad p \\text{ is core} \\iff |N_{eps}(p)| \\ge MinPts'}</MB>
        </Formula>
        <ul>
          <li><strong>Core point</strong>: at least MinPts points (itself included) within eps.</li>
          <li><strong>Border point</strong>: not core, but inside the eps-neighborhood of some core point.</li>
          <li><strong>Noise</strong>: neither core nor border.</li>
          <li><strong>Directly density-reachable</strong>: q is directly reachable from p if p is core and q is in <M>{'N_{eps}(p)'}</M>. Not symmetric: a border point is reachable from a core point, not the other way round.</li>
          <li><strong>Density-reachable</strong>: there is a chain <M>{'p = p_1, p_2, \\dots, p_n = q'}</M> where each next point is directly reachable from the previous one.</li>
          <li><strong>Density-connected</strong>: p and q are both density-reachable from some point o. This one is symmetric.</li>
          <li>A <strong>cluster</strong> is a maximal set of density-connected points.</li>
        </ul>
        <Formula title="The algorithm">
          <ol style={{ marginBottom: 0 }}>
            <li>Pick an unvisited point p and find its eps-neighborhood.</li>
            <li>If p is core, start a new cluster and keep adding every point density-reachable from p (expand through core points only).</li>
            <li>If p is not core, mark it as noise for now. It can still become a border point of a later cluster.</li>
            <li>Repeat until every point is visited.</li>
          </ol>
        </Formula>
      </Section>
      <DbscanLab />

      <Section id="vs" title="Why not just k-means?" kicker="Comparison">
        <Table
          head={['', 'k-means', 'DBSCAN']}
          rows={[
            ['Number of clusters', 'You give k', 'Found by the algorithm'],
            ['Cluster shape', 'Convex, roughly round', 'Any shape'],
            ['Noise', 'Every point is assigned', 'Marked as noise'],
            ['Parameters', 'k', 'eps and MinPts'],
            ['Varying density', 'Not the main problem', 'Hard: one eps for all'],
            ['Cost', <M>{'O(nkt)'}</M>, <><M>{'O(n \\log n)'}</M> with a spatial index, <M>{'O(n^2)'}</M> without</>],
          ]}
        />
      </Section>
      <CompareLab />

      <Section id="eps" title="Choosing the parameters" kicker="Heuristic">
        <p>
          Fix MinPts first (a common default is twice the number of dimensions, so 4 for 2D data). Then sort the distance from every point to its <M>{'(MinPts - 1)'}</M>th nearest neighbor and look for the knee.
        </p>
      </Section>
      <KDistLab />

      <Section id="optics" title="OPTICS in brief" kicker="Varying density">
        <p>
          OPTICS does not output one clustering. It outputs an <strong>ordering</strong> of the points together with each point's reachability distance. Plotting reachability in that order gives valleys for clusters. Cutting the plot at different heights gives the DBSCAN result for different eps values, so clusters of different density show up in one run.
        </p>
      </Section>

      <Section id="worked" title="Worked example" kicker="Exam style">
        <p>Exams give a few coordinates with eps and MinPts and ask you to label each point core, border or noise, then list the clusters. Count the point itself in its own neighborhood unless the question says otherwise.</p>
      </Section>
      <WorkedLab />

      <Trap>
        <ul>
          <li>Check whether MinPts includes the point itself. Off by one changes which points are core.</li>
          <li>A border point does not expand the cluster. Only core points pass reachability on.</li>
          <li>A border point near two clusters can be assigned to either; the result can depend on processing order.</li>
          <li>Directly density-reachable is not symmetric. Density-connected is.</li>
        </ul>
      </Trap>

      <Section id="check" title="Check yourself">
        <Check q="A point has 2 neighbors within eps and MinPts = 4. Is it noise?">
          It is not core (3 points including itself, fewer than 4). It is a border point if one of its neighbors is core, and noise otherwise.
        </Check>
        <Check q="What happens when eps is huge?">
          Every point is core and everything is density-connected, so you get one cluster and no noise.
        </Check>
        <Check q="Why can DBSCAN find ring-shaped clusters while k-means cannot?">
          DBSCAN chains through neighborhoods, so a cluster can bend around. k-means assigns each point to its nearest centroid, which always cuts space into convex pieces.
        </Check>
        <Check q="Two clusters have very different densities. What goes wrong?">
          An eps small enough to separate the dense cluster marks most of the sparse one as noise; an eps large enough for the sparse one merges dense clusters. OPTICS handles this better.
        </Check>
      </Section>
    </>
  )
}
