import { useMemo, useState } from 'react'
import { Section, Table, TopicHeader } from '../components/Content'
import { Lab } from '../components/Lab'
import { Dot, Heat, Plot, Tip, nearestIndex, scales } from '../components/Plot'
import { Btn, Legend, Readout, Seg, Slider, Stat, SERIES_HEX, seriesColor } from '../components/ui'
import { bestKmeans, kmedoids, silhouette } from '../lib/cluster'
import { IRIS, IRIS_CLASSES, IRIS_COLUMNS, SHAPES, addOutliers, make2D, type Shape2D } from '../lib/datasets'
import { agglomerative, dbscan, knnPredict, parseCsv, scale, type Linkage, type Scaling } from '../lib/e-cluster'
import { fmt, type Pt } from '../lib/stats'

type Source = 'gen' | 'iris' | 'csv'
type Algo = 'kmeans' | 'kmedoids' | 'dbscan' | 'agglo' | 'knn'
type LP = Pt & { label: number }

const SAMPLE = `hours_online,songs_skipped,listener
1.0,2,casual
1.5,3,casual
2.0,2,casual
1.2,4,casual
2.4,3,casual
6.0,12,explorer
6.5,15,explorer
7.2,13,explorer
5.8,16,explorer
6.9,11,explorer
3.5,25,skipper
4.0,28,skipper
3.2,30,skipper
4.4,26,skipper
3.8,31,skipper`

const MAX_MEDOIDS = 300
const MAX_AGGLO = 400

const colorFor = (l: number) => (l < 0 ? 'var(--ink-4)' : l < 8 ? seriesColor(l) : 'var(--ink-2)')
const shapeFor = (l: number) => (l < 0 ? 4 : l % 8)

function useData() {
  const [source, setSource] = useState<Source>('gen')
  const [shape, setShape] = useState<Shape2D>('blobs')
  const [n, setN] = useState(200)
  const [noise, setNoise] = useState(0.06)
  const [outliers, setOutliers] = useState(0)
  const [seed, setSeed] = useState(7)
  const [fx, setFx] = useState(2)
  const [fy, setFy] = useState(3)
  const [csv, setCsv] = useState(SAMPLE)
  const [scaling, setScaling] = useState<Scaling>('none')
  const parsed = useMemo(() => parseCsv(csv), [csv])
  const raw: LP[] = useMemo(() => {
    if (source === 'iris') return IRIS.map((r) => ({ x: r.f[fx], y: r.f[fy], label: r.label }))
    if (source === 'csv') return parsed.pts
    return addOutliers(make2D(shape, n, seed, noise, 3), outliers, seed + 1)
  }, [source, shape, n, noise, outliers, seed, fx, fy, parsed])
  const pts = useMemo(() => scale(raw, scaling), [raw, scaling])
  const names =
    source === 'iris' ? [IRIS_COLUMNS[fx], IRIS_COLUMNS[fy]] : source === 'csv' ? [parsed.xName, parsed.yName] : ['feature 1', 'feature 2']
  const classes = source === 'iris' ? IRIS_CLASSES : source === 'csv' ? parsed.classes : ['group 1', 'group 2', 'group 3', 'group 4', 'group 5', 'group 6']
  const sig = `${source}|${shape}|${n}|${noise}|${outliers}|${seed}|${fx}|${fy}|${csv.length}|${scaling}`
  return {
    source, setSource, shape, setShape, n, setN, noise, setNoise, outliers, setOutliers, seed, setSeed, fx, setFx, fy, setFy, csv, setCsv, scaling, setScaling, parsed, raw, pts, names, classes, sig,
  }
}

function bounds(pts: Pt[]) {
  if (!pts.length) return { x: [0, 1] as [number, number], y: [0, 1] as [number, number], span: 1 }
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const px = (x1 - x0 || 1) * 0.07
  const py = (y1 - y0 || 1) * 0.07
  return { x: [x0 - px, x1 + px] as [number, number], y: [y0 - py, y1 + py] as [number, number], span: Math.max(x1 - x0, y1 - y0) || 1 }
}

