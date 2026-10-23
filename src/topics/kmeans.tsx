import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Heat, Line, Plot, Tip, VLine, nearestIndex, scales } from '../components/Plot'
import { Btn, Legend, Readout, Seg, Slider, Stat, Toggle, SERIES_HEX, seriesColor } from '../components/ui'
import { assign, bestKmeans, initPlusPlus, initRandom, kmeans, kmedoids, silhouette, sse, update } from '../lib/cluster'
import { SHAPES, make2D, type Shape2D } from '../lib/datasets'
import { dist, fmt, type Pt } from '../lib/stats'

const W = 560
const H = 420

function StepLab() {
  const [shape, setShape] = useState<Shape2D>('blobs')
  const [k, setK] = useState(3)
  const [seed, setSeed] = useState(4)
  const [init, setInit] = useState<'random' | 'plus' | 'manual'>('random')
  const [regions, setRegions] = useState(true)
  const pts = useMemo(() => make2D(shape, 180, 11, 0.06, 3).map(({ x, y }) => ({ x, y })), [shape])
  const [cs, setCs] = useState<Pt[]>(() => initRandom(pts, 3, 4))
  const [labels, setLabels] = useState<number[] | null>(null)
  const [phase, setPhase] = useState<'assign' | 'update'>('assign')
  const [history, setHistory] = useState<number[]>([])
  const [trail, setTrail] = useState<Pt[][]>(() => initRandom(pts, 3, 4).map((p) => [p]))
  const [hover, setHover] = useState<number | null>(null)

  const reset = (nextInit = init, nextK = k, nextSeed = seed, nextPts = pts) => {
    const c = nextInit === 'plus' ? initPlusPlus(nextPts, nextK, nextSeed) : nextInit === 'random' ? initRandom(nextPts, nextK, nextSeed) : []
    setCs(c)
    setLabels(null)
    setPhase('assign')
    setHistory([])
    setTrail(c.map((p) => [p]))
  }

  const converged = labels !== null && phase === 'assign' && history.length > 1 && history[history.length - 1] === history[history.length - 2]

  const step = () => {
    if (cs.length === 0) return
    if (phase === 'assign') {
      const l = assign(pts, cs)
      setLabels(l)
      setHistory((h) => [...h, sse(pts, l, cs)])
      setPhase('update')
    } else if (labels) {
      const next = update(pts, labels, cs)
      setCs(next)
      setTrail((t) => next.map((p, j) => [...(t[j] ?? []), p]))
      setHistory((h) => [...h, sse(pts, labels, next)])
      setPhase('assign')
    }
  }

  const run = () => {
    if (cs.length === 0) return
    let c = cs
    let l = labels ?? assign(pts, c)
    const h = [...history, sse(pts, l, c)]
    const t = trail.length ? trail.map((x) => [...x]) : c.map((p) => [p])
    for (let it = 0; it < 100; it++) {
      const nc = update(pts, l, c)
      nc.forEach((p, j) => t[j]?.push(p))
      const nl = assign(pts, nc)
      c = nc
      h.push(sse(pts, nl, c))
      const same = nl.every((v, i) => v === l[i])
      l = nl
      if (same) break
    }
    setCs(c)
    setLabels(l)
    setHistory(h)
    setTrail(t)
    setPhase('update')
  }

  const sc = scales(W, H, [0, 1], [0, 1], undefined, true)
  const regionFn = useMemo(
    () => (x: number, y: number) => {
      if (!cs.length) return null
      let b = 0
      let bd = Infinity
      cs.forEach((c, j) => {
        const d = (c.x - x) ** 2 + (c.y - y) ** 2
        if (d < bd) {
          bd = d
          b = j
        }
      })
      return { color: SERIES_HEX[b % 8], opacity: 0.09 }
    },
    [cs],
  )

  const cur = labels && cs.length ? sse(pts, labels, cs) : null

  return (
    <Lab
      title="k-means, one step at a time"
      desc="Each click alternates the two moves of k-means: assign every point to its nearest centroid, then move each centroid to the mean of its points."
      controls={
        <>
          <Seg label="Dataset" value={shape} onChange={(v) => { setShape(v); const np = make2D(v, 180, 11, 0.06, 3).map(({ x, y }) => ({ x, y })); reset(init, k, seed, np) }} options={SHAPES.filter((s) => s.id !== 'lines').map((s) => ({ v: s.id, label: s.name }))} />
          <Slider label="k (number of clusters)" value={k} min={1} max={8} onChange={(v) => { setK(v); reset(init, v) }} />
          <Seg label="Initial centroids" value={init} onChange={(v) => { setInit(v); reset(v) }} options={[{ v: 'random', label: 'Random' }, { v: 'plus', label: 'k-means++' }, { v: 'manual', label: 'Click to place' }]} />
          <div className="row">
            <Btn variant="primary" onClick={step} disabled={!cs.length || converged}>
              {phase === 'assign' ? 'Assign points' : 'Move centroids'}
            </Btn>
            <Btn onClick={run} disabled={!cs.length}>Run to the end</Btn>
          </div>
          <div className="row">
            <Btn sm onClick={() => reset()}>Reset</Btn>
            <Btn sm variant="ghost" onClick={() => { const s = seed + 1; setSeed(s); reset(init, k, s) }} disabled={init === 'manual'}>New random start</Btn>
          </div>
          <Toggle on={regions} onChange={setRegions}>Show nearest-centroid regions</Toggle>
        </>
      }
      notes={[
        'Press "New random start" a few times with random initialization on Uneven blobs. Different starts can end in different final SSE values: k-means only finds a local minimum.',
        'Switch to k-means++. It spreads the first centroids apart, so bad starts become much rarer.',
        'Try Moons or Rings with k = 2. k-means draws straight borders between centroids, so it cannot follow curved shapes. Compare with DBSCAN later.',
        'Choose "Click to place" and put all centroids in one corner. Watch how many steps it takes to recover.',
      ]}
    >
      <Plot
        w={W}
        h={H}
        x={[0, 1]}
        y={[0, 1]}
        label="Scatter plot of points colored by cluster with centroids"
        cursor={init === 'manual' && cs.length < k ? 'crosshair' : undefined}
        onDown={(p) => {
          if (init === 'manual' && cs.length < k) {
            setCs((c) => [...c, { x: p.x, y: p.y }])
            setTrail((t) => [...t, [{ x: p.x, y: p.y }]])
          }
        }}
        onMove={(p) => setHover(nearestIndex(pts, p, sc) >= 0 ? nearestIndex(pts, p, sc) : null)}
        onLeave={() => setHover(null)}
      >
        {regions && cs.length > 0 && <Heat res={56} fn={regionFn} />}
        {pts.map((p, i) => (
          <Dot key={i} x={p.x} y={p.y} r={4} color={labels ? seriesColor(labels[i]) : 'var(--ink-3)'} shape={labels ? labels[i] : 0} opacity={0.9} />
        ))}
        {trail.map((t, j) => (
          <Line key={'t' + j} pts={t} color={seriesColor(j)} width={1.5} dash="3 3" />
        ))}
        {cs.map((c, j) => (
          <g key={'c' + j}>
            <Dot x={c.x} y={c.y} r={9} color="var(--surface)" stroke={seriesColor(j)} strokeWidth={3} shape={j} />
          </g>
        ))}
        {hover !== null && labels && (
          <Tip x={pts[hover].x} y={pts[hover].y} lines={[`cluster ${labels[hover] + 1}`, `distance to centroid ${fmt(dist(pts[hover], cs[labels[hover]]), 3)}`]} />
        )}
      </Plot>
      {cs.length > 0 && <Legend items={cs.map((_, j) => ({ label: `Cluster ${j + 1}`, color: seriesColor(j), shape: j }))} />}
      <Readout>
        <Stat k="Iteration" v={Math.floor(history.length / 2)} />
        <Stat k="SSE" v={cur === null ? '-' : fmt(cur, 3)} sub="sum of squared distances" />
        <Stat k="Next move" v={converged ? 'Converged' : cs.length < k && init === 'manual' ? `Place ${k - cs.length}` : phase === 'assign' ? 'Assign' : 'Update'} />
      </Readout>
      {history.length > 1 && <SseChart history={history} />}
    </Lab>
  )
}

