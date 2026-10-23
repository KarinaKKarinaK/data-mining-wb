import { useMemo, useState } from 'react'
import { Check, Formula, Note, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Dot, HLine, Plot, Rect, Tip } from '../components/Plot'
import { Btn, Legend, Readout, Seg, Slider, Stat, Toggle } from '../components/ui'
import { GROCERIES } from '../lib/datasets'
import { apriori, closedMaximal, count, itemCounts, key, rules, show, type Level } from '../lib/e-assoc'
import { TxEditor } from '../lib/e-ui'
import { fmt } from '../lib/stats'

const pct = (v: number) => `${Math.round(v * 100)}%`

function SupportBars({ tx, minCount }: { tx: string[][]; minCount: number }) {
  const counts = itemCounts(tx)
  const n = tx.length || 1
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div>
      <span className="label">Support of each single item</span>
      <Plot
        w={560}
        h={220}
        x={[0, Math.max(1, counts.length)]}
        y={[0, 1]}
        yLabel="support"
        xTickValues={counts.map(([it], i) => ({ v: i + 0.5, label: it.length > 8 ? it.slice(0, 7) + '.' : it }))}
        yFmt={pct}
        yTicks={4}
        label="Bar chart of item supports"
      >
        {counts.map(([it, c], i) => (
          <Rect key={it} x0={i + 0.14} x1={i + 0.86} y0={0} y1={c / n} rx={4} color={c >= minCount ? 'var(--s1)' : 'var(--ink-4)'} onEnter={() => setHover(i)} onLeave={() => setHover(null)} />
        ))}
        <HLine y={minCount / n} color="var(--s2)" label={`min_sup ${pct(minCount / n)}`} />
        {hover !== null && <Tip x={hover + 0.5} y={counts[hover][1] / n} lines={[counts[hover][0], `count ${counts[hover][1]} of ${tx.length}`, `support ${fmt(counts[hover][1] / n, 2)}`]} />}
      </Plot>
      <Legend
        items={[
          { label: 'frequent (count reaches min_sup)', color: 'var(--s1)', shape: 1 },
          { label: 'infrequent', color: 'var(--ink-4)', shape: 1 },
        ]}
      />
    </div>
  )
}

function StepLab({ tx, levels, minSup, setMinSup }: { tx: string[][]; levels: Level[]; minSup: number; setMinSup: (v: number) => void }) {
  const [lv, setLv] = useState(0)
  const cur = levels[Math.min(lv, levels.length - 1)]
  const minCount = Math.ceil(minSup * tx.length - 1e-9)
  const counted = levels.slice(0, lv + 1).reduce((s, l) => s + l.cands.filter((c) => c.count !== null).length, 0)
  const pruned = levels.slice(0, lv + 1).reduce((s, l) => s + l.cands.filter((c) => c.status === 'pruned').length, 0)
  if (!cur) return null
  return (
    <Lab
      title="Apriori, level by level"
      desc="Each level builds candidates C_k from the frequent sets of the level before, throws away any candidate with an infrequent subset, then scans the database once to count the rest."
      controls={
        <>
          <Slider label="min_sup" value={minSup} min={0.1} max={0.8} step={0.05} fmt={(v) => `${pct(v)} (count ${Math.ceil(v * tx.length - 1e-9)})`} onChange={(v) => { setMinSup(v); setLv(0) }} />
          <div className="row">
            <Btn sm onClick={() => setLv((v) => Math.max(0, v - 1))} disabled={lv === 0}>Previous level</Btn>
            <Btn sm variant="primary" onClick={() => setLv((v) => Math.min(levels.length - 1, v + 1))} disabled={lv >= levels.length - 1}>
              Next level
            </Btn>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Showing level k = {cur.k} of {levels.length}. {lv >= levels.length - 1 ? 'No more candidates can be built, so Apriori stops here.' : ''}
          </p>
        </>
      }
      notes={[
        'Lower min_sup to 20%. Level 3 now shows candidates removed by the prune step without ever being counted, because one of their pairs was infrequent.',
        'Raise min_sup to 50%. Fewer frequent items means far fewer candidates at the next level. This is why support pruning is so effective.',
        'Count the database scans: one per level. FP-growth needs only two scans in total.',
      ]}
    >
      <Table
        head={[`Candidate in C${cur.k}`, 'Prune check', 'Count', 'Result']}
        num={[2]}
        hl={(i) => cur.cands[i].status === 'frequent'}
        rows={cur.cands.map((c) => [
          show(c.set),
          cur.k === 1 ? 'single item, no subsets to check' : c.status === 'pruned' ? `${show(c.prunedBy!)} is not frequent, so remove` : 'all subsets frequent',
          c.count === null ? 'not counted' : `${c.count}`,
          c.status === 'frequent' ? `in L${cur.k}` : c.status === 'pruned' ? 'pruned' : 'below min_sup',
        ])}
      />
      <p style={{ marginTop: 12 }}>
        <strong>
          L<sub>{cur.k}</sub>
        </strong>{' '}
        = {cur.frequent.length ? cur.frequent.map((f) => `${show(f.set)}: ${f.count}`).join(', ') : 'empty'}
      </p>
      {cur.k === 1 && <p className="muted" style={{ fontSize: 13.5 }}>Next, C2 joins every pair of sets in L1. From level 3 on, two sets are joined only when they share all items except the last.</p>}
      <Readout>
        <Stat k="min count" v={minCount} sub={`${pct(minSup)} of ${tx.length}`} />
        <Stat k="Candidates" v={cur.cands.length} sub={`at level ${cur.k}`} />
        <Stat k="Pruned so far" v={pruned} sub="never counted" />
        <Stat k="Counted so far" v={counted} sub={`${lv + 1} database scans`} />
      </Readout>
    </Lab>
  )
}

