import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Label, Plot, Rect, VLine } from '../components/Plot'
import { Legend, Readout, Seg, Slider, Stat, seriesColor } from '../components/ui'
import { fmt, gauss, mean, rng, std } from '../lib/stats'

const INCOMES = [12000, 23000, 31000, 38000, 45000, 54000, 61000, 68000, 73600, 98000]

type Method = 'minmax' | 'z' | 'decimal'

function transform(vals: number[], m: Method, nmin: number, nmax: number) {
  if (m === 'minmax') {
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    return vals.map((v) => ((v - lo) / (hi - lo)) * (nmax - nmin) + nmin)
  }
  if (m === 'z') {
    const mu = mean(vals)
    const s = std(vals)
    return vals.map((v) => (v - mu) / s)
  }
  const top = Math.max(...vals.map(Math.abs))
  let j = 0
  while (top / 10 ** j >= 1) j++
  return vals.map((v) => v / 10 ** j)
}

function NormLab() {
  const [m, setM] = useState<Method>('minmax')
  const [range, setRange] = useState<'01' | 'pm1' | '100'>('01')
  const [out, setOut] = useState(0)
  const [nmin, nmax] = range === '01' ? [0, 1] : range === 'pm1' ? [-1, 1] : [0, 100]
  const vals = out > 0 ? [...INCOMES, out] : INCOMES
  const t = transform(vals, m, nmin, nmax)
  const idx = vals.indexOf(73600)
  const lo = Math.min(...t)
  const hi = Math.max(...t)
  const pad = (hi - lo) * 0.08 || 0.1
  const typical = t.slice(0, INCOMES.length - 1)
  const spread = Math.max(...typical) - Math.min(...typical)
  return (
    <Lab
      title="Normalize incomes, then add an outlier"
      desc="Ten incomes from 12,000 to 98,000. The highlighted one is 73,600. Choose a method, then use the slider to add one very rich customer."
      controls={
        <>
          <Seg label="Method" value={m} onChange={setM} options={[{ v: 'minmax', label: 'Min-max' }, { v: 'z', label: 'z-score' }, { v: 'decimal', label: 'Decimal scaling' }]} />
          {m === 'minmax' && <Seg label="New range" value={range} onChange={setRange} options={[{ v: '01', label: '[0, 1]' }, { v: 'pm1', label: '[-1, 1]' }, { v: '100', label: '[0, 100]' }]} />}
          <Slider label="Add an outlier income" value={out} min={0} max={1000000} step={10000} onChange={setOut} fmt={(v) => (v === 0 ? 'none' : v.toLocaleString('en-US'))} />
        </>
      }
      notes={[
        'With no outlier and min-max to [0, 1], 73,600 maps to 0.716.',
        'Add a 1,000,000 outlier with min-max. The ten normal incomes get squeezed into a tiny slice near 0. Watch "spread of the normal values" collapse.',
        'z-score handles the outlier better: values are not forced into a fixed range, so the normal ones keep more room.',
        'Decimal scaling divides by a power of 10 so every absolute value is below 1. The outlier changes the power and shrinks everything else.',
      ]}
    >
      <span className="label">Original values</span>
      <Plot w={600} h={110} x={[0, Math.max(...vals) * 1.05]} y={[0, 1]} yTickValues={[]} xFmt={(v) => `${Math.round(v / 1000)}k`} label="Original incomes">
        {vals.map((v, i) => (
          <Dot key={i} x={v} y={0.5} r={i === idx ? 7 : 5} color={i === idx ? seriesColor(1) : i >= INCOMES.length ? seriesColor(4) : seriesColor(0)} shape={i === idx ? 1 : i >= INCOMES.length ? 2 : 0} />
        ))}
      </Plot>
      <span className="label">After {m === 'minmax' ? 'min-max' : m === 'z' ? 'z-score' : 'decimal scaling'}</span>
      <Plot w={600} h={120} x={[lo - pad, hi + pad]} y={[0, 1]} yTickValues={[]} xFmt={(v) => fmt(v, 2)} label="Normalized incomes">
        {t.map((v, i) => (
          <Dot key={i} x={v} y={0.5} r={i === idx ? 7 : 5} color={i === idx ? seriesColor(1) : i >= INCOMES.length ? seriesColor(4) : seriesColor(0)} shape={i === idx ? 1 : i >= INCOMES.length ? 2 : 0} />
        ))}
        <Label x={t[idx]} y={0.5} dy={-14} anchor="middle" color="var(--ink)">
          {fmt(t[idx], 3)}
        </Label>
      </Plot>
      <Legend
        items={[
          { label: 'income', color: seriesColor(0) },
          { label: '73,600', color: seriesColor(1), shape: 1 },
          ...(out > 0 ? [{ label: 'outlier', color: seriesColor(4), shape: 2 }] : []),
        ]}
      />
      <Readout>
        <Stat k="73,600 becomes" v={fmt(t[idx], 4)} />
        <Stat k="New min" v={fmt(lo, 3)} />
        <Stat k="New max" v={fmt(hi, 3)} />
        <Stat k="New mean" v={fmt(mean(t), 3)} />
        <Stat k="New std" v={fmt(std(t), 3)} />
        <Stat k="Spread of normal values" v={fmt(spread, 3)} sub="range of the first nine" />
      </Readout>
    </Lab>
  )
}

