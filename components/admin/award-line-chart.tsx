"use client"

import { useMemo } from "react"

interface AwardLineChartProps {
  /** 最近 N 天，按时间正序：[{date, count}] */
  data: { date: string; count: number }[]
}

const W = 640
const H = 200
const PAD = { top: 16, right: 16, bottom: 28, left: 32 }

export function AwardLineChart({ data }: AwardLineChartProps) {
  const { points, areaPath, linePath, max, min, xLabels } = useMemo(() => {
    const n = data.length
    const max = Math.max(1, ...data.map((d) => d.count))
    const min = 0
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const step = n > 1 ? plotW / (n - 1) : 0
    const yOf = (v: number) => PAD.top + plotH - ((v - min) / (max - min || 1)) * plotH
    const xOf = (i: number) => PAD.left + i * step
    const points = data.map((d, i) => ({ x: xOf(i), y: yOf(d.count), ...d }))
    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ")
    const areaPath =
      `M${points[0]?.x.toFixed(1)},${(PAD.top + plotH).toFixed(1)} ` +
      points.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
      ` L${points[n - 1]?.x.toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`
    // 横轴标签：最多 7 个
    const xLabels = data.map((d, i) => ({ x: xOf(i), label: d.date.slice(5) }))
    return { points, areaPath, linePath, max, min, xLabels }
  }, [data])

  const total = data.reduce((s, d) => s + d.count, 0)
  // y 轴刻度
  const yTicks = [0, Math.ceil(max / 2), max]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground">
          合计 <span className="text-sm font-bold text-foreground">{total}</span> 张
        </p>
        <p className="text-[11px] text-muted-foreground">最近 {data.length} 天</p>
      </div>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full min-w-[420px]" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="award-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-green)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--brand-green)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* y 轴网格线 + 刻度 */}
          {yTicks.map((t, i) => {
            const plotH = H - PAD.top - PAD.bottom
            const y = PAD.top + plotH - (t / (max || 1)) * plotH
            return (
              <g key={i}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={W - PAD.right}
                  y2={y}
                  stroke="var(--border)"
                  strokeOpacity="0.5"
                  strokeDasharray="3 3"
                />
                <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
                  {t}
                </text>
              </g>
            )
          })}
          {/* 区域填充 */}
          <path d={areaPath} fill="url(#award-area)" />
          {/* 折线 */}
          <path d={linePath} fill="none" stroke="var(--brand-green)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {/* 数据点 */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="var(--brand-green)" stroke="var(--background)" strokeWidth="1.5" />
              {p.count > 0 && (
                <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--foreground)">
                  {p.count}
                </text>
              )}
            </g>
          ))}
          {/* x 轴标签 */}
          {xLabels.map((l, i) => (
            <text key={i} x={l.x} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
              {l.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