function LatticeLab({ tx, levels }: { tx: string[][]; levels: Level[] }) {
  const top = itemCounts(tx).slice(0, 5).map(([i]) => i).sort()
  const [hover, setHover] = useState<string | null>(null)
  const status = new Map<string, { s: 'frequent' | 'infrequent' | 'skipped'; c: number | null; why?: string }>()
  levels.forEach((l) =>
    l.cands.forEach((c) =>
      status.set(key(c.set), { s: c.status === 'frequent' ? 'frequent' : c.status === 'infrequent' ? 'infrequent' : 'skipped', c: c.count, why: c.prunedBy ? `pruned: ${show(c.prunedBy)} is infrequent` : undefined }),
    ),
  )
  const rows: string[][][] = top.map(() => [])
  for (let m = 1; m < 1 << top.length; m++) {
    const s = top.filter((_, i) => m & (1 << i))
    rows[s.length - 1].push(s)
  }
  const W = Math.max(760, Math.max(...rows.map((r) => r.length)) * 96)
  const H = 380
  const rowY = (k: number) => 30 + (k - 1) * ((H - 60) / Math.max(1, top.length - 1))
  const pos = new Map<string, { x: number; y: number }>()
  rows.forEach((r, k) => r.forEach((s, i) => pos.set(key(s), { x: ((i + 0.5) / r.length) * W, y: rowY(k + 1) })))
  const abbr = (s: string[]) => s.map((i) => i.slice(0, 3)).join(' ')
  const cm = closedMaximal(levels)
  const nFreq = cm.length
  const nClosed = cm.filter((c) => c.closed).length
  const nMax = cm.filter((c) => c.maximal).length
  const info = hover ? status.get(hover) : null
  return (
    <Lab
      title="The itemset lattice"
      desc={`Every subset of the ${top.length} most common items, from single items at the top to the full set at the bottom. The coloring comes from the Apriori run above.`}
      notes={[
        'Every set below a frequent set is a superset. Once a set is infrequent, all sets below it are infrequent too. That is the Apriori property, and why whole branches go grey.',
        'Hover a dashed node: Apriori never counted it, either because a subset was infrequent or because it was never built from L at the level above.',
        'Maximal frequent sets are the frequent sets with nothing frequent below them. Closed sets lose no support information: every frequent set and its count can be rebuilt from them.',
      ]}
    >
      <svg className="plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Itemset lattice">
        {rows.slice(1).flatMap((r) =>
          r.flatMap((s) =>
            s.map((_, i) => {
              const sub = s.filter((__, j) => j !== i)
              const a = pos.get(key(sub))!
              const b = pos.get(key(s))!
              const on = status.get(key(s))?.s === 'frequent'
              return <line key={key(s) + i} x1={a.x} y1={a.y + 11} x2={b.x} y2={b.y - 11} stroke={on ? 'var(--s1)' : 'var(--line-2)'} strokeWidth={on ? 1.4 : 1} opacity={on ? 0.7 : 1} />
            }),
          ),
        )}
        {rows.flat().map((s) => {
          const p = pos.get(key(s))!
          const st = status.get(key(s))
          const kind = st?.s ?? 'skipped'
          const lab = abbr(s)
          const w = Math.max(40, lab.length * 6.6 + 14)
          return (
            <g key={key(s)} transform={`translate(${p.x},${p.y})`} onPointerEnter={() => setHover(key(s))} onPointerLeave={() => setHover(null)} style={{ cursor: 'default' }}>
              <rect
                x={-w / 2}
                y={-11}
                width={w}
                height={22}
                rx={7}
                fill={kind === 'frequent' ? 'var(--s1)' : 'var(--surface-2)'}
                stroke={kind === 'frequent' ? 'none' : kind === 'infrequent' ? 'var(--s2)' : 'var(--ink-4)'}
                strokeDasharray={kind === 'skipped' ? '3 3' : undefined}
                strokeWidth={1.5}
              />
              <text y={4} textAnchor="middle" fontSize={10.5} fontFamily="var(--mono)" fill={kind === 'frequent' ? '#0d0e10' : kind === 'infrequent' ? 'var(--ink)' : 'var(--ink-3)'}>
                {lab}
              </text>
            </g>
          )
        })}
      </svg>
      <Legend
        items={[
          { label: 'frequent (filled)', color: 'var(--s1)', shape: 1 },
          { label: 'counted, below min_sup (solid outline)', color: 'var(--s2)', shape: 1 },
          { label: 'never counted (dashed)', color: 'var(--ink-4)', shape: 1 },
        ]}
      />
      <p className="muted" style={{ fontSize: 13, minHeight: 20 }}>
        {hover
          ? `${show(hover.split(', '))}: ${info?.c !== null && info?.c !== undefined ? `count ${info.c}, ` : `count ${count(tx, hover.split(', '))} if you did count it, `}${info?.why ?? (info ? (info.s === 'frequent' ? 'frequent' : 'counted and below min_sup') : 'not built, since a subset was already infrequent')}`
          : `Labels use the first three letters: ${top.map((i) => `${i.slice(0, 3)} = ${i}`).join(', ')}.`}
      </p>
      <Readout>
        <Stat k="Frequent sets" v={nFreq} sub="all items, not only these 5" />
        <Stat k="Closed" v={nClosed} sub="no superset with equal count" />
        <Stat k="Maximal" v={nMax} sub="no frequent superset" />
      </Readout>
      <div style={{ marginTop: 12 }}>
        <Table
          head={['Frequent itemset', 'Count', 'Closed', 'Maximal']}
          num={[1]}
          rows={cm.map((c) => [show(c.set), c.count, c.closed ? 'yes' : 'no', c.maximal ? 'yes' : 'no'])}
        />
      </div>
    </Lab>
  )
}

