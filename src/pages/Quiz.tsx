import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table, TopicHeader } from '../components/Content'
import { Btn, Seg, Stat } from '../components/ui'
import { QUESTIONS, type Question } from '../content/quiz'
import { Rich } from '../content/Rich'
import '../content/practice.css'
import { useStored } from '../lib/store'
import { GROUPS, TOPICS } from '../topics'

type Result = { given: string; correct: boolean }

function shuffled<T>(a: T[]) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

const short = (id: string) => TOPICS.find((t) => t.id === id)?.short ?? id
const fmtAns = (q: Question) => (q.type === 'num' ? String(Number(q.answer.toFixed(4))) : q.options![q.answer])

export default function Quiz() {
  const [topics, setTopics] = useStored<string[]>('qz-topics', TOPICS.map((t) => t.id))
  const [length, setLength] = useStored<number>('qz-length', 20)
  const [best, setBest] = useStored<{ pct: number; total: number } | null>('qz-best', null)
  const [phase, setPhase] = useState<'setup' | 'run' | 'done'>('setup')
  const [qs, setQs] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<Record<string, Result>>({})
  const [input, setInput] = useState('')

  const pool = useMemo(() => QUESTIONS.filter((q) => topics.includes(q.topic)), [topics])
  const q = qs[idx]
  const res = q ? results[q.id] : undefined

  const start = (list: Question[]) => {
    setQs(list)
    setIdx(0)
    setResults({})
    setInput('')
    setPhase('run')
  }

  const answer = (given: string, correct: boolean) => {
    if (!q || res) return
    setResults((r) => ({ ...r, [q.id]: { given, correct } }))
  }

  const checkNum = () => {
    if (!q || !input.trim()) return
    const v = Number(input.replace(',', '.'))
    if (Number.isNaN(v)) return
    answer(input, Math.abs(v - q.answer) <= (q.tol ?? 0.005) + 1e-9)
  }

  const next = () => {
    setInput('')
    if (idx + 1 >= qs.length) setPhase('done')
    else setIdx((i) => i + 1)
  }

  const correct = Object.values(results).filter((r) => r.correct).length
  const pct = qs.length ? Math.round((correct / qs.length) * 100) : 0

  useEffect(() => {
    if (phase !== 'done' || qs.length < 10) return
    if (!best || pct > best.pct) setBest({ pct, total: qs.length })
  }, [phase])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'run' || !q) return
      const t = e.target as HTMLElement
      if (e.key === 'Enter' && res) {
        e.preventDefault()
        next()
        return
      }
      if (t.tagName === 'INPUT') return
      if (!res && q.options) {
        const k = Number(e.key)
        if (k >= 1 && k <= q.options.length) answer(q.options[k - 1], k - 1 === q.answer)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase === 'setup') {
    const toggle = (id: string) => setTopics((ts) => (ts.includes(id) ? ts.filter((x) => x !== id) : [...ts, id]))
    const count = length === 0 ? pool.length : Math.min(length, pool.length)
    return (
      <div className="page">
        <TopicHeader group="Practice" title="Practice quiz" lede={`${QUESTIONS.length} questions with worked answers, including exam-style calculations.`} />
        <div className="card" style={{ display: 'grid', gap: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Topics ({topics.length} selected, {pool.length} questions)</span>
            <div className="row">
              <Btn sm variant="ghost" onClick={() => setTopics(TOPICS.map((t) => t.id))}>
                Select all
              </Btn>
              <Btn sm variant="ghost" onClick={() => setTopics([])}>
                Clear
              </Btn>
            </div>
          </div>
          {GROUPS.map((g) => (
            <div key={g}>
              <div className="ctl-head" style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  className="chip"
                  style={{ border: 0, padding: 0 }}
                  onClick={() => {
                    const ids = TOPICS.filter((t) => t.group === g).map((t) => t.id)
                    const all = ids.every((i) => topics.includes(i))
                    setTopics((ts) => (all ? ts.filter((x) => !ids.includes(x)) : [...new Set([...ts, ...ids])]))
                  }}
                >
                  {g}
                </button>
              </div>
              <div className="chips">
                {TOPICS.filter((t) => t.group === g).map((t) => (
                  <button key={t.id} type="button" className={`chip${topics.includes(t.id) ? ' on' : ''}`} aria-pressed={topics.includes(t.id)} onClick={() => toggle(t.id)}>
                    {t.short}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Seg
            label="Length"
            value={length}
            onChange={setLength}
            options={[
              { v: 10, label: '10' },
              { v: 20, label: '20' },
              { v: 40, label: '40' },
              { v: 0, label: 'All' },
            ]}
          />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Btn variant="primary" disabled={!pool.length} onClick={() => start(shuffled(pool).slice(0, count))}>
              Start {count} questions
            </Btn>
            {best && <span className="label">Best so far: {best.pct}% on {best.total} questions</span>}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const byTopic = [...new Set(qs.map((x) => x.topic))].map((t) => {
      const list = qs.filter((x) => x.topic === t)
      return { t, total: list.length, ok: list.filter((x) => results[x.id]?.correct).length }
    })
    const wrong = qs.filter((x) => !results[x.id]?.correct)
    return (
      <div className="page">
        <TopicHeader group="Practice" title="Quiz results" lede="Redo what you missed. Review any topic below 70%." />
        <div className="grid c3">
          <div className="card" style={{ textAlign: 'center' }}>
            <span className="label">Score</span>
            <div className="qz-big" style={{ marginTop: 10 }}>
              {pct}%
            </div>
          </div>
          <Stat k="Correct" v={`${correct} of ${qs.length}`} />
          <Stat k="Best" v={best ? `${best.pct}%` : '-'} sub="quizzes of 10 or more questions" />
        </div>
        <div className="row" style={{ margin: '18px 0' }}>
          {wrong.length > 0 && (
            <Btn variant="primary" onClick={() => start(shuffled(wrong))}>
              Retry the {wrong.length} wrong
            </Btn>
          )}
          <Btn onClick={() => setPhase('setup')}>New quiz</Btn>
        </div>
        <Table
          head={['Topic', 'Correct', 'Score', '']}
          num={[1, 2]}
          rows={byTopic.map((r) => [
            short(r.t),
            `${r.ok} / ${r.total}`,
            `${Math.round((r.ok / r.total) * 100)}%`,
            r.ok < r.total ? <Link to={`/learn/${r.t}`}>Review</Link> : '',
          ])}
        />
        {wrong.length > 0 && (
          <div style={{ marginTop: 28, display: 'grid', gap: 12 }}>
            <h3>What you missed</h3>
            {wrong.map((x) => (
              <div className="card tight" key={x.id}>
                <span className="label">{short(x.topic)}</span>
                <p style={{ color: 'var(--ink)', margin: '6px 0' }}>
                  <Rich text={x.q} />
                </p>
                <p style={{ margin: 0, fontSize: 14 }}>
                  You said {results[x.id]?.given ?? 'nothing'}. Answer: <strong>{fmtAns(x)}</strong>. <Rich text={x.explain} />
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!q) return null
  return (
    <div className="page narrow">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="label">
          Question {idx + 1} of {qs.length} · {short(q.topic)}
        </span>
        <span className="label">
          {correct} correct
        </span>
      </div>
      <div className="fc-bar" aria-hidden>
        <span style={{ width: `${(idx / qs.length) * 100}%`, background: 'var(--accent)' }} />
      </div>
      <div className="card fade-in" key={q.id} style={{ marginTop: 18 }}>
        <span className="label">{q.type === 'num' ? 'Calculation' : q.type === 'tf' ? 'True or false' : 'Multiple choice'}</span>
        <div className="qz-q">
          <Rich text={q.q} />
        </div>
        {q.options ? (
          <div style={{ display: 'grid', gap: 6 }}>
            {q.options.map((o, i) => {
              const cls = res ? (i === q.answer ? ' right' : res.given === o ? ' wrong' : '') : ''
              return (
                <button key={i} type="button" className={`qz-opt${cls}`} disabled={!!res} onClick={() => answer(o, i === q.answer)}>
                  <span className="key">{i + 1}</span>
                  <span style={{ flex: 1 }}>
                    <Rich text={o} />
                  </span>
                  {cls === ' right' && <span className="qz-tag">Correct</span>}
                  {cls === ' wrong' && <span className="qz-tag">Your answer</span>}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="row">
            <input
              className="input"
              style={{ fontFamily: 'var(--mono)', width: 180 }}
              inputMode="decimal"
              placeholder="Your answer"
              value={input}
              disabled={!!res}
              autoFocus
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !res) {
                  e.preventDefault()
                  e.stopPropagation()
                  checkNum()
                }
              }}
            />
            <Btn variant="primary" onClick={checkNum} disabled={!!res || !input.trim()}>
              Check
            </Btn>
            <span className="muted" style={{ fontSize: 13 }}>
              Accepted within ±{q.tol ?? 0.005}
            </span>
          </div>
        )}
        {res && (
          <div className={`qz-fb ${res.correct ? 'ok' : 'no'}`}>
            <span className="label">{res.correct ? 'Correct' : `Not quite. Answer: ${fmtAns(q)}`}</span>
            <Rich text={q.explain} />
          </div>
        )}
      </div>
      <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
        <Btn sm variant="ghost" onClick={() => setPhase('setup')}>
          Quit
        </Btn>
        <Btn variant="primary" onClick={next} disabled={!res}>
          {idx + 1 >= qs.length ? 'See results' : 'Next'} <kbd>Enter</kbd>
        </Btn>
      </div>
    </div>
  )
}
