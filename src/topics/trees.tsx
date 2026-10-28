import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, Heat, Line, Plot, Rect, Tip, VLine } from '../components/Plot'
import { Btn, Legend, Readout, Seg, Slider, Stat, Toggle, SERIES_HEX, seriesColor } from '../components/ui'
import { counts, evalSplit, growTree, predictTree, treeSize, type LP } from '../lib/tree'
import { BUYS_COMPUTER, PLAY_TENNIS, make2D, type Row } from '../lib/datasets'
import { entropy, fmt, gini } from '../lib/stats'

function ImpurityLab() {
  const [p, setP] = useState(0.3)
  const xs = Array.from({ length: 101 }, (_, i) => i / 100)
  const ent = (q: number) => entropy([q, 1 - q])
  const gin = (q: number) => gini([q, 1 - q])
  const mis = (q: number) => 1 - Math.max(q, 1 - q)
  return (
    <Lab
      title="Three ways to measure impurity"
      desc="Two classes, p is the fraction in class 1. All three are 0 for a pure node and peak at p = 0.5."
      controls={<Slider label="p (fraction of class 1)" value={p} min={0} max={1} step={0.01} onChange={setP} fmt={(v) => v.toFixed(2)} />}
      notes={['Set p = 0.5: entropy is 1 bit, Gini 0.5. Entropy and Gini are smooth curves, so small purity gains still register; misclassification error often misses them.']}
    >
      <Plot w={560} h={300} x={[0, 1]} y={[0, 1]} xLabel="p" yLabel="impurity" label="Entropy, Gini and misclassification error versus p">
        <Line pts={xs.map((x) => ({ x, y: ent(x) }))} color={seriesColor(0)} />
        <Line pts={xs.map((x) => ({ x, y: gin(x) }))} color={seriesColor(1)} dash="6 3" />
        <Line pts={xs.map((x) => ({ x, y: mis(x) }))} color={seriesColor(2)} dash="2 3" />
        <VLine x={p} color="var(--ink-4)" />
        <Dot x={p} y={ent(p)} r={5} color={seriesColor(0)} shape={0} />
        <Dot x={p} y={gin(p)} r={5} color={seriesColor(1)} shape={1} />
        <Dot x={p} y={mis(p)} r={5} color={seriesColor(2)} shape={2} />
      </Plot>
      <Legend items={[{ label: 'Entropy (bits)', color: seriesColor(0), shape: 0 }, { label: 'Gini index', color: seriesColor(1), shape: 1 }, { label: 'Misclassification error', color: seriesColor(2), shape: 2 }]} />
      <Readout>
        <Stat k="Entropy" v={fmt(ent(p), 3)} />
        <Stat k="Gini" v={fmt(gin(p), 3)} />
        <Stat k="Misclassification" v={fmt(mis(p), 3)} />
      </Readout>
    </Lab>
  )
}

type Path = [string, string][]
type TNode = { key: string; path: Path; rows: Row[]; attr?: string; kids: { value: string; node: TNode }[]; x: number; depth: number }

const keyOf = (path: Path) => path.map(([a, v]) => `${a}=${v}`).join('&') || 'root'

const DATA = { buys: BUYS_COMPUTER, tennis: PLAY_TENNIS }