function SseChart({ history }: { history: number[] }) {
  const max = Math.max(...history)
  return (
    <div style={{ marginTop: 12 }}>
      <span className="label">SSE after every move</span>
      <Plot w={560} h={150} x={[0, Math.max(1, history.length - 1)]} y={[0, max * 1.1]} xTicks={6} yTicks={3} label="SSE decreasing over steps" yFmt={(v) => fmt(v, 1)}>
        <Line pts={history.map((v, i) => ({ x: i, y: v }))} color="var(--s1)" />
        {history.map((v, i) => (
          <Dot key={i} x={i} y={v} r={3} color="var(--s1)" />
        ))}
      </Plot>
    </div>
  )
}

function ElbowLab() {
  const [shape, setShape] = useState<Shape2D>('blobs')
  const [clusters, setClusters] = useState(4)
  const [k, setK] = useState(4)
  const pts = useMemo(() => make2D(shape, 200, 21, 0.06, clusters).map(({ x, y }) => ({ x, y })), [shape, clusters])
  const curve = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const r = bestKmeans(pts, i + 1, 4)
        return { k: i + 1, sse: r.sse, sil: i === 0 ? 0 : silhouette(pts, r.labels).mean, labels: r.labels }
      }),
    [pts],
  )
  const sel = curve[k - 1]
  const maxS = Math.max(...curve.map((c) => c.sse))
  return (
    <Lab
      title="Choosing k: elbow and silhouette"
      desc="k-means needs k up front. Run it for k = 1 to 9 and look for the bend where adding a cluster stops paying off."
      controls={
        <>
          <Seg label="Dataset" value={shape} onChange={setShape} options={[{ v: 'blobs', label: 'Blobs' }, { v: 'varied', label: 'Uneven' }, { v: 'uniform', label: 'No structure' }]} />
          <Slider label="True number of groups" value={clusters} min={2} max={6} onChange={setClusters} />
          <Slider label="Selected k" value={k} min={1} max={9} onChange={setK} />
        </>
      }
      notes={[
        'SSE always goes down as k grows (with k = n it reaches 0), so you never pick the k with the smallest SSE. You pick the elbow.',
        'Silhouette peaks near the true number of groups. On "No structure" there is no clear elbow and silhouette stays low, which is the honest answer.',
      ]}
    >
      <div className="grid c2">
        <div>
          <span className="label">SSE vs k</span>
          <Plot w={360} h={240} x={[1, 9]} y={[0, maxS * 1.05]} xLabel="k" xTicks={8} yTicks={4} label="SSE by number of clusters" yFmt={(v) => fmt(v, 1)}>
            <VLine x={k} color="var(--ink-4)" />
            <Line pts={curve.map((c) => ({ x: c.k, y: c.sse }))} color="var(--s1)" />
            {curve.map((c) => (
              <Dot key={c.k} x={c.k} y={c.sse} r={c.k === k ? 6 : 3.5} color="var(--s1)" />
            ))}
          </Plot>
        </div>
        <div>
          <span className="label">Mean silhouette vs k</span>
          <Plot w={360} h={240} x={[1, 9]} y={[0, 1]} xLabel="k" xTicks={8} yTicks={4} label="Silhouette by number of clusters">
            <VLine x={k} color="var(--ink-4)" />
            <Line pts={curve.slice(1).map((c) => ({ x: c.k, y: c.sil }))} color="var(--s3)" />
            {curve.slice(1).map((c) => (
              <Dot key={c.k} x={c.k} y={c.sil} r={c.k === k ? 6 : 3.5} color="var(--s3)" />
            ))}
          </Plot>
        </div>
      </div>
      <Plot w={W} h={300} x={[0, 1]} y={[0, 1]} axes={false} grid={false} label="Clustering for the selected k">
        {pts.map((p, i) => (
          <Dot key={i} x={p.x} y={p.y} r={3.6} color={seriesColor(sel.labels[i])} shape={sel.labels[i]} />
        ))}
      </Plot>
      <Readout>
        <Stat k="k" v={k} />
        <Stat k="SSE" v={fmt(sel.sse, 3)} />
        <Stat k="Silhouette" v={k === 1 ? 'n/a' : fmt(sel.sil, 3)} sub="-1 bad, 1 great" />
      </Readout>
    </Lab>
  )
}