function RulesLab({ tx, levels, minConf, setMinConf, minSup, setMinSup }: { tx: string[][]; levels: Level[]; minConf: number; setMinConf: (v: number) => void; minSup: number; setMinSup: (v: number) => void }) {
  const [sort, setSort] = useState<'lift' | 'conf' | 'sup'>('lift')
  const [all, setAll] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const rs = useMemo(() => rules(tx, levels).sort((a, b) => b[sort] - a[sort] || b.conf - a.conf), [tx, levels, sort])
  const strong = rs.filter((r) => r.conf >= minConf - 1e-9)
  const shown = all ? rs : strong
  const verdict = (l: number) => (l > 1.05 ? 'positive' : l < 0.95 ? 'negative' : 'about independent')
  const maxSup = Math.max(0.2, ...rs.map((r) => r.sup))
  return (
    <Lab
      title="From frequent itemsets to rules"
      desc="For every frequent itemset, every way of splitting it into a left side and a right side is a candidate rule. Keep the ones whose confidence reaches min_conf."
      controls={
        <>
          <Slider label="min_sup" value={minSup} min={0.1} max={0.8} step={0.05} fmt={pct} onChange={setMinSup} />
          <Slider label="min_conf" value={minConf} min={0.3} max={1} step={0.05} fmt={pct} onChange={setMinConf} />
          <Seg label="Sort by" value={sort} onChange={setSort} options={[{ v: 'lift', label: 'Lift' }, { v: 'conf', label: 'Confidence' }, { v: 'sup', label: 'Support' }]} />
          <Toggle on={all} onChange={setAll}>Also list rules below min_conf</Toggle>
        </>
      }
      notes={[
        'Rules from the same itemset all share one support value. Only confidence changes, because the left side changes.',
        'Sort by confidence, then by lift. A rule can have high confidence and still have lift below 1 when the right side is very common anyway.',
        'Every point above the dashed line is a strong rule. Points in the grey shape have lift below 1.',
      ]}
    >
      <Plot
        w={560}
        h={260}
        x={[0, maxSup * 1.08]}
        y={[0, 1.04]}
        xLabel="support"
        yLabel="confidence"
        xFmt={pct}
        yFmt={pct}
        label="Scatter of rules by support and confidence"
        onLeave={() => setHover(null)}
      >
        <HLine y={minConf} color="var(--s2)" label={`min_conf ${pct(minConf)}`} />
        {rs.map((r, i) => (
          <Dot key={i} x={r.sup} y={r.conf} r={5} shape={r.lift >= 1 ? 0 : 1} color={r.lift >= 1 ? 'var(--s1)' : 'var(--ink-3)'} onEnter={() => setHover(i)} onLeave={() => setHover(null)} />
        ))}
        {hover !== null && rs[hover] && (
          <Tip x={rs[hover].sup} y={rs[hover].conf} lines={[`${show(rs[hover].lhs)} => ${show(rs[hover].rhs)}`, `conf ${fmt(rs[hover].conf, 3)}  lift ${fmt(rs[hover].lift, 3)}`]} />
        )}
      </Plot>
      <Legend
        items={[
          { label: 'lift at least 1', color: 'var(--s1)', shape: 0 },
          { label: 'lift below 1', color: 'var(--ink-3)', shape: 1 },
        ]}
      />
      <Readout>
        <Stat k="Candidate rules" v={rs.length} />
        <Stat k="Strong rules" v={strong.length} sub={`conf at least ${pct(minConf)}`} />
        <Stat k="Lift below 1" v={strong.filter((r) => r.lift < 1).length} sub="among strong rules" />
      </Readout>
      <div style={{ marginTop: 12, maxHeight: 360, overflowY: 'auto' }}>
        <Table
          head={['Rule', 'Support', 'Confidence', 'Lift', 'Correlation']}
          num={[1, 2, 3]}
          hl={(i) => shown[i].conf >= minConf - 1e-9 && all}
          rows={shown.map((r) => [`${show(r.lhs)} => ${show(r.rhs)}`, fmt(r.sup, 3), fmt(r.conf, 3), fmt(r.lift, 3), verdict(r.lift)])}
        />
      </div>
    </Lab>
  )
}

