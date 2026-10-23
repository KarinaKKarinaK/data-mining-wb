import { createContext, useContext, useMemo, useRef, type PointerEvent, type ReactNode } from 'react'
import { shapePath } from './ui'
import type { Pt } from '../lib/stats'

export type PlotCtx = {
  sx: (v: number) => number
  sy: (v: number) => number
  iw: number
  ih: number
  x: [number, number]
  y: [number, number]
}

const Ctx = createContext<PlotCtx | null>(null)
export function usePlot() {
  const c = useContext(Ctx)
  if (!c) throw new Error('usePlot outside Plot')
  return c
}

export function niceTicks(lo: number, hi: number, count = 5) {
  const span = hi - lo
  if (!(span > 0)) return [lo]
  const raw = span / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toFixed(10)))
  return out
}

const defaultFmt = (v: number) => {
  const a = Math.abs(v)
  if (a >= 10000) return `${(v / 1000).toFixed(0)}k`
  if (a >= 100 || Number.isInteger(v)) return String(Math.round(v * 100) / 100)
  return String(Number(v.toFixed(2)))
}

export type PlotEvent = Pt & { px: number; py: number; e: PointerEvent<SVGSVGElement> }

export function Plot({
  w = 560,
  h = 380,
  x,
  y,
  xLabel,
  yLabel,
  xTicks = 5,
  yTicks = 5,
  grid = true,
  axes = true,
  pad,
  xFmt = defaultFmt,
  yFmt = defaultFmt,
  xTickValues,
  yTickValues,
  onDown,
  onMove,
  onUp,
  onLeave,
  cursor,
  label,
  children,
}: {
  w?: number
  h?: number
  x: [number, number]
  y: [number, number]
  xLabel?: string
  yLabel?: string
  xTicks?: number
  yTicks?: number
  grid?: boolean
  axes?: boolean
  pad?: { t?: number; r?: number; b?: number; l?: number }
  xFmt?: (v: number) => string
  yFmt?: (v: number) => string
  xTickValues?: { v: number; label: string }[]
  yTickValues?: { v: number; label: string }[]
  onDown?: (p: PlotEvent) => void
  onMove?: (p: PlotEvent) => void
  onUp?: (p: PlotEvent) => void
  onLeave?: () => void
  cursor?: string
  label: string
  children?: ReactNode
}) {
  const m = {
    t: pad?.t ?? 14,
    r: pad?.r ?? 16,
    b: pad?.b ?? (axes ? (xLabel ? 46 : 30) : 10),
    l: pad?.l ?? (axes ? (yLabel ? 56 : 40) : 10),
  }
  const iw = w - m.l - m.r
  const ih = h - m.t - m.b
  const ctx = useMemo<PlotCtx>(
    () => ({
      sx: (v) => ((v - x[0]) / (x[1] - x[0])) * iw,
      sy: (v) => ih - ((v - y[0]) / (y[1] - y[0])) * ih,
      iw,
      ih,
      x,
      y,
    }),
    [x[0], x[1], y[0], y[1], iw, ih],
  )
  const ref = useRef<SVGSVGElement>(null)

  const toData = (e: PointerEvent<SVGSVGElement>): PlotEvent | null => {
    const svg = ref.current
    const mtx = svg?.getScreenCTM()
    if (!svg || !mtx) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(mtx.inverse())
    const px = p.x - m.l
    const py = p.y - m.t
    return { px, py, x: x[0] + (px / iw) * (x[1] - x[0]), y: y[0] + ((ih - py) / ih) * (y[1] - y[0]), e }
  }

  const xt = xTickValues ?? niceTicks(x[0], x[1], xTicks).map((v) => ({ v, label: xFmt(v) }))
  const yt = yTickValues ?? niceTicks(y[0], y[1], yTicks).map((v) => ({ v, label: yFmt(v) }))

  return (
    <svg
      ref={ref}
      className="plot"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={label}
      style={{ cursor }}
      onPointerDown={(e) => {
        const p = toData(e)
        if (p && onDown) {
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          onDown(p)
        }
      }}
      onPointerMove={(e) => {
        const p = toData(e)
        if (p && onMove) onMove(p)
      }}
      onPointerUp={(e) => {
        const p = toData(e)
        if (p && onUp) onUp(p)
      }}
      onPointerLeave={() => onLeave?.()}
    >
      <g transform={`translate(${m.l},${m.t})`}>
        {grid && (
          <g>
            {yt.map((t) => (
              <line key={'gy' + t.v} className="grid-line" x1={0} x2={iw} y1={ctx.sy(t.v)} y2={ctx.sy(t.v)} />
            ))}
            {xt.map((t) => (
              <line key={'gx' + t.v} className="grid-line" y1={0} y2={ih} x1={ctx.sx(t.v)} x2={ctx.sx(t.v)} />
            ))}
          </g>
        )}
        {axes && (
          <g className="axis">
            <line x1={0} x2={iw} y1={ih} y2={ih} />
            <line x1={0} x2={0} y1={0} y2={ih} />
            {xt.map((t) => (
              <text key={'tx' + t.v} x={ctx.sx(t.v)} y={ih + 16} textAnchor="middle">
                {t.label}
              </text>
            ))}
            {yt.map((t) => (
              <text key={'ty' + t.v} x={-8} y={ctx.sy(t.v) + 3.5} textAnchor="end">
                {t.label}
              </text>
            ))}
            {xLabel && (
              <text className="axis-label" x={iw / 2} y={ih + 38} textAnchor="middle">
                {xLabel}
              </text>
            )}
            {yLabel && (
              <text className="axis-label" transform={`translate(${-44},${ih / 2}) rotate(-90)`} textAnchor="middle">
                {yLabel}
              </text>
            )}
          </g>
        )}
        <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
      </g>
    </svg>
  )
}