function MedoidLab() {
  const base = useMemo(() => make2D('blobs', 60, 5, 0.05, 2).map(({ x, y }) => ({ x, y })), [])
  const [out, setOut] = useState<Pt>({ x: 0.95, y: 0.08 })
  const [drag, setDrag] = useState(false)
  const pts = useMemo(() => [...base, out], [base, out])
  const km = useMemo(() => kmeans(pts, 2, 3), [pts])
  const kd = useMemo(() => kmedoids(pts, 2, 2), [pts])
  return (
    <Lab
      title="Drag an outlier: means move, medoids stay"
      desc="Both methods split the same points into 2 groups. Drag the far-away point and compare where the centers go."
      notes={['A mean is pulled toward every point it averages, including outliers. A medoid must be an actual data point, chosen to minimize total distance, so one stray point barely moves it.', 'The price: k-medoids (PAM) tries many swaps, so it is much slower on large data.']}
    >
      <Plot
        w={W}
        h={360}
        x={[0, 1]}
        y={[0, 1]}
        label="Points with k-means centroids and k-medoids medoids"
        cursor={drag ? 'grabbing' : 'grab'}
        onDown={(p) => {
          if (Math.hypot(p.x - out.x, p.y - out.y) < 0.06) setDrag(true)
        }}
        onMove={(p) => drag && setOut({ x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) })}
        onUp={() => setDrag(false)}
      >
        {pts.map((p, i) => (
          <Dot key={i} x={p.x} y={p.y} r={i === pts.length - 1 ? 7 : 4} color={seriesColor(km.labels[i])} shape={km.labels[i]} />
        ))}
        {km.cs.map((c, j) => (
          <Dot key={'m' + j} x={c.x} y={c.y} r={10} shape={4} color="var(--ink)" />
        ))}
        {kd.cs.map((c, j) => (
          <Dot key={'d' + j} x={c.x} y={c.y} r={11} shape={0} fill={false} color="var(--s3)" />
        ))}
      </Plot>
      <Legend
        items={[
          { label: 'k-means centroid (mean)', color: 'var(--ink)', shape: 4 },
          { label: 'k-medoids medoid (ring)', color: 'var(--s3)', shape: 0 },
        ]}
      />
      <Readout>
        <Stat k="k-means SSE" v={fmt(km.sse, 3)} />
        <Stat k="k-medoids cost" v={fmt(kd.cost, 3)} sub="sum of distances" />
      </Readout>
    </Lab>
  )
}

