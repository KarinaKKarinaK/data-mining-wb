import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Heat, Line, Plot, VLine } from '../components/Plot'
import { Btn, Legend, Readout, Seg, Slider, Stat, SERIES_HEX, seriesColor } from '../components/ui'
import { lineInBox } from '../lib/geom'
import { fmt, gauss, rng, type Pt } from '../lib/stats'

type Fn = 'AND' | 'OR' | 'NAND' | 'XOR'
const INPUTS: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
]
const TARGET: Record<Fn, number[]> = {
  AND: [0, 0, 0, 1],
  OR: [0, 1, 1, 1],
  NAND: [1, 1, 1, 0],
  XOR: [0, 1, 1, 0],
}
const SOLUTION: Record<Fn, [number, number, number] | null> = {
  AND: [1, 1, 1.5],
  OR: [1, 1, 0.5],
  NAND: [-1, -1, -1.5],
  XOR: null,
}

function boundary(w0: number, w1: number, w2: number, lo: number, hi: number): Pt[] {
  return lineInBox(w0, w1, w2, lo, hi)
}

const out = (s: number) => (s >= 0 ? 1 : 0)

function ManualLab() {
  const [fn, setFn] = useState<Fn>('AND')
  const [w1, setW1] = useState(0.5)
  const [w2, setW2] = useState(0.5)
  const [t, setT] = useState(0.2)
  const rows = INPUTS.map(([a, b], i) => {
    const s = w1 * a + w2 * b
    return { a, b, s, o: out(s - t), tg: TARGET[fn][i] }
  })
  const correct = rows.filter((r) => r.o === r.tg).length
  const regionFn = useMemo(() => (x: number, y: number) => ({ color: SERIES_HEX[out(w1 * x + w2 * y - t)], opacity: 0.12 }), [w1, w2, t])
  return (
    <Lab
      title="Set the weights yourself"
      desc="Output 1 when the weighted sum reaches the threshold. The line is where they are equal."
      controls={
        <>
          <Seg label="Target function" value={fn} onChange={setFn} options={(['AND', 'OR', 'NAND', 'XOR'] as Fn[]).map((f) => ({ v: f, label: f }))} />
          <Slider label="w1" value={w1} min={-2} max={2} step={0.1} onChange={setW1} fmt={(v) => fmt(v, 1)} />
          <Slider label="w2" value={w2} min={-2} max={2} step={0.1} onChange={setW2} fmt={(v) => fmt(v, 1)} />
          <Slider label="threshold t" value={t} min={-2} max={2} step={0.1} onChange={setT} fmt={(v) => fmt(v, 1)} />
          <Btn
            sm
            disabled={!SOLUTION[fn]}
            onClick={() => {
              const s = SOLUTION[fn]
              if (s) {
                setW1(s[0])
                setW2(s[1])
                setT(s[2])
              }
            }}
          >
            {SOLUTION[fn] ? 'Show one solution' : 'XOR has no solution'}
          </Btn>
        </>
      }
      notes={[
        'AND: weights 1 and 1, threshold 1.5. Only (1, 1) reaches it. OR: drop the threshold to 0.5.',
        'Try XOR: the two 1s sit on opposite corners, so no straight line separates them from the 0s.',
      ]}
    >
      <div>
        <Plot w={420} h={360} x={[-0.5, 1.5]} y={[-0.5, 1.5]} xLabel="I1" yLabel="I2" xTicks={4} yTicks={4} label="Inputs, targets and the perceptron decision line">
          <Heat res={40} fn={regionFn} />
          <Line pts={boundary(-t, w1, w2, -0.5, 1.5)} color="var(--ink)" width={2} />
          {rows.map((r, i) => (
            <Dot key={i} x={r.a} y={r.b} r={9} color={seriesColor(r.tg)} shape={r.tg} stroke={r.o === r.tg ? undefined : '#f2f1ee'} strokeWidth={2.5} />
          ))}
        </Plot>
        <div style={{ marginTop: 12 }}>
          <Table
            head={['I1', 'I2', 'w1·I1 + w2·I2', 'O', 'T', 'OK']}
            num={[2]}
            hl={(i) => rows[i].o !== rows[i].tg}
            rows={rows.map((r) => [r.a, r.b, fmt(r.s, 2), r.o, r.tg, r.o === r.tg ? 'yes' : 'no'])}
          />
          <Readout>
            <Stat k="Correct" v={`${correct} / 4`} />
            <Stat k="Fires when" v={`sum >= ${fmt(t, 1)}`} />
          </Readout>
        </div>
      </div>
      <Legend items={[{ label: 'target 0', color: seriesColor(0), shape: 0 }, { label: 'target 1', color: seriesColor(1), shape: 1 }, { label: 'white ring = wrong output', color: '#f2f1ee' }]} />
    </Lab>
  )
}