function clusterStats(pts: Pt[], labels: number[]) {
  const ids = [...new Set(labels)].filter((l) => l >= 0).sort((a, b) => a - b)
  const sizes = ids.map((id) => labels.filter((l) => l === id).length)
  let sse = 0
  ids.forEach((id) => {
    const mine = pts.filter((_, i) => labels[i] === id)
    const mx = mine.reduce((s, p) => s + p.x, 0) / mine.length
    const my = mine.reduce((s, p) => s + p.y, 0) / mine.length
    mine.forEach((p) => (sse += (p.x - mx) ** 2 + (p.y - my) ** 2))
  })
  const sil = pts.length <= 500 && ids.length > 1 ? silhouette(pts, labels).mean : NaN
  return { ids, sizes, sse, sil, noise: labels.filter((l) => l < 0).length }
}

function download(rows: string[][], name: string) {
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function DataControls({ d }: { d: ReturnType<typeof useData> }) {
  return (
    <>
      <Seg label="Data source" value={d.source} onChange={d.setSource} options={[{ v: 'gen', label: 'Generated' }, { v: 'iris', label: 'Iris' }, { v: 'csv', label: 'Your CSV' }]} />
      {d.source === 'gen' && (
        <>
          <Seg label="Shape" value={d.shape} onChange={d.setShape} options={SHAPES.map((s) => ({ v: s.id, label: s.name }))} />
          <Slider label="Points" value={d.n} min={60} max={400} step={20} onChange={d.setN} />
          <Slider label="Noise" value={d.noise} min={0} max={0.2} step={0.01} fmt={(v) => v.toFixed(2)} onChange={d.setNoise} />
          <Slider label="Extra outliers" value={d.outliers} min={0} max={20} onChange={d.setOutliers} />
          <Btn sm onClick={() => d.setSeed(d.seed + 1)}>New random sample</Btn>
        </>
      )}
      {d.source === 'iris' && (
        <>
          <label className="ctl">
            <span className="ctl-head">x axis</span>
            <select className="input" value={d.fx} onChange={(e) => d.setFx(Number(e.target.value))}>
              {IRIS_COLUMNS.map((c, i) => (
                <option key={c} value={i}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="ctl">
            <span className="ctl-head">y axis</span>
            <select className="input" value={d.fy} onChange={(e) => d.setFy(Number(e.target.value))}>
              {IRIS_COLUMNS.map((c, i) => (
                <option key={c} value={i}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {d.source === 'csv' && (
        <div className="ctl">
          <span className="ctl-head">Paste CSV (first two numeric columns are used, a text column becomes the class)</span>
          <textarea className="input" rows={7} value={d.csv} spellCheck={false} onChange={(e) => d.setCsv(e.target.value)} aria-label="CSV data" />
          <input
            type="file"
            accept=".csv,.txt,text/csv"
            className="input"
            aria-label="Upload a CSV file"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) f.text().then((t) => d.setCsv(t))
            }}
          />
          {d.parsed.error && <span style={{ color: 'var(--bad)', fontSize: 13 }}>{d.parsed.error}</span>}
        </div>
      )}
      <Seg label="Scaling" value={d.scaling} onChange={d.setScaling} options={[{ v: 'none', label: 'None' }, { v: 'minmax', label: 'Min-max' }, { v: 'z', label: 'z-score' }]} />
    </>
  )
}

function Bench({ d }: { d: ReturnType<typeof useData> }) {
  const [algo, setAlgo] = useState<Algo>('kmeans')
  const [k, setK] = useState(3)
  const [epsF, setEpsF] = useState(0.06)
  const [minPts, setMinPts] = useState(5)
  const [link, setLink] = useState<Linkage>('single')
  const [kk, setKk] = useState(5)
  const [brush, setBrush] = useState(0)
  const [added, setAdded] = useState<{ sig: string; pts: LP[] }>({ sig: '', pts: [] })
  const [hover, setHover] = useState<number | null>(null)
  const pts = d.pts
  const b = bounds(pts)
  const eps = epsF * b.span
  const extra = added.sig === d.sig ? added.pts : []

  const res = useMemo(() => {
    if (!pts.length) return null
    if (algo === 'kmeans') {
      const r = bestKmeans(pts, Math.min(k, pts.length), 5)
      return { labels: r.labels, centers: r.cs, core: null as boolean[] | null, tooBig: false }
    }
    if (algo === 'kmedoids') {
      if (pts.length > MAX_MEDOIDS) return { labels: pts.map(() => -1), centers: [], core: null, tooBig: true }
      const r = kmedoids(pts, Math.min(k, pts.length), 1)
      return { labels: r.labels, centers: r.cs, core: null, tooBig: false }
    }
    if (algo === 'dbscan') {
      const r = dbscan(pts, eps, minPts)
      return { labels: r.labels, centers: [], core: r.core, tooBig: false }
    }
    if (algo === 'agglo') {
      if (pts.length > MAX_AGGLO) return { labels: pts.map(() => -1), centers: [], core: null, tooBig: true }
      return { labels: agglomerative(pts, Math.min(k, pts.length), link), centers: [], core: null, tooBig: false }
    }
    return null
  }, [pts, algo, k, eps, minPts, link])

  const train: LP[] = useMemo(() => [...pts.map((p, i) => ({ ...p, label: d.raw[i]?.label ?? 0 })).filter((p) => p.label >= 0), ...extra], [pts, d.raw, extra])
  const knn = useMemo(() => {
    if (algo !== 'knn' || train.length < 2) return null
    const loo = train.map((p, i) => knnPredict(train.filter((_, j) => j !== i), p, kk).label)
    const correct = loo.filter((l, i) => l === train[i].label).length
    return { loo, acc: correct / train.length }
  }, [algo, train, kk])
  const heat = useMemo(
    () => (x: number, y: number) => {
      if (algo !== 'knn' || train.length < 1) return null
      const r = knnPredict(train, { x, y }, Math.min(kk, train.length))
      return r.label < 0 ? null : { color: SERIES_HEX[r.label % 8], opacity: 0.06 + 0.12 * r.share }
    },
    [algo, train, kk],
  )

  const stats = res && !res.tooBig ? clusterStats(pts, res.labels) : null
  const sc = scales(560, 440, b.x, b.y, undefined, true, true, true)
  const labelsShown = algo === 'knn' ? train.map((p) => p.label) : res?.labels ?? []
  const shown = algo === 'knn' ? train : pts
  const suffix = d.scaling === 'none' ? '' : d.scaling === 'z' ? ' (z-score)' : ' (min-max)'
  const nLab = new Set(d.raw.map((p) => p.label).filter((l) => l >= 0)).size
  const classCount = Math.max(2, Math.min(6, d.source === 'gen' ? nLab + 1 : d.classes.length || 2))

  const exportCsv = () => {
    if (algo === 'knn') {
      download([['x', 'y', 'class', 'loo_prediction'], ...train.map((p, i) => [fmt(p.x, 4), fmt(p.y, 4), String(p.label), String(knn?.loo[i] ?? '')])], 'playground-knn.csv')
      return
    }
    const head = ['x', 'y', ...(d.scaling !== 'none' ? ['x_scaled', 'y_scaled'] : []), 'cluster']
    const rows = pts.map((p, i) => [String(d.raw[i].x), String(d.raw[i].y), ...(d.scaling !== 'none' ? [fmt(p.x, 4), fmt(p.y, 4)] : []), String(res?.labels[i] ?? '')])
    download([head, ...rows], `playground-${algo}.csv`)
  }

  const legend =
    algo === 'knn'
      ? Array.from({ length: classCount }, (_, i) => ({ label: d.classes[i] ?? `class ${i + 1}`, color: colorFor(i), shape: shapeFor(i) }))
      : [
          ...(stats?.ids ?? []).filter((id) => id < 8).map((id) => ({ label: `Cluster ${id + 1}`, color: colorFor(id), shape: shapeFor(id) })),
          ...((stats?.ids ?? []).some((id) => id >= 8) ? [{ label: 'Clusters 9 and up', color: 'var(--ink-2)', shape: 0 }] : []),
          ...(stats && stats.noise > 0 ? [{ label: 'Noise', color: 'var(--ink-4)', shape: 4 }] : []),
        ]

  return (
    <Lab
      title="Lab bench"
      desc="Choose data, choose an algorithm, change its parameters. Results update immediately."
      controls={
        <>
          <DataControls d={d} />
          <Seg label="Algorithm" value={algo} onChange={setAlgo} options={[{ v: 'kmeans', label: 'k-means' }, { v: 'kmedoids', label: 'k-medoids' }, { v: 'dbscan', label: 'DBSCAN' }, { v: 'agglo', label: 'Agglomerative' }, { v: 'knn', label: 'kNN' }]} />
          {(algo === 'kmeans' || algo === 'kmedoids' || algo === 'agglo') && <Slider label="k (clusters)" value={k} min={1} max={10} onChange={setK} />}
          {algo === 'agglo' && <Seg label="Linkage" value={link} onChange={setLink} options={[{ v: 'single', label: 'Single' }, { v: 'complete', label: 'Complete' }, { v: 'average', label: 'Average' }]} />}
          {algo === 'dbscan' && (
            <>
              <Slider label="eps" value={epsF} min={0.01} max={0.3} step={0.005} fmt={() => fmt(eps, 3)} onChange={setEpsF} />
              <Slider label="MinPts" value={minPts} min={2} max={15} onChange={setMinPts} />
            </>
          )}
          {algo === 'knn' && (
            <>
              <Slider label="k (neighbors)" value={kk} min={1} max={25} onChange={setKk} />
              <Seg label="Click on the plot to add a point of class" value={brush} onChange={setBrush} options={Array.from({ length: classCount }, (_, i) => ({ v: i, label: d.classes[i] ?? `${i + 1}` }))} />
              <Btn sm onClick={() => setAdded({ sig: d.sig, pts: [] })} disabled={!extra.length}>
                Remove my {extra.length} points
              </Btn>
            </>
          )}
          <Btn sm variant="ghost" onClick={exportCsv} disabled={!pts.length}>
            Download labels as CSV
          </Btn>
        </>
      }
      notes={[
        'Moons with k-means, then DBSCAN with eps around 0.05: only the density method follows the curves.',
        'Add 15 extra outliers. Compare where k-means and k-medoids put their centers, then see DBSCAN mark them as noise.',
        'Parallel lines: single linkage follows each line (chaining), complete linkage cuts across them.',
        'Iris with sepal_length and petal_width, kNN with scaling None, then z-score. Watch the leave-one-out accuracy.',
      ]}
    >
      <Plot
        w={560}
        h={440}
        x={b.x}
        y={b.y}
        xLabel={d.names[0] + suffix}
        yLabel={d.names[1] + suffix}
        label="Scatter plot of the playground data"
        cursor={algo === 'knn' ? 'crosshair' : undefined}
        onDown={(p) => {
          if (algo === 'knn') setAdded({ sig: d.sig, pts: [...extra, { x: p.x, y: p.y, label: brush }] })
        }}
        onMove={(p) => {
          const i = nearestIndex(shown, p, sc)
          setHover(i >= 0 ? i : null)
        }}
        onLeave={() => setHover(null)}
      >
        {algo === 'knn' && train.length > 0 && <Heat res={50} fn={heat} />}
        {shown.map((p, i) => {
          const l = labelsShown[i] ?? -1
          const wrong = algo === 'knn' && knn && knn.loo[i] !== l
          const core = res?.core ? res.core[i] : true
          return <Dot key={i} x={p.x} y={p.y} r={algo === 'dbscan' && !core && l >= 0 ? 3 : l < 0 ? 3.5 : 4.2} color={colorFor(l)} shape={shapeFor(l)} fill={!wrong} opacity={0.92} />
        })}
        {res?.centers.map((c, j) => (
          <Dot key={'c' + j} x={c.x} y={c.y} r={10} color="var(--surface)" stroke={colorFor(j)} strokeWidth={3} shape={shapeFor(j)} />
        ))}
        {hover !== null && shown[hover] && (
          <Tip
            x={shown[hover].x}
            y={shown[hover].y}
            lines={[
              `${d.names[0]} ${fmt(shown[hover].x, 3)}`,
              `${d.names[1]} ${fmt(shown[hover].y, 3)}`,
              algo === 'knn'
                ? `class ${d.classes[labelsShown[hover]] ?? labelsShown[hover] + 1}, LOO says ${knn ? d.classes[knn.loo[hover]] ?? knn.loo[hover] + 1 : '-'}`
                : labelsShown[hover] < 0
                  ? 'noise'
                  : `cluster ${labelsShown[hover] + 1}${res?.core ? (res.core[hover] ? ', core' : ', border') : ''}`,
            ]}
          />
        )}
      </Plot>
      <Legend items={legend} />
      {res?.tooBig && (
        <p style={{ color: 'var(--warn)', fontSize: 13.5 }}>
          This method compares every pair of points many times. Use at most {algo === 'kmedoids' ? MAX_MEDOIDS : MAX_AGGLO} points (you have {pts.length}).
        </p>
      )}
      {algo === 'knn' ? (
        <Readout>
          <Stat k="Training points" v={train.length} sub={`${extra.length} added by you`} />
          <Stat k="Leave-one-out acc." v={knn ? fmt(knn.acc, 3) : '-'} sub="hollow marks are misses" />
          <Stat k="k" v={kk} />
        </Readout>
      ) : (
        stats && (
          <>
            <Readout>
              <Stat k="Clusters" v={stats.ids.length} />
              <Stat k="SSE" v={fmt(stats.sse, 3)} sub="to each cluster mean" />
              <Stat k="Silhouette" v={isNaN(stats.sil) ? 'n/a' : fmt(stats.sil, 3)} sub={pts.length > 500 ? 'too many points' : 'noise excluded'} />
              <Stat k="Noise" v={stats.noise} />
            </Readout>
            <div style={{ marginTop: 12 }}>
              <Table head={['Cluster', 'Size', 'Share']} num={[1, 2]} rows={stats.ids.map((id, i) => [`Cluster ${id + 1}`, stats.sizes[i], `${Math.round((stats.sizes[i] / pts.length) * 100)}%`])} />
            </div>
          </>
        )
      )}
    </Lab>
  )
}

function SideBySide({ d }: { d: ReturnType<typeof useData> }) {
  const [k, setK] = useState(3)
  const [epsF, setEpsF] = useState(0.06)
  const [minPts, setMinPts] = useState(5)
  const pts = d.pts
  const b = bounds(pts)
  const small = pts.length <= MAX_AGGLO
  const runs = useMemo(() => {
    if (!pts.length) return []
    const out: { name: string; labels: number[] | null }[] = [
      { name: 'k-means', labels: bestKmeans(pts, Math.min(k, pts.length), 4).labels },
      { name: 'DBSCAN', labels: dbscan(pts, epsF * b.span, minPts).labels },
      { name: 'Single linkage', labels: small ? agglomerative(pts, Math.min(k, pts.length), 'single') : null },
      { name: 'Complete linkage', labels: small ? agglomerative(pts, Math.min(k, pts.length), 'complete') : null },
    ]
    return out
  }, [pts, k, epsF, minPts])
  return (
    <Lab
      title="Same data, four algorithms"
      desc="Uses the data chosen in the bench above. Each method has its own idea of what a cluster is."
      controls={
        <>
          <Slider label="k (k-means, linkage)" value={k} min={1} max={8} onChange={setK} />
          <Slider label="eps (DBSCAN)" value={epsF} min={0.01} max={0.3} step={0.005} fmt={() => fmt(epsF * b.span, 3)} onChange={setEpsF} />
          <Slider label="MinPts (DBSCAN)" value={minPts} min={2} max={15} onChange={setMinPts} />
        </>
      }
      notes={['No single method wins everywhere. Blobs suit k-means, curved or nested shapes suit DBSCAN and single linkage, and complete linkage prefers compact groups of similar size.']}
    >
      <div className="grid c2">
        {runs.map((r) => {
          const st = r.labels ? clusterStats(pts, r.labels) : null
          return (
            <div key={r.name}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="label">{r.name}</span>
                <span className="label">{st ? `${st.ids.length} clusters${st.noise ? `, ${st.noise} noise` : ''}` : 'too many points'}</span>
              </div>
              <Plot w={360} h={280} x={b.x} y={b.y} axes={false} label={`${r.name} result`}>
                {r.labels && pts.map((p, i) => <Dot key={i} x={p.x} y={p.y} r={3} color={colorFor(r.labels![i])} shape={shapeFor(r.labels![i])} />)}
              </Plot>
            </div>
          )
        })}
      </div>
    </Lab>
  )
}

export default function Playground() {
  const d = useData()
  return (
    <div className="page">
      <TopicHeader
        group="Practice"
        title="Dataset playground"
        lede="A lab bench for every clustering and classification method on this site. Use generated shapes, the Iris flowers, or paste your own CSV, then compare what each algorithm finds."
      />
      <Bench d={d} />
      <SideBySide d={d} />
      <Section id="tips" title="What to look for" kicker="Reading the results">
        <Table
          head={['Number', 'What it tells you']}
          rows={[
            ['SSE', 'Total squared distance from points to their cluster mean. Lower means tighter clusters, but it always drops as k grows.'],
            ['Silhouette', 'Average over points of (b - a) / max(a, b). Near 1 means well separated, near 0 means overlapping, negative means likely misplaced.'],
            ['Noise', 'Points DBSCAN could not attach to any dense region. Other methods force every point into a cluster.'],
            ['Leave-one-out accuracy', 'For kNN: hide each training point in turn, predict it from the rest, and count the hits.'],
          ]}
        />
        <p style={{ marginTop: 12 }}>
          Scaling matters whenever the two columns use different units. Without it, the column with the larger range decides every distance on its own.
        </p>
      </Section>
    </div>
  )
}
