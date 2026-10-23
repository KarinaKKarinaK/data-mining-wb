import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Label, Line, Plot, Rect, Tip, VLine, nearestIndex, scales } from '../components/Plot'
import { Legend, Readout, Seg, Slider, Stat, seriesColor } from '../components/ui'
import { clamp, fmt, gauss, mean, median, modes, quantile, rng, std, variance } from '../lib/stats'

function trimmed(vals: number[], pct: number) {
  const s = [...vals].sort((a, b) => a - b)
  const cut = Math.floor(s.length * pct)
  const kept = s.slice(cut, s.length - cut)
  return { value: kept.length ? mean(kept) : NaN, cut }
}

function five(vals: number[]) {
  const q1 = quantile(vals, 0.25)
  const q3 = quantile(vals, 0.75)
  const iqr = q3 - q1
  const lo = q1 - 1.5 * iqr
  const hi = q3 + 1.5 * iqr
  const inside = vals.filter((v) => v >= lo && v <= hi)
  return {
    min: Math.min(...vals),
    max: Math.max(...vals),
    q1,
    q2: median(vals),
    q3,
    iqr,
    lo,
    hi,
    wLo: inside.length ? Math.min(...inside) : q1,
    wHi: inside.length ? Math.max(...inside) : q3,
    outliers: vals.filter((v) => v < lo || v > hi),
  }
}

function BoxMarks({ vals, y0, y1, color = 'var(--s1)' }: { vals: number[]; y0: number; y1: number; color?: string }) {
  const f = five(vals)
  const ym = (y0 + y1) / 2
  return (
    <g>
      <Line pts={[{ x: f.wLo, y: ym }, { x: f.q1, y: ym }]} color="var(--ink-2)" width={1.5} />
      <Line pts={[{ x: f.q3, y: ym }, { x: f.wHi, y: ym }]} color="var(--ink-2)" width={1.5} />
      <Line pts={[{ x: f.wLo, y: y0 + (y1 - y0) * 0.25 }, { x: f.wLo, y: y1 - (y1 - y0) * 0.25 }]} color="var(--ink-2)" width={1.5} />
      <Line pts={[{ x: f.wHi, y: y0 + (y1 - y0) * 0.25 }, { x: f.wHi, y: y1 - (y1 - y0) * 0.25 }]} color="var(--ink-2)" width={1.5} />
      <Rect x0={f.q1} x1={f.q3} y0={y0} y1={y1} color={color} opacity={0.22} rx={4} />
      <Rect x0={f.q1} x1={f.q3} y0={y0} y1={y1} color="none" stroke={color} rx={4} />
      <Line pts={[{ x: f.q2, y: y0 }, { x: f.q2, y: y1 }]} color="var(--ink)" width={2.5} />
      {f.outliers.map((v, i) => (
        <Dot key={i} x={v} y={ym} r={4.5} fill={false} color="var(--s2)" />
      ))}
    </g>
  )
}

const PRESETS: Record<string, { vals: number[]; dom: [number, number]; name: string }> = {
  trim: { vals: [0, 4, 5, 6, 7, 7, 8, 10, 11, 18], dom: [0, 20], name: 'Trimmed mean example' },
  sym: { vals: [8, 9, 10, 10, 11, 12, 12, 12, 13, 14, 14, 15, 16], dom: [0, 25], name: 'Symmetric' },
  right: { vals: [2, 3, 3, 4, 4, 4, 5, 5, 6, 7, 9, 12, 18, 25], dom: [0, 30], name: 'Right skewed' },
  outlier: { vals: [10, 11, 12, 12, 13, 13, 14, 15, 15, 16, 48], dom: [0, 50], name: 'One outlier' },
}