const LABELS3 = ['youth', 'middle_aged', 'senior']

function DiscLab() {
  const ages = useMemo(() => {
    const r = rng(17)
    return Array.from({ length: 240 }, () => Math.min(90, Math.max(16, Math.round(18 + Math.abs(gauss(r)) * 14 + (r() < 0.25 ? r() * 40 : 0))))).sort((a, b) => a - b)
  }, [])
  const [k, setK] = useState(3)
  const [m, setM] = useState<'width' | 'freq'>('width')
  const lo = ages[0]
  const hi = ages[ages.length - 1]
  let bins: { a: number; b: number; n: number }[]
  if (m === 'width') {
    const w = (hi - lo) / k
    bins = Array.from({ length: k }, (_, i) => ({ a: lo + i * w, b: lo + (i + 1) * w, n: ages.filter((v) => Math.min(k - 1, Math.floor((v - lo) / w)) === i).length }))
  } else {
    const n = ages.length
    bins = Array.from({ length: k }, (_, i) => {
      const s = Math.round((i * n) / k)
      const e = Math.round(((i + 1) * n) / k)
      return { a: i === 0 ? lo : (ages[s - 1] + ages[s]) / 2, b: i === k - 1 ? hi : (ages[e - 1] + ages[e]) / 2, n: e - s }
    })
  }
  const maxN = Math.max(...bins.map((b) => b.n))
  const raw = Array.from({ length: hi - lo + 1 }, (_, i) => ({ v: lo + i, n: ages.filter((a) => a === lo + i).length }))
  const rawMax = Math.max(...raw.map((r) => r.n))
  return (
    <Lab
      title="Discretize age into intervals"
      desc="240 customer ages, most of them young. Cut the range into k intervals by equal width or equal frequency."
      controls={
        <>
          <Seg label="Method" value={m} onChange={setM} options={[{ v: 'width', label: 'Equal width' }, { v: 'freq', label: 'Equal frequency' }]} />
          <Slider label="Number of intervals k" value={k} min={2} max={8} onChange={setK} />
        </>
      }
      notes={[
        'Equal width on skewed data: the first interval is packed and the last ones are nearly empty.',
        'Equal frequency gives every interval the same count, so the young range gets cut into narrow intervals.',
        'With k = 3, the intervals can be named youth, middle_aged and senior: a concept hierarchy on top of raw numbers.',
      ]}
    >
      <Plot w={600} h={260} x={[lo - 1, hi + 1]} y={[0, maxN * 1.2]} xLabel="age" yLabel="records per interval" label="Interval counts over the age range">
        {bins.map((b, i) => (
          <Rect key={i} x0={b.a + 0.3} x1={b.b - 0.3} y0={0} y1={b.n} color={seriesColor(i)} opacity={0.75} rx={3} />
        ))}
        {raw.map((r) => (
          <Rect key={'r' + r.v} x0={r.v - 0.35} x1={r.v + 0.35} y0={0} y1={(r.n / rawMax) * maxN * 0.25} color="var(--ink)" opacity={0.35} />
        ))}
        {bins.slice(1).map((b, i) => (
          <VLine key={'v' + i} x={b.a} color="var(--ink-3)" width={1} />
        ))}
      </Plot>
      <Table
        head={['Interval', 'Range', 'Count', k === 3 ? 'Label' : 'Width']}
        num={[2]}
        rows={bins.map((b, i) => [i + 1, `[${fmt(b.a, 1)}, ${fmt(b.b, 1)}${i === k - 1 ? ']' : ')'}`, b.n, k === 3 ? LABELS3[i] : fmt(b.b - b.a, 1)])}
      />
      <Readout>
        <Stat k="Smallest interval count" v={Math.min(...bins.map((b) => b.n))} />
        <Stat k="Largest interval count" v={maxN} />
      </Readout>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader
        group="Preprocessing"
        title="Normalization and discretization"
        lede="Transformation changes values into a form that mines better: on a common scale, or grouped into a few meaningful intervals."
        minutes={20}
      />

      <Plain>
        <p>
          Comparing a salary of 60,000 to an age of 35 is like comparing meters to millimeters. Any method that adds up differences, such as distance in kNN or k-means, will only see the salary. Normalization puts every attribute on the same scale so each one gets a fair vote.
        </p>
      </Plain>

      <Section id="what" title="Kinds of transformation" kicker="Overview">
        <ul>
          <li><strong>Feature construction</strong>: build new attributes that capture the information better, such as area from length and width, or frequency features from a signal (Fourier, wavelets).</li>
          <li><strong>Normalization</strong>: scale values into a small common range.</li>
          <li><strong>Discretization</strong>: replace a continuous range by intervals or labels. It also reduces data size.</li>
        </ul>
      </Section>

      <Section id="norm" title="Three normalization methods" kicker="Normalization">
        <Formula title="Min-max">
          <MB>{"v' = \\frac{v - \\min_A}{\\max_A - \\min_A}(new\\_max_A - new\\_min_A) + new\\_min_A"}</MB>
          <p>Keeps the shape and fits values exactly into the new range. A new value outside the old [min, max] falls outside the new range.</p>
        </Formula>
        <Formula title="z-score">
          <MB>{"v' = \\frac{v - \\bar{A}}{\\sigma_A}"}</MB>
          <p>Says how many standard deviations a value is from the mean. Use it when min and max are unknown or there are outliers.</p>
        </Formula>
        <Formula title="Decimal scaling">
          <MB>{"v' = \\frac{v}{10^j}, \\quad j \\text{ the smallest integer with } \\max |v'| < 1"}</MB>
        </Formula>
      </Section>
      <NormLab />

      <Section id="worked" title="Worked example" kicker="Exam style">
        <Table
          head={['Question', 'Working', 'Answer']}
          rows={[
            ['Income 12,000 to 98,000. Min-max 73,600 to [0, 1].', <M>{'\\frac{73600 - 12000}{98000 - 12000} = \\frac{61600}{86000}'}</M>, '0.716'],
            ['Mean 54,000, std 16,000. z-score of 73,600.', <M>{'\\frac{73600 - 54000}{16000} = \\frac{19600}{16000}'}</M>, '1.225'],
            ['Values from -986 to 917. Decimal scaling.', 'max |v| = 986, so j = 3', '-0.986 to 0.917'],
          ]}
        />
      </Section>

      <Section id="disc" title="Discretization" kicker="Intervals and labels">
        <p>
          Split a continuous attribute into intervals, for example age into 0 to 10, 11 to 20 and so on, or into youth, middle_aged and senior. Methods include binning (equal width or equal frequency), histogram analysis, clustering and decision tree splits.
        </p>
      </Section>
      <DiscLab />

      <Section id="traps" title="Common mistakes">
        <Trap>
          <ul>
            <li>Compute min, max, mean and std on the training data only, then apply the same numbers to the test data.</li>
            <li>Min-max is very sensitive to outliers. One extreme value squashes everything else.</li>
            <li>z-scores are not limited to [-1, 1]. A value 3 standard deviations away has z = 3.</li>
            <li>The z-score uses the standard deviation divided by N in this course.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="Min 20, max 70. Min-max 45 to [0, 10].">(45 - 20) / (70 - 20) x 10 = 5.</Check>
        <Check q="Mean 50, std 5. Which value has z = -2?">50 - 2 x 5 = 40.</Check>
        <Check q="Why normalize before kNN or k-means?">Both use distances. Without normalization, the attribute with the largest numbers dominates the distance and the others are ignored.</Check>
      </Section>
    </>
  )
}
