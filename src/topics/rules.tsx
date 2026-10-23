import { useMemo, useState } from 'react'
import { Check, Formula, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { M, MB } from '../components/Math'
import { Btn, Readout, Seg, Stat } from '../components/ui'
import { BUYS_COMPUTER, type Row } from '../lib/datasets'
import { fmt, log2 } from '../lib/stats'

const D = BUYS_COMPUTER
const ATTRS = D.columns
const TARGET = D.target
const VALUES: Record<string, string[]> = Object.fromEntries(ATTRS.map((a) => [a, [...new Set(D.rows.map((r) => r[a]))]]))

type Cond = [string, string]
type Rule = { conds: Cond[]; cls: string }

const matches = (r: Row, conds: Cond[]) => conds.every(([a, v]) => r[a] === v)
const shortRule = (rule: Rule) => `IF ${rule.conds.map(([a, v]) => `${a} = ${v}`).join(' AND ')} THEN ${rule.cls}`
const ruleText = (rule: Rule) => `IF ${rule.conds.length ? rule.conds.map(([a, v]) => `${a} = ${v}`).join(' AND ') : 'true'} THEN ${TARGET} = ${rule.cls}`

function stats(rule: Rule, rows: Row[] = D.rows) {
  const cov = rows.filter((r) => matches(r, rule.conds))
  const ok = cov.filter((r) => r[TARGET] === rule.cls)
  return { ncov: cov.length, ncorrect: ok.length, coverage: cov.length / rows.length, accuracy: cov.length ? ok.length / cov.length : 0 }
}

function BuilderLab() {
  const [pick, setPick] = useState<Record<string, string>>({ age: 'youth', income: 'any', student: 'yes', credit_rating: 'any' })
  const [cls, setCls] = useState('yes')
  const rule: Rule = { conds: ATTRS.filter((a) => pick[a] !== 'any').map((a) => [a, pick[a]] as Cond), cls }
  const s = stats(rule)
  return (
    <Lab
      title="Build a rule and score it"
      desc="Scored on the 14 buys_computer tuples."
      controls={
        <>
          {ATTRS.map((a) => (
            <Seg key={a} label={a} value={pick[a]} onChange={(v) => setPick({ ...pick, [a]: v })} options={['any', ...VALUES[a]].map((v) => ({ v, label: v === 'any' ? 'any' : v.replace('_', ' ') }))} />
          ))}
          <Seg label="THEN buys_computer =" value={cls} onChange={setCls} options={[{ v: 'yes', label: 'yes' }, { v: 'no', label: 'no' }]} />
        </>
      }
      notes={[
        'Set only student = yes: it covers half the data with high accuracy.',
        'Add conditions one by one: coverage can only drop, accuracy usually rises.',
        'Set every attribute to any: "IF true THEN yes" covers all 14 with accuracy 9/14.',
      ]}
    >
      <p className="mono" style={{ color: 'var(--ink)', fontSize: 13.5 }}>{ruleText(rule)}</p>
      <Table
        head={['#', ...ATTRS, TARGET, 'covered', 'correct']}
        hl={(i) => matches(D.rows[i], rule.conds)}
        rows={D.rows.map((r, i) => {
          const c = matches(r, rule.conds)
          return [i + 1, ...ATTRS.map((a) => r[a]), r[TARGET], c ? 'yes' : '', c ? (r[TARGET] === cls ? 'yes' : 'no') : '']
        })}
      />
      <Readout>
        <Stat k="n covers" v={s.ncov} />
        <Stat k="n correct" v={s.ncorrect} />
        <Stat k="Coverage" v={fmt(s.coverage, 3)} sub={`${s.ncov} / 14`} />
        <Stat k="Accuracy" v={s.ncov ? fmt(s.accuracy, 3) : '-'} sub={s.ncov ? `${s.ncorrect} / ${s.ncov}` : 'covers nothing'} />
      </Readout>
    </Lab>
  )
}

const RULESET: (Rule & { id: string })[] = [
  { id: 'R1', conds: [['age', 'youth'], ['student', 'no']], cls: 'no' },
  { id: 'R2', conds: [['age', 'youth'], ['student', 'yes']], cls: 'yes' },
  { id: 'R3', conds: [['age', 'senior'], ['credit_rating', 'excellent']], cls: 'no' },
  { id: 'R4', conds: [['income', 'high']], cls: 'no' },
  { id: 'R5', conds: [['student', 'yes']], cls: 'yes' },
  { id: 'R6', conds: [['credit_rating', 'fair']], cls: 'yes' },
]

function ConflictLab() {
  const [order, setOrder] = useState(RULESET.map((r) => r.id))
  const [tuple, setTuple] = useState<Row>({ age: 'youth', income: 'high', student: 'no', credit_rating: 'fair' })
  const [strategy, setStrategy] = useState<'size' | 'order'>('size')
  const rules = order.map((id) => RULESET.find((r) => r.id === id)!)
  const fired = rules.filter((r) => matches(tuple, r.conds))
  const winner =
    fired.length === 0 ? null : strategy === 'order' ? fired[0] : fired.reduce((b, r) => (r.conds.length > b.conds.length ? r : b), fired[0])
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= order.length) return
    const n = [...order]
    ;[n[i], n[j]] = [n[j], n[i]]
    setOrder(n)
  }
  return (
    <Lab
      title="When several rules fire"
      desc="Pick a tuple. When fired rules disagree, the strategy picks the winner."
      controls={
        <>
          {ATTRS.map((a) => (
            <Seg key={a} label={a} value={tuple[a]} onChange={(v) => setTuple({ ...tuple, [a]: v })} options={VALUES[a].map((v) => ({ v, label: v.replace('_', ' ') }))} />
          ))}
          <Seg label="Strategy" value={strategy} onChange={setStrategy} options={[{ v: 'size', label: 'Size ordering' }, { v: 'order', label: 'Rule ordering' }]} />
        </>
      }
      notes={[
        'The default tuple fires R1, R4 (no) and R6 (yes). Size ordering picks R1, the most specific.',
        'Switch to rule ordering and move R6 to the top: the same tuple becomes yes.',
        'Pick middle_aged, low, no, excellent: nothing fires, so the default rule says yes.',
      ]}
    >
      <Table
        head={['#', 'Rule (THEN buys_computer)', 'Cov.', 'Acc.', 'Fires', '']}
        num={[2, 3]}
        hl={(i) => winner?.id === rules[i].id}
        rows={rules.map((r, i) => {
          const s = stats(r)
          return [
            i + 1,
            <span className="mono" style={{ fontSize: 12.5 }}>{`${r.id}: ${shortRule(r)}`}</span>,
            fmt(s.coverage, 2),
            fmt(s.accuracy, 2),
            matches(tuple, r.conds) ? 'yes' : '',
            <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
              <Btn sm variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">Up</Btn>
              <Btn sm variant="ghost" onClick={() => move(i, 1)} disabled={i === rules.length - 1} title="Move down">Down</Btn>
            </span>,
          ]
        })}
      />
      <Readout>
        <Stat k="Rules fired" v={fired.length ? fired.map((r) => r.id).join(', ') : 'none'} />
        <Stat k="Winner" v={winner ? winner.id : 'default rule'} />
        <Stat k="Prediction" v={winner ? winner.cls : 'yes'} sub={winner ? undefined : 'majority class'} />
      </Readout>
    </Lab>
  )
}