function Explorer() {
  const W = 560
  const H = 320
  const [preset, setPreset] = useState('trim')
  const [vals, setVals] = useState<number[]>(PRESETS.trim.vals)
  const [mode, setMode] = useState<'move' | 'remove'>('move')
  const [trim, setTrim] = useState(0.1)
  const [drag, setDrag] = useState(-1)
  const dom = PRESETS[preset].dom

  const dots = useMemo(() => {
    const seen = new Map<number, number>()
    return vals.map((v) => {
      const k = seen.get(v) ?? 0
      seen.set(v, k + 1)
      return { x: v, y: 0.58 + k * 0.08 }
    })
  }, [vals])

  const sc = scales(W, H, dom, [0, 1], undefined, true, true, false)
  const has = vals.length > 0
  const f = has ? five(vals) : null
  const tm = trimmed(vals, trim)
  const md = modes(vals)

  return (
    <Lab
      title="Drag the data, watch every statistic"
      desc="Drag a dot, click empty space to add a value, or switch to remove mode."
      controls={
        <>
          <Seg
            label="Start from"
            value={preset}
            onChange={(v) => {
              setPreset(v)
              setVals(PRESETS[v].vals)
            }}
            options={Object.entries(PRESETS).map(([k, p]) => ({ v: k, label: p.name }))}
          />
          <Seg label="Click does" value={mode} onChange={setMode} options={[{ v: 'move', label: 'Drag or add' }, { v: 'remove', label: 'Remove' }]} />
          <Slider label="Trim from each end" value={trim} min={0} max={0.25} step={0.05} onChange={setTrim} fmt={(v) => `${Math.round(v * 100)}%`} />
        </>
      }
      notes={[
        'On "One outlier", drag 48 further right. Mean and std dev follow it; median and IQR stay put.',
        'On the trimmed mean example, a 10% trim drops 0 and 18 and gives 7.25.',
        'Drag values until mean, median and mode are equal: the data is now symmetric.',
      ]}
    >
      <Plot
        w={W}
        h={H}
        x={dom}
        y={[0, 1]}
        xLabel="value"
        yTickValues={[]}
        label="Values on a number line with a boxplot"
        cursor={drag >= 0 ? 'grabbing' : 'pointer'}
        onDown={(p) => {
          const i = nearestIndex(dots, p, sc, 12)
          if (mode === 'remove') {
            if (i >= 0 && vals.length > 1) setVals((v) => v.filter((_, k) => k !== i))
            return
          }
          if (i >= 0) setDrag(i)
          else if (p.y > 0.45) setVals((v) => [...v, clamp(Math.round(p.x), dom[0], dom[1])])
        }}
        onMove={(p) => {
          if (drag >= 0) setVals((v) => v.map((x, k) => (k === drag ? clamp(Math.round(p.x), dom[0], dom[1]) : x)))
        }}
        onUp={() => setDrag(-1)}
      >
        {f && <BoxMarks vals={vals} y0={0.1} y1={0.34} />}
        {f && (
          <>
            <VLine x={f.lo} color="var(--ink-4)" dash="2 4" width={1} />
            <VLine x={f.hi} color="var(--ink-4)" dash="2 4" width={1} />
          </>
        )}
        {has && <Dot x={mean(vals)} y={0.22} r={6} shape={3} color={seriesColor(3)} />}
        {dots.map((d, i) => (
          <Dot key={i} x={d.x} y={d.y} r={drag === i ? 7 : 5.5} color={f && (d.x < f.lo || d.x > f.hi) ? seriesColor(1) : seriesColor(0)} />
        ))}
        {f && <Label x={f.q2} y={0.38} anchor="middle">median</Label>}
      </Plot>
      <Legend
        items={[
          { label: 'value', color: seriesColor(0) },
          { label: 'outlier (beyond 1.5 IQR fences)', color: seriesColor(1) },
          { label: 'mean', color: seriesColor(3), shape: 3 },
        ]}
      />
      {f && (
        <Readout>
          <Stat k="N" v={vals.length} />
          <Stat k="Mean" v={fmt(mean(vals), 3)} />
          <Stat k="Median" v={fmt(f.q2, 3)} />
          <Stat k="Mode" v={md.length ? md.join(', ') : 'none'} />
          <Stat k="Midrange" v={fmt((f.min + f.max) / 2, 3)} />
          <Stat k={`Trimmed ${Math.round(trim * 100)}%`} v={fmt(tm.value, 3)} sub={`drops ${tm.cut} each end`} />
          <Stat k="Q1" v={fmt(f.q1, 3)} />
          <Stat k="Q3" v={fmt(f.q3, 3)} />
          <Stat k="IQR" v={fmt(f.iqr, 3)} />
          <Stat k="Range" v={fmt(f.max - f.min, 3)} />
          <Stat k="Variance" v={fmt(variance(vals), 3)} sub="divide by N" />
          <Stat k="Std dev" v={fmt(std(vals), 3)} sub="divide by N" />
        </Readout>
      )}
    </Lab>
  )
}