const PRESETS: { name: string; v: [number, number, number, number] }[] = [
  { name: 'Tea and coffee', v: [15, 5, 75, 5] },
  { name: 'Diapers and beer', v: [5, 1, 0, 4] },
  { name: 'Independent', v: [16, 24, 24, 36] },
]

function LiftLab() {
  const [v, setV] = useState<[number, number, number, number]>([15, 5, 75, 5])
  const [ab, aOnly, bOnly, none] = v
  const n = ab + aOnly + bOnly + none
  const pA = (ab + aOnly) / n
  const pB = (ab + bOnly) / n
  const sup = ab / n
  const conf = ab + aOnly ? ab / (ab + aOnly) : 0
  const lift = pA && pB ? sup / (pA * pB) : 0
  const set = (i: number) => (x: number) => setV((cur) => cur.map((c, j) => (j === i ? x : c)) as [number, number, number, number])
  return (
    <Lab
      title="When confidence lies: lift"
      desc="Set the four cells of a 2 x 2 table for items A and B. Compare how often baskets with A contain B (confidence) with how often any basket contains B."
      controls={
        <>
          <div className="row">
            {PRESETS.map((p) => (
              <Btn sm key={p.name} onClick={() => setV(p.v)}>
                {p.name}
              </Btn>
            ))}
          </div>
          <Slider label="A and B" value={ab} min={0} max={100} onChange={set(0)} />
          <Slider label="A, not B" value={aOnly} min={0} max={100} onChange={set(1)} />
          <Slider label="B, not A" value={bOnly} min={0} max={100} onChange={set(2)} />
          <Slider label="Neither" value={none} min={0} max={100} onChange={set(3)} />
        </>
      }
      notes={[
        'Tea and coffee: 75% of tea buyers buy coffee, which sounds like a strong rule. But 90% of all customers buy coffee, so buying tea actually makes coffee less likely. Lift is 0.833.',
        'Set the four cells so that A and B / A not B equals B not A / Neither. Lift becomes exactly 1: the items are independent.',
      ]}
    >
      <Plot w={560} h={170} x={[0, 1]} y={[0, 2]} xFmt={pct} yTickValues={[{ v: 0.5, label: 'P(B)' }, { v: 1.5, label: 'P(B | A)' }]} pad={{ l: 70 }} label="Bars comparing P(B) and P(B given A)">
        <Rect x0={0} x1={pB} y0={0.2} y1={0.8} rx={4} color="var(--ink-3)" />
        <Rect x0={0} x1={conf} y0={1.2} y1={1.8} rx={4} color="var(--s1)" />
      </Plot>
      <Table
        head={['', 'B', 'not B', 'Total']}
        num={[1, 2, 3]}
        rows={[
          ['A', ab, aOnly, ab + aOnly],
          ['not A', bOnly, none, bOnly + none],
          ['Total', ab + bOnly, aOnly + none, n],
        ]}
      />
      <Readout>
        <Stat k="support(A => B)" v={fmt(sup, 3)} />
        <Stat k="confidence" v={fmt(conf, 3)} sub="P(B | A)" />
        <Stat k="P(B)" v={fmt(pB, 3)} />
        <Stat k="lift" v={n && pA && pB ? fmt(lift, 3) : 'n/a'} sub={lift > 1.005 ? 'positively correlated' : lift < 0.995 ? 'negatively correlated' : 'independent'} />
      </Readout>
    </Lab>
  )
}

