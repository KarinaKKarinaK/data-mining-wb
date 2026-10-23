import type { ReactNode } from 'react'

export function Lab({
  title,
  desc,
  controls,
  children,
  notes,
  wide,
  id,
}: {
  title: string
  desc?: ReactNode
  controls?: ReactNode
  children: ReactNode
  notes?: ReactNode[]
  wide?: boolean
  id?: string
}) {
  return (
    <section className="card lab fade-in" id={id}>
      <div className="lab-head">
        <span className="lab-tag">Lab</span>
        <h3>{title}</h3>
        {desc && <p>{desc}</p>}
      </div>
      <div className={`lab-body${wide || !controls ? ' wide' : ''}`}>
        <div className="lab-viz">{children}</div>
        {controls && <div className="lab-side">{controls}</div>}
      </div>
      {notes && notes.length > 0 && (
        <div className="lab-foot">
          <span className="label">Try</span>
          <ul>
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
