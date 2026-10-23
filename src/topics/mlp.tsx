import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Heat, Label, Line, Plot, VLine } from '../components/Plot'
import { Btn, Legend, Readout, Seg, Slider, Stat, SERIES_HEX, seriesColor } from '../components/ui'
import { act, dact, forward, initNet, sig, trainEpoch, type Act, type Net } from '../lib/c-mlp'
import { make2D } from '../lib/datasets'
import { fmt, gauss, rng } from '../lib/stats'

type DataId = 'xor' | 'moons' | 'circles'

function makeData(id: DataId) {
  if (id === 'xor') {
    const r = rng(14)
    return Array.from({ length: 160 }, (_, i) => {
      const cx = i % 2
      const cy = Math.floor(i / 2) % 2
      return { x: (cx ? 0.7 : -0.7) + gauss(r) * 0.25, y: (cy ? 0.7 : -0.7) + gauss(r) * 0.25, label: cx ^ cy }
    })
  }
  return make2D(id, 180, 6, 0.08).map((p) => ({ x: (p.x - 0.5) * 3, y: (p.y - 0.5) * 3, label: p.label }))
}

function TrainLab() {
  const [dataId, setDataId] = useState<DataId>('xor')
  const [hidden, setHidden] = useState(4)
  const [lr, setLr] = useState(0.5)
  const [a, setA] = useState<Act>('tanh')
  const [seed, setSeed] = useState(1)
  const [running, setRunning] = useState(false)
  const [, setTick] = useState(0)
  const data = useMemo(() => makeData(dataId), [dataId])
  const net = useRef<Net>(initNet(4, 'tanh', 1))
  const lin = useRef({ w: [0, 0, 0] })
  const epoch = useRef(0)
  const hist = useRef<{ loss: number; acc: number }[]>([])

  const reset = (h = hidden, act2 = a, s = seed) => {
    net.current = initNet(h, act2, s)
    lin.current = { w: [0, 0, 0] }
    epoch.current = 0
    hist.current = []
    setRunning(false)
    setTick((t) => t + 1)
  }

  const train = (n: number) => {
    let last = { loss: 0, acc: 0 }
    for (let i = 0; i < n; i++) {
      last = trainEpoch(net.current, data, lr, hidden === 0 ? lin.current : null)
      epoch.current++
      if (epoch.current % 5 === 0) hist.current.push(last)
    }
    if (hist.current.length > 400) hist.current = hist.current.filter((_, i) => i % 2 === 0)
    setTick((t) => t + 1)
    return last
  }

  useEffect(() => {
    if (!running) return
    const slow = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = window.setInterval(() => {
      train(slow ? 300 : 15)
      if (epoch.current >= 5000) setRunning(false)
    }, slow ? 500 : 40)
    return () => window.clearInterval(id)
  }, [running, data, lr, hidden])

  const predict = (x: number, y: number) => {
    if (hidden === 0) return sig(lin.current.w[0] + lin.current.w[1] * x + lin.current.w[2] * y)
    return forward(net.current, x, y).out
  }
  const regionFn = (x: number, y: number) => {
    const p = predict(x, y)
    return { color: SERIES_HEX[p > 0.5 ? 1 : 0], opacity: 0.06 + Math.abs(p - 0.5) * 0.36 }
  }
  const last = hist.current[hist.current.length - 1]
  const acc = data.filter((d) => (predict(d.x, d.y) > 0.5 ? 1 : 0) === d.label).length / data.length
  const maxLoss = Math.max(0.8, ...hist.current.map((h) => h.loss))

  return (
    <Lab
      title="Train a small network live"
      desc="Two inputs, one hidden layer, one sigmoid output. Press Train and watch backpropagation bend the decision boundary."
      controls={
        <>
          <Seg label="Dataset" value={dataId} onChange={(v) => { setDataId(v); reset() }} options={[{ v: 'xor', label: 'XOR' }, { v: 'moons', label: 'Moons' }, { v: 'circles', label: 'Rings' }]} />
          <Slider label="Hidden units" value={hidden} min={0} max={8} onChange={(v) => { setHidden(v); reset(v) }} fmt={(v) => (v === 0 ? '0 (no hidden layer)' : String(v))} />
          <Seg label="Hidden activation" value={a} onChange={(v) => { setA(v); reset(hidden, v) }} options={[{ v: 'sigmoid', label: 'sigmoid' }, { v: 'tanh', label: 'tanh' }, { v: 'relu', label: 'ReLU' }]} />
          <Slider label="Learning rate" value={lr} min={0.05} max={2} step={0.05} onChange={setLr} fmt={(v) => fmt(v, 2)} />
          <div className="row">
            <Btn variant="primary" onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Train'}</Btn>
            <Btn onClick={() => train(1)} disabled={running}>One epoch</Btn>
          </div>
          <div className="row">
            <Btn sm onClick={() => reset()}>Reset weights</Btn>
            <Btn sm variant="ghost" onClick={() => { const s = seed + 1; setSeed(s); reset(hidden, a, s) }}>New random start</Btn>
          </div>
        </>
      }
      notes={[
        'Set hidden units to 0 on XOR. The model is then plain logistic regression, a single straight boundary, and accuracy stays near 50%.',
        'With 2 to 4 hidden units XOR is solved: each hidden unit draws one line and the output combines them.',
        'Raise the learning rate to 2. Loss drops faster at first but can bounce or stall. Very small rates are stable but slow.',
        'Rings need a closed boundary. Count how many hidden units it takes before the network wraps around the inner ring.',
      ]}
    >
      <div className="grid c2">
        <Plot w={380} h={360} x={[-1.6, 1.6]} y={[-1.6, 1.6]} xLabel="x1" yLabel="x2" xTicks={4} yTicks={4} label="Data and network decision regions">
          <Heat res={38} fn={regionFn} />
          {data.map((d, i) => (
            <Dot key={i} x={d.x} y={d.y} r={3.6} color={seriesColor(d.label)} shape={d.label} />
          ))}
        </Plot>
        <div>
          <span className="label">Network (line width = weight size, blue positive, orange negative)</span>
          <NetDiagram net={net.current} hidden={hidden} lin={lin.current.w} />
          <span className="label">Training loss (cross-entropy)</span>
          <Plot w={360} h={150} x={[0, Math.max(10, hist.current.length * 5)]} y={[0, maxLoss]} xTicks={4} yTicks={3} label="Loss over epochs" yFmt={(v) => fmt(v, 1)}>
            <Line pts={hist.current.map((h, i) => ({ x: (i + 1) * 5, y: h.loss }))} color={seriesColor(0)} />
          </Plot>
        </div>
      </div>
      <Legend items={[{ label: 'class 0', color: seriesColor(0), shape: 0 }, { label: 'class 1', color: seriesColor(1), shape: 1 }]} />
      <Readout>
        <Stat k="Epoch" v={epoch.current} />
        <Stat k="Loss" v={last ? fmt(last.loss, 3) : '-'} />
        <Stat k="Accuracy" v={fmt(acc, 3)} />
        <Stat k="Parameters" v={hidden === 0 ? 3 : hidden * 4 + 1} />
      </Readout>
    </Lab>
  )
}