type Row = { it: number; wOld: number[]; I: number[]; T: number; O: number; wNew: number[] }

function TrainerLab() {
  const [fn, setFn] = useState<Fn>('AND')
  const [alpha, setAlpha] = useState(1)
  const [w, setW] = useState([0, 0, 0])
  const [idx, setIdx] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [epochErr, setEpochErr] = useState(0)
  const [epochs, setEpochs] = useState<number[]>([])
  const [history, setHistory] = useState<number[][]>([[0, 0, 0]])
  const converged = epochs.length > 0 && epochs[epochs.length - 1] === 0

  const reset = (f = fn, a = alpha) => {
    setFn(f)
    setAlpha(a)
    setW([0, 0, 0])
    setIdx(0)
    setRows([])
    setEpochErr(0)
    setEpochs([])
    setHistory([[0, 0, 0]])
  }

  const stepOnce = (state: { w: number[]; idx: number; rows: Row[]; err: number; epochs: number[]; hist: number[][] }) => {
    const [a, b] = INPUTS[state.idx]
    const I = [1, a, b]
    const T = TARGET[fn][state.idx]
    const O = out(state.w.reduce((s, wi, i) => s + wi * I[i], 0))
    const wNew = state.w.map((wi, i) => wi + alpha * (T - O) * I[i])
    const row = { it: state.rows.length + 1, wOld: state.w, I, T, O, wNew }
    let err = state.err + (T === O ? 0 : 1)
    let ep = state.epochs
    let nextIdx = state.idx + 1
    if (nextIdx === 4) {
      ep = [...ep, err]
      err = 0
      nextIdx = 0
    }
    return { w: wNew, idx: nextIdx, rows: [...state.rows, row], err, epochs: ep, hist: T === O ? state.hist : [...state.hist, wNew] }
  }

  const apply = (n: number) => {
    let s = { w, idx, rows, err: epochErr, epochs, hist: history }
    for (let i = 0; i < n; i++) {
      if (s.epochs.length && s.epochs[s.epochs.length - 1] === 0) break
      if (s.epochs.length >= 50) break
      s = stepOnce(s)
    }
    setW(s.w)
    setIdx(s.idx)
    setRows(s.rows)
    setEpochErr(s.err)
    setEpochs(s.epochs)
    setHistory(s.hist)
  }

  const regionFn = useMemo(() => (x: number, y: number) => ({ color: SERIES_HEX[out(w[0] + w[1] * x + w[2] * y)], opacity: 0.12 }), [w])
  const shown = rows.slice(-12)

  return (
    <Lab
      title="Train it with the perceptron learning rule"
      desc="Weights start at 0. Only wrong outputs change the weights."
      controls={
        <>
          <Seg label="Target function" value={fn} onChange={(f) => reset(f)} options={(['AND', 'OR', 'NAND', 'XOR'] as Fn[]).map((f) => ({ v: f, label: f }))} />
          <Slider label="learning rate α" value={alpha} min={0.1} max={1} step={0.1} onChange={(a) => reset(fn, a)} fmt={(v) => fmt(v, 1)} />
          <div className="row">
            <Btn variant="primary" onClick={() => apply(1)} disabled={converged || epochs.length >= 50}>
              One example
            </Btn>
            <Btn onClick={() => apply(4 - idx)} disabled={converged || epochs.length >= 50}>
              Finish epoch
            </Btn>
          </div>
          <div className="row">
            <Btn sm onClick={() => apply(400)} disabled={converged || epochs.length >= 50}>
              Run until done
            </Btn>
            <Btn sm variant="ghost" onClick={() => reset()}>
              Reset
            </Btn>
          </div>
        </>
      }
      notes={[
        'AND with α = 1: step through and check that weights change only on highlighted rows.',
        'α = 0.1: the final weights are 10 times smaller, the line is the same.',
        'XOR: no error-free epoch ever. The run gives up after 50.',
      ]}
    >
      <div>
        <div>
          <Plot w={420} h={360} x={[-0.5, 1.5]} y={[-0.5, 1.5]} xLabel="I1" yLabel="I2" xTicks={4} yTicks={4} label="Current decision line during training">
            <Heat res={40} fn={regionFn} />
            {history.slice(-6, -1).map((h, i) => (
              <Line key={i} pts={boundary(h[0], h[1], h[2], -0.5, 1.5)} color="var(--ink-4)" width={1} dash="3 3" />
            ))}
            <Line pts={boundary(w[0], w[1], w[2], -0.5, 1.5)} color="var(--ink)" width={2} />
            {INPUTS.map(([a, b], i) => (
              <Dot key={i} x={a} y={b} r={9} color={seriesColor(TARGET[fn][i])} shape={TARGET[fn][i]} stroke={i === idx && !converged ? '#f2f1ee' : undefined} strokeWidth={2.5} />
            ))}
          </Plot>
          <Readout>
            <Stat k="w0" v={fmt(w[0], 1)} />
            <Stat k="w1" v={fmt(w[1], 1)} />
            <Stat k="w2" v={fmt(w[2], 1)} />
            <Stat k="Epochs" v={epochs.length} />
            <Stat k="Status" v={converged ? 'Converged' : epochs.length >= 50 ? 'Gave up' : 'Training'} />
          </Readout>
        </div>
        <div style={{ marginTop: 14 }}>
          <span className="label">Trace (last 12 rows). I0 = 1 is the bias input.</span>
          <Table
            head={['#', 'w old', 'I', 'T', 'O', 'T = O?', 'w new']}
            hl={(i) => shown[i].T !== shown[i].O}
            rows={shown.map((r) => [r.it, r.wOld.map((v) => fmt(v, 1)).join(', '), r.I.join(', '), r.T, r.O, r.T === r.O ? 'yes' : 'no', r.wNew.map((v) => fmt(v, 1)).join(', ')])}
          />
          {epochs.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span className="label">Errors per epoch</span>
              <Plot w={460} h={150} x={[1, Math.max(2, epochs.length)]} y={[0, 4]} xLabel="epoch" yLabel="errors" xTicks={5} yTicks={4} label="Errors per epoch">
                <Line pts={epochs.map((e, i) => ({ x: i + 1, y: e }))} color={seriesColor(0)} />
                {epochs.map((e, i) => (
                  <Dot key={i} x={i + 1} y={e} r={3} color={seriesColor(0)} />
                ))}
              </Plot>
            </div>
          )}
        </div>
      </div>
    </Lab>
  )
}