function Worked() {
  const lv = apriori(GROCERIES.map((t) => [...t].sort()), 3)
  const strong = rules(GROCERIES, lv)
    .filter((r) => r.conf >= 0.7 - 1e-9)
    .sort((a, b) => b.conf - a.conf || b.lift - a.lift)
  return (
    <>
      <p>
        Default baskets, 10 transactions, min_sup = 30% (count 3) and min_conf = 70%. Do it on paper first, then compare.
      </p>
      <div className="grid c3">
        {lv
          .filter((l) => l.frequent.length)
          .map((l) => (
            <Note key={l.k} title={`L${l.k}`}>
              {l.frequent.map((f) => (
                <div key={key(f.set)} className="mono" style={{ fontSize: 13 }}>
                  {show(f.set)}: {f.count}
                </div>
              ))}
            </Note>
          ))}
      </div>
      <p>
        At level 3 the join gives {'{'}beer, diapers, milk{'}'} and {'{'}bread, diapers, milk{'}'}. Both survive the prune step, but the second has count 2, so only the first is frequent. Strong rules:
      </p>
      <Table head={['Rule', 'Support', 'Confidence', 'Lift']} num={[1, 2, 3]} rows={strong.map((r) => [`${show(r.lhs)} => ${show(r.rhs)}`, fmt(r.sup, 2), fmt(r.conf, 3), fmt(r.lift, 3)])} />
    </>
  )
}

const DEFAULT = GROCERIES.map((t) => [...t].sort())