type Cand = { a: string; v: string; pos: number; neg: number; gain: number }
type Snap = { rules: Rule[]; current: Cond[]; cands: Cand[]; chosen?: Cand; remaining: number; remainingPos: number; msg: string }

function foil(pos: number, neg: number, p2: number, n2: number) {
  if (p2 === 0) return -Infinity
  return p2 * (log2(p2 / (p2 + n2)) - log2(pos / (pos + neg)))
}

function covering(target: string) {
  const snaps: Snap[] = []
  let remaining = [...D.rows]
  const rules: Rule[] = []
  const posIn = (rows: Row[]) => rows.filter((r) => r[TARGET] === target).length
  snaps.push({ rules: [], current: [], cands: [], remaining: remaining.length, remainingPos: posIn(remaining), msg: `Start: learn rules for ${TARGET} = ${target}. Tuples of this class are positive, the rest negative.` })
  let guard = 0
  while (posIn(remaining) > 0 && guard++ < 10) {
    const conds: Cond[] = []
    let covered = remaining
    while (covered.some((r) => r[TARGET] !== target)) {
      const pos = posIn(covered)
      const neg = covered.length - pos
      const cands: Cand[] = []
      ATTRS.filter((a) => !conds.some(([c]) => c === a)).forEach((a) =>
        VALUES[a].forEach((v) => {
          const sub = covered.filter((r) => r[a] === v)
          const p2 = posIn(sub)
          cands.push({ a, v, pos: p2, neg: sub.length - p2, gain: foil(pos, neg, p2, sub.length - p2) })
        }),
      )
      cands.sort((x, y) => y.gain - x.gain || y.pos - x.pos)
      const best = cands[0]
      if (!best || !(best.gain > 0)) break
      conds.push([best.a, best.v])
      covered = covered.filter((r) => r[best.a] === best.v)
      snaps.push({ rules: [...rules], current: [...conds], cands: cands.slice(0, 8), chosen: best, remaining: remaining.length, remainingPos: posIn(remaining), msg: `Add the condition with the highest FOIL gain: ${best.a} = ${best.v} (covers ${best.pos} positive, ${best.neg} negative).` })
    }
    if (!conds.length) break
    const rule = { conds, cls: target }
    rules.push(rule)
    remaining = remaining.filter((r) => !matches(r, conds))
    snaps.push({ rules: [...rules], current: [], cands: [], remaining: remaining.length, remainingPos: posIn(remaining), msg: `The rule covers no negatives, so it is finished. Remove the ${covered.length} tuples it covers. ${posIn(remaining)} positive tuples remain.` })
  }
  snaps[snaps.length - 1].msg += ' No positives left: done.'
  return snaps
}