function BinsLab() {
  const data = useMemo(() => {
    const r = rng(42)
    return Array.from({ length: 300 }, (_, i) => clamp(i % 5 < 3 ? 35 + gauss(r) * 6 : 66 + gauss(r) * 8, 0, 100))
  }, [])
  const [bins, setBins] = useState(12)
  const [hover, setHover] = useState(-1)
  const w = 100 / bins
  const counts = Array.from({ length: bins }, (_, b) => data.filter((v) => Math.min(bins - 1, Math.floor(v / w)) === b).length)
  const maxC = Math.max(...counts)
  return (
    <Lab
      title="Histogram: how many bins?"
      desc="300 exam scores. Only the bucket count changes."
      controls={<Slider label="Number of bins" value={bins} min={2} max={40} onChange={setBins} />}
      notes={['Set 3 bins: the two peaks merge into one hump and the two groups disappear.', 'Set 40 bins: the shape turns noisy. Around 10 to 20 shows the real shape.']}
    >
      <Plot w={560} h={300} x={[0, 100]} y={[0, maxC * 1.15]} xLabel="score" yLabel="count" label="Histogram of scores" onLeave={() => setHover(-1)}>
        {counts.map((c, b) => (
          <Rect key={b} x0={b * w + w * 0.04} x1={(b + 1) * w - w * 0.04} y0={0} y1={c} color={seriesColor(0)} opacity={hover === b ? 1 : 0.8} rx={2} onEnter={() => setHover(b)} onLeave={() => setHover(-1)} />
        ))}
        {hover >= 0 && <Tip x={(hover + 0.5) * w} y={counts[hover]} lines={[`[${fmt(hover * w, 1)}, ${fmt((hover + 1) * w, 1)})`, `${counts[hover]} students`]} />}
      </Plot>
      <Readout>
        <Stat k="Bin width" v={fmt(w, 2)} />
        <Stat k="Tallest bin" v={maxC} />
        <Stat k="Mean" v={fmt(mean(data), 2)} />
        <Stat k="Median" v={fmt(median(data), 2)} />
      </Readout>
    </Lab>
  )
}

function SkewLab() {
  const z = useMemo(() => {
    const r = rng(7)
    return Array.from({ length: 800 }, () => gauss(r))
  }, [])
  const [s, setS] = useState(0.6)
  const v = useMemo(() => z.map((x) => (Math.abs(s) < 1e-9 ? x : (Math.exp(s * x) - 1) / s)), [z, s])
  const lo = quantile(v, 0.005)
  const hi = quantile(v, 0.995)
  const nb = 30
  const bw = (hi - lo) / nb
  const counts = Array.from({ length: nb }, (_, b) => v.filter((x) => x >= lo + b * bw && x < lo + (b + 1) * bw).length)
  const top = counts.indexOf(Math.max(...counts))
  const mo = lo + (top + 0.5) * bw
  const mu = mean(v)
  const me = median(v)
  const order = [
    { n: 'mean', v: mu },
    { n: 'median', v: me },
    { n: 'mode', v: mo },
  ].sort((a, b) => a.v - b.v)
  const shape = Math.abs(s) < 0.08 ? 'roughly symmetric' : s > 0 ? 'right (positively) skewed' : 'left (negatively) skewed'
  return (
    <Lab
      title="Skew pulls the mean"
      desc="The tail drags the mean furthest, the median a little, the mode not at all."
      controls={<Slider label="Skew" value={s} min={-1} max={1} step={0.05} onChange={setS} fmt={(x) => fmt(x, 2)} />}
      notes={['Slide right (tail to the right, like incomes): mode < median < mean.', 'Slide left (tail to the left, like an easy exam): mean < median < mode.', 'At 0 all three meet. The mode is the middle of the tallest bar.']}
    >
      <Plot w={560} h={290} x={[lo, hi]} y={[0, Math.max(...counts) * 1.2]} xLabel="value" yLabel="count" label="Histogram with mean, median and mode marked">
        {counts.map((c, b) => (
          <Rect key={b} x0={lo + b * bw + bw * 0.06} x1={lo + (b + 1) * bw - bw * 0.06} y0={0} y1={c} color="var(--ink-4)" opacity={0.75} rx={2} />
        ))}
        <VLine x={mu} color={seriesColor(0)} dash="0" width={2.5} />
        <VLine x={me} color={seriesColor(1)} dash="6 4" width={2.5} />
        <VLine x={mo} color={seriesColor(2)} dash="2 3" width={2.5} />
      </Plot>
      <Legend
        items={[
          { label: `mean ${fmt(mu, 2)}`, color: seriesColor(0) },
          { label: `median ${fmt(me, 2)}`, color: seriesColor(1), shape: 1 },
          { label: `mode ${fmt(mo, 2)}`, color: seriesColor(2), shape: 2 },
        ]}
      />
      <Readout>
        <Stat k="Shape" v={shape} />
        <Stat k="Order" v={order.map((o) => o.n).join(' < ')} />
      </Readout>
    </Lab>
  )
}