export function Dot({
  x,
  y,
  color = 'var(--s1)',
  shape = 0,
  r = 4.5,
  opacity = 1,
  stroke,
  strokeWidth = 1.5,
  ring = true,
  fill = true,
  onEnter,
  onLeave,
}: {
  x: number
  y: number
  color?: string
  shape?: number
  r?: number
  opacity?: number
  stroke?: string
  strokeWidth?: number
  ring?: boolean
  fill?: boolean
  onEnter?: () => void
  onLeave?: () => void
}) {
  const { sx, sy } = usePlot()
  return (
    <g transform={`translate(${sx(x)},${sy(y)})`} opacity={opacity} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      {onEnter && <circle r={r + 6} fill="transparent" />}
      <path
        d={shapePath(shape, r)}
        fill={fill ? color : 'none'}
        stroke={stroke ?? (fill ? (ring ? 'var(--surface)' : 'none') : color)}
        strokeWidth={stroke ? strokeWidth : fill ? 1.2 : 1.6}
      />
    </g>
  )
}

export function Line({ pts, color = 'var(--ink-2)', width = 2, dash, opacity = 1 }: { pts: Pt[]; color?: string; width?: number; dash?: string; opacity?: number }) {
  const { sx, sy } = usePlot()
  if (pts.length < 2) return null
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join('')
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} opacity={opacity} strokeLinejoin="round" strokeLinecap="round" />
}

export function Area({ pts, base, color, opacity = 0.18 }: { pts: Pt[]; base: number; color: string; opacity?: number }) {
  const { sx, sy } = usePlot()
  if (pts.length < 2) return null
  const d =
    pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join('') +
    `L${sx(pts[pts.length - 1].x)},${sy(base)}L${sx(pts[0].x)},${sy(base)}Z`
  return <path d={d} fill={color} opacity={opacity} />
}

export function Rect({
  x0,
  x1,
  y0,
  y1,
  color,
  opacity = 1,
  rx = 0,
  stroke,
  onEnter,
  onLeave,
}: {
  x0: number
  x1: number
  y0: number
  y1: number
  color: string
  opacity?: number
  rx?: number
  stroke?: string
  onEnter?: () => void
  onLeave?: () => void
}) {
  const { sx, sy } = usePlot()
  const X = Math.min(sx(x0), sx(x1))
  const Y = Math.min(sy(y0), sy(y1))
  return (
    <rect
      x={X}
      y={Y}
      width={Math.max(0, Math.abs(sx(x1) - sx(x0)))}
      height={Math.max(0, Math.abs(sy(y1) - sy(y0)))}
      fill={color}
      opacity={opacity}
      rx={rx}
      stroke={stroke}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    />
  )
}

