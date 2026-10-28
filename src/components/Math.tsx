import katex from 'katex'
import { useMemo } from 'react'

function render(tex: string, display: boolean) {
  return katex.renderToString(tex, { throwOnError: false, displayMode: display, strict: false })
}

export function M({ children }: { children: string }) {
  const html = useMemo(() => render(children, false), [children])
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

export type Sym = [tex: string, meaning: string]

// A display formula. With a note it becomes interactive: hover or tap shows
// what it does and what each symbol means.
export function MB({ children, note, syms, name }: { children: string; note?: string; syms?: Sym[]; name?: string }) {
  const html = useMemo(() => render(children, true), [children])
  if (!note) return <div dangerouslySetInnerHTML={{ __html: html }} />
  return (
    <div className="fx" tabIndex={0}>
      {name && <div className="fx-name">{name}</div>}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <div className="fx-more">
        <div>
          <p className="fx-note">{note}</p>
          {syms && syms.length > 0 && (
            <dl className="fx-syms">
              {syms.map(([s, m]) => (
                <div key={s}>
                  <dt>
                    <M>{s}</M>
                  </dt>
                  <dd>{m}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  )
}
