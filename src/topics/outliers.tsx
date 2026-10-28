import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Line, Plot, Tip, VLine } from '../components/Plot'
import { Legend, Readout, Seg, Slider, Stat, seriesColor } from '../components/ui'
import { bestKmeans } from '../lib/cluster'
import { knnIdx, lof } from '../lib/density'
import { addOutliers, make2D } from '../lib/datasets'
import { dist, fmt, gauss, mean, quantile, rng, std, type Pt } from '../lib/stats'

const ring = (c: Pt, r: number): Pt[] => Array.from({ length: 49 }, (_, i) => ({ x: c.x + r * Math.cos((i / 48) * Math.PI * 2), y: c.y + r * Math.sin((i / 48) * Math.PI * 2) }))

function StatLab() {
  const [text, setText] = useState('52, 55, 58, 60, 61, 61, 63, 64, 66, 67, 68, 70, 71, 74, 96, 12')
  const [method, setMethod] = useState<'z' | 'iqr'>('iqr')
  const [zt, setZt] = useState(2)
  const [mult, setMult] = useState(1.5)
  const vals = text.split(/[\s,;]+/).map(Number).filter((v) => Number.isFinite(v))
  const ok = vals.length >= 3
  const m = ok ? mean(vals) : 0
  const s = ok ? std(vals) : 1
  const q1 = ok ? quantile(vals, 0.25) : 0
  const q3 = ok ? quantile(vals, 0.75) : 0
  const iqr = q3 - q1
  const lo = method === 'z' ? m - zt * s : q1 - mult * iqr
  const hi = method === 'z' ? m + zt * s : q3 + mult * iqr
  const flag = (v: number) => v < lo || v > hi
  const xmin = Math.min(...vals, lo)
  const xmax = Math.max(...vals, hi)
  const pad = (xmax - xmin) * 0.06 || 1
  const seen = new Map<number, number>()
  const flagged = vals.filter(flag)
  return (
    <Lab
      title="Statistical outliers on one attribute"
      desc="Type numbers and pick a rule: z-score or the boxplot IQR fences."
      controls={
        <>
          <Seg label="Rule" value={method} onChange={setMethod} options={[{ v: 'z', label: 'z-score' }, { v: 'iqr', label: 'IQR fences' }]} />
          {method === 'z' ? <Slider label="Flag if |z| greater than" value={zt} min={1} max={4} step={0.1} onChange={setZt} fmt={(v) => v.toFixed(1)} /> : <Slider label="Fence multiplier" value={mult} min={0.5} max={3} step={0.1} onChange={setMult} fmt={(v) => v.toFixed(1)} />}
        </>
      }
      notes={[
        'Add 150 and 160. The standard deviation grows, so each extreme z-score shrinks (masking). The IQR fences barely move.',
      ]}
    >
      <textarea className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} aria-label="Values" />
      {ok && (
        <Plot w={560} h={170} x={[xmin - pad, xmax + pad]} y={[0, 1]} yTickValues={[]} xLabel="value" label="Strip plot with outlier fences">
          <VLine x={lo} color="var(--s2)" label="lower" />
          <VLine x={hi} color="var(--s2)" label="upper" />
          {method === 'z' ? <VLine x={m} color="var(--ink-3)" dash="2 3" label="mean" /> : <VLine x={quantile(vals, 0.5)} color="var(--ink-3)" dash="2 3" label="median" />}
          {vals.map((v, i) => {
            const k = seen.get(v) ?? 0
            seen.set(v, k + 1)
            return <Dot key={i} x={v} y={0.3 + k * 0.12} r={5.5} color={flag(v) ? 'var(--s2)' : 'var(--s1)'} shape={flag(v) ? 2 : 0} />
          })}
        </Plot>
      )}
      <Legend items={[{ label: 'normal', color: 'var(--s1)', shape: 0 }, { label: 'flagged', color: 'var(--s2)', shape: 2 }]} />
      <Readout>
        <Stat k="Mean" v={fmt(m, 2)} />
        <Stat k="Std (N)" v={fmt(s, 2)} />
        <Stat k="Q1 / Q3" v={`${fmt(q1, 2)} / ${fmt(q3, 2)}`} />
        <Stat k="Fences" v={`${fmt(lo, 1)} / ${fmt(hi, 1)}`} />
        <Stat k="Flagged" v={flagged.length ? flagged.join(', ') : 'none'} />
      </Readout>
    </Lab>
  )
}

