import { useState } from 'react'
import { Check, Plain, Section, Table, TopicHeader, Trap } from '../components/Content'
import { Lab } from '../components/Lab'
import { Readout, Seg, Slider, Stat, Toggle } from '../components/ui'

type TaskId = 'error' | 'outlier-num' | 'outlier-cat' | 'impute' | 'ordinal'

const TASKS: Record<
  TaskId,
  {
    name: string
    recommended: 'zero' | 'few'
    input: string
    query: (v: string) => string
    examples: string[]
    expect: Record<string, string>
    hint: string
  }
> = {
  error: {
    name: 'Error detection',
    recommended: 'zero',
    input: 'age: 230',
    query: (v) => `Is there an error in ${v}?`,
    examples: ['Is there an error in country: Frnace?\nYes', 'Is there an error in city: Paris?\nNo', 'Is there an error in salary: -10?\nYes'],
    expect: { 'age: 230': 'Yes. No person is 230 years old.' },
    hint: 'Type an attribute and value, such as "zip: 99999999" or "month: 13".',
  },
  'outlier-num': {
    name: 'Outlier (numeric)',
    recommended: 'zero',
    input: '70F, 71F, 72F, 140F, 73F, 74F',
    query: (v) => `Are there any outliers in ${v}?`,
    examples: ['Are there any outliers in 3kg, 4kg, 3.5kg, 4.2kg?\nNo', 'Are there any outliers in 10cm, 11cm, 95cm, 12cm?\nYes: 95cm'],
    expect: { '70F, 71F, 72F, 140F, 73F, 74F': 'Yes: 140F.' },
    hint: 'A list of measurements with units.',
  },
  'outlier-cat': {
    name: 'Outlier (categorical)',
    recommended: 'zero',
    input: 'audi, chevrolet, dodge, banana, ford',
    query: (v) => `Are there any outliers in {${v}}?`,
    examples: ['Are there any outliers in {red, green, blue}?\nNo', 'Are there any outliers in {cat, dog, hammer, rabbit}?\nYes: hammer'],
    expect: { 'audi, chevrolet, dodge, banana, ford': 'Yes: banana. The others are car brands.' },
    hint: 'A list of category values. Statistics cannot judge these, world knowledge can.',
  },
  impute: {
    name: 'Missing value imputation',
    recommended: 'few',
    input: 'Pittsburgh',
    query: (v) => `City: ${v}, County:`,
    examples: ['City: Detroit, County: Wayne', 'City: Fargo, County: Cass', 'City: Seattle, County: King'],
    expect: { Pittsburgh: 'Allegheny' },
    hint: 'A US city. The examples teach the pattern, the model fills in the county.',
  },
  ordinal: {
    name: 'Ordinal or not',
    recommended: 'few',
    input: '(bronze, silver, gold)',
    query: (v) => `Is ${v} an ordinal?`,
    examples: ['Is (low, medium, high) an ordinal?\nYes', 'Is (door, window, wheel) an ordinal?\nNo', 'Is (disagree, neutral, agree) an ordinal?\nYes'],
    expect: { '(bronze, silver, gold)': 'Yes. The values have a natural order.' },
    hint: 'A set of values in brackets.',
  },
}

