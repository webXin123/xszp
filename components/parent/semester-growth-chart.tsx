"use client"

import { useMemo } from "react"

export interface SemesterGrowthPoint {
  label: string
  value: number
}

interface SemesterGrowthChartProps {
  data: SemesterGrowthPoint[]
  studentName: string
}

const WIDTH = 520
const HEIGHT = 220
const PADDING = { top: 20, right: 22, bottom: 40, left: 34 }

/** 学期五育总积分趋势：轻量 SVG，避免为单张趋势图引入图表依赖。 */
export function SemesterGrowthChart({ data, studentName }: SemesterGrowthChartProps) {
  const { points, linePath, areaPath, ticks } = useMemo(() => {
    const max = Math.max(10, ...data.map((item) => item.value))
    const roundedMax = Math.ceil(max / 10) * 10
    const plotWidth = WIDTH - PADDING.left - PADDING.right
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
    const x = (index: number) => PADDING.left + (data.length > 1 ? (plotWidth * index) / (data.length - 1) : plotWidth / 2)
    const y = (value: number) => PADDING.top + plotHeight - (value / roundedMax) * plotHeight
    const points = data.map((item, index) => ({ ...item, x: x(index), y: y(item.value) }))
    const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")
    const areaPath = points.length > 0
      ? `M${points[0].x.toFixed(1)},${(PADDING.top + plotHeight).toFixed(1)} ${points.map((point) => `L${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")} L${points[points.length - 1].x.toFixed(1)},${(PADDING.top + plotHeight).toFixed(1)} Z`
      : ""
    const ticks = [0, Math.round(roundedMax / 2), roundedMax]
    return { points, linePath, areaPath, ticks }
  }, [data])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="sr-only">{studentName}历史学期五育总积分：{data.map((item) => `${item.label} ${item.value} 分`).join("，")}</p>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{studentName} · 五育总积分</span>
        <span className="font-semibold text-brand-green">本学期 {data.at(-1)?.value ?? 0} 分</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={`${studentName}历史学期五育总积分成长趋势`}>
        <defs>
          <linearGradient id="semester-growth-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-green)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-brand-green)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => {
          const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
          const max = ticks[2] || 1
          const y = PADDING.top + plotHeight - (tick / max) * plotHeight
          return <g key={tick}>
            <line x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y} stroke="var(--border)" strokeDasharray="3 4" strokeOpacity="0.72" />
            <text x={PADDING.left - 7} y={y + 3.5} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{tick}</text>
          </g>
        })}
        <path d={areaPath} fill="url(#semester-growth-area)" />
        <path d={linePath} fill="none" stroke="var(--color-brand-green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="4" fill="var(--color-brand-green)" stroke="var(--background)" strokeWidth="2" />
          <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--foreground)">{point.value}</text>
          <text x={point.x} y={HEIGHT - 14} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">{point.label}</text>
        </g>)}
      </svg>
    </div>
  )
}