export function VLine({ x, color = 'var(--ink-3)', dash = '4 4', label, width = 1.5 }: { x: number; color?: string; dash?: string; label?: string; width?: number }) {
  const { sx, ih } = usePlot()
  return (
    <g>
      <line x1={sx(x)} x2={sx(x)} y1={0} y2={ih} stroke={color} strokeDasharray={dash} strokeWidth={width} />
      {label && (
        <text x={sx(x) + 5} y={11} fill="var(--ink-2)" fontSize={11}>
          {label}
        </text>
      )}
    </g>
  )
}

export function HLine({ y, color = 'var(--ink-3)', dash = '4 4', label, width = 1.5 }: { y: number; color?: string; dash?: string; label?: string; width?: number }) {
  const { sy, iw } = usePlot()
  return (
    <g>
      <line x1={0} x2={iw} y1={sy(y)} y2={sy(y)} stroke={color} strokeDasharray={dash} strokeWidth={width} />
      {label && (
        <text x={iw - 4} y={sy(y) - 6} fill="var(--ink-2)" fontSize={11} textAnchor="end">
          {label}
        </text>
      )}
    </g>
  )
}

export function Label({ x, y, children, anchor = 'start', dx = 0, dy = 0, color = 'var(--ink-2)', size = 11.5 }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; dx?: number; dy?: number; color?: string; size?: number }) {
  const { sx, sy } = usePlot()
  return (
    <text x={sx(x) + dx} y={sy(y) + dy} textAnchor={anchor} fill={color} fontSize={size} style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 3 }}>
      {children}
    </text>
  )
}

export function Tip({ x, y, lines }: { x: number; y: number; lines: string[] }) {
  const { sx, sy, iw } = usePlot()
  const wpx = Math.max(...lines.map((l) => l.length)) * 6.7 + 16
  const hpx = lines.length * 15 + 10
  let X = sx(x) + 12
  if (X + wpx > iw) X = sx(x) - wpx - 12
  let Y = sy(y) - hpx - 10
  if (Y < 0) Y = sy(y) + 12
  return (
    <g className="tip" transform={`translate(${X},${Y})`} pointerEvents="none">
      <rect width={wpx} height={hpx} rx={7} />
      {lines.map((l, i) => (
        <text key={i} x={8} y={17 + i * 15}>
          {l}
        </text>
      ))}
    </g>
  )
}

export function Heat({ res = 60, fn }: { res?: number; fn: (x: number, y: number) => { color: string; opacity: number } | null }) {
  const { x, y, iw, ih } = usePlot()
  const cells = useMemo(() => {
    const out: { i: number; j: number; color: string; opacity: number }[] = []
    for (let i = 0; i < res; i++)
      for (let j = 0; j < res; j++) {
        const cx = x[0] + ((i + 0.5) / res) * (x[1] - x[0])
        const cy = y[0] + ((j + 0.5) / res) * (y[1] - y[0])
        const c = fn(cx, cy)
        if (c) out.push({ i, j, ...c })
      }
    return out
  }, [fn, res, x[0], x[1], y[0], y[1]])
  const cw = iw / res
  const ch = ih / res
  return (
    <g pointerEvents="none">
      {cells.map((c) => (
        <rect key={c.i * res + c.j} x={c.i * cw} y={ih - (c.j + 1) * ch} width={cw + 0.6} height={ch + 0.6} fill={c.color} opacity={c.opacity} />
      ))}
    </g>
  )
}

export function nearestIndex(pts: Pt[], p: Pt, ctx: { sx: (v: number) => number; sy: (v: number) => number }, maxPx = 14) {
  let best = -1
  let bd = maxPx
  pts.forEach((q, i) => {
    const d = Math.hypot(ctx.sx(q.x) - ctx.sx(p.x), ctx.sy(q.y) - ctx.sy(p.y))
    if (d < bd) {
      bd = d
      best = i
    }
  })
  return best
}

export function scales(w: number, h: number, x: [number, number], y: [number, number], pad?: { t?: number; r?: number; b?: number; l?: number }, axes = true, xLabel = false, yLabel = false) {
  const m = { t: pad?.t ?? 14, r: pad?.r ?? 16, b: pad?.b ?? (axes ? (xLabel ? 46 : 30) : 10), l: pad?.l ?? (axes ? (yLabel ? 56 : 40) : 10) }
  const iw = w - m.l - m.r
  const ih = h - m.t - m.b
  return {
    sx: (v: number) => ((v - x[0]) / (x[1] - x[0])) * iw,
    sy: (v: number) => ih - ((v - y[0]) / (y[1] - y[0])) * ih,
  }
}