function PromptLab() {
  const [task, setTask] = useState<TaskId>('impute')
  const [mode, setMode] = useState<'zero' | 'few'>('few')
  const [shots, setShots] = useState(2)
  const [inputs, setInputs] = useState<Record<TaskId, string>>(() => Object.fromEntries(Object.entries(TASKS).map(([k, t]) => [k, t.input])) as Record<TaskId, string>)
  const t = TASKS[task]
  const v = inputs[task]
  const ex = mode === 'few' ? t.examples.slice(0, shots) : []
  const prompt = [...ex, t.query(v)].join('\n\n')
  const answer = t.expect[v] ?? 'The model answers from what it knows. Check it before trusting it.'
  return (
    <Lab
      title="Build the prompt"
      desc="Pick a preprocessing task, choose zero-shot or few-shot, and edit the input. The exact prompt text updates below."
      controls={
        <>
          <Seg
            label="Task"
            value={task}
            onChange={(k) => {
              setTask(k)
              setMode(TASKS[k].recommended)
            }}
            options={Object.entries(TASKS).map(([k, x]) => ({ v: k as TaskId, label: x.name }))}
          />
          <Seg label="Prompting" value={mode} onChange={setMode} options={[{ v: 'zero', label: 'Zero-shot' }, { v: 'few', label: 'Few-shot' }]} />
          {mode === 'few' && <Slider label="Examples in the prompt" value={shots} min={1} max={t.examples.length} onChange={setShots} />}
          <label className="ctl">
            <span className="ctl-head">Input</span>
            <input className="input" value={v} onChange={(e) => setInputs((s) => ({ ...s, [task]: e.target.value }))} />
            <span className="muted" style={{ fontSize: 12 }}>{t.hint}</span>
          </label>
        </>
      }
      notes={[
        'Imputation in zero-shot mode is just "City: Pittsburgh, County:". Without examples the model may not know you want a county name only. A few examples fix the format.',
        'Error and outlier checks are clear yes or no questions, so zero-shot usually works.',
        'Few-shot examples cost extra tokens on every call. Use as few as give the right format.',
      ]}
    >
      <span className="label">Prompt sent to the model</span>
      <pre className="code" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
        {prompt}
      </pre>
      <span className="label" style={{ display: 'block', marginTop: 12 }}>
        Likely answer
      </span>
      <p style={{ marginTop: 6, color: 'var(--ink)' }}>{answer}</p>
      <Readout>
        <Stat k="Mode" v={mode === 'zero' ? 'Zero-shot' : 'Few-shot'} />
        <Stat k="Examples" v={ex.length} />
        <Stat k="Course suggests" v={t.recommended === 'zero' ? 'Zero-shot' : 'Few-shot'} />
        <Stat k="Prompt words" v={prompt.split(/\s+/).filter(Boolean).length} />
      </Readout>
    </Lab>
  )
}

const SETS: Record<string, { name: string; values: string[]; answers: [boolean, boolean][] }> = {
  lmh: { name: 'low, medium, high', values: ['low', 'medium', 'high'], answers: [[false, true], [false, true]] },
  agree: { name: 'disagree to totally agree', values: ['disagree', 'agree', 'totally agree'], answers: [[false, true], [false, true]] },
  metals: { name: 'silver, gold, platinum', values: ['silver', 'gold', 'platinum'], answers: [[false, true], [false, true]] },
  cities: { name: 'New York, Chicago, Boston', values: ['New York', 'Chicago', 'Boston'], answers: [[false, false], [false, false]] },
  parts: { name: 'door, window, wheel', values: ['door', 'window', 'wheel'], answers: [[false, false], [false, false]] },
}

function OrdinalLab() {
  const [set, setSet] = useState('metals')
  const [ans, setAns] = useState<Record<string, [boolean, boolean][]>>(() => Object.fromEntries(Object.entries(SETS).map(([k, s]) => [k, s.answers.map((a) => [...a] as [boolean, boolean])])))
  const s = SETS[set]
  const a = ans[set]
  const pairOk = a.map(([ab, ba]) => ab !== ba)
  const ordinal = pairOk.every(Boolean)
  const flip = (i: number, j: 0 | 1) => setAns((o) => ({ ...o, [set]: o[set].map((p, k) => (k === i ? (j === 0 ? [!p[0], p[1]] : [p[0], !p[1]]) : p)) as [boolean, boolean][] }))
  return (
    <Lab
      title="Pairwise test for ordinal values"
      desc="Ask the model, for each neighboring pair, whether A is higher than B and whether B is higher than A. The toggles show the model's answers. Flip them to see how the verdict follows the rule."
      controls={<Seg label="Value set" value={set} onChange={setSet} options={Object.entries(SETS).map(([k, x]) => ({ v: k, label: x.name }))} />}
      notes={[
        'Ordinal means exactly one direction is "yes" for every pair. Gold is higher than silver, silver is not higher than gold.',
        'New York vs Chicago: both directions are "no". There is no order, so the attribute is nominal.',
        'If both directions come back "yes", the model contradicted itself. Treat that answer as unreliable.',
      ]}
    >
      <Table
        head={['Pair', 'Is A higher than B?', 'Is B higher than A?', 'Pair says']}
        rows={s.values.slice(0, -1).map((v, i) => {
          const w = s.values[i + 1]
          const [ab, ba] = a[i]
          return [
            `${v} / ${w}`,
            <Toggle on={ab} onChange={() => flip(i, 0)}>
              {ab ? 'Yes' : 'No'}
            </Toggle>,
            <Toggle on={ba} onChange={() => flip(i, 1)}>
              {ba ? 'Yes' : 'No'}
            </Toggle>,
            ab && ba ? 'contradiction' : ab !== ba ? 'ordered' : 'no order',
          ]
        })}
      />
      <Readout>
        <Stat k="Pairs with one yes" v={`${pairOk.filter(Boolean).length} of ${pairOk.length}`} />
        <Stat k="Verdict" v={ordinal ? 'Ordinal' : 'Not ordinal'} />
      </Readout>
    </Lab>
  )
}

