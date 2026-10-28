import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Line, Plot, Rect, Tip, VLine, usePlot } from '../components/Plot'
import { Btn, Legend, Readout, Slider, Stat, Toggle, seriesColor } from '../components/ui'
import { clipSeg } from '../lib/geom'
import { fmt, gauss, mean, rng, type Pt } from '../lib/stats'

function ols(pts: Pt[]) {
  const mx = mean(pts.map((p) => p.x))
  const my = mean(pts.map((p) => p.y))
  const sxy = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0)
  const sxx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0)
  const w1 = sxx ? sxy / sxx : 0
  return { w1, w0: my - w1 * mx, mx, my }
}

const sseOf = (pts: Pt[], w0: number, w1: number) => pts.reduce((s, p) => s + (p.y - (w0 + w1 * p.x)) ** 2, 0)

function Squares({ pts, w0, w1 }: { pts: Pt[]; w0: number; w1: number }) {
  const { sx, sy } = usePlot()
  const ratio = (sy(0) - sy(1)) / (sx(1) - sx(0))
  return (
    <>
      {pts.map((p, i) => {
        const r = p.y - (w0 + w1 * p.x)
        const wx = Math.abs(r) * ratio
        return <Rect key={i} x0={p.x} x1={p.x + (r > 0 ? -wx : wx)} y0={p.y} y1={p.y - r} color={seriesColor(1)} opacity={0.14} stroke={seriesColor(1)} />
      })}
    </>
  )
}

const START: Pt[] = [
  { x: 1, y: 2.2 },
  { x: 2, y: 2.6 },
  { x: 2.8, y: 4.1 },
  { x: 3.6, y: 3.8 },
  { x: 4.5, y: 5.2 },
  { x: 5.2, y: 4.9 },
  { x: 6, y: 6.3 },
  { x: 6.9, y: 6.1 },
  { x: 7.8, y: 7.4 },
  { x: 8.7, y: 7.2 },
]