function CoveringLab() {
  const [target, setTarget] = useState('yes')
  const snaps = useMemo(() => covering(target), [target])
  const [i, setI] = useState(0)
  const s = snaps[Math.min(i, snaps.length - 1)]
  return (
    <Lab
      title="Sequential covering, step by step"
      desc="Grow a rule by best FOIL gain until it covers no negatives, remove what it covers, repeat."
      controls={
        <>
          <Seg label="Learn rules for class" value={target} onChange={(v) => { setTarget(v); setI(0) }} options={[{ v: 'yes', label: 'yes' }, { v: 'no', label: 'no' }]} />
          <div className="row">
            <Btn variant="primary" onClick={() => setI(Math.min(i + 1, snaps.length - 1))} disabled={i >= snaps.length - 1}>Next step</Btn>
            <Btn onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>Back</Btn>
          </div>
          <Btn sm variant="ghost" onClick={() => setI(snaps.length - 1)}>Jump to the end</Btn>
        </>
      }
      notes={['Class yes: the first pick is age = middle_aged (4 positives, 0 negatives), finished in one step.', 'Compare the result with the tree rules above: similar, but each rule is learned on what the earlier ones left over.']}
    >
      <p style={{ color: 'var(--ink)' }}>
        Step {Math.min(i, snaps.length - 1) + 1} of {snaps.length}. {s.msg}
      </p>
      {s.current.length > 0 && <p className="mono" style={{ fontSize: 13 }}>Growing: {ruleText({ conds: s.current, cls: target })}</p>}
      {s.cands.length > 0 && (
        <Table
          head={['Candidate condition', 'pos covered', 'neg covered', 'FOIL gain']}
          num={[1, 2, 3]}
          hl={(k) => s.chosen?.a === s.cands[k].a && s.chosen?.v === s.cands[k].v}
          rows={s.cands.map((c) => [`${c.a} = ${c.v}`, c.pos, c.neg, isFinite(c.gain) ? fmt(c.gain, 3) : 'n/a'])}
        />
      )}
      <div style={{ marginTop: 12 }}>
        <span className="label">Rules learned so far</span>
        {s.rules.length ? (
          <ol style={{ marginTop: 6 }}>
            {s.rules.map((r, k) => (
              <li key={k} className="mono" style={{ fontSize: 13 }}>{ruleText(r)}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">None yet.</p>
        )}
      </div>
      <Readout>
        <Stat k="Rules" v={s.rules.length} />
        <Stat k="Tuples left" v={s.remaining} />
        <Stat k="Positives left" v={s.remainingPos} />
      </Readout>
    </Lab>
  )
}

const TREE_RULES: Rule[] = [
  { conds: [['age', 'youth'], ['student', 'no']], cls: 'no' },
  { conds: [['age', 'youth'], ['student', 'yes']], cls: 'yes' },
  { conds: [['age', 'middle_aged']], cls: 'yes' },
  { conds: [['age', 'senior'], ['credit_rating', 'excellent']], cls: 'no' },
  { conds: [['age', 'senior'], ['credit_rating', 'fair']], cls: 'yes' },
]

export default function Page() {
  return (
    <>
      <TopicHeader group="Classification" title="Rule-based classification" lede="A list of readable IF-THEN rules: written by hand, read off a decision tree, or learned with sequential covering." />

      <Plain>
        <p>
          Like a doctor's checklist: IF fever AND rash THEN measles. The questions are how good each rule is, what to do when rules disagree, and where rules come from.
        </p>
      </Plain>

      <Section id="rules" title="Rules, coverage and accuracy">
        <p>
          <strong>Antecedent</strong>: the IF part, a conjunction of tests. <strong>Consequent</strong>: the THEN part, a class. A rule <strong>covers</strong> a tuple when every test is true for it.
        </p>
        <Formula title="Quality of a rule R on data D">
          <MB>{'coverage(R) = \\frac{n_{covers}}{|D|}, \\qquad accuracy(R) = \\frac{n_{correct}}{n_{covers}}'}</MB>
          <p>
            <M>{'n_{covers}'}</M>: tuples covered by R. <M>{'n_{correct}'}</M>: covered tuples that R classifies correctly.
          </p>
        </Formula>
      </Section>

      <BuilderLab />

      <Section id="conflicts" title="Conflict resolution">
        <ul>
          <li><strong>Size ordering</strong>: the rule with the most conditions (the most specific one) wins.</li>
          <li><strong>Rule ordering</strong>: a priority list (decision list), first rule that fires wins. The order comes from class or rule quality.</li>
          <li><strong>Default rule</strong>: if no rule fires, predict a default class, usually the majority class.</li>
        </ul>
      </Section>

      <ConflictLab />

      <Section id="from-tree" title="Rules from a decision tree">
        <p>
          Each root-to-leaf path is one rule. The rules are <strong>mutually exclusive</strong> and <strong>exhaustive</strong>, so no conflict resolution is needed. The buys_computer tree gives:
        </p>
        <Table
          head={['Rule', 'Coverage', 'Accuracy']}
          num={[1, 2]}
          rows={TREE_RULES.map((r) => {
            const s = stats(r)
            return [<span className="mono" style={{ fontSize: 12.5 }}>{shortRule(r)}</span>, `${s.ncov} / 14`, fmt(s.accuracy, 2)]
          })}
        />
        <p style={{ marginTop: 12 }}>Coverages sum to 14 / 14. Pruning conditions afterwards can make rules overlap again.</p>
      </Section>

      <Section id="covering" title="Sequential covering">
        <p>Learn rules for one class at a time, each covering many tuples of that class and few others.</p>
        <Formula title="FOIL gain for adding a condition">
          <MB>{"FOIL\\_Gain = pos' \\times \\Big(\\log_2 \\frac{pos'}{pos' + neg'} - \\log_2 \\frac{pos}{pos + neg}\\Big)"}</MB>
          <p>
            <M>{'pos, neg'}</M>: covered by the current rule. <M>{"pos', neg'"}</M>: covered after adding the condition. Rewards higher accuracy that still covers many positives.
          </p>
        </Formula>
      </Section>

      <CoveringLab />

      <Section id="traps" title="Common mistakes">
        <Trap>
          <ul>
            <li>Coverage is divided by all tuples |D|. Accuracy is divided by the covered tuples only.</li>
            <li>A rule with 100% accuracy that covers one tuple is usually overfitting.</li>
            <li>Tree rules never conflict; hand-written or covering rules can, so state the strategy you use.</li>
            <li>In sequential covering, the tuples covered by a finished rule are removed before learning the next rule.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="On buys_computer, what are the coverage and accuracy of IF age = youth AND student = yes THEN yes?">It covers tuples 9 and 11, both yes. Coverage 2/14 = 0.143, accuracy 2/2 = 1.</Check>
        <Check q="Why do rules extracted from a decision tree never conflict?">Each tuple follows exactly one path from root to leaf, so it satisfies exactly one rule. The rules are mutually exclusive and exhaustive.</Check>
        <Check q="A rule covers pos = 9, neg = 5. Adding a condition gives pos' = 6, neg' = 0. What is the FOIL gain?">6 × (log2(6/6) - log2(9/14)) = 6 × (0 + 0.637) = 3.82.</Check>
      </Section>
    </>
  )
}