export default function Page() {
  return (
    <>
      <TopicHeader
        group="Preprocessing"
        title="LLMs as data preprocessors"
        lede="Large language models know a lot about the world. That makes them useful for cleaning jobs that pure statistics cannot do, like spotting that 'banana' does not belong in a list of car brands."
        minutes={15}
      />

      <Plain>
        <p>
          Classic cleaning methods only see numbers and counts. They cannot tell that Athens is a city in Georgia or that platinum outranks gold. An LLM has read enough text to know these things. You ask it a short, well-formed question about your data and use its answer as a cleaning decision.
        </p>
      </Plain>

      <Section id="prompting" title="Zero-shot and few-shot" kicker="Two ways to ask">
        <Table
          head={['Style', 'What the prompt contains', 'Good for']}
          rows={[
            ['Zero-shot', 'Only the question, no examples', 'Clear yes/no checks: errors, outliers'],
            ['Few-shot', 'A few input and output examples, then the new input', 'Tasks where the output format matters: imputation, ordinal detection'],
          ]}
        />
      </Section>

      <Section id="tasks" title="Four preprocessing tasks" kicker="Patterns">
        <Table
          head={['Task', 'Approach', 'Prompt pattern']}
          rows={[
            ['Error detection', 'Zero-shot', <code>Is there an error in attr: val?</code>],
            ['Outlier detection', 'Zero-shot', <code>Are there any outliers in v1, v2, ...?</code>],
            ['Missing value imputation', 'Few-shot', <code>City: Detroit, County: Wayne ... City: X, County:</code>],
            ['Ordinal or not', 'Few-shot', <code>Is (low, medium, high) an ordinal? Yes ...</code>],
          ]}
        />
      </Section>
      <PromptLab />

      <Section id="ordinal" title="Detecting ordinal attributes" kicker="Pairwise logic">
        <p>
          Ask about each pair in both directions. If exactly one direction is "yes" for every pair, the values have an order. If both are "no", there is no order. This turns a fuzzy question into a simple check.
        </p>
      </Section>
      <OrdinalLab />

      <Section id="limits" title="When not to trust it" kicker="Limits">
        <Trap title="Watch out">
          <ul>
            <li>LLMs can be confidently wrong. Spot-check answers against a trusted source.</li>
            <li>Answers can change between runs. Fix the prompt and settings, and keep the outputs.</li>
            <li>Every record is an API call. Cost and time grow with data size.</li>
            <li>Sending customer data to an external model can break privacy rules. Check before you send.</li>
            <li>Ambiguous inputs need context. "Athens" could be in Georgia, Ohio or Greece.</li>
          </ul>
        </Trap>
      </Section>

      <Section id="check" title="Check yourself">
        <Check q="Why few-shot for imputation but zero-shot for error detection?">
          Imputation needs the answer in a specific format (just the county name). Examples show the format. Error detection is a plain yes or no question the model already understands.
        </Check>
        <Check q="What can an LLM do that a z-score cannot?">Judge categorical and semantic values, such as spotting that 'banana' is not a car brand, or that a city and county do not match.</Check>
        <Check q="The model says 'red' is higher than 'blue' and 'blue' is higher than 'red'. What do you conclude?">The answers contradict each other, so you cannot trust them for this pair. Colors are nominal.</Check>
      </Section>
    </>
  )
}