function DistanceLab() {
  const pts = useMemo(() => addOutliers(make2D('blobs', 150, 31, 0.06, 3), 8, 6).map(({ x, y }) => ({ x, y })), [])
  const [r, setR] = useState(0.08)
  const [pi, setPi] = useState(0.02)
  const [hover, setHover] = useState<number | null>(null)
  const frac = useMemo(() => pts.map((p, i) => pts.filter((q, j) => j !== i && dist(p, q) <= r).length / (pts.length - 1)), [pts, r])
  const out = frac.map((f) => f <= pi)
  return (
    <Lab
      title="Distance-based outliers: DB(r, π)"
      desc="An outlier has at most a fraction π of the others within distance r. Hover a point."
      controls={
        <>
          <Slider label="Radius r" value={r} min={0.02} max={0.25} step={0.005} onChange={setR} fmt={(v) => v.toFixed(3)} />
          <Slider label="Fraction π" value={pi} min={0} max={0.2} step={0.005} onChange={setPi} fmt={(v) => v.toFixed(3)} />
        </>
      }
      notes={['Make r tiny: almost nobody has neighbors, so most points are flagged. Make it huge: nobody is flagged.', 'One global r cannot suit clusters of different spread. Points on the edge of a loose cluster get flagged before a point that sits just outside a tight cluster.']}
    >
      <Plot
        w={460}
        h={460}
        x={[0, 1]}
        y={[0, 1]}
        axes={false}
        label="Points flagged by the DB(r, pi) rule"
        onMove={(e) => {
          let best = -1
          let bd = 0.025
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
          <Dot key={i} x={p.x} y={p.y} r={out[i] ? 6 : 4} color={out[i] ? 'var(--s2)' : 'var(--s1)'} shape={out[i] ? 2 : 0} opacity={out[i] ? 1 : 0.75} />
        ))}
        {hover !== null && (
          <>
            <Line pts={ring(pts[hover], r)} color="var(--ink)" width={1.4} dash="4 3" />
            <Tip x={pts[hover].x} y={pts[hover].y} lines={[`within r: ${fmt(frac[hover] * 100, 1)}% of others`, out[hover] ? 'outlier' : 'normal']} />
          </>
        )}
      </Plot>
      <Legend items={[{ label: 'normal', color: 'var(--s1)', shape: 0 }, { label: 'outlier', color: 'var(--s2)', shape: 2 }]} />
      <Readout>
        <Stat k="Flagged" v={out.filter(Boolean).length} />
        <Stat k="Points" v={pts.length} />
      </Readout>
    </Lab>
  )
}

function makeLocal() {
  const r = rng(41)
  const out: Pt[] = []
  for (let i = 0; i < 60; i++) out.push({ x: 0.3 + gauss(r) * 0.03, y: 0.62 + gauss(r) * 0.03 })
  for (let i = 0; i < 50; i++) out.push({ x: 0.7 + gauss(r) * 0.1, y: 0.38 + gauss(r) * 0.1 })
  out.push({ x: 0.42, y: 0.62 })
  out.push({ x: 0.08, y: 0.1 })
  return out
}

function LofLab() {
  const pts = useMemo(makeLocal, [])
  const LOCAL = 110
  const GLOBAL = 111
  const [method, setMethod] = useState<'knn' | 'lof'>('lof')
  const [k, setK] = useState(6)
  const [top, setTop] = useState(5)
  const scores = useMemo(() => (method === 'lof' ? lof(pts, k) : pts.map((_, i) => knnIdx(pts, i, k)[k - 1].d)), [pts, k, method])
  const ranked = useMemo(() => pts.map((_, i) => i).sort((a, b) => scores[b] - scores[a]), [scores, pts])
  const rank = new Map(ranked.map((i, r) => [i, r]))
  const max = scores[ranked[0]]
  const min = Math.min(...scores)
  const flagged = new Set(ranked.slice(0, top))
  const where = (i: number) => (i === LOCAL ? 'next to the tight cluster' : i === GLOBAL ? 'far from everything' : i < 60 ? 'tight cluster' : 'loose cluster')
  return (
    <Lab
      title="Why local density matters: kNN distance vs LOF"
      desc="A tight cluster, a loose one, a point just outside the tight one, and a far point. Marker size is the score."
      controls={
        <>
          <Seg label="Score" value={method} onChange={setMethod} options={[{ v: 'knn', label: 'kNN distance' }, { v: 'lof', label: 'LOF' }]} />
          <Slider label="k (neighbors)" value={k} min={2} max={15} onChange={setK} />
          <Slider label="Flag the top" value={top} min={1} max={12} onChange={setTop} />
        </>
      }
      notes={[
        'kNN distance ranks the point beside the tight cluster below ordinary loose-cluster points: its distances are small.',
        'LOF compares a point with its neighbors\' density, so that point scores high while loose-cluster points stay near 1.',
      ]}
    >
      <Plot w={460} h={460} x={[0, 1]} y={[0, 1]} axes={false} label="Points sized by outlier score">
        {pts.map((p, i) => {
          const t = max > min ? (scores[i] - min) / (max - min) : 0
          const f = flagged.has(i)
          return <Dot key={i} x={p.x} y={p.y} r={3 + t * 9} color={f ? 'var(--s2)' : 'var(--s1)'} shape={f ? 2 : 0} opacity={f ? 1 : 0.55} />
        })}
      </Plot>
      <Legend items={[{ label: 'normal', color: 'var(--s1)', shape: 0 }, { label: `top ${top} flagged`, color: 'var(--s2)', shape: 2 }]} />
      <Table head={['Rank', 'Where', 'Score']} num={[0, 2]} rows={ranked.slice(0, top).map((i, r) => [r + 1, where(i), fmt(scores[i], 3)])} hl={(r) => ranked[r] === LOCAL} />
      <Readout>
        <Stat k="Local outlier rank" v={(rank.get(LOCAL) ?? 0) + 1} sub="point next to the tight cluster" />
        <Stat k="Global outlier rank" v={(rank.get(GLOBAL) ?? 0) + 1} />
      </Readout>
    </Lab>
  )
}