function NetDiagram({ net, hidden, lin }: { net: Net; hidden: number; lin: number[] }) {
  const hy = (j: number) => (hidden === 1 ? 0.5 : 0.08 + (0.84 * j) / Math.max(1, hidden - 1))
  const inY = [0.7, 0.3]
  const maxW = Math.max(1, ...net.W1.flat().map(Math.abs), ...net.W2.map(Math.abs), ...lin.map(Math.abs))
  const width = (w: number) => 0.6 + (5 * Math.abs(w)) / maxW
  const col = (w: number) => (w >= 0 ? seriesColor(0) : seriesColor(1))
  return (
    <Plot w={360} h={200} x={[0, 1]} y={[0, 1]} axes={false} grid={false} label="Network diagram">
      {hidden === 0
        ? inY.map((y, i) => <Line key={i} pts={[{ x: 0.12, y }, { x: 0.88, y: 0.5 }]} color={col(lin[i + 1])} width={width(lin[i + 1])} />)
        : net.W1.map((w, j) => (
            <g key={j}>
              {inY.map((y, i) => (
                <Line key={i} pts={[{ x: 0.12, y }, { x: 0.5, y: hy(j) }]} color={col(w[i])} width={width(w[i])} opacity={0.85} />
              ))}
              <Line pts={[{ x: 0.5, y: hy(j) }, { x: 0.88, y: 0.5 }]} color={col(net.W2[j])} width={width(net.W2[j])} opacity={0.85} />
            </g>
          ))}
      {inY.map((y, i) => (
        <g key={'i' + i}>
          <Dot x={0.12} y={y} r={9} color="var(--surface-3)" stroke="var(--ink-3)" />
          <Label x={0.12} y={y} dx={-14} dy={4} anchor="end">{`x${i + 1}`}</Label>
        </g>
      ))}
      {Array.from({ length: hidden }, (_, j) => (
        <Dot key={'h' + j} x={0.5} y={hy(j)} r={8} color="var(--surface-3)" stroke="var(--ink-3)" />
      ))}
      <Dot x={0.88} y={0.5} r={10} color="var(--surface-3)" stroke="var(--ink)" />
      <Label x={0.88} y={0.5} dx={16} dy={4}>out</Label>
    </Plot>
  )
}