function SeparableLab() {
  const [gap, setGap] = useState(0.15)
  const [seed, setSeed] = useState(2)
  const [epoch, setEpoch] = useState(60)
  const data = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: 60 }, (_, i) => {
      const c = i % 2
      const cx = c ? 0.5 + gap : 0.5 - gap
      return { x: cx + gauss(r) * 0.1, y: 0.5 + gauss(r) * 0.18 + (c ? 0.05 : -0.05), c }
    })
  }, [gap, seed])
  const run = useMemo(() => {
    let w = [0, 0, 0]
    const ws = [w]
    const errs: number[] = []
    for (let e = 0; e < 60; e++) {
      let err = 0
      data.forEach((d) => {
        const I = [1, d.x, d.y]
        const O = out(w[0] + w[1] * d.x + w[2] * d.y)
        if (O !== d.c) {
          err++
          w = w.map((wi, i) => wi + 0.5 * (d.c - O) * I[i])
        }
      })
      errs.push(err)
      ws.push(w)
      if (err === 0) break
    }
    return { ws, errs }
  }, [data])
  const e = Math.min(epoch, run.errs.length)
  const w = run.ws[e]
  const conv = run.errs[run.errs.length - 1] === 0
  return (
    <Lab
      title="When does the perceptron converge?"
      desc="Move the classes apart or together, then scrub through the epochs."
      controls={
        <>
          <Slider label="Gap between classes" value={gap} min={-0.05} max={0.3} step={0.01} onChange={setGap} fmt={(v) => fmt(v, 2)} />
          <Slider label="Show after epoch" value={e} min={0} max={run.errs.length} onChange={setEpoch} />
          <Btn sm variant="ghost" onClick={() => setSeed((s) => s + 1)}>
            New sample
          </Btn>
        </>
      }
      notes={['Clear gap: zero errors after a few epochs. Shrink the gap until the classes overlap: the error count never reaches 0 and the weights never settle.']}
    >
      <div className="grid c2">
        <Plot w={360} h={320} x={[0, 1]} y={[0, 1]} xLabel="x1" yLabel="x2" xTicks={4} yTicks={4} label="Two classes and the perceptron line">
          <Line pts={boundary(w[0], w[1], w[2], 0, 1)} color="var(--ink)" width={2} />
          {data.map((d, i) => (
            <Dot key={i} x={d.x} y={d.y} r={4.5} color={seriesColor(d.c)} shape={d.c} />
          ))}
        </Plot>
        <div>
          <span className="label">Misclassified points per epoch</span>
          <Plot w={340} h={220} x={[1, Math.max(2, run.errs.length)]} y={[0, Math.max(4, ...run.errs)]} xLabel="epoch" yLabel="errors" xTicks={5} yTicks={4} label="Errors per epoch">
            {e > 0 && <VLine x={e} color="var(--ink-4)" />}
            <Line pts={run.errs.map((v, i) => ({ x: i + 1, y: v }))} color={seriesColor(0)} />
          </Plot>
          <Readout>
            <Stat k="Result" v={conv ? `Converged, epoch ${run.errs.length}` : 'No convergence in 60'} />
          </Readout>
        </div>
      </div>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader group="Classification" title="Perceptrons" lede="The simplest artificial neuron: weight each input, add them up, output 1 if the total reaches a threshold." />

      <Plain>
        <p>
          Deciding whether to go outside: sunshine pushes toward yes, rain toward no. Weigh each factor, add them up, go if the total is high enough. Learning means adjusting the weights after each wrong decision.
        </p>
      </Plain>

      <Section id="model" title="The model">
        <p>
          Inputs <M>{'I_1, \\dots, I_n'}</M>, weights <M>{'w_1, \\dots, w_n'}</M>. Fold the threshold in with a constant input <M>{'I_0 = 1'}</M> and weight <M>{'w_0 = -t'}</M>.
        </p>
        <Formula title="Output">
          <MB>{'O = \\begin{cases} 1 & \\text{if } \\sum_{i=0}^{n} w_i I_i \\ge 0 \\\\ 0 & \\text{otherwise} \\end{cases}'}</MB>
          <p>Where the sum is exactly 0 is a line in 2D (a hyperplane in general): 1 on one side, 0 on the other.</p>
        </Formula>
      </Section>

      <ManualLab />

      <Section id="separable" title="What a perceptron can represent">
        <p>
          One perceptron can represent a Boolean function only if a straight line separates the 1s from the 0s. AND, OR, NAND and NOT are <strong>linearly separable</strong>; XOR is not. Layers of perceptrons can represent any Boolean function, for example XOR = AND(OR, NAND).
        </p>
      </Section>

      <Section id="learning" title="Learning the weights">
        <ol>
          <li>Start with some initial weights (often all 0).</li>
          <li>Feed one training example. Compute the output O and compare it with the target T.</li>
          <li>If they differ, change every weight. If they match, change nothing.</li>
          <li>Loop over the examples until a whole pass (epoch) has no errors, or a stopping rule is hit.</li>
        </ol>
        <Formula title="Perceptron weight update">
          <MB>{'w_i \\leftarrow w_i + \\alpha\\,(T - O)\\,I_i'}</MB>
          <p>
            <M>{'\\alpha'}</M> is the learning rate. Output 0 but target 1: <M>{'T - O = 1'}</M>, each weight moves toward its input and the sum rises next time. Output 1 but target 0: the reverse. Weights of inputs that were 0 do not change.
          </p>
        </Formula>
      </Section>

      <TrainerLab />

      <Section id="worked" title="Reading a trace by hand">
        <p>Exams give initial weights, α and the order of examples, and ask for the weights after each step. AND, α = 1, zero weights:</p>
        <Table
          head={['#', 'w old (w0, w1, w2)', 'I (1, I1, I2)', 'T', 'O', 'w new']}
          rows={[
            [1, '0, 0, 0', '1, 0, 0', 0, 1, '-1, 0, 0'],
            [2, '-1, 0, 0', '1, 0, 1', 0, 0, '-1, 0, 0'],
            [3, '-1, 0, 0', '1, 1, 0', 0, 0, '-1, 0, 0'],
            [4, '-1, 0, 0', '1, 1, 1', 1, 0, '0, 1, 1'],
            [5, '0, 1, 1', '1, 0, 0', 0, 1, '-1, 1, 1'],
          ]}
        />
        <p style={{ marginTop: 12 }}>
          Row 1: the sum is 0, and step(0) = 1, so O = 1 but T = 0. Only <M>{'w_0'}</M> changes, because <M>{'I_1 = I_2 = 0'}</M>. Row 4: the sum is -1, so O = 0 but T = 1, and every weight increases by <M>{'1 \\cdot (1 - 0) \\cdot I_i'}</M>. Row 5 starts the second pass: the sum is 0 again, so O = 1 and <M>{'w_0'}</M> drops. The trainer above continues this run.
        </p>
      </Section>

      <Section id="convergence" title="Convergence theorem">
        <p>
          If the training examples are linearly separable, the perceptron learning rule finds weights that classify all of them correctly in a finite number of steps, for any initial weights and any positive learning rate. If they are not separable, there is no such guarantee and the weights never settle.
        </p>
      </Section>
      <SeparableLab />

      <Section id="traps" title="Common mistakes">
        <Trap>
          <ul>
            <li>Forgetting the bias input. Without <M>{'I_0 = 1'}</M> the line must pass through the origin.</li>
            <li>Updating when the output was already correct. The rule changes weights only when <M>{'T \\neq O'}</M>.</li>
            <li>The step function outputs 1 when the sum is <M>{'\\ge 0'}</M>. A sum of exactly 0 gives O = 1, which matters on the very first row when all weights start at 0.</li>
            <li>Claiming a single perceptron can learn XOR. It cannot; you need a hidden layer.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="Give weights and a threshold for OR with two inputs.">w1 = w2 = 1 and threshold 0.5. One active input gives a sum of 1 &gt; 0.5.</Check>
        <Check q="Weights (0, 1, 1), input (1, 0, 0), target 0, α = 0.5. What are the new weights?">The sum is 0, so O = 1 and T - O = -1. New weights: (0 - 0.5, 1 - 0, 1 - 0) = (-0.5, 1, 1).</Check>
        <Check q="Why can no single perceptron compute XOR?">The points (0, 1) and (1, 0) have output 1, the points (0, 0) and (1, 1) have output 0. They sit on opposite corners of the square, so no straight line puts both 1s on one side and both 0s on the other.</Check>
        <Check q="Does a smaller learning rate change whether the perceptron converges?">No. On separable data it still converges. With zero initial weights, scaling α just scales all the weights, so the decision line is the same.</Check>
      </Section>
    </>
  )
}