function TreeBuilderLab() {
  const [ds, setDs] = useState<'buys' | 'tennis'>('buys')
  const data = DATA[ds]
  const classes = [...new Set(data.rows.map((r) => r[data.target]))].sort().reverse()
  const [splits, setSplits] = useState<Record<string, string>>({})
  const [sel, setSel] = useState('root')

  const tree = useMemo(() => {
    let leaf = 0
    const build = (path: Path, rows: Row[], depth: number): TNode => {
      const key = keyOf(path)
      const attr = splits[key]
      const node: TNode = { key, path, rows, attr, kids: [], x: 0, depth }
      if (attr) {
        const values = [...new Set(rows.map((r) => r[attr]))].sort()
        node.kids = values.map((v) => ({ value: v, node: build([...path, [attr, v]], rows.filter((r) => r[attr] === v), depth + 1) }))
        node.x = node.kids.reduce((s, k) => s + k.node.x, 0) / node.kids.length
      } else node.x = leaf++
      return node
    }
    const root = build([], data.rows, 0)
    return { root, leaves: leaf }
  }, [splits, data])

  const all: TNode[] = []
  const walk = (n: TNode) => {
    all.push(n)
    n.kids.forEach((k) => walk(k.node))
  }
  walk(tree.root)
  const selected = all.find((n) => n.key === sel) ?? tree.root
  const used = selected.path.map(([a]) => a)
  const free = data.columns.filter((c) => !used.includes(c))
  const nodeCounts = counts(selected.rows, data.target, classes)
  const evals = free.map((a) => evalSplit(selected.rows, a, data.target, classes))
  const bestGain = Math.max(...evals.map((e) => e.gain), -1)

  const split = (key: string, attr: string) => {
    setSplits((s) => {
      const n = { ...s }
      Object.keys(n).forEach((k) => {
        if (k !== key && k.startsWith(key === 'root' ? '' : key + '&')) delete n[k]
      })
      n[key] = attr
      return n
    })
  }
  const unsplit = (key: string) =>
    setSplits((s) => {
      const n = { ...s }
      Object.keys(n).forEach((k) => {
        if (k === key || (key !== 'root' && k.startsWith(key + '&')) || key === 'root') delete n[k]
      })
      return n
    })

  const auto = () => {
    const out: Record<string, string> = {}
    const go = (path: Path, rows: Row[]) => {
      const c = counts(rows, data.target, classes)
      const usedA = path.map(([a]) => a)
      const freeA = data.columns.filter((x) => !usedA.includes(x))
      if (c.filter((v) => v > 0).length <= 1 || !freeA.length) return
      const best = freeA.map((a) => evalSplit(rows, a, data.target, classes)).sort((a, b) => b.gain - a.gain)[0]
      out[keyOf(path)] = best.attr
      ;[...new Set(rows.map((r) => r[best.attr]))].forEach((v) => go([...path, [best.attr, v]], rows.filter((r) => r[best.attr] === v)))
    }
    go([], data.rows)
    setSplits(out)
  }

  const W = 600
  const maxDepth = Math.max(...all.map((n) => n.depth))
  const H = 70 + maxDepth * 92
  const spacing = W / Math.max(1, tree.leaves)
  const nx = (n: TNode) => spacing * (n.x + 0.5)
  const ny = (n: TNode) => 30 + n.depth * 92
  const bw = Math.min(118, spacing - 8)

  return (
    <Lab
      title="Build a decision tree by hand"
      desc="Click a node, then Split on an attribute from the table."
      controls={
        <>
          <Seg label="Dataset" value={ds} onChange={(v) => { setDs(v); setSplits({}); setSel('root') }} options={[{ v: 'buys', label: 'buys_computer' }, { v: 'tennis', label: 'play tennis' }]} />
          <Btn variant="primary" onClick={auto}>Grow with ID3 (max gain)</Btn>
          <Btn onClick={() => { setSplits({}); setSel('root') }}>Clear tree</Btn>
          <p style={{ fontSize: 13, margin: 0 }}>
            Selected node: <strong>{selected.key === 'root' ? 'root' : selected.path.map(([a, v]) => `${a} = ${v}`).join(', ')}</strong>
          </p>
        </>
      }
      notes={[
        'At the root of buys_computer, age has the highest gain. Split on it: the middle_aged branch is pure right away.',
        'Split the root on income instead. The tree needs more nodes to reach pure leaves.',
        'On play tennis, compare the Gain and GainRatio columns for attributes with 2 vs 3 values.',
      ]}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="plot" style={{ width: '100%', maxWidth: 720 }} role="img" aria-label="Decision tree diagram">
        {all.map((n) =>
          n.kids.map((k) => (
            <g key={n.key + k.value}>
              <line x1={nx(n)} y1={ny(n) + 20} x2={nx(k.node)} y2={ny(k.node) - 20} stroke="var(--line-2)" strokeWidth={1.5} />
              <text x={(nx(n) + nx(k.node)) / 2} y={(ny(n) + ny(k.node)) / 2 + 4} textAnchor="middle" fontSize={10.5} fill="var(--ink-2)" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>
                {k.value}
              </text>
            </g>
          )),
        )}
        {all.map((n) => {
          const c = counts(n.rows, data.target, classes)
          const pure = c.filter((v) => v > 0).length <= 1
          const maj = classes[c.indexOf(Math.max(...c))]
          const isSel = n.key === selected.key
          return (
            <g key={n.key} transform={`translate(${nx(n) - bw / 2},${ny(n) - 20})`} onClick={() => setSel(n.key)} style={{ cursor: 'pointer' }}>
              <rect width={bw} height={40} rx={9} fill={n.attr ? 'var(--surface-3)' : pure ? SERIES_HEX[classes.indexOf(maj)] + '33' : 'var(--surface-2)'} stroke={isSel ? 'var(--accent)' : 'var(--line-2)'} strokeWidth={isSel ? 2 : 1} />
              <text x={bw / 2} y={17} textAnchor="middle" fontSize={11.5} fill="var(--ink)">
                {n.attr ? `${n.attr}?` : pure ? `${data.target} = ${maj}` : 'not split'}
              </text>
              <text x={bw / 2} y={31} textAnchor="middle" fontSize={10} fill="var(--ink-3)" fontFamily="var(--mono)">
                {classes.map((cl, i) => `${cl} ${c[i]}`).join(' / ')}
              </text>
            </g>
          )
        })}
      </svg>
      <Readout>
        <Stat k="Records at node" v={selected.rows.length} sub={classes.map((c, i) => `${c} ${nodeCounts[i]}`).join(', ')} />
        <Stat k="Info(D)" v={fmt(entropy(nodeCounts), 3)} sub="bits" />
        <Stat k="Gini(D)" v={fmt(gini(nodeCounts), 3)} />
      </Readout>
      <div style={{ marginTop: 12 }}>
        {free.length && nodeCounts.filter((v) => v > 0).length > 1 ? (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th className="num">Info_A(D)</th>
                  <th className="num">Gain</th>
                  <th className="num">SplitInfo</th>
                  <th className="num">GainRatio</th>
                  <th className="num">Gini after</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {evals.map((e) => (
                  <tr key={e.attr} className={e.gain === bestGain ? 'hl' : ''}>
                    <td>{e.attr}</td>
                    <td className="num">{fmt(e.infoAfter, 3)}</td>
                    <td className="num">{fmt(e.gain, 3)}</td>
                    <td className="num">{fmt(e.splitInfo, 3)}</td>
                    <td className="num">{fmt(e.gainRatio, 3)}</td>
                    <td className="num">{fmt(e.giniAfter, 3)}</td>
                    <td>
                      <button type="button" className="btn sm" onClick={() => split(selected.key, e.attr)}>
                        Split
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 13.5 }}>This node is pure or has no attributes left, so it becomes a leaf labeled with the majority class.</p>
        )}
        {selected.attr && (
          <div style={{ marginTop: 10 }}>
            <Btn sm variant="ghost" onClick={() => unsplit(selected.key)}>
              Remove this split
            </Btn>
          </div>
        )}
      </div>
    </Lab>
  )
}

const TEMPS: [number, string][] = [
  [64, 'yes'], [65, 'no'], [68, 'yes'], [69, 'yes'], [70, 'yes'], [71, 'no'], [72, 'no'],
  [72, 'yes'], [75, 'yes'], [75, 'yes'], [80, 'no'], [81, 'yes'], [83, 'yes'], [85, 'no'],
]

function ThresholdLab() {
  const [data, setData] = useState(TEMPS)
  const sorted = [...data].sort((a, b) => a[0] - b[0])
  const values = [...new Set(sorted.map((d) => d[0]))]
  const cuts = values.slice(0, -1).map((v, i) => (v + values[i + 1]) / 2)
  const base = entropy([sorted.filter((d) => d[1] === 'yes').length, sorted.filter((d) => d[1] === 'no').length])
  const evals = cuts.map((t) => {
    const L = sorted.filter((d) => d[0] <= t)
    const R = sorted.filter((d) => d[0] > t)
    const cl = [L.filter((d) => d[1] === 'yes').length, L.filter((d) => d[1] === 'no').length]
    const cr = [R.filter((d) => d[1] === 'yes').length, R.filter((d) => d[1] === 'no').length]
    const info = (L.length / sorted.length) * entropy(cl) + (R.length / sorted.length) * entropy(cr)
    return { t, cl, cr, gain: base - info }
  })
  const bestIdx = evals.reduce((b, e, i) => (e.gain > evals[b].gain ? i : b), 0)
  const [pick, setPick] = useState(bestIdx)
  const cur = evals[Math.min(pick, evals.length - 1)]
  const maxG = Math.max(...evals.map((e) => e.gain), 0.05)
  const stack: Record<number, number> = {}
  return (
    <Lab
      title="Splitting a continuous attribute"
      desc="Temperature for 14 days of play tennis. Click a point to flip its class."
      controls={
        <>
          <Slider label="Candidate cut" value={Math.min(pick, evals.length - 1)} min={0} max={evals.length - 1} onChange={setPick} fmt={(i) => `T <= ${evals[i]?.t ?? ''}`} />
          <Btn sm onClick={() => setPick(bestIdx)}>Jump to best cut</Btn>
          <Btn sm variant="ghost" onClick={() => setData(TEMPS)}>Reset classes</Btn>
        </>
      }
      notes={['Look at the gain bars: the best cut always sits between neighbors of different classes, so those are the only cuts worth checking.', 'Flip a few classes and watch the best cut move.']}
    >
      <Plot
        w={560}
        h={150}
        x={[62, 87]}
        y={[0, 5]}
        xLabel="temperature"
        yTicks={1}
        yTickValues={[]}
        label="Temperature values colored by class with the chosen cut"
        onDown={(p) => {
          const i = data.findIndex((d) => Math.abs(d[0] - p.x) < 0.6)
          if (i >= 0) setData((ds) => ds.map((d, j) => (j === i ? [d[0], d[1] === 'yes' ? 'no' : 'yes'] : d)))
        }}
      >
        <VLine x={cur.t} color="var(--ink)" dash="none" label={`cut ${cur.t}`} />
        {data.map((d, i) => {
          stack[d[0]] = (stack[d[0]] ?? 0) + 1
          const c = d[1] === 'yes' ? 0 : 1
          return <Dot key={i} x={d[0]} y={stack[d[0]] * 1.2} r={7} color={seriesColor(c)} shape={c} />
        })}
      </Plot>
      <Legend items={[{ label: 'play = yes', color: seriesColor(0), shape: 0 }, { label: 'play = no', color: seriesColor(1), shape: 1 }]} />
      <span className="label">Information gain of every candidate cut</span>
      <Plot w={560} h={200} x={[62, 87]} y={[0, maxG * 1.15]} xLabel="cut point" yLabel="gain" yTicks={3} label="Gain per candidate cut" yFmt={(v) => fmt(v, 2)}>
        {evals.map((e, i) => (
          <Rect key={i} x0={e.t - 0.35} x1={e.t + 0.35} y0={0} y1={e.gain} rx={2} color={i === Math.min(pick, evals.length - 1) ? 'var(--s1)' : 'var(--ink-4)'} onEnter={() => setPick(i)} />
        ))}
      </Plot>
      <Readout>
        <Stat k="Info(D)" v={fmt(base, 3)} />
        <Stat k="Left (T <= cut)" v={`${cur.cl[0]} yes, ${cur.cl[1]} no`} />
        <Stat k="Right" v={`${cur.cr[0]} yes, ${cur.cr[1]} no`} />
        <Stat k="Gain" v={fmt(cur.gain, 3)} sub={pick === bestIdx ? 'best cut' : `best is ${evals[bestIdx].t}`} />
      </Readout>
    </Lab>
  )
}

function OverfitLab() {
  const [depth, setDepth] = useState(3)
  const [noise, setNoise] = useState(0.22)
  const [showTest, setShowTest] = useState(false)
  const train: LP[] = useMemo(() => make2D('moons', 160, 31, noise), [noise])
  const test: LP[] = useMemo(() => make2D('moons', 300, 77, noise), [noise])
  const curve = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const t = growTree(train, i + 1)
        const acc = (pts: LP[]) => pts.filter((p) => predictTree(t, p) === p.label).length / pts.length
        return { d: i + 1, tree: t, train: acc(train), test: acc(test) }
      }),
    [train, test],
  )
  const cur = curve[depth - 1]
  const fn = useMemo(() => (x: number, y: number) => ({ color: SERIES_HEX[predictTree(cur.tree, { x, y })], opacity: 0.16 }), [cur])
  const [hover, setHover] = useState<number | null>(null)
  const bestTest = curve.reduce((b, c) => (c.test > b.test ? c : b), curve[0])
  return (
    <Lab
      title="Depth vs overfitting"
      desc="A tree learns two noisy half-moons with axis-parallel splits."
      controls={
        <>
          <Slider label="max_depth" value={depth} min={1} max={12} onChange={setDepth} />
          <Slider label="Label noise" value={noise} min={0.05} max={0.4} step={0.01} onChange={setNoise} fmt={(v) => v.toFixed(2)} />
          <Toggle on={showTest} onChange={setShowTest}>Show test points instead of training</Toggle>
        </>
      }
      notes={[
        'Drag max_depth to 12: training accuracy nears 100% while test accuracy stalls or drops. That gap is overfitting.',
        'Pre-pruning tries to stop at the best test depth, using a validation set instead of the test set.',
      ]}
    >
      <Plot w={560} h={360} x={[0, 1]} y={[0, 1]} label="Decision regions of the tree with data points" onMove={(p) => {
        const pts = showTest ? test : train
        let b = -1
        let bd = 0.02
        pts.forEach((q, i) => {
          const d = Math.hypot(q.x - p.x, q.y - p.y)
          if (d < bd) {
            bd = d
            b = i
          }
        })
        setHover(b >= 0 ? b : null)
      }} onLeave={() => setHover(null)}>
        <Heat res={70} fn={fn} />
        {(showTest ? test : train).map((p, i) => (
          <Dot key={i} x={p.x} y={p.y} r={3.8} color={seriesColor(p.label)} shape={p.label} />
        ))}
        {hover !== null && (() => {
          const p = (showTest ? test : train)[hover]
          if (!p) return null
          const pr = predictTree(cur.tree, p)
          return <Tip x={p.x} y={p.y} lines={[`class ${p.label}`, `predicted ${pr}`, pr === p.label ? 'correct' : 'wrong']} />
        })()}
      </Plot>
      <Legend items={[{ label: 'Class 0', color: seriesColor(0), shape: 0 }, { label: 'Class 1', color: seriesColor(1), shape: 1 }]} />
      <span className="label">Accuracy vs max_depth</span>
      <Plot w={560} h={200} x={[1, 12]} y={[0.5, 1]} xLabel="max_depth" yLabel="accuracy" xTicks={11} yTicks={5} label="Training and test accuracy by depth">
        <VLine x={depth} color="var(--ink-4)" />
        <Line pts={curve.map((c) => ({ x: c.d, y: c.train }))} color={seriesColor(0)} />
        <Line pts={curve.map((c) => ({ x: c.d, y: c.test }))} color={seriesColor(1)} dash="6 3" />
        {curve.map((c) => (
          <g key={c.d}>
            <Dot x={c.d} y={c.train} r={3} color={seriesColor(0)} shape={0} />
            <Dot x={c.d} y={c.test} r={3} color={seriesColor(1)} shape={1} />
          </g>
        ))}
      </Plot>
      <Legend items={[{ label: 'Training accuracy', color: seriesColor(0), shape: 0 }, { label: 'Test accuracy (dashed)', color: seriesColor(1), shape: 1 }]} />
      <Readout>
        <Stat k="Train accuracy" v={`${(cur.train * 100).toFixed(1)}%`} />
        <Stat k="Test accuracy" v={`${(cur.test * 100).toFixed(1)}%`} />
        <Stat k="Nodes" v={treeSize(cur.tree)} />
        <Stat k="Best test depth" v={bestTest.d} />
      </Readout>
    </Lab>
  )
}

