import type { ReactNode } from 'react'
import { M } from '../components/Math'

export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/g)
  return (
    <>
      {parts.map((p, i) => (p.startsWith('$') && p.endsWith('$') && p.length > 2 ? <M key={i}>{p.slice(1, -1)}</M> : <span key={i}>{p}</span>))}
    </>
  )
}

export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}
