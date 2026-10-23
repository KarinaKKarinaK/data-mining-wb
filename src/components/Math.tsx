import katex from 'katex'
import { useMemo } from 'react'

function render(tex: string, display: boolean) {
  return katex.renderToString(tex, { throwOnError: false, displayMode: display, strict: false })
}

export function M({ children }: { children: string }) {
  const html = useMemo(() => render(children, false), [children])
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

export function MB({ children }: { children: string }) {
  const html = useMemo(() => render(children, true), [children])
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