function ActLab() {
  const [a, setA] = useState<Act>('sigmoid')
  const [z, setZ] = useState(1)
  const xs = Array.from({ length: 121 }, (_, i) => -6 + i * 0.1)
  return (
    <Lab
      title="Activation functions and their slopes"
      desc="Backpropagation multiplies by the slope of the activation at every layer. Flat regions mean tiny gradients and slow learning."
      controls={
        <>
          <Seg label="Function" value={a} onChange={setA} options={[{ v: 'sigmoid', label: 'sigmoid' }, { v: 'tanh', label: 'tanh' }, { v: 'relu', label: 'ReLU' }]} />
          <Slider label="Net input z" value={z} min={-6} max={6} step={0.1} onChange={setZ} fmt={(v) => fmt(v, 1)} />
        </>
      }
      notes={['The sigmoid slope is at most 0.25 (at z = 0). Through many layers those small factors multiply and gradients vanish.', 'ReLU has slope 1 for every positive input, which is one reason deep networks prefer it. For negative input its slope is 0.']}
    >
      <Plot w={560} h={280} x={[-6, 6]} y={[-1.2, a === 'relu' ? 6 : 1.2]} xLabel="z" xTicks={6} yTicks={4} label="Activation function and derivative">
        <VLine x={z} color="var(--ink-4)" />
        <Line pts={xs.map((x) => ({ x, y: act(a, x) }))} color={seriesColor(0)} width={2.5} />
        <Line pts={xs.map((x) => ({ x, y: dact(a, x) }))} color={seriesColor(1)} dash="5 4" />
        <Dot x={z} y={act(a, z)} r={6} color={seriesColor(0)} />
        <Dot x={z} y={dact(a, z)} r={6} color={seriesColor(1)} shape={1} />
      </Plot>
      <Legend items={[{ label: 'f(z)', color: seriesColor(0) }, { label: "slope f'(z)", color: seriesColor(1), shape: 1 }]} />
      <Readout>
        <Stat k="f(z)" v={fmt(act(a, z), 4)} />
        <Stat k="f'(z)" v={fmt(dact(a, z), 4)} />
      </Readout>
    </Lab>
  )
}

