import type { ReactNode } from 'react'
import { Pill } from './ui'

export function TopicHeader({ group, title, lede, minutes }: { group: string; title: string; lede: ReactNode; minutes?: number }) {
  return (
    <header className="topic-head fade-in">
      <div className="row">
        <Pill>{group}</Pill>
        {minutes && <span className="label">{minutes} min</span>}
      </div>
      <h1>{title}</h1>
      <p className="lede">{lede}</p>
    </header>
  )
}

export function Section({ id, title, kicker, children }: { id: string; title: string; kicker?: string; children: ReactNode }) {
  return (
    <section className="section" id={id}>
      {kicker && <span className="label">{kicker}</span>}
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export function Plain({ children, title = 'In plain words' }: { children: ReactNode; title?: string }) {
  return (
    <div className="callout plain">
      <span className="label">{title}</span>
      {children}
    </div>
  )
}

export function Trap({ children, title = 'Exam trap' }: { children: ReactNode; title?: string }) {
  return (
    <div className="callout trap">
      <span className="label">{title}</span>
      {children}
    </div>
  )
}

export function Formula({ children, title = 'Formula' }: { children: ReactNode; title?: string }) {
  return (
    <div className="callout formula">
      <span className="label">{title}</span>
      {children}
    </div>
  )
}

export function Note({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="callout">
      <span className="label">{title}</span>
      {children}
    </div>
  )
}

export function Check({ q, children }: { q: ReactNode; children: ReactNode }) {
  return (
    <details className="check">
      <summary>{q}</summary>
      <div className="ans">{children}</div>
    </details>
  )
}

export function Table({ head, rows, num = [], hl }: { head: ReactNode[]; rows: ReactNode[][]; num?: number[]; hl?: (i: number) => boolean }) {
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={num.includes(i) ? 'num' : ''}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={hl?.(i) ? 'hl' : ''}>
              {r.map((c, j) => (
                <td key={j} className={num.includes(j) ? 'num' : ''}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