function WorkedTable() {
  const rows = BUYS_COMPUTER.rows
  const e = evalSplit(rows, 'age', 'buys_computer', ['yes', 'no'])
  return (
    <Table
      head={['age', 'yes', 'no', 'Info(D_v)', 'weight |D_v|/|D|']}
      num={[1, 2, 3, 4]}
      rows={e.parts.map((p) => [p.value, p.counts[0], p.counts[1], fmt(entropy(p.counts), 3), `${p.n}/14`])}
    />
  )
}

export default function Page() {
  const all = ['age', 'income', 'student', 'credit_rating'].map((a) => evalSplit(BUYS_COMPUTER.rows, a, 'buys_computer', ['yes', 'no']))
  return (
    <>
      <TopicHeader group="Classification" title="Decision trees" lede="Each node tests one attribute, each leaf names a class. The hard part is choosing which attribute to test first." />

      <Plain>
        <p>
          Like 20 questions: "Is it alive?" beats "Is it a toaster?" because it splits the options into groups that are easy to finish. A tree picks the attribute that leaves each group as close to one class as possible.
        </p>
      </Plain>

      <Section id="algorithm" title="The basic algorithm">
        <ol>
          <li>Start with all training records at the root.</li>
          <li>If all records at a node have the same class, make it a leaf with that class.</li>
          <li>If no attributes are left, make it a leaf with the majority class.</li>
          <li>Otherwise pick the best attribute by an attribute selection measure, create a branch for each of its outcomes, and repeat on each branch.</li>
        </ol>
        <p>Greedy, top-down, divide and conquer. ID3, C4.5 and CART all work this way, and no choice is ever revisited.</p>
      </Section>

      <Section id="impurity" title="Measuring purity">
        <Formula title="Entropy of a set of records">
          <MB>{'Info(D) = -\\sum_{i=1}^{m} p_i \\log_2 p_i'}</MB>
          <p>
            <M>{'p_i'}</M> is the fraction of records in class i. Entropy is 0 when the node is pure and <M>{'\\log_2 m'}</M> at most. A fair coin has entropy 1 bit.
          </p>
        </Formula>
      </Section>
      <ImpurityLab />

      <Section id="gain" title="Information gain and gain ratio">
        <Formula title="Information gain (ID3)">
          <MB>{'Info_A(D) = \\sum_{v=1}^{V} \\frac{|D_v|}{|D|} Info(D_v) \\qquad Gain(D, A) = Info(D) - Info_A(D)'}</MB>
          <p>Split on the attribute with the largest gain.</p>
        </Formula>
        <Formula title="Gain ratio (C4.5)">
          <MB>{'SplitInfo_A(D) = -\\sum_{v=1}^{V} \\frac{|D_v|}{|D|} \\log_2 \\frac{|D_v|}{|D|} \\qquad GainRatio(A) = \\frac{Gain(D, A)}{SplitInfo_A(D)}'}</MB>
          <p>Gain favors attributes with many values: an ID attribute gets perfect gain but predicts nothing. SplitInfo grows with the number of branches, so dividing by it removes that bias.</p>
        </Formula>
        <Formula title="Gini index (CART)">
          <MB>{'Gini(D) = 1 - \\sum_{i=1}^{m} p_i^2 \\qquad Gini_A(D) = \\sum_v \\frac{|D_v|}{|D|} Gini(D_v)'}</MB>
        </Formula>
      </Section>
      <TreeBuilderLab />

      <Section id="worked" title="Worked example: the root of buys_computer">
        <p>14 records: 9 yes and 5 no.</p>
        <MB>{'Info(D) = -\\tfrac{9}{14}\\log_2\\tfrac{9}{14} - \\tfrac{5}{14}\\log_2\\tfrac{5}{14} = 0.940'}</MB>
        <WorkedTable />
        <MB>{'Info_{age}(D) = \\tfrac{5}{14}(0.971) + \\tfrac{4}{14}(0) + \\tfrac{5}{14}(0.971) = 0.694'}</MB>
        <MB>{'Gain(D, age) = 0.940 - 0.694 = 0.246'}</MB>
        <Table
          head={['Attribute', 'Gain (exact)', 'Gain (textbook)']}
          num={[1, 2]}
          rows={all.map((e) => [e.attr, fmt(e.gain, 4), { age: '0.246', income: '0.029', student: '0.151', credit_rating: '0.048' }[e.attr] ?? ''])}
        />
        <p style={{ marginTop: 10 }}>
          The textbook subtracts rounded values, so it gets 0.246 and 0.151 instead of 0.2467 and 0.1518. Either is fine if you show the steps. age becomes the root.
        </p>
      </Section>

      <Section id="continuous" title="Continuous attributes">
        <p>
          Sort the values of A, take each midpoint between neighbors as a candidate t, compute the gain of <M>{'A \\le t'}</M> versus <M>{'A > t'}</M>, and keep the best. A can be tested again lower in the tree with another t.
        </p>
      </Section>
      <ThresholdLab />

      <Section id="pruning" title="Overfitting and pruning">
        <p>A fully grown tree memorizes noise in tiny leaves. Two fixes:</p>
        <ul>
          <li>
            <strong>Pre-pruning (early stopping).</strong> Stop when a node is too small, the tree too deep, or the best gain below a threshold. Cheap, but a weak split can hide strong ones below it.
          </li>
          <li>
            <strong>Post-pruning.</strong> Grow the full tree, then cut. <strong>Reduced-error pruning</strong>: on a validation set, try replacing each subtree with a leaf, remove the one that helps accuracy most, repeat until pruning hurts.
          </li>
        </ul>
      </Section>
      <OverfitLab />

      <Section id="traps" title="Common mistakes">
        <Trap>
          <ul>
            <li>Use log base 2. Natural log gives different numbers.</li>
            <li>Weight each branch by its size <M>{'|D_v|/|D|'}</M> before adding. Forgetting the weights is the most common error.</li>
            <li>
              <M>{'0 \\log_2 0'}</M> counts as 0, so a pure branch contributes nothing.
            </li>
            <li>Gain picks the largest value. Entropy after the split picks the smallest. They choose the same attribute.</li>
            <li>A tree with 100% training accuracy is not a good tree. Judge it on data it has not seen.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="A node has 8 yes and 8 no records. What is its entropy and its Gini index?">Entropy = 1 bit (p = 0.5). Gini = 1 - 0.25 - 0.25 = 0.5.</Check>
        <Check q="Why would C4.5 prefer gain ratio over information gain for a customer_id attribute?">customer_id splits the data into single-record branches with perfect purity, so its gain is maximal. Its SplitInfo is also huge (log2 of the number of records), so the gain ratio is small and the attribute is not chosen.</Check>
        <Check q="Training accuracy is 99% and test accuracy is 71%. What is happening and what can you do?">The tree overfits. Limit depth or minimum leaf size (pre-pruning), or grow fully and prune with a validation set (post-pruning).</Check>
        <Check q={<>Compute <M>{'Info_{student}(D)'}</M> for buys_computer: student = yes has 6 yes and 1 no, student = no has 3 yes and 4 no.</>}>
          <M>{'\\tfrac{7}{14}(0.592) + \\tfrac{7}{14}(0.985) = 0.789'}</M>, so Gain = 0.940 - 0.789 = 0.151.
        </Check>
      </Section>
    </>
  )
}

