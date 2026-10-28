import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Area, Dot, Line, Plot, VLine } from '../components/Plot'
import { Legend, Readout, Seg, Slider, Stat, seriesColor } from '../components/ui'
import { normCdf, normPdf } from '../lib/stats'
import { fmt, rng } from '../lib/stats'

const SD = 0.13

function metrics(tp: number, fp: number, fn: number, tn: number) {
  const n = tp + fp + fn + tn
  const precision = tp + fp ? tp / (tp + fp) : NaN
  const recall = tp + fn ? tp / (tp + fn) : NaN
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : NaN
  return { accuracy: (tp + tn) / n, precision, recall, f1, fpr: fp + tn ? fp / (fp + tn) : NaN }
}

const pct = (v: number) => (isFinite(v) ? `${(v * 100).toFixed(1)}%` : '0/0')

function ThresholdLab() {
  const [t, setT] = useState(0.5)
  const [sep, setSep] = useState(0.3)
  const [posShare, setPosShare] = useState(0.3)
  const N = 1000
  const mn = 0.5 - sep / 2
  const mp = 0.5 + sep / 2
  const P = Math.round(N * posShare)
  const Nn = N - P
  const tp = Math.round(P * (1 - normCdf(t, mp, SD)))
  const fn = P - tp
  const fp = Math.round(Nn * (1 - normCdf(t, mn, SD)))
  const tn = Nn - fp
  const m = metrics(tp, fp, fn, tn)
  const xs = Array.from({ length: 121 }, (_, i) => i / 120)
  const negCurve = xs.map((x) => ({ x, y: Nn * normPdf(x, mn, SD) }))
  const posCurve = xs.map((x) => ({ x, y: P * normPdf(x, mp, SD) }))
  const ymax = Math.max(...negCurve.map((p) => p.y), ...posCurve.map((p) => p.y)) * 1.1
  const roc = xs.map((x) => ({ x: 1 - normCdf(x, mn, SD), y: 1 - normCdf(x, mp, SD) })).reverse()
  const auc = roc.reduce((s, p, i) => (i ? s + ((p.x - roc[i - 1].x) * (p.y + roc[i - 1].y)) / 2 : 0), 0)
  const prec = xs.slice(0, 116).map((x) => {
    const a = P * (1 - normCdf(x, mp, SD))
    const b = Nn * (1 - normCdf(x, mn, SD))
    return { x, y: a + b > 0.5 ? a / (a + b) : 1 }
  })
  const rec = xs.map((x) => ({ x, y: 1 - normCdf(x, mp, SD) }))
  return (
    <Lab
      title="Move the decision threshold"
      desc="Records scoring above the threshold are predicted positive."
      controls={
        <>
          <Slider label="Threshold" value={t} min={0} max={1} step={0.01} onChange={setT} fmt={(v) => v.toFixed(2)} />
          <Slider label="How well the classes separate" value={sep} min={0} max={0.7} step={0.01} onChange={setSep} fmt={(v) => v.toFixed(2)} />
          <Slider label="Share of positives" value={posShare} min={0.02} max={0.8} step={0.01} onChange={setPosShare} fmt={pct} />
        </>
      }
      notes={[
        'Threshold 0: recall hits 100%, precision falls to the share of positives.',
        'Separation 0: the ROC curve is the diagonal and AUC is 0.5.',
        'Positives at 2%, threshold 0.5: accuracy stays high while precision drops.',
      ]}
    >
      <span className="label">Score distribution of 1000 records</span>
      <Plot w={560} h={240} x={[0, 1]} y={[0, ymax]} xLabel="classifier score" yLabel="records" yTicks={3} label="Score distributions for negative and positive records" yFmt={(v) => fmt(v, 0)}>
        <Area pts={negCurve} base={0} color={seriesColor(0)} opacity={0.2} />
        <Area pts={posCurve} base={0} color={seriesColor(1)} opacity={0.2} />
        <Line pts={negCurve} color={seriesColor(0)} />
        <Line pts={posCurve} color={seriesColor(1)} dash="6 3" />
        <VLine x={t} color="var(--ink)" label={`threshold ${t.toFixed(2)}`} dash="none" />
      </Plot>
      <Legend items={[{ label: 'Actual negative', color: seriesColor(0), shape: 0 }, { label: 'Actual positive (dashed)', color: seriesColor(1), shape: 1 }]} />
      <Table
        head={['Actual / Predicted', 'Positive', 'Negative']}
        num={[1, 2]}
        rows={[
          ['Positive', `TP ${tp}`, `FN ${fn}`],
          ['Negative', `FP ${fp}`, `TN ${tn}`],
        ]}
      />
      <Readout>
        <Stat k="Accuracy" v={pct(m.accuracy)} />
        <Stat k="Precision" v={pct(m.precision)} sub="TP / (TP + FP)" />
        <Stat k="Recall" v={pct(m.recall)} sub="TP / (TP + FN)" />
        <Stat k="F1" v={isFinite(m.f1) ? fmt(m.f1, 3) : '0/0'} />
      </Readout>
      <div className="grid c2" style={{ marginTop: 14 }}>
        <div>
          <span className="label">ROC curve, AUC {fmt(auc, 3)}</span>
          <Plot w={340} h={280} x={[0, 1]} y={[0, 1]} xLabel="false positive rate" yLabel="true positive rate" xTicks={4} yTicks={4} label="ROC curve with current threshold">
            <Line pts={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} color="var(--ink-4)" dash="4 4" width={1} />
            <Line pts={roc} color={seriesColor(0)} />
            <Dot x={m.fpr} y={m.recall} r={6} color={seriesColor(1)} shape={1} />
          </Plot>
        </div>
        <div>
          <span className="label">Precision and recall vs threshold</span>
          <Plot w={340} h={280} x={[0, 1]} y={[0, 1]} xLabel="threshold" xTicks={4} yTicks={4} label="Precision and recall as threshold changes">
            <Line pts={prec} color={seriesColor(2)} />
            <Line pts={rec} color={seriesColor(3)} dash="6 3" />
            <VLine x={t} color="var(--ink-3)" />
          </Plot>
          <Legend items={[{ label: 'Precision', color: seriesColor(2), shape: 2 }, { label: 'Recall (dashed)', color: seriesColor(3), shape: 3 }]} />
        </div>
      </div>
    </Lab>
  )
}