function StepLab() {
  const [x1, setX1] = useState(1)
  const [x2, setX2] = useState(0.5)
  const [w1, setW1] = useState(0.2)
  const [w2, setW2] = useState(-0.4)
  const [b, setB] = useState(0.1)
  const [t, setT] = useState(1)
  const [lr, setLr] = useState(0.5)
  const net = w1 * x1 + w2 * x2 + b
  const o = sig(net)
  const err = 0.5 * (t - o) ** 2
  const delta = (t - o) * o * (1 - o)
  const nw = [w1 + lr * delta * x1, w2 + lr * delta * x2, b + lr * delta]
  const o2 = sig(nw[0] * x1 + nw[1] * x2 + nw[2])
  return (
    <Lab
      title="One backpropagation step by hand"
      desc="A single sigmoid neuron with squared error. Every number an exam would ask for is computed below as you change the inputs."
      controls={
        <>
          <Slider label="x1" value={x1} min={-1} max={1} step={0.1} onChange={setX1} fmt={(v) => fmt(v, 1)} />
          <Slider label="x2" value={x2} min={-1} max={1} step={0.1} onChange={setX2} fmt={(v) => fmt(v, 1)} />
          <Slider label="w1" value={w1} min={-1} max={1} step={0.1} onChange={setW1} fmt={(v) => fmt(v, 1)} />
          <Slider label="w2" value={w2} min={-1} max={1} step={0.1} onChange={setW2} fmt={(v) => fmt(v, 1)} />
          <Slider label="bias b" value={b} min={-1} max={1} step={0.1} onChange={setB} fmt={(v) => fmt(v, 1)} />
          <Seg label="Target T" value={t} onChange={setT} options={[{ v: 0, label: '0' }, { v: 1, label: '1' }]} />
          <Slider label="learning rate η" value={lr} min={0.1} max={2} step={0.1} onChange={setLr} fmt={(v) => fmt(v, 1)} />
        </>
      }
      notes={['After the step the output always moves toward the target, and the error drops.', 'If the output is already close to 0 or 1, O(1 - O) is tiny, so the update is tiny too even when the answer is wrong.']}
    >
      <Table
        head={['Quantity', 'Formula', 'Value']}
        num={[2]}
        rows={[
          ['Net input', <M>{'net = w_1x_1 + w_2x_2 + b'}</M>, fmt(net, 4)],
          ['Output', <M>{'O = \\sigma(net) = 1 / (1 + e^{-net})'}</M>, fmt(o, 4)],
          ['Error', <M>{'E = \\tfrac12 (T - O)^2'}</M>, fmt(err, 4)],
          ['Delta', <M>{'\\delta = (T - O)\\,O(1 - O)'}</M>, fmt(delta, 4)],
          ['New w1', <M>{'w_1 + \\eta\\,\\delta\\,x_1'}</M>, fmt(nw[0], 4)],
          ['New w2', <M>{'w_2 + \\eta\\,\\delta\\,x_2'}</M>, fmt(nw[1], 4)],
          ['New b', <M>{'b + \\eta\\,\\delta'}</M>, fmt(nw[2], 4)],
          ['Output after step', '', fmt(o2, 4)],
          ['Error after step', '', fmt(0.5 * (t - o2) ** 2, 4)],
        ]}
      />
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader group="Classification" title="Neural networks" lede="One perceptron draws one straight line. Put layers of them together, swap the hard threshold for a smooth function, and the network can draw almost any boundary. Backpropagation is how it learns the weights." minutes={30} />

      <Plain>
        <p>
          A hidden layer is a team of simple detectors. Each one answers a small yes-or-no question, like "is the point above this line?". The output unit combines their answers. With enough detectors the combination can trace curves, rings and islands that no single line could.
        </p>
      </Plain>

      <Section id="structure" title="Structure" kicker="Multilayer perceptron">
        <ul>
          <li><strong>Input layer</strong>: one unit per attribute. It only passes values on.</li>
          <li><strong>Hidden layers</strong>: each unit computes a weighted sum of the previous layer and applies a nonlinear activation such as sigmoid.</li>
          <li><strong>Output layer</strong>: one unit for a two-class problem (output read as a probability), or one per class.</li>
          <li>Feed-forward: signals go from input to output with no loops.</li>
        </ul>
        <Formula title="One unit">
          <MB>{'O_j = f\\Big(\\sum_i w_{ij} O_i + \\theta_j\\Big), \\qquad \\sigma(z) = \\frac{1}{1 + e^{-z}}'}</MB>
          <p>
            The sigmoid replaces the perceptron's hard step with a smooth S curve. Smooth means it has a derivative, <M>{"\\sigma'(z) = \\sigma(z)(1 - \\sigma(z))"}</M>, and that is what makes gradient-based learning possible.
          </p>
        </Formula>
      </Section>

      <TrainLab />

      <Section id="backprop" title="Backpropagation" kicker="How it learns">
        <ol>
          <li>Initialize all weights to small random values (not all zero, or every hidden unit learns the same thing).</li>
          <li><strong>Forward pass</strong>: compute every unit's output, layer by layer.</li>
          <li>Compute the error at the output.</li>
          <li><strong>Backward pass</strong>: send the error back through the network. Each unit gets a share of blame proportional to its weights.</li>
          <li>Move every weight a small step against its gradient. Repeat over many epochs.</li>
        </ol>
        <Formula title="Error terms with sigmoid units">
          <MB>{'\\text{output unit: } Err_j = O_j(1 - O_j)(T_j - O_j)'}</MB>
          <MB>{'\\text{hidden unit: } Err_j = O_j(1 - O_j)\\sum_k Err_k\\, w_{jk}'}</MB>
          <MB>{'w_{ij} \\leftarrow w_{ij} + \\eta\\, Err_j\\, O_i, \\qquad \\theta_j \\leftarrow \\theta_j + \\eta\\, Err_j'}</MB>
        </Formula>
      </Section>

      <StepLab />
      <ActLab />

      <Section id="practice" title="In practice" kicker="Strengths and weaknesses">
        <Table
          head={['Strength', 'Weakness']}
          rows={[
            ['Learns nonlinear boundaries', 'Long training time'],
            ['Tolerates noisy data', 'Many choices: layers, units, learning rate, epochs'],
            ['Works on numeric inputs of many kinds (images, text embeddings)', 'Hard to interpret: the knowledge is spread over weights'],
            ['Fast prediction once trained', 'Can overfit; needs a validation set to stop in time'],
          ]}
        />
        <Trap>
          <ul>
            <li>Normalize inputs (for example to [0, 1]) before training. Large inputs saturate the sigmoid and gradients vanish.</li>
            <li>Categorical attributes need one input unit per value (one-hot encoding).</li>
            <li>Zero initial weights make all hidden units identical forever. Use small random values.</li>
            <li>The perceptron rule and backpropagation are different. The perceptron updates only on mistakes with a hard threshold; backprop uses gradients of a smooth error.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="Why can a network with one hidden layer solve XOR when a perceptron cannot?">Each hidden unit can draw a separate line (for example OR and NAND). The output unit combines them (AND), which carves out the two opposite corners.</Check>
        <Check q="A sigmoid output unit gives O = 0.6 with target 1. What is its error term?">Err = O(1 - O)(T - O) = 0.6 × 0.4 × 0.4 = 0.096.</Check>
        <Check q="What does the learning rate control?">The size of each weight step. Too large and training overshoots or oscillates; too small and it takes many epochs to converge.</Check>
        <Check q="Why is a smooth activation needed for backpropagation?">The weight updates use the derivative of the activation. A hard step has derivative zero almost everywhere, so no error signal would flow back.</Check>
      </Section>
    </>
  )
}