function ClusterLab() {
  const pts = useMemo(() => addOutliers(make2D('blobs', 120, 52, 0.06, 3), 6, 9).map(({ x, y }) => ({ x, y })), [])
  const [k, setK] = useState(3)
  const [top, setTop] = useState(6)
  const res = useMemo(() => bestKmeans(pts, k, 4), [pts, k])
  const score = pts.map((p, i) => dist(p, res.cs[res.labels[i]]))
  const ranked = pts.map((_, i) => i).sort((a, b) => score[b] - score[a])
  const flagged = new Set(ranked.slice(0, top))
  return (
    <Lab
      title="Clustering-based outliers"
      desc="Cluster first, then score each object by its distance to its own center."
      controls={
        <>
          <Slider label="k" value={k} min={1} max={6} onChange={setK} />
          <Slider label="Flag the top" value={top} min={1} max={15} onChange={setTop} />
        </>
      }
      notes={['With k too small, whole groups sit far from a shared center and their edges get flagged. With the right k, only the stray points stand out.', 'Outliers also pull the k-means centers toward themselves, which is one reason k-medoids is used here.']}
    >
      <Plot w={460} h={420} x={[0, 1]} y={[0, 1]} axes={false} label="Distance to own centroid as outlier score">
        {pts.map((p, i) => (
          <Line key={'l' + i} pts={[p, res.cs[res.labels[i]]]} color={seriesColor(res.labels[i])} width={0.6} opacity={flagged.has(i) ? 0.8 : 0.15} />
        ))}
        {pts.map((p, i) => (
          <Dot key={i} x={p.x} y={p.y} r={flagged.has(i) ? 6.5 : 4} color={flagged.has(i) ? 'var(--s2)' : seriesColor(res.labels[i])} shape={flagged.has(i) ? 2 : res.labels[i]} />
        ))}
        {res.cs.map((c, j) => (
          <Dot key={'c' + j} x={c.x} y={c.y} r={9} color="var(--surface)" stroke={seriesColor(j)} strokeWidth={2.5} shape={j} />
        ))}
      </Plot>
      <Readout>
        <Stat k="Largest distance" v={fmt(score[ranked[0]], 3)} />
        <Stat k="Flagged" v={top} />
      </Readout>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader group="Clustering" title="Outlier detection" lede="An object so unlike the rest that it seems to come from a different process. Sometimes an error, often the thing you are looking for." />

      <Plain>
        <p>
          Your bank sees thousands of normal payments: coffee, groceries, rent. Then 4,000 dollars from another country at 3 a.m. No rule covers it; it is just unlike everything else, so it gets flagged.
        </p>
        <p>Noise is random error to smooth away. An outlier is a real object that breaks the pattern.</p>
      </Plain>

      <Section id="types" title="Three kinds of outliers">
        <Table
          head={['Type', 'What is unusual', 'Example']}
          rows={[
            ['Global (point anomaly)', 'The object deviates from the whole data set', 'A transaction 50 times larger than any other'],
            ['Contextual (conditional)', 'Normal in general, unusual in its context. Split attributes into contextual (time, place) and behavioral (temperature)', '28 degrees C is fine in summer and an outlier in January'],
            ['Collective', 'Each object alone looks fine, the group together does not', 'Hundreds of small identical orders from new accounts within one minute'],
          ]}
        />
        <p style={{ marginTop: 12 }}>
          By labels needed: <strong>supervised</strong> (classification with heavy imbalance), <strong>semi-supervised</strong> (some labels, usually normal), <strong>unsupervised</strong> (none, the usual case).
        </p>
      </Section>

      <Section id="statistical" title="Statistical methods">
        <p>Assume the normal data follows a distribution and flag objects in its low-probability tails.</p>
        <Formula title="Two simple rules">
          <MB>{'z_i = \\frac{x_i - \\bar{x}}{\\sigma}, \\quad \\text{flag if } |z_i| > 3 \\qquad\\text{or}\\qquad x_i < Q_1 - 1.5\\,IQR \\;\\text{ or }\\; x_i > Q_3 + 1.5\\,IQR'}</MB>
          <p>For a normal distribution about 99.7% of values fall within <M>{'\\bar{x} \\pm 3\\sigma'}</M>. The IQR rule is the boxplot rule.</p>
        </Formula>
      </Section>
      <StatLab />

      <Section id="proximity" title="Proximity-based methods">
        <p>No distribution needed: an object is an outlier if its neighbors are far away.</p>
        <Formula title="Distance-based outlier">
          <MB>{'o \\text{ is a } DB(r, \\pi) \\text{ outlier if } \\frac{|\\{o\' : d(o, o\') \\le r\\}|}{|D|} \\le \\pi'}</MB>
          <p>A related score is the kNN distance: the distance from o to its kth nearest neighbor. Larger means more isolated.</p>
        </Formula>
      </Section>
      <DistanceLab />

      <Section id="lof" title="Density-based: the local outlier factor">
        <p>
          Distance rules use one global yardstick. LOF compares an object's density with its neighbors' density, so it adapts to clusters of different spread.
        </p>
        <Formula title="LOF">
          <MB>{'reachdist_k(o \\leftarrow o\') = \\max\\{dist_k(o), d(o, o\')\\}'}</MB>
          <MB>{'lrd_k(o) = \\frac{|N_k(o)|}{\\sum_{o\' \\in N_k(o)} reachdist_k(o\' \\leftarrow o)}, \\qquad LOF_k(o) = \\frac{1}{|N_k(o)|}\\sum_{o\' \\in N_k(o)} \\frac{lrd_k(o\')}{lrd_k(o)}'}</MB>
          <p>
            <M>{'dist_k(o)'}</M>: distance to the kth nearest neighbor. <M>{'lrd'}</M>: local reachability density. LOF near 1 is normal; well above 1 is an outlier.
          </p>
        </Formula>
      </Section>
      <LofLab />

      <Section id="clustering" title="Clustering-based methods">
        <ul>
          <li>Objects that belong to no cluster (DBSCAN noise) are outliers.</li>
          <li>Objects far from the center of their closest cluster are outliers.</li>
          <li>Objects in very small or sparse clusters may all be outliers.</li>
        </ul>
      </Section>
      <ClusterLab />

      <Section id="worked" title="Worked example">
        <p>Values: 2, 3, 3, 4, 5, 5, 6, 30.</p>
        <ul>
          <li>Mean <M>{'= 58/8 = 7.25'}</M>. Variance (divide by N) <M>{'= 603.5/8 = 75.4375'}</M>, so <M>{'\\sigma = 8.686'}</M>.</li>
          <li>z-score of 30: <M>{'(30 - 7.25)/8.686 = 2.619'}</M>. With the threshold 3 it is <strong>not</strong> flagged: the outlier inflated the standard deviation that judges it.</li>
          <li>Quartiles (linear interpolation): <M>{'Q_1 = 3'}</M>, <M>{'Q_3 = 5.25'}</M>, <M>{'IQR = 2.25'}</M>. Upper fence <M>{'5.25 + 1.5 \\times 2.25 = 8.625'}</M>, so 30 <strong>is</strong> flagged.</li>
        </ul>
        <p>Paste the values into the first lab to check.</p>
      </Section>

      <Trap>
        <ul>
          <li>Noise and outliers are different: cleaning removes noise, detection looks for exceptions.</li>
          <li>z-scores use the mean and standard deviation, which outliers themselves distort. Prefer median and IQR for small, dirty samples.</li>
          <li>LOF near 1 is normal. Do not read LOF as a probability.</li>
          <li>Quartile values depend on the interpolation method. State the method you use.</li>
        </ul>
      </Trap>

      <Section id="check" title="Check yourself">
        <Check q="Give an example of a contextual outlier and name its contextual and behavioral attributes.">
          A 35 degree day in Hong Kong in December. Contextual attributes: date and location. Behavioral attribute: temperature.
        </Check>
        <Check q="Why can kNN distance miss a point that sits just outside a very dense cluster?">
          Its distances are small in absolute terms, smaller than distances inside a loose cluster elsewhere. A global score ranks it as normal; LOF compares it with its dense neighbors and flags it.
        </Check>
        <Check q="An object has LOF = 1.02. Outlier or not?">
          Not an outlier. Its density matches its neighbors' density.
        </Check>
        <Check q="Why is outlier detection usually unsupervised?">
          Outliers are rare and varied, so labeled examples of every kind are hard to collect. New kinds of fraud or failure are by definition not in the training data.
        </Check>
      </Section>
    </>
  )
}