function ImbalanceLab() {
  const [pos, setPos] = useState(10)
  const [model, setModel] = useState<'lazy' | 'screen'>('lazy')
  const N = 10000
  const neg = N - pos
  const tp = model === 'lazy' ? 0 : Math.round(pos * 0.9)
  const fn = pos - tp
  const fp = model === 'lazy' ? 0 : Math.round(neg * 0.02)
  const tn = neg - fp
  const m = metrics(tp, fp, fn, tn)
  return (
    <Lab
      title="When 99.9% accuracy means nothing"
      desc="10,000 patients. The screening model catches 90% of cancer cases with 2% false alarms."
      controls={
        <>
          <Slider label="Cancer cases out of 10,000" value={pos} min={1} max={5000} onChange={setPos} />
          <Seg label="Model" value={model} onChange={setModel} options={[{ v: 'lazy', label: 'Always non_cancer' }, { v: 'screen', label: 'Screening model' }]} />
        </>
      }
      notes={['10 cancer cases, always non_cancer: 99.9% accuracy, 0% recall.', 'Raise cases to 5000 (balanced) and pick the screening model: accuracy (94%) and recall (90%) now tell the same story.']}
    >
      <Table
        head={['', 'Predicted cancer', 'Predicted non_cancer', 'Recall per class']}
        num={[1, 2, 3]}
        rows={[
          ['cancer', tp, fn, pct(pos ? tp / pos : NaN)],
          ['non_cancer', fp, tn, pct(tn / neg)],
        ]}
      />
      <Readout>
        <Stat k="Accuracy" v={pct(m.accuracy)} />
        <Stat k="Recall (cancer)" v={pct(m.recall)} />
        <Stat k="Precision (cancer)" v={pct(m.precision)} sub={isFinite(m.precision) ? undefined : 'no positive predictions'} />
        <Stat k="F1 (cancer)" v={isFinite(m.f1) ? fmt(m.f1, 3) : '0/0'} />
      </Readout>
    </Lab>
  )
}

