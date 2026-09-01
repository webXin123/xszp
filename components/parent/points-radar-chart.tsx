"use client"

import { useMemo } from "react"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"

export interface RadarSeries {
  key: string
  label: string
  /** 与 AWARD_LEVEL1_LIST 等长的各指标积分值 */
  values: number[]
  color: string
  fillOpacity: number
  dashed?: boolean
}

interface PointsRadarChartProps {
  series: RadarSeries[]
}

const CX = 190
const CY = 150
const R = 100
const LABEL_R = 118

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

function axisAngle(index: number, total: number) {
  return -90 + (360 / total) * index
}

function toPoints(values: number[], max: number, total: number) {
  return values
    .map((v, i) => {
      const r = (Math.max(0, v) / max) * R
      const { x, y } = polar(axisAngle(i, total), r)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
}

/** 五育积分雷达图：纯 SVG 绘制，支持多条系列对比（学生 / 班级均分 / 年级均分） */
export function PointsRadarChart({ series }: PointsRadarChartProps) {
  const total = AWARD_LEVEL1_LIST.length

  const max = useMemo(() => {
    let m = 1
    for (const s of series) for (const v of s.values) m = Math.max(m, v)
    return Math.ceil(m * 2) / 2
  }, [series])

  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <div className="flex flex-col gap-3">
      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ background: s.color, opacity: Math.max(0.55, s.fillOpacity + 0.4) }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 380 300"
          className="mx-auto h-auto w-full max-w-[430px]"
          role="img"
          aria-label="本学期一级指标积分雷达图"
        >
          {/* 网格环 */}
          {rings.map((f) => (
            <polygon
              key={f}
              points={AWARD_LEVEL1_LIST.map((_, i) => {
                const { x, y } = polar(axisAngle(i, total), R * f)
                return `${x.toFixed(2)},${y.toFixed(2)}`
              }).join(" ")}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth={f === 1 ? 1.2 : 0.7}
            />
          ))}
          {/* 轴线 */}
          {AWARD_LEVEL1_LIST.map((_, i) => {
            const { x, y } = polar(axisAngle(i, total), R)
            return (
              <line
                key={i}
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke="currentColor"
                className="text-border/70"
                strokeWidth={0.7}
              />
            )
          })}
          {/* 数据系列 */}
          {series
            .slice()
            .reverse()
            .map((s) => (
              <polygon
                key={s.key}
                points={toPoints(s.values, max, total)}
                style={{ fill: s.color, stroke: s.color, fillOpacity: s.fillOpacity }}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 3" : undefined}
                strokeLinejoin="round"
              />
            ))}
          {/* 顶点标记（第一条系列，即学生本人） */}
          {series[0] &&
            series[0].values.map((v, i) => {
              const r = (Math.max(0, v) / max) * R
              const { x, y } = polar(axisAngle(i, total), r)
              return <circle key={i} cx={x} cy={y} r={2.6} style={{ fill: series[0].color }} />
            })}
          {/* 轴标签 */}
          {AWARD_LEVEL1_LIST.map((name, i) => {
            const angle = axisAngle(i, total)
            const { x, y } = polar(angle, LABEL_R)
            const cos = Math.cos((angle * Math.PI) / 180)
            const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle"
            return (
              <text
                key={name}
                x={x}
                y={y + 3}
                textAnchor={anchor}
                className="fill-muted-foreground"
                fontSize={10}
              >
                {name}
              </text>
            )
          })}
        </svg>
      </div>

      {/* 明细对比表 */}
      <div className="max-h-56 overflow-y-auto rounded-xl border border-border/40">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur">
            <tr className="text-muted-foreground">
              <th className="px-3 py-1.5 text-left font-medium">一级指标</th>
              {series.map((s) => (
                <th key={s.key} className="px-3 py-1.5 text-right font-medium">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AWARD_LEVEL1_LIST.map((name, i) => (
              <tr key={name} className="border-t border-border/30">
                <td className="px-3 py-1.5 text-foreground">{name}</td>
                {series.map((s) => (
                  <td
                    key={s.key}
                    className="px-3 py-1.5 text-right font-semibold tabular-nums"
                    style={{ color: s.color }}
                  >
                    {s.values[i]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
