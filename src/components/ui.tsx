import type { CSSProperties, ReactNode } from 'react'

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  fmt,
}: {
  label: ReactNode
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  fmt?: (v: number) => string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="ctl">
      <span className="ctl-head">
        <span>{label}</span>
        <span className="v">{fmt ? fmt(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--pct': `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function Seg<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { v: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  label?: ReactNode
}) {
  return (
    <div className="ctl">
      {label && <span className="ctl-head">{label}</span>}
      <div className="seg" role="radiogroup">
        {options.map((o) => (
          <button key={String(o.v)} type="button" role="radio" aria-checked={o.v === value} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <span
      className={`toggle${on ? ' on' : ''}`}
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onClick={() => onChange(!on)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onChange(!on)
        }
      }}
    >
      <span className="sw" />
      {children}
    </span>
  )
}

export function Btn({
  children,
  onClick,
  variant,
  sm,
  disabled,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost'
  sm?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button type="button" title={title} disabled={disabled} className={`btn${variant ? ' ' + variant : ''}${sm ? ' sm' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

export function Stat({ k, v, sub }: { k: ReactNode; v: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="val">{v}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export function Readout({ children }: { children: ReactNode }) {
  return <div className="readout">{children}</div>
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="pill">
      <span className="dot" />
      {children}
    </span>
  )
}

export function Legend({ items }: { items: { label: ReactNode; color: string; shape?: number }[] }) {
  return (
    <div className="legend">
      {items.map((it, i) => (
        <span key={i}>
          <svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden>
            <path d={shapePath(it.shape ?? 0, 4.5)} fill={it.color} />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  )
}

export function shapePath(shape: number, r: number) {
  const s = shape % 8
  if (s === 0) return `M${r},0A${r},${r} 0 1,1 ${-r},0A${r},${r} 0 1,1 ${r},0Z`
  if (s === 1) {
    const a = r * 0.88
    return `M${-a},${-a}H${a}V${a}H${-a}Z`
  }
  if (s === 2) {
    const a = r * 1.2
    return `M0,${-a}L${a * 0.95},${a * 0.72}H${-a * 0.95}Z`
  }
  if (s === 3) {
    const a = r * 1.25
    return `M0,${-a}L${a},0L0,${a}L${-a},0Z`
  }
  if (s === 4) {
    const a = r * 1.15
    const t = r * 0.42
    return `M${-t},${-a}H${t}V${-t}H${a}V${t}H${t}V${a}H${-t}V${t}H${-a}V${-t}H${-t}Z`
  }
  if (s === 5) {
    const a = r * 1.15
    return `M0,${a}L${-a * 0.95},${-a * 0.72}H${a * 0.95}Z`
  }
  if (s === 6) {
    let d = ''
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.55 : r * 1.3
      const a = (Math.PI / 5) * i - Math.PI / 2
      d += `${i ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`
    }
    return d + 'Z'
  }
  let d = ''
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * r * 1.1).toFixed(2)},${(Math.sin(a) * r * 1.1).toFixed(2)}`
  }
  return d + 'Z'
}

export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)']
export const SERIES_HEX = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
export const seriesColor = (i: number) => (i < 0 ? 'var(--ink-4)' : SERIES[i % SERIES.length])