const CLASSES = ['Airplane', 'Boat', 'Car']
const DEFAULT_CM = [
  [2, 1, 0],
  [0, 1, 0],
  [1, 2, 3],
]

function MultiClassLab() {
  const [cm, setCm] = useState(DEFAULT_CM)
  const set = (i: number, j: number, v: number) => setCm((c) => c.map((r, a) => r.map((x, b) => (a === i && b === j ? Math.max(0, Math.round(v) || 0) : x))))
  const per = CLASSES.map((_, i) => {
    const tp = cm[i][i]
    const colSum = cm.reduce((s, r) => s + r[i], 0)
    const rowSum = cm[i].reduce((s, v) => s + v, 0)
    const p = colSum ? tp / colSum : 0
    const r = rowSum ? tp / rowSum : 0
    return { tp, fp: colSum - tp, fn: rowSum - tp, p, r, f1: p + r ? (2 * p * r) / (p + r) : 0, support: rowSum }
  })
  const total = cm.flat().reduce((s, v) => s + v, 0)
  const TP = per.reduce((s, c) => s + c.tp, 0)
  const FP = per.reduce((s, c) => s + c.fp, 0)
  const FN = per.reduce((s, c) => s + c.fn, 0)
  const microP = TP + FP ? TP / (TP + FP) : 0
  const microR = TP + FN ? TP / (TP + FN) : 0
  const microF = microP + microR ? (2 * microP * microR) / (microP + microR) : 0
  const macro = (k: 'p' | 'r' | 'f1') => per.reduce((s, c) => s + c[k], 0) / per.length
  return (
    <Lab
      title="Macro vs micro averaging"
      desc="Rows are actual classes, columns are predictions. Edit any cell."
      notes={[
        'Compare micro F1 with accuracy: in single-label problems they are always equal.',
        'Make Boat perfect (only its diagonal cell nonzero). Macro F1 jumps far more than micro F1, because macro weights the rare class like the others.',
      ]}
    >
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Actual \ Predicted</th>
              {CLASSES.map((c) => (
                <th key={c} className="num">
                  {c}
                </th>
              ))}
              <th className="num">Precision</th>
              <th className="num">Recall</th>
              <th className="num">F1</th>
              <th className="num">Support</th>
            </tr>
          </thead>
          <tbody>
            {CLASSES.map((c, i) => (
              <tr key={c}>
                <td>{c}</td>
                {CLASSES.map((_, j) => (
                  <td key={j} className="num">
                    <input
                      className="input num"
                      type="number"
                      min={0}
                      value={cm[i][j]}
                      aria-label={`actual ${c} predicted ${CLASSES[j]}`}
                      onChange={(e) => set(i, j, Number(e.target.value))}
                      style={{ width: 60, borderColor: i === j ? 'var(--accent)' : undefined }}
                    />
                  </td>
                ))}
                <td className="num">{fmt(per[i].p, 2)}</td>
                <td className="num">{fmt(per[i].r, 2)}</td>
                <td className="num">{fmt(per[i].f1, 2)}</td>
                <td className="num">{per[i].support}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Readout>
        <Stat k="Accuracy" v={fmt(total ? TP / total : 0, 2)} sub={`${TP} of ${total} correct`} />
        <Stat k="Macro F1" v={fmt(macro('f1'), 2)} sub={`P ${fmt(macro('p'), 2)}, R ${fmt(macro('r'), 2)}`} />
        <Stat k="Micro F1" v={fmt(microF, 2)} sub={`TP ${TP}, FP ${FP}, FN ${FN}`} />
      </Readout>
      <div style={{ marginTop: 10 }}>
        <button type="button" className="btn sm ghost" onClick={() => setCm(DEFAULT_CM)}>
          Back to the worked example
        </button>
      </div>
    </Lab>
  )
}

const ROWS = 20

function FoldsLab() {
  const [method, setMethod] = useState<'holdout' | 'kfold' | 'loo' | 'strat'>('kfold')
  const [k, setK] = useState(5)
  const [round, setRound] = useState(0)
  const classes = useMemo(() => Array.from({ length: ROWS }, (_, i) => (i % 10 < 3 ? 1 : 0)), [])
  const order = useMemo(() => {
    const r = rng(9)
    const idx = Array.from({ length: ROWS }, (_, i) => i)
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      ;[idx[i], idx[j]] = [idx[j], idx[i]]
    }
    return idx
  }, [])
  const kk = method === 'loo' ? ROWS : method === 'holdout' ? 1 : k
  const rounds = method === 'holdout' ? 1 : kk
  const cur = Math.min(round, rounds - 1)
  const fold = useMemo(() => {
    const f = Array(ROWS).fill(0)
    if (method === 'holdout') {
      order.forEach((row, pos) => (f[row] = pos < Math.round(ROWS / 3) ? 0 : 1))
      return f
    }
    if (method === 'strat') {
      let c = 0
      ;[0, 1].forEach((cls) => order.filter((row) => classes[row] === cls).forEach((row) => (f[row] = c++ % kk)))
      return f
    }
    order.forEach((row, pos) => (f[row] = Math.floor((pos * kk) / ROWS)))
    return f
  }, [method, kk, order, classes])
  const isVal = (i: number) => (method === 'holdout' ? fold[i] === 0 : fold[i] === cur)
  const val = Array.from({ length: ROWS }, (_, i) => i).filter(isVal)
  const valPos = val.filter((i) => classes[i] === 1).length
  return (
    <Lab
      title="Which rows train, which rows test"
      desc="20 records, 6 in the minority class (triangles)."
      controls={
        <>
          <Seg label="Method" value={method} onChange={(v) => { setMethod(v); setRound(0) }} options={[{ v: 'holdout', label: 'Holdout' }, { v: 'kfold', label: 'k-fold' }, { v: 'strat', label: 'Stratified' }, { v: 'loo', label: 'Leave-one-out' }]} />
          {(method === 'kfold' || method === 'strat') && <Slider label="k" value={k} min={2} max={10} onChange={(v) => { setK(v); setRound(0) }} />}
          {rounds > 1 && <Slider label="Round" value={cur + 1} min={1} max={rounds} onChange={(v) => setRound(v - 1)} />}
        </>
      }
      notes={[
        'Step through k-fold rounds: every record validates exactly once.',
        'k-fold with k = 5 can leave a fold with no triangles. Switch to Stratified: every fold stays as close to the 30% minority share as the counts allow.',
      ]}
    >
      <svg viewBox="0 0 560 120" className="plot" style={{ width: '100%', maxWidth: 640 }} role="img" aria-label="Records colored by train or validation role">
        {Array.from({ length: ROWS }, (_, i) => {
          const x = 14 + i * 27
          const v = isVal(i)
          return (
            <g key={i} transform={`translate(${x},20)`}>
              <rect width={22} height={44} rx={6} fill={v ? seriesColor(1) : seriesColor(0)} opacity={v ? 0.9 : 0.35} />
              <text x={11} y={58 + 16} textAnchor="middle" fontSize={10} fill="var(--ink-3)" fontFamily="var(--mono)">
                {i + 1}
              </text>
              {classes[i] === 1 ? <path d="M11,13 L17,27 L5,27 Z" fill="var(--ink)" /> : <circle cx={11} cy={22} r={4.5} fill="var(--ink)" />}
            </g>
          )
        })}
      </svg>
      <Legend items={[{ label: 'Training', color: seriesColor(0), shape: 1 }, { label: 'Validation', color: seriesColor(1), shape: 1 }]} />
      <Readout>
        <Stat k="Rounds" v={rounds} />
        <Stat k="Training share" v={pct((ROWS - val.length) / ROWS)} sub={method === 'kfold' || method === 'strat' ? `1 - 1/k = ${fmt(1 - 1 / kk, 2)}` : undefined} />
        <Stat k="Minority in validation" v={`${valPos} of ${val.length}`} sub="overall 30%" />
      </Readout>
    </Lab>
  )
}

function WorkedExample() {
  return (
    <Table
      head={['Actual \\ Predicted', 'buys = yes', 'buys = no', 'Total', 'Recognition']}
      num={[1, 2, 3, 4]}
      rows={[
        ['buys = yes', '6954', '46', '7000', '99.34%'],
        ['buys = no', '412', '2588', '3000', '86.27%'],
        ['Total', '7366', '2634', '10000', '95.42%'],
      ]}
    />
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader group="Classification" title="Classification and evaluation" lede="A classifier predicts a record's class from its other attributes. This page is about measuring how good it is." />

      <Plain>
        <p>
          A spam filter learns from emails already marked spam or not spam, then gets tested on emails it has never seen. How you count its mistakes decides whether it looks good.
        </p>
      </Plain>

      <Section id="process" title="The three-step process">
        <ol>
          <li>
            <strong>Training set.</strong> Archived records with a known value for one categorical <strong>class attribute</strong>. Because the labels are known, this is supervised learning.
          </li>
          <li>
            <strong>Build a model.</strong> The classifier maps the non-class attributes to a class value, for example <M>{'f(age = youth, income = low) = risky'}</M>. Decision trees, naive Bayes, kNN and neural networks are all ways to build it.
          </li>
          <li>
            <strong>Evaluate on a test set.</strong> Records disjoint from the training set. Predict each one and compare with its true class.
          </li>
        </ol>
      </Section>

      <Section id="metrics" title="Confusion matrix and the four rates">
        <p>
          Rows are the actual class, columns the predicted class. Cell <M>{'c_{ij}'}</M> counts records of class i predicted as class j, so the diagonal holds the correct predictions. For two classes, call the class you care about positive.
        </p>
        <Formula title="Definitions">
          <MB note="Three basic scores from the confusion matrix. Accuracy is the share of all records predicted correctly; precision and recall look only at the positive class." syms={[['TP', 'true positives: positive records predicted positive'], ['TN', 'true negatives: negative records predicted negative'], ['FP', 'false positives: negative records wrongly flagged positive'], ['FN', 'false negatives: positive records the model missed'], ['N', 'total number of test records']]}>{'Accuracy = \\frac{TP + TN}{N} \\qquad Precision = \\frac{TP}{TP + FP} \\qquad Recall = \\frac{TP}{TP + FN}'}</MB>
          <MB note="The F measure (F1) is the harmonic mean of precision and recall. Use it when you want one number that is only high if both are high." syms={[['F', 'F measure, also called F1'], ['Precision', 'TP / (TP + FP)'], ['Recall', 'TP / (TP + FN)']]}>{'F = \\frac{2 \\cdot Precision \\cdot Recall}{Precision + Recall}'}</MB>
          <p>
            Precision: of what I flagged, how much was right. Recall: of what was there, how much I found. F stays low unless both are high.
          </p>
        </Formula>
      </Section>
      <ThresholdLab />

      <Section id="worked" title="Worked example">
        <p>A classifier for buys_computer is tested on 10,000 records.</p>
        <WorkedExample />
        <p style={{ marginTop: 12 }}>
          Accuracy <M>{'= \\frac{6954 + 2588}{10000} = 95.42\\%'}</M>. With yes as the positive class: precision <M>{'= \\frac{6954}{6954 + 412} = 0.944'}</M>, recall <M>{'= \\frac{6954}{7000} = 0.993'}</M>, F <M>{'= \\frac{2(0.944)(0.993)}{0.944 + 0.993} = 0.968'}</M>.
        </p>
      </Section>

      <Section id="imbalance" title="Class imbalance">
        <p>When one class is rare, always predicting the common class gives high accuracy for free. Report precision and recall for the rare class.</p>
      </Section>
      <ImbalanceLab />

      <Section id="multiclass" title="More than two classes">
        <Formula title="Two ways to average">
          <MB note="Two ways to get one score for many classes. Macro F1 averages the per-class F1 scores so every class counts the same; micro precision pools the counts of all classes first so every record counts the same." syms={[['C', 'number of classes'], ['F1_c', 'F1 score of class c on its own'], ['TP_c', 'true positives for class c'], ['FP_c', 'false positives for class c (records wrongly predicted as c)']]}>{'F1_{macro} = \\frac{1}{C}\\sum_{c=1}^{C} F1_c \\qquad P_{micro} = \\frac{\\sum_c TP_c}{\\sum_c (TP_c + FP_c)}'}</MB>
          <p>Macro weights every class equally, micro every record. In the worked example: macro F1 0.58, micro F1 0.60 (equal to accuracy).</p>
        </Formula>
      </Section>
      <MultiClassLab />

      <Section id="methods" title="Holdout and cross-validation">
        <Table
          head={['Method', 'How', 'Good for', 'Weakness']}
          rows={[
            ['Holdout', 'One random split, typically 2/3 train, 1/3 test', 'Large data, quick checks', 'Fewer training records; result depends on the one split'],
            ['Repeated subsampling', 'Holdout k times with new random splits, average accuracy', 'Smoother estimate', 'Some records may never be tested'],
            ['k-fold CV', 'k disjoint folds; each fold validates once, the other k-1 train', 'The standard choice, k = 10', 'k times the training cost'],
            ['Leave-one-out', 'k = |D|, validate on a single record each time', 'Very small data sets', 'Expensive for large data'],
            ['Stratified k-fold', 'Each fold keeps the class distribution of the full data', 'Imbalanced classes', 'Needs class labels to stratify'],
          ]}
        />
        <p style={{ marginTop: 12 }}>
          Each k-fold round trains on <M>{'1 - \\frac{1}{k}'}</M> of the data. The deployed model is trained on all of it; cross-validation only estimates its accuracy.
        </p>
      </Section>
      <FoldsLab />

      <Section id="traps" title="Common mistakes">
        <Trap>
          <ul>
            <li>Testing on training records. The test set must be disjoint, or the score is optimistic.</li>
            <li>Precision and recall swap places easily. Precision divides by what you predicted positive (a column). Recall divides by what is actually positive (a row).</li>
            <li>Micro averages are not the same as averaging per-class numbers. Micro pools the counts first.</li>
            <li>Cross-validation picks settings and estimates accuracy. It does not produce the final model.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="A model flags 50 transactions as fraud. 40 really are fraud, and the data contains 80 frauds in total. Precision and recall?">
          Precision = 40 / 50 = 0.8. Recall = 40 / 80 = 0.5. F = 2(0.8)(0.5) / 1.3 = 0.615.
        </Check>
        <Check q="With 10-fold cross-validation, what fraction of the data trains each model?">
          <M>{'1 - \\frac{1}{10} = 0.9'}</M>, so 90% trains and 10% validates in every round.
        </Check>
        <Check q="Why use stratified folds?">So every fold has the same class proportions as the full data. Without it a fold can miss a rare class entirely, which makes that round meaningless.</Check>
        <Check q="When does micro F1 equal accuracy?">In single-label multi-class classification. Every wrong prediction adds one FP (to the predicted class) and one FN (to the true class), so micro precision = micro recall = correct / total.</Check>
      </Section>
    </>
  )
}