function FitLab() {
  const [pts, setPts] = useState<Pt[]>(START)
  const [drag, setDrag] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [squares, setSquares] = useState(true)
  const [mine, setMine] = useState(false)
  const [m1, setM1] = useState(0.5)
  const [m0, setM0] = useState(2)
  const hasOutlier = pts.length > START.length
  const fit = ols(pts)
  const base = ols(pts.slice(0, START.length))
  const sse = sseOf(pts, fit.w0, fit.w1)
  const sst = pts.reduce((s, p) => s + (p.y - fit.my) ** 2, 0)
  const r2 = sst ? 1 - sse / sst : 0
  const near = (p: Pt) => {
    let best = -1
    let bd = 0.45
    pts.forEach((q, i) => {
      const d = Math.hypot(q.x - p.x, q.y - p.y)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    return best
  }
  return (
    <Lab
      title="Least squares, live"
      desc="Drag any point. Each square's area is one squared residual; the line minimizes their total."
      controls={
        <>
          <Toggle on={squares} onChange={setSquares}>Draw squared residuals</Toggle>
          <Toggle on={mine} onChange={setMine}>Compare with my own line</Toggle>
          {mine && (
            <>
              <Slider label="my slope" value={m1} min={-1} max={2} step={0.05} onChange={setM1} fmt={(v) => fmt(v, 2)} />
              <Slider label="my intercept" value={m0} min={-2} max={8} step={0.1} onChange={setM0} fmt={(v) => fmt(v, 1)} />
            </>
          )}
          <div className="row">
            <Btn sm onClick={() => setPts(hasOutlier ? pts.slice(0, START.length) : [...pts, { x: 9, y: 1 }])}>{hasOutlier ? 'Remove outlier' : 'Add an outlier'}</Btn>
            <Btn sm variant="ghost" onClick={() => setPts(START)}>Reset points</Btn>
          </div>
        </>
      }
      notes={[
        'Turn on "my own line" and try to beat the least-squares SSE. You cannot.',
        'Add the outlier: one squared residual drags the slope down. The dashed line is the fit without it.',
        'Pull a middle point up, then a far-right point by the same amount. The far-right one tilts the line more: extreme x means more leverage.',
      ]}
    >
      <Plot
        w={460}
        h={420}
        x={[0, 10]}
        y={[0, 10]}
        xLabel="x"
        yLabel="y"
        label="Scatter plot with least squares line and residuals"
        cursor={drag !== null ? 'grabbing' : hover !== null ? 'grab' : undefined}
        onDown={(p) => {
          const i = near(p)
          if (i >= 0) setDrag(i)
        }}
        onMove={(p) => {
          if (drag !== null) setPts((ps) => ps.map((q, i) => (i === drag ? { x: Math.min(10, Math.max(0, p.x)), y: Math.min(10, Math.max(0, p.y)) } : q)))
          else {
            const i = near(p)
            setHover(i >= 0 ? i : null)
          }
        }}
        onUp={() => setDrag(null)}
        onLeave={() => {
          setDrag(null)
          setHover(null)
        }}
      >
        {squares && <Squares pts={pts} w0={fit.w0} w1={fit.w1} />}
        {pts.map((p, i) => (
          <Line key={'r' + i} pts={[p, { x: p.x, y: fit.w0 + fit.w1 * p.x }]} color={seriesColor(1)} width={1.2} />
        ))}
        {hasOutlier && <Line pts={clipSeg({ x: 0, y: base.w0 }, { x: 10, y: base.w0 + base.w1 * 10 }, 0, 10, 0, 10)} color="var(--ink-3)" width={1.5} dash="5 4" />}
        {mine && <Line pts={clipSeg({ x: 0, y: m0 }, { x: 10, y: m0 + m1 * 10 }, 0, 10, 0, 10)} color={seriesColor(2)} width={2} />}
        <Line pts={clipSeg({ x: 0, y: fit.w0 }, { x: 10, y: fit.w0 + fit.w1 * 10 }, 0, 10, 0, 10)} color={seriesColor(0)} width={2.5} />
        {pts.map((p, i) => (
          <Dot key={i} x={p.x} y={p.y} r={i === hover || i === drag ? 7 : 5.5} color="#f2f1ee" />
        ))}
        {hover !== null && drag === null && <Tip x={pts[hover].x} y={pts[hover].y} lines={[`(${fmt(pts[hover].x, 2)}, ${fmt(pts[hover].y, 2)})`, `residual ${fmt(pts[hover].y - (fit.w0 + fit.w1 * pts[hover].x), 3)}`]} />}
      </Plot>
      <Legend
        items={[
          { label: 'least-squares line', color: seriesColor(0) },
          { label: 'residuals', color: seriesColor(1) },
          ...(mine ? [{ label: 'my line', color: seriesColor(2) }] : []),
          ...(hasOutlier ? [{ label: 'fit without outlier', color: 'var(--ink-3)' }] : []),
        ]}
      />
      <Readout>
        <Stat k="Slope w1" v={fmt(fit.w1, 3)} />
        <Stat k="Intercept w0" v={fmt(fit.w0, 3)} />
        <Stat k="SSE" v={fmt(sse, 3)} />
        <Stat k="R²" v={fmt(r2, 3)} />
        {mine && <Stat k="My SSE" v={fmt(sseOf(pts, m0, m1), 3)} sub={sseOf(pts, m0, m1) <= sse + 1e-9 ? 'matches the minimum' : 'higher than least squares'} />}
      </Readout>
    </Lab>
  )
}

function solve(A: number[][], b: number[]) {
  const n = b.length
  const M = A.map((r, i) => [...r, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    if (Math.abs(M[c][c]) < 1e-12) continue
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((r, i) => (Math.abs(r[i]) < 1e-12 ? 0 : r[n] / r[i]))
}

function polyfit(pts: Pt[], deg: number) {
  const X = pts.map((p) => Array.from({ length: deg + 1 }, (_, j) => (2 * p.x - 1) ** j))
  const A = Array.from({ length: deg + 1 }, (_, i) => Array.from({ length: deg + 1 }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? 1e-10 : 0)))
  const b = Array.from({ length: deg + 1 }, (_, i) => X.reduce((s, r, k) => s + r[i] * pts[k].y, 0))
  const c = solve(A, b)
  return (x: number) => c.reduce((s, cj, j) => s + cj * (2 * x - 1) ** j, 0)
}

const truth = (x: number) => Math.sin(2 * Math.PI * x)

function PolyLab() {
  const [deg, setDeg] = useState(3)
  const [seed, setSeed] = useState(3)
  const { train, test } = useMemo(() => {
    const r = rng(seed)
    const train = Array.from({ length: 12 }, (_, i) => {
      const x = (i + 0.5) / 12 + (r() - 0.5) * 0.04
      return { x, y: truth(x) + gauss(r) * 0.25 }
    })
    const test = Array.from({ length: 40 }, () => {
      const x = 0.02 + r() * 0.96
      return { x, y: truth(x) + gauss(r) * 0.25 }
    })
    return { train, test }
  }, [seed])
  const rmse = (f: (x: number) => number, s: Pt[]) => Math.sqrt(mean(s.map((p) => (p.y - f(p.x)) ** 2)))
  const curve = useMemo(
    () =>
      Array.from({ length: 11 }, (_, d) => {
        const f = polyfit(train, d)
        return { d, tr: rmse(f, train), te: rmse(f, test) }
      }),
    [train, test],
  )
  const f = polyfit(train, deg)
  const xs = Array.from({ length: 200 }, (_, i) => i / 199)
  const cap = 1.6
  const best = curve.reduce((b, c) => (c.te < b.te ? c : b), curve[0])
  return (
    <Lab
      title="Polynomial degree and overfitting"
      desc="12 noisy training points from a smooth curve, 40 test points."
      controls={
        <>
          <Slider label="Polynomial degree" value={deg} min={0} max={10} onChange={setDeg} />
          <Btn sm variant="ghost" onClick={() => setSeed((s) => s + 1)}>New sample</Btn>
        </>
      }
      notes={[
        'Degree 0 or 1: both errors high (underfitting).',
        `Raise the degree: training error keeps falling, test error bottoms out near degree ${best.d} and climbs.`,
        'Degree 10: the curve hits nearly every training point and swings wildly between them.',
      ]}
    >
      <div className="grid c2">
        <Plot w={380} h={300} x={[0, 1]} y={[-2, 2]} xLabel="x" yLabel="y" xTicks={4} yTicks={4} label="Polynomial fit with train and test points">
          {test.map((p, i) => (
            <Dot key={'t' + i} x={p.x} y={p.y} r={3} color={seriesColor(1)} shape={1} opacity={0.6} />
          ))}
          <Line pts={xs.map((x) => ({ x, y: truth(x) }))} color="var(--ink-4)" dash="4 4" width={1.5} />
          <Line pts={xs.map((x) => ({ x, y: Math.max(-2, Math.min(2, f(x))) }))} color={seriesColor(0)} width={2.5} />
          {train.map((p, i) => (
            <Dot key={i} x={p.x} y={p.y} r={5} color={seriesColor(0)} />
          ))}
        </Plot>
        <div>
          <span className="label">Error (RMSE) by degree</span>
          <Plot w={360} h={300} x={[0, 10]} y={[0, cap]} xLabel="degree" yLabel="RMSE" xTicks={5} yTicks={4} label="Training and test error by degree">
            <VLine x={deg} color="var(--ink-4)" />
            <Line pts={curve.map((c) => ({ x: c.d, y: Math.min(cap, c.tr) }))} color={seriesColor(0)} />
            <Line pts={curve.map((c) => ({ x: c.d, y: Math.min(cap, c.te) }))} color={seriesColor(1)} />
            {curve.map((c) => (
              <g key={c.d}>
                <Dot x={c.d} y={Math.min(cap, c.tr)} r={3} color={seriesColor(0)} />
                <Dot x={c.d} y={Math.min(cap, c.te)} r={3} color={seriesColor(1)} shape={1} />
              </g>
            ))}
          </Plot>
        </div>
      </div>
      <Legend items={[{ label: 'training points and error', color: seriesColor(0) }, { label: 'test points and error', color: seriesColor(1), shape: 1 }, { label: 'true curve', color: 'var(--ink-4)' }]} />
      <Readout>
        <Stat k="Train RMSE" v={fmt(curve[deg].tr, 3)} />
        <Stat k="Test RMSE" v={fmt(curve[deg].te, 3)} />
        <Stat k="Best degree on test" v={best.d} />
      </Readout>
    </Lab>
  )
}

function Worked() {
  const xs = [1, 2, 3, 4, 5]
  const ys = [2, 4, 5, 4, 5]
  const mx = mean(xs)
  const my = mean(ys)
  const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  const w1 = sxy / sxx
  const w0 = my - w1 * mx
  const sse = xs.reduce((s, x, i) => s + (ys[i] - (w0 + w1 * x)) ** 2, 0)
  const sst = ys.reduce((s, y) => s + (y - my) ** 2, 0)
  return (
    <>
      <Table
        head={['x', 'y', 'x - x̄', 'y - ȳ', '(x - x̄)(y - ȳ)', '(x - x̄)²', 'ŷ', 'residual²']}
        num={[0, 1, 2, 3, 4, 5, 6, 7]}
        rows={xs.map((x, i) => [x, ys[i], fmt(x - mx, 0), fmt(ys[i] - my, 0), fmt((x - mx) * (ys[i] - my), 0), fmt((x - mx) ** 2, 0), fmt(w0 + w1 * x, 1), fmt((ys[i] - (w0 + w1 * x)) ** 2, 2)])}
      />
      <p style={{ marginTop: 12 }}>
        <M>{`\\bar{x} = ${mx},\\ \\bar{y} = ${my},\\ w_1 = \\frac{${sxy}}{${sxx}} = ${fmt(w1, 1)},\\ w_0 = ${my} - ${fmt(w1, 1)} \\times ${mx} = ${fmt(w0, 1)}`}</M>. So <M>{`\\hat{y} = ${fmt(w0, 1)} + ${fmt(w1, 1)}x`}</M>, with <M>{`SSE = ${fmt(sse, 1)}`}</M>, <M>{`SST = ${sst}`}</M> and <M>{`R^2 = 1 - ${fmt(sse, 1)}/${sst} = ${fmt(1 - sse / sst, 1)}`}</M>.
      </p>
    </>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader group="Classification" title="Regression" lede="Regression predicts a number instead of a category. The simplest model is the straight line with the smallest squared errors." />

      <Plain>
        <p>
          A rubber band stretched through a cloud of nails, where each nail pulls with the square of its distance. Far points pull hardest.
        </p>
      </Plain>

      <Section id="linear" title="Simple linear regression">
        <p>
          Model <M>{'\\hat{y} = w_0 + w_1 x'}</M>. The residual <M>{'y_i - \\hat{y}_i'}</M> is the vertical gap between a point and the line.
        </p>
        <Formula title="Least-squares coefficients">
          <MB>{'w_1 = \\frac{\\sum_{i=1}^{N}(x_i - \\bar{x})(y_i - \\bar{y})}{\\sum_{i=1}^{N}(x_i - \\bar{x})^2}, \\qquad w_0 = \\bar{y} - w_1 \\bar{x}'}</MB>
          <p>These minimize <M>{'SSE = \\sum (y_i - \\hat{y}_i)^2'}</M>. The fitted line always passes through the point <M>{'(\\bar{x}, \\bar{y})'}</M>.</p>
        </Formula>
        <Formula title="How good is the fit">
          <MB>{'R^2 = 1 - \\frac{SSE}{SST}, \\qquad SST = \\sum (y_i - \\bar{y})^2'}</MB>
          <p>
            Share of the variation in <M>{'y'}</M> explained by the line. 1 is a perfect fit, 0 is no better than predicting <M>{'\\bar{y}'}</M>.
          </p>
        </Formula>
      </Section>

      <FitLab />

      <Section id="worked" title="Worked by hand">
        <p>Five points. Fill the table column by column, then use the sums.</p>
        <Worked />
      </Section>

      <Section id="beyond" title="Beyond a straight line">
        <ul>
          <li><strong>Multiple linear regression</strong>: <M>{'\\hat{y} = w_0 + w_1x_1 + \\dots + w_nx_n'}</M>, solved with the same least-squares idea in matrix form.</li>
          <li><strong>Polynomial regression</strong>: add <M>{'x^2, x^3, \\dots'}</M> as extra attributes. The model is still linear in the weights, so least squares still works.</li>
          <li><strong>Other regressors</strong>: regression trees, kNN regression (average of the neighbors), neural networks with a linear output unit.</li>
        </ul>
      </Section>

      <PolyLab />

      <Section id="traps" title="Common mistakes">
        <Trap>
          <ul>
            <li>Mixing up the formulas: the slope uses the sum of products divided by the sum of squares of <M>{'x'}</M>, not of <M>{'y'}</M>.</li>
            <li>Judging a model by training error. A complex enough model always fits the training data; use test data.</li>
            <li>Ignoring outliers. Squared error lets one extreme point move the whole line.</li>
            <li>Reading a strong fit as cause and effect. Regression measures association.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="Classification or regression: predicting tomorrow's maximum temperature?">Regression, the target is numeric. Predicting whether it will rain is classification.</Check>
        <Check q="Points (1, 1), (2, 3), (3, 5). What is the least-squares line?">x̄ = 2, ȳ = 3. Sum of products = (-1)(-2) + 0 + (1)(2) = 4, sum of squares = 2, so w1 = 2 and w0 = 3 - 2 × 2 = -1. ŷ = -1 + 2x, a perfect fit with R² = 1.</Check>
        <Check q="Why does training error keep going down as you raise the polynomial degree?">Each higher degree model contains the lower one as a special case, so least squares can always do at least as well on the training points. That says nothing about new data.</Check>
      </Section>
    </>
  )
}
