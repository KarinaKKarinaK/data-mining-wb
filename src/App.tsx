import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { GROUPS, TOPICS, topicById } from './topics'
import { load, save } from './lib/store'
import Home from './pages/Home'
import Course from './pages/Course'

const Playground = lazy(() => import('./pages/Playground'))
const Flashcards = lazy(() => import('./pages/Flashcards'))
const Quiz = lazy(() => import('./pages/Quiz'))
const Examples = lazy(() => import('./pages/Examples'))
const Projects = lazy(() => import('./pages/Projects'))
const Datasets = lazy(() => import('./pages/Datasets'))
const Resources = lazy(() => import('./pages/Resources'))

type Entry = { to: string; label: string; section: string }

const EXTRA: Entry[] = [
  { to: '/', label: 'Home', section: 'Start' },
  { to: '/course', label: 'Course guide', section: 'Start' },
  { to: '/practice/flashcards', label: 'Flashcards', section: 'Practice' },
  { to: '/practice/quiz', label: 'Practice quiz', section: 'Practice' },
  { to: '/playground', label: 'Dataset playground', section: 'Practice' },
  { to: '/examples', label: 'Real-world cases', section: 'Explore' },
  { to: '/projects', label: 'Project ideas', section: 'Explore' },
  { to: '/datasets', label: 'Where to find data', section: 'Explore' },
  { to: '/resources', label: 'Books, courses, tools', section: 'Explore' },
]

const ALL: Entry[] = [...EXTRA.slice(0, 2), ...TOPICS.map((t) => ({ to: `/learn/${t.id}`, label: t.title, section: t.group })), ...EXTRA.slice(2)]

function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  const [seen, setSeen] = useState<string[]>(() => load('seen', []))
  const loc = useLocation()
  useEffect(() => {
    const m = loc.pathname.match(/^\/learn\/(.+)$/)
    if (m && !seen.includes(m[1])) {
      const next = [...seen, m[1]]
      setSeen(next)
      save('seen', next)
    }
    close()
  }, [loc.pathname])
  const item = (to: string, label: string, done = false) => (
    <NavLink key={to} to={to} end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}${done ? ' done' : ''}`}>
      <span className="nav-dot" />
      {label}
    </NavLink>
  )
  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <Link to="/" className="brand">
        <img src="/favicon.svg" alt="" />
        <span>Mining Lab</span>
      </Link>
      <div className="label nav-group">Start</div>
      {item('/', 'Home')}
      {item('/course', 'Course guide')}
      {GROUPS.map((g) => (
        <div key={g}>
          <div className="label nav-group">{g}</div>
          {TOPICS.filter((t) => t.group === g).map((t) => item(`/learn/${t.id}`, t.short, seen.includes(t.id)))}
        </div>
      ))}
      <div className="label nav-group">Practice</div>
      {EXTRA.filter((e) => e.section === 'Practice').map((e) => item(e.to, e.label))}
      <div className="label nav-group">Explore</div>
      {EXTRA.filter((e) => e.section === 'Explore').map((e) => item(e.to, e.label))}
    </aside>
  )
}

function Search({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const nav = useNavigate()
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current?.focus(), [])
  const hits = useMemo(() => {
    const s = q.toLowerCase().trim()
    const extra = TOPICS.map((t) => ({ to: `/learn/${t.id}`, text: `${t.title} ${t.short} ${t.blurb}` }))
    return ALL.filter((e) => !s || `${e.label} ${e.section} ${extra.find((x) => x.to === e.to)?.text ?? ''}`.toLowerCase().includes(s)).slice(0, 12)
  }, [q])
  const go = (to: string) => {
    nav(to)
    onClose()
  }
  return (
    <div className="search-backdrop" onClick={onClose}>
      <div className="search card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search">
        <input
          ref={ref}
          className="input search-input"
          placeholder="Search topics and pages"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setI(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setI((v) => Math.min(v + 1, hits.length - 1))
            if (e.key === 'ArrowUp') setI((v) => Math.max(v - 1, 0))
            if (e.key === 'Enter' && hits[i]) go(hits[i].to)
            if (e.key === 'Escape') onClose()
          }}
        />
        <div className="search-list">
          {hits.map((h, k) => (
            <button key={h.to} type="button" className={`search-hit${k === i ? ' on' : ''}`} onMouseEnter={() => setI(k)} onClick={() => go(h.to)}>
              <span>{h.label}</span>
              <span className="label">{h.section}</span>
            </button>
          ))}
          {!hits.length && <p className="muted" style={{ padding: 12 }}>Nothing matches.</p>}
        </div>
      </div>
    </div>
  )
}

function TopicRoute() {
  const { id = '' } = useParams()
  const t = topicById(id)
  if (!t) return <NotFound />
  const idx = TOPICS.indexOf(t)
  const prev = TOPICS[idx - 1]
  const next = TOPICS[idx + 1]
  return (
    <div className="page" key={t.id}>
      <Suspense fallback={<Loading />}>
        <t.Comp />
      </Suspense>
      <nav className="grid c2 pager">
        {prev ? (
          <Link className="card link tight" to={`/learn/${prev.id}`}>
            <span className="label">Previous</span>
            <div>{prev.title}</div>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="card link tight" to={`/learn/${next.id}`} style={{ textAlign: 'right' }}>
            <span className="label">Next</span>
            <div>{next.title}</div>
          </Link>
        )}
      </nav>
    </div>
  )
}

function Loading() {
  return <div className="muted" style={{ padding: 40 }}>Loading</div>
}

function NotFound() {
  return (
    <div className="page narrow">
      <h1>Not found</h1>
      <p>
        That page does not exist. <Link to="/">Go home</Link>.
      </p>
    </div>
  )
}

export default function App() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(false)
  const loc = useLocation()
  useEffect(() => window.scrollTo(0, 0), [loc.pathname])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearch((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const here = ALL.find((e) => e.to === loc.pathname)
  return (
    <div className="shell">
      <Sidebar open={open} close={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button type="button" className="btn ghost sm menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            Menu
          </button>
          <div className="crumbs">
            <span>{here?.section ?? 'Mining Lab'}</span>
            {here && <span>/</span>}
            {here && <b>{here.label}</b>}
          </div>
          <span className="spacer" />
          <button type="button" className="btn ghost sm search-btn" onClick={() => setSearch(true)}>
            Search <kbd>⌘K</kbd>
          </button>
        </header>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/course" element={<Course />} />
            <Route path="/learn/:id" element={<TopicRoute />} />
            <Route path="/playground" element={<Playground />} />
            <Route path="/practice/flashcards" element={<Flashcards />} />
            <Route path="/practice/quiz" element={<Quiz />} />
            <Route path="/examples" element={<Examples />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <footer className="footer">
          <span>Independent study resource for COMP 4331 Data Mining at HKUST. Not official course material and not endorsed by the course.</span>
          <span className="label">Private resource</span>
        </footer>
      </div>
      {search && <Search onClose={() => setSearch(false)} />}
    </div>
  )
}