export default function Page() {
  const [tx, setTx] = useState<string[][]>(DEFAULT)
  const [minSup, setMinSup] = useState(0.3)
  const [minConf, setMinConf] = useState(0.7)
  const minCount = Math.max(1, Math.ceil(minSup * tx.length - 1e-9))
  const levels = useMemo(() => apriori(tx, minCount), [tx, minCount])
  return (
    <>
      <TopicHeader group="Association" title="Frequent itemsets and Apriori" lede="Association analysis finds items that show up together in the same transactions, then turns them into IF-THEN rules. Apriori is the classic algorithm, and its one big idea fits in a sentence." minutes={30} />

      <Plain>
        <p>
          Picture a pile of supermarket receipts. You want to know which products tend to be bought together, so you can place them nearby or bundle a discount. Counting every possible combination of products is hopeless: 100 products already give about 10<sup>30</sup> possible combinations.
        </p>
        <p>
          Apriori uses a simple shortcut: <strong>if a combination is rare, any bigger combination containing it is rare too</strong>. If hardly anyone buys eggs and cola together, nobody needs to count eggs, cola and bread.
        </p>
      </Plain>

      <Section id="measures" title="Support, confidence and lift" kicker="The three numbers">
        <p>
          An <strong>itemset</strong> is a set of items, such as {'{'}diapers, beer{'}'}. A <strong>rule</strong> <M>{'A \\Rightarrow B'}</M> says that baskets containing A tend to contain B, where A and B share no items.
        </p>
        <Formula title="Definitions (N transactions)">
          <MB>{'support(A \\Rightarrow B) = P(A \\cup B) = \\frac{\\text{count}(A \\cup B)}{N}'}</MB>
          <MB>{'confidence(A \\Rightarrow B) = P(B \\mid A) = \\frac{support(A \\cup B)}{support(A)}'}</MB>
          <MB>{'lift(A, B) = \\frac{P(A \\cup B)}{P(A)\\,P(B)} = \\frac{confidence(A \\Rightarrow B)}{support(B)}'}</MB>
          <p>
            Here <M>{'A \\cup B'}</M> means the basket contains <em>all</em> items of A and of B. A rule is <strong>strong</strong> when support reaches min_sup and confidence reaches min_conf.
          </p>
        </Formula>
        <p>
          Lift compares the rule with chance. Lift above 1: buying A makes B more likely (positive correlation). Lift of 1: independent. Lift below 1: buying A makes B <em>less</em> likely (negative correlation), even if confidence looks high.
        </p>
      </Section>

      <TxEditor tx={tx} onChange={setTx} reset={() => setTx(DEFAULT)}>
        <SupportBars tx={tx} minCount={minCount} />
      </TxEditor>

      <Section id="algorithm" title="The Apriori algorithm" kicker="Level-wise search">
        <Formula title="Apriori property (anti-monotone)">
          <p>
            Every subset of a frequent itemset is frequent. Equivalently: if <M>{'X'}</M> is infrequent, every superset of <M>{'X'}</M> is infrequent.
          </p>
        </Formula>
        <ol>
          <li>Scan the data, count each item, keep the frequent ones as <M>{'L_1'}</M>.</li>
          <li>
            <strong>Join</strong>: build candidates <M>{'C_k'}</M> by joining pairs in <M>{'L_{k-1}'}</M> that agree on their first <M>{'k-2'}</M> items.
          </li>
          <li>
            <strong>Prune</strong>: delete any candidate that has a <M>{'(k-1)'}</M>-subset outside <M>{'L_{k-1}'}</M>. No counting needed.
          </li>
          <li>Scan the data once to count the remaining candidates. Those reaching min_sup form <M>{'L_k'}</M>.</li>
          <li>Repeat until no candidates are left. Then generate rules from all frequent itemsets.</li>
        </ol>
      </Section>

      <StepLab tx={tx} levels={levels} minSup={minSup} setMinSup={setMinSup} />

      <Section id="lattice" title="Seeing the search space" kicker="Lattice">
        <p>
          With d items there are <M>{'2^d - 1'}</M> nonempty itemsets. Apriori walks the lattice from the top down and stops descending under any infrequent set.
        </p>
        <Formula title="Compressed outputs">
          <p>
            A frequent itemset X is <strong>closed</strong> if no proper superset has the same support. It is <strong>maximal</strong> if no proper superset is frequent. Every maximal set is closed, and maximal sets alone tell you which sets are frequent but not their counts.
          </p>
        </Formula>
      </Section>

      <LatticeLab tx={tx} levels={levels} />

      <Section id="rules" title="Generating rules" kicker="Step two">
        <p>
          For each frequent itemset <M>{'l'}</M> and each nonempty proper subset <M>{'s'}</M>, output <M>{'s \\Rightarrow (l - s)'}</M> when <M>{'\\frac{support(l)}{support(s)} \\ge min\\_conf'}</M>. Support is already known from the frequent-itemset step, so no new scan is needed.
        </p>
      </Section>

      <RulesLab tx={tx} levels={levels} minConf={minConf} setMinConf={setMinConf} minSup={minSup} setMinSup={setMinSup} />

      <Section id="lift" title="Interesting does not mean strong" kicker="Correlation">
        <p>Support and confidence can both pass and the rule can still be misleading. Lift checks the rule against what you would expect by chance.</p>
      </Section>

      <LiftLab />

      <Section id="worked" title="Worked example" kicker="Exam style">
        <Worked />
      </Section>

      <Section id="myth" title="About beer and diapers" kicker="A popular story">
        <p>
          Almost every course tells the story that a supermarket found beer and diapers bought together on weekday evenings and moved them next to each other. It is mostly a myth. The pattern came from a small 1990s data analysis, and there is no solid record of a store changing its shelves because of it. It is a good illustration of what a rule looks like, not a real case study. The default baskets above include it on purpose.
        </p>
      </Section>

      <Section id="traps" title="Strengths and weaknesses" kicker="Know these cold">
        <Table
          head={['', 'Apriori']}
          rows={[
            ['Strength', 'Simple, easy to explain, and the prune step removes huge parts of the search space'],
            ['Database scans', 'One per level, so k + 1 scans for itemsets of size up to k'],
            ['Weak spot', <>Can still generate a huge number of candidates when min_sup is low (10<sup>4</sup> frequent items give more than 10<sup>7</sup> candidate pairs)</>],
            ['Fix', 'FP-growth, which needs no candidates and only two scans'],
          ]}
        />
        <Trap>
          <ul>
            <li>Support of a rule is the support of <em>both sides together</em>, not of the left side.</li>
            <li>Confidence is not symmetric: conf(A =&gt; B) and conf(B =&gt; A) have different denominators. Lift is symmetric.</li>
            <li>The prune step removes candidates <em>before</em> counting. If a question asks which candidates are counted, leave the pruned ones out.</li>
            <li>min_sup given as a percentage: convert to a count and round up. 30% of 10 transactions is 3.</li>
            <li>High confidence with lift below 1 is a negatively correlated rule. Say so if asked whether a rule is interesting.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="L2 contains {a, b}, {a, c}, {b, c}, {b, d}. Which C3 candidates survive the prune step?">
          Joining on the first item gives {'{'}a, b, c{'}'} and {'{'}b, c, d{'}'}. {'{'}a, b, c{'}'} has subsets ab, ac, bc, all in L2, so it stays. {'{'}b, c, d{'}'} has subset {'{'}c, d{'}'}, which is not in L2, so it is pruned without counting.
        </Check>
        <Check q="sup({milk}) = 0.7, sup({bread}) = 0.7, sup({milk, bread}) = 0.5. Find conf(milk => bread) and the lift.">
          Confidence = 0.5 / 0.7 = 0.714. Lift = 0.5 / (0.7 x 0.7) = 1.020, so the two items are close to independent despite the high confidence.
        </Check>
        <Check q="Why is every maximal frequent itemset also closed?">
          A maximal set has no frequent superset, so no superset can have the same support (which would make it frequent). That is exactly the closed condition.
        </Check>
        <Check q="If min_sup goes down, what happens to the number of frequent itemsets and to the running time?">
          Both go up. More sets pass the threshold, so more candidates are joined at every level and the algorithm runs more levels.
        </Check>
      </Section>
    </>
  )
}
