import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Section, Table, TopicHeader } from '../components/Content'
import { Btn, Seg, Stat } from '../components/ui'
import { CARDS, type Card } from '../content/flashcards'
import { Rich } from '../content/Rich'
import '../content/practice.css'
import { useStored } from '../lib/store'
import { GROUPS, TOPICS } from '../topics'

type Status = 'known' | 'learning'
const cardId = (c: Card) => `${c.topic}|${c.front}`

function shuffled<T>(a: T[]) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export default function Flashcards() {
  const [deck, setDeck] = useStored<string>('fc-deck', 'all')
  const [mode, setMode] = useState<'study' | 'list'>('study')
  const [progress, setProgress] = useStored<Record<string, Status>>('fc-progress', {})
  const [onlyLearning, setOnlyLearning] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [seed, setSeed] = useState(0)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const deckCards = useMemo(() => (deck === 'all' ? CARDS : CARDS.filter((c) => c.topic === deck)), [deck])
  const order = useMemo(() => {
    const base = onlyLearning ? deckCards.filter((c) => progress[cardId(c)] === 'learning') : deckCards
    return shuffle ? shuffled(base) : base
  }, [deckCards, onlyLearning, shuffle, seed])

  const known = deckCards.filter((c) => progress[cardId(c)] === 'known').length
  const learning = deckCards.filter((c) => progress[cardId(c)] === 'learning').length
  const card = order[idx]
  const done = idx >= order.length

  const restart = () => {
    setIdx(0)
    setFlipped(false)
  }

  useEffect(restart, [deck, onlyLearning, shuffle, seed])

  const go = (d: number) => {
    setFlipped(false)
    setIdx((i) => Math.max(0, Math.min(order.length, i + d)))
  }
  const mark = (s: Status) => {
    if (!card) return
    setProgress((p) => ({ ...p, [cardId(card)]: s }))
    go(1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (mode !== 'study' || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(t.tagName)) return
      if (e.key === ' ') {
        e.preventDefault()
        if (!done) setFlipped((f) => !f)
      } else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === '1') mark('learning')
      else if (e.key === '2') mark('known')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const topic = TOPICS.find((t) => t.id === deck)
  const resetDeck = () => {
    setProgress((p) => {
      const n = { ...p }
      deckCards.forEach((c) => delete n[cardId(c)])
      return n
    })
    setOnlyLearning(false)
    restart()
  }

  return (
    <div className="page">
      <TopicHeader group="Practice" title="Flashcards" lede="Flip, mark what you knew, repeat the rest. Progress is saved in this browser." />

      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <label className="ctl" style={{ minWidth: 240 }}>
            <span className="ctl-head">Deck</span>
            <select className="input" value={deck} onChange={(e) => setDeck(e.target.value)}>
              <option value="all">All topics ({CARDS.length} cards)</option>
              {GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {TOPICS.filter((t) => t.group === g).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.short} ({CARDS.filter((c) => c.topic === t.id).length})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <Seg
            label="View"
            value={mode}
            onChange={setMode}
            options={[
              { v: 'study', label: 'Study' },
              { v: 'list', label: 'All cards' },
            ]}
          />
        </div>
        <div className="grid c4">
          <Stat k="Cards" v={deckCards.length} />
          <Stat k="Known" v={known} />
          <Stat k="Still learning" v={learning} />
          <Stat k="Not seen" v={deckCards.length - known - learning} />
        </div>
        <div className="fc-bar" aria-hidden>
          <span style={{ width: `${(known / deckCards.length) * 100}%`, background: 'var(--good)' }} />
          <span style={{ width: `${(learning / deckCards.length) * 100}%`, background: 'var(--warn)' }} />
        </div>
        {topic && (
          <p style={{ margin: 0, fontSize: 14 }}>
            Review the topic first: <Link to={`/learn/${topic.id}`}>{topic.title}</Link>
          </p>
        )}
      </div>

      {mode === 'study' ? (
        <>
          <div className="row" style={{ marginTop: 18, justifyContent: 'space-between' }}>
            <div className="row">
              <Btn sm variant={shuffle ? 'primary' : undefined} onClick={() => (shuffle ? setSeed((s) => s + 1) : setShuffle(true))}>
                {shuffle ? 'Reshuffle' : 'Shuffle'}
              </Btn>
              {shuffle && (
                <Btn sm variant="ghost" onClick={() => setShuffle(false)}>
                  In order
                </Btn>
              )}
              <Btn sm variant={onlyLearning ? 'primary' : undefined} disabled={!learning && !onlyLearning} onClick={() => setOnlyLearning((v) => !v)}>
                {onlyLearning ? 'Showing still learning' : `Only still learning (${learning})`}
              </Btn>
            </div>
            <span className="label">
              {done ? 'Finished' : `Card ${idx + 1} of ${order.length}`}
            </span>
          </div>

          {done || !card ? (
            <div className="card" style={{ marginTop: 18, textAlign: 'center', padding: 36 }}>
              <span className="label">Round complete</span>
              <h2 style={{ margin: '10px 0' }}>{order.length ? 'Nice work.' : 'No cards here.'}</h2>
              <p>
                {known} known and {learning} still learning in this deck.
              </p>
              <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
                {learning > 0 && (
                  <Btn
                    variant="primary"
                    onClick={() => {
                      setOnlyLearning(true)
                      setSeed((s) => s + 1)
                    }}
                  >
                    Study the {learning} still learning
                  </Btn>
                )}
                <Btn
                  onClick={() => {
                    setOnlyLearning(false)
                    restart()
                  }}
                >
                  Start over
                </Btn>
              </div>
            </div>
          ) : (
            <>
              <div className="fc-stage">
                <div
                  className={`fc-card${flipped ? ' flipped' : ''}`}
                  onClick={() => setFlipped((f) => !f)}
                  role="button"
                  tabIndex={0}
                  aria-label={flipped ? 'Answer side, click to show question' : 'Question side, click to show answer'}
                >
                  <div className="fc-face">
                    <span className="label">{TOPICS.find((t) => t.id === card.topic)?.short}</span>
                    <div className="fc-front">
                      <Rich text={card.front} />
                    </div>
                    <span className="fc-hint">Click or press space to flip</span>
                  </div>
                  <div className="fc-face fc-back">
                    <span className="label">Answer</span>
                    <div>
                      <Rich text={card.back} />
                    </div>
                    {progress[cardId(card)] && (
                      <span className="fc-hint fc-status" style={{ color: progress[cardId(card)] === 'known' ? 'var(--good)' : 'var(--warn)' }}>
                        Marked {progress[cardId(card)] === 'known' ? 'known' : 'still learning'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="fc-actions">
                <div className="row">
                  <Btn sm variant="ghost" onClick={() => go(-1)} disabled={idx === 0}>
                    Previous
                  </Btn>
                  <Btn sm variant="ghost" onClick={() => go(1)}>
                    Skip
                  </Btn>
                </div>
                <div className="fc-mark">
                  <button type="button" className="btn fc-learning" onClick={() => mark('learning')}>
                    Still learning <kbd>1</kbd>
                  </button>
                  <button type="button" className="btn fc-known" onClick={() => mark('known')}>
                    I know this <kbd>2</kbd>
                  </button>
                </div>
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
                Keys: <kbd>Space</kbd> flip, <kbd>←</kbd> <kbd>→</kbd> move, <kbd>1</kbd> still learning, <kbd>2</kbd> known.
              </p>
            </>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <Btn sm variant="ghost" onClick={resetDeck}>
              Reset progress for this deck
            </Btn>
          </div>
        </>
      ) : (
        <Section id="list" title={topic ? topic.title : 'All cards'}>
          <Table
            head={['Question', 'Answer', 'Status']}
            rows={deckCards.map((c) => [
              <span style={{ whiteSpace: 'normal', display: 'block', minWidth: 220, color: 'var(--ink)' }}>
                <Rich text={c.front} />
              </span>,
              <span style={{ whiteSpace: 'normal', display: 'block', minWidth: 260 }}>
                <Rich text={c.back} />
              </span>,
              progress[cardId(c)] === 'known' ? 'Known' : progress[cardId(c)] === 'learning' ? 'Learning' : '',
            ])}
          />
        </Section>
      )}
    </div>
  )
}