function OneDLab() {
  const data = [2, 4, 10, 12, 3, 20, 30, 11, 25]
  const [m1, setM1] = useState(2)
  const [m2, setM2] = useState(4)
  const rows = useMemo(() => {
    const out: { it: number; a: number[]; b: number[]; m1: number; m2: number }[] = []
    let c1 = m1
    let c2 = m2
    for (let it = 1; it <= 8; it++) {
      const a = data.filter((v) => Math.abs(v - c1) <= Math.abs(v - c2))
      const b = data.filter((v) => Math.abs(v - c1) > Math.abs(v - c2))
      const n1 = a.length ? a.reduce((s, v) => s + v, 0) / a.length : c1
      const n2 = b.length ? b.reduce((s, v) => s + v, 0) / b.length : c2
      out.push({ it, a, b, m1: n1, m2: n2 })
      if (n1 === c1 && n2 === c2) break
      c1 = n1
      c2 = n2
    }
    return out
  }, [m1, m2])
  return (
    <Lab
      title="Worked by hand: k = 2 on one attribute"
      desc={<>Data: {'{'}2, 4, 10, 12, 3, 20, 30, 11, 25{'}'}. Pick the two starting means and the table redoes every iteration.</>}
      controls={
        <>
          <Slider label="Start mean 1" value={m1} min={0} max={30} onChange={setM1} />
          <Slider label="Start mean 2" value={m2} min={0} max={30} onChange={setM2} />
        </>
      }
      notes={['Ties go to cluster 1 here. In an exam, state how you break ties.', 'Start with means 2 and 4: it converges to {2, 3, 4, 10, 11, 12} and {20, 25, 30}. Try 25 and 30 instead.']}
    >
      <Table
        head={['Iteration', 'Cluster 1', 'Cluster 2', 'New mean 1', 'New mean 2']}
        num={[0, 3, 4]}
        rows={rows.map((r) => [r.it, `{${[...r.a].sort((x, y) => x - y).join(', ')}}`, `{${[...r.b].sort((x, y) => x - y).join(', ')}}`, fmt(r.m1, 2), fmt(r.m2, 2)])}
      />
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader group="Clustering" title="k-means and k-medoids" lede="Partitioning methods split n objects into exactly k groups. k-means is the most used clustering algorithm in practice, and it fits in two sentences." minutes={25} />

      <Plain>
        <p>
          Imagine placing k flags on a map, then telling every house to join the nearest flag. Now move each flag to the middle of its houses. Repeat until nobody changes flag. That is k-means.
        </p>
      </Plain>

      <Section id="algorithm" title="The algorithm" kicker="How it works">
        <ol>
          <li>Pick k initial centroids (randomly, or with k-means++).</li>
          <li><strong>Assign</strong>: put every object in the cluster of its nearest centroid.</li>
          <li><strong>Update</strong>: recompute each centroid as the mean of the objects assigned to it.</li>
          <li>Repeat 2 and 3 until no assignment changes (or the centroids stop moving).</li>
        </ol>
        <Formula title="What k-means minimizes">
          <MB>{'SSE = \\sum_{j=1}^{k} \\sum_{x \\in C_j} \\lVert x - m_j \\rVert^2'}</MB>
          <p>
            <M>{'m_j'}</M> is the mean of cluster <M>{'C_j'}</M>. Both steps can only lower SSE, so the loop always stops, but at a <strong>local</strong> minimum that depends on the start.
          </p>
        </Formula>
      </Section>

      <StepLab />

      <Section id="by-hand" title="Doing it by hand" kicker="Exam style">
        <p>Exams like small one-dimensional examples where you write out each iteration. Use the table below to check your own working.</p>
      </Section>
      <OneDLab />

      <Section id="choosing-k" title="How to choose k" kicker="Model selection">
        <p>
          SSE can be driven to zero by giving every point its own cluster, so it cannot pick k on its own. Two common tools: the <strong>elbow method</strong> (plot SSE against k and look for the bend) and the <strong>silhouette coefficient</strong>.
        </p>
        <Formula title="Silhouette of one object">
          <MB>{'s(i) = \\frac{b(i) - a(i)}{\\max\\{a(i), b(i)\\}}'}</MB>
          <p>
            <M>{'a(i)'}</M>: average distance to the other members of its own cluster (tightness). <M>{'b(i)'}</M>: smallest average distance to the members of another cluster (separation). Close to 1 is good, near 0 means it sits on a border, negative means it is probably in the wrong cluster.
          </p>
        </Formula>
      </Section>
      <ElbowLab />

      <Section id="medoids" title="k-medoids (PAM)" kicker="Robust variant">
        <p>
          k-medoids uses a real data object as each cluster center (the <strong>medoid</strong>) and minimizes the sum of distances instead of squared distances. PAM starts with k medoids, then keeps swapping a medoid with a non-medoid whenever the swap lowers the total cost.
        </p>
      </Section>
      <MedoidLab />

      <Section id="compare" title="Strengths and weaknesses" kicker="Know these cold">
        <Table
          head={['', 'k-means', 'k-medoids (PAM)']}
          rows={[
            ['Center', 'Mean (may not be a data point)', 'Medoid (always a data point)'],
            ['Objective', 'Sum of squared distances', 'Sum of distances'],
            ['Outliers', 'Sensitive', 'Robust'],
            ['Cost per iteration', <M>{'O(nkd)'}</M>, <M>{'O(k(n-k)^2)'}</M>],
            ['Data types', 'Needs a mean, so numeric', 'Any distance, works for categorical too'],
            ['Shapes found', 'Convex, similar-size blobs', 'Same limitation'],
          ]}
        />
        <Trap>
          <ul>
            <li>k-means converges, but only to a local optimum. Run it several times with different starts and keep the lowest SSE.</li>
            <li>You must give k. It is an input, not a result.</li>
            <li>Scale your attributes first. An attribute measured in thousands will dominate the distance.</li>
            <li>The mean of nominal data is undefined. Use k-modes or k-medoids for categorical attributes.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="Why does SSE never increase during k-means?">
          The assign step gives each point its nearest centroid, which cannot raise its squared distance. The update step moves each centroid to the mean, which is exactly the point that minimizes the sum of squared distances to its members. Neither step can increase SSE.
        </Check>
        <Check q="You get SSE 4.1 on one run and 3.2 on another with the same k. What happened?">
          Different initial centroids led to different local minima. Keep the 3.2 run, or use k-means++ and several restarts.
        </Check>
        <Check q="When is k-medoids the better choice?">
          When there are outliers, when attributes are categorical or only a dissimilarity matrix is available, and when n is small enough that the extra cost is fine.
        </Check>
      </Section>
    </>
  )
}