const SAME: Record<string, { name: string; vals: number[] }> = {
  even: { name: 'Spread evenly', vals: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100] },
  clumps: { name: 'Two clumps', vals: [0, 22, 23, 24, 24.5, 25, 25.5, 26, 27, 28, 50, 72, 73, 74, 74.5, 75, 76, 77, 78, 79, 100] },
  edges: { name: 'Piled at the ends', vals: [0, 1, 2, 3, 4, 25, 46, 47, 48, 49, 50, 51, 52, 53, 54, 75, 96, 97, 98, 99, 100] },
}

function SameBoxLab() {
  const [k, setK] = useState('clumps')
  const vals = SAME[k].vals
  const f = five(vals)
  const counts = Array.from({ length: 10 }, (_, b) => vals.filter((v) => Math.min(9, Math.floor(v / 10)) === b).length)
  return (
    <Lab
      title="Same boxplot, different data"
      desc="Three datasets of 21 values, all with five-number summary 0, 25, 50, 75, 100."
      controls={<Seg label="Dataset" value={k} onChange={setK} options={Object.entries(SAME).map(([key, d]) => ({ v: key, label: d.name }))} />}
      notes={['Switch datasets: the boxplot never moves, the histogram changes completely, and so does the std dev.']}
    >
      <Plot w={560} h={110} x={[0, 100]} y={[0, 1]} yTickValues={[]} label="Boxplot, identical for all three datasets">
        <BoxMarks vals={vals} y0={0.25} y1={0.75} color={seriesColor(0)} />
      </Plot>
      <Plot w={560} h={220} x={[0, 100]} y={[0, Math.max(...counts) * 1.15]} xLabel="value" yLabel="count" label="Histogram of the selected dataset">
        {counts.map((c, b) => (
          <Rect key={b} x0={b * 10 + 0.5} x1={(b + 1) * 10 - 0.5} y0={0} y1={c} color={seriesColor(2)} rx={2} />
        ))}
      </Plot>
      <Readout>
        <Stat k="Min" v={f.min} />
        <Stat k="Q1" v={fmt(f.q1, 1)} />
        <Stat k="Median" v={fmt(f.q2, 1)} />
        <Stat k="Q3" v={fmt(f.q3, 1)} />
        <Stat k="Max" v={f.max} />
        <Stat k="Std dev" v={fmt(std(vals), 2)} sub="this one differs" />
      </Readout>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader
        group="Foundations"
        title="Summarizing data"
        lede="Before mining anything, describe the data: its center, its spread and its shape."
      />

      <Plain>
        <p>
          Think of 40 exam scores. The <strong>center</strong> is the typical score, the <strong>spread</strong> is how far scores differ, and the <strong>shape</strong> says whether most did well with a few failures or the reverse.
        </p>
      </Plain>

      <Section id="basics" title="Objects and attributes">
        <p>
          A dataset is a collection of <strong>objects</strong> (also called records, tuples, samples, instances). Each object is described by <strong>attributes</strong> (features, variables, fields).
        </p>
        <Table
          head={['Attribute type', 'What it allows', 'Examples']}
          rows={[
            ['Nominal', 'Only tells objects apart, no order', 'eye color, zip code, ID'],
            ['Binary', 'Nominal with exactly two values', 'smoker yes/no'],
            ['Ordinal', 'Values have a meaningful order', 'grade A/B/C, small/medium/large'],
            ['Numeric', 'Real numbers, differences make sense', 'temperature, income, date'],
          ]}
        />
      </Section>

      <Section id="center" title="Measures of center">
        <Formula>
          <MB>{'\\bar{x} = \\frac{1}{N}\\sum_{i=1}^{N} x_i \\qquad \\bar{x}_w = \\frac{\\sum_i w_i x_i}{\\sum_i w_i} \\qquad \\text{midrange} = \\frac{\\max + \\min}{2}'}</MB>
          <p>
            The <strong>median</strong> is the middle value of the sorted data. With an even count, average the two middle values. The <strong>mode</strong> is the most frequent value. A <strong>trimmed mean</strong> drops a percentage of the lowest and highest values first, like diving judges ignoring the extreme scores.
          </p>
        </Formula>
        <p>The mean is pulled by extreme values; the median is not. That is why salaries are reported with the median.</p>
      </Section>

      <Section id="spread" title="Measures of spread">
        <Formula>
          <MB>{'\\sigma^2 = \\frac{1}{N}\\sum_{i=1}^{N}(x_i - \\bar{x})^2 = \\frac{1}{N}\\sum x_i^2 - \\bar{x}^2 \\qquad \\sigma = \\sqrt{\\sigma^2}'}</MB>
          <MB>{'IQR = Q_3 - Q_1 \\qquad \\text{outlier if } x < Q_1 - 1.5\\,IQR \\text{ or } x > Q_3 + 1.5\\,IQR'}</MB>
          <p>
            <M>{'Q_1'}</M>, the median and <M>{'Q_3'}</M> are the 25th, 50th and 75th percentiles. Together with min and max they form the <strong>five-number summary</strong>. <M>{'\\sigma = 0'}</M> only when every value is equal.
          </p>
        </Formula>
      </Section>

      <Explorer />

      <Section id="worked" title="Worked example">
        <Table
          head={['Question', 'Working', 'Answer']}
          rows={[
            ['Median of 1, 5, 2, 8, 7', 'Sort: 1, 2, 5, 7, 8. Middle (3rd) value.', '5'],
            ['Median of 1, 6, 2, 8, 7, 2', 'Sort: 1, 2, 2, 6, 7, 8. Average of 2 and 6.', '4'],
            ['10% trimmed mean of 0, 4, 5, 6, 7, 7, 8, 10, 11, 18', 'Drop 1 value each end (0 and 18). 58 / 8.', '7.25'],
            ['Midrange of the same data', '(18 + 0) / 2', '9'],
          ]}
        />
      </Section>

      <Section id="plots" title="Three plots you must read">
        <ul>
          <li>
            <strong>Boxplot</strong>: the five-number summary as a picture. The box runs from <M>{'Q_1'}</M> to <M>{'Q_3'}</M> with a line at the median. Whiskers reach the furthest values inside the 1.5 IQR fences. Points beyond are drawn on their own as outliers.
          </li>
          <li>
            <strong>Histogram</strong>: counts per bucket (usually equal width). Shows shape: peaks, skew, gaps.
          </li>
          <li>
            <strong>Scatter plot</strong>: two numeric attributes, one point per object. Shows positive, negative or no correlation.
          </li>
        </ul>
      </Section>
      <BinsLab />

      <Section id="shape" title="Skew and the order of mean, median, mode">
        <p>Symmetric data has mean = median = mode. A long tail pulls the mean toward it.</p>
      </Section>
      <SkewLab />

      <Section id="same-box" title="Why one plot is never enough">
        <p>A boxplot only knows five numbers, and very different data can share them.</p>
      </Section>
      <SameBoxLab />

      <Section id="traps" title="Common mistakes">
        <Trap>
          <ul>
            <li>pandas <code>.std()</code> divides by N - 1. The course divides by N, so use <code>ddof=0</code>.</li>
            <li>Different tools compute quartiles differently. This site and pandas use linear interpolation between sorted values. State your method if it matters.</li>
            <li>Forgetting to sort before finding the median.</li>
            <li>The same boxplot can hide very different distributions. Check a histogram too.</li>
            <li>The 1.5 IQR rule flags candidates. An outlier may be a real but rare value, not an error.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="Data: 3, 7, 7, 2, 9. Give the mean, median, mode and midrange.">
          Sorted: 2, 3, 7, 7, 9. Mean 28 / 5 = 5.6. Median 7. Mode 7. Midrange (9 + 2) / 2 = 5.5.
        </Check>
        <Check q="Incomes in a city have mean 52,000 and median 38,000. What is the shape?">
          Right (positively) skewed. A few very high incomes pull the mean above the median.
        </Check>
        <Check q="Q1 = 20 and Q3 = 30. Is 48 an outlier by the 1.5 IQR rule?">
          IQR = 10, upper fence = 30 + 15 = 45. Since 48 &gt; 45, yes.
        </Check>
        <Check q="Values 4, 4, 4, 4. What is the standard deviation?">
          0. Every value equals the mean, so every squared deviation is 0.
        </Check>
      </Section>
    </>
  )
}
