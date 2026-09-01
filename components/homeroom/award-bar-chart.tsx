"use client"

import { cn } from "@/lib/utils"

interface AwardBarChartProps {
  data: { level1: string; points: number }[]
  /** 横轴含义：本周奖卡获得总数 */
  unit?: string
}

const BAR_COLORS = [
  "bg-brand-blue",
  "bg-brand-green",
  "bg-brand-orange",
  "bg-brand-yellow",
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-primary",
]

export function AwardBarChart({ data, unit = "张" }: AwardBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.points))
  const total = data.reduce((s, d) => s + d.points, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground">
          合计 <span className="text-sm font-bold text-foreground">{total}</span> {unit}
        </p>
        <p className="text-[11px] text-muted-foreground">按一级指标分布</p>
      </div>
      <div className="flex h-44 items-end gap-1.5">
        {data.map((d, i) => {
          const heightPct = (d.points / max) * 100
          return (
            <div key={d.level1} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[11px] font-semibold text-foreground">
                {d.points > 0 ? d.points : ""}
              </span>
              <div className="flex h-32 w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-7 rounded-t-md shadow-sm transition-all",
                    BAR_COLORS[i % BAR_COLORS.length],
                    d.points === 0 && "opacity-20",
                  )}
                  style={{
                    height: `${Math.max(heightPct, d.points > 0 ? 6 : 0)}%`,
                    backgroundImage:
                      "linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.04) 60%)",
                  }}
                />
              </div>
              <span className="line-clamp-2 h-7 text-center text-[10px] leading-tight text-muted-foreground">
                {d.level1}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
