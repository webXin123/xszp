"use client"

import { cn } from "@/lib/utils"

interface AwardBarChartProps {
  data: { level1: string; points: number }[]
  /** 横轴含义：本周奖卡获得总数 */
  unit?: string
}

const BAR_STYLES = [
  { bar: "from-[#718cff] to-[#a9b5ff]", text: "text-[#5969c3]" },
  { bar: "from-[#35b982] to-[#8adbb0]", text: "text-[#21845b]" },
  { bar: "from-[#ef914d] to-[#ffc078]", text: "text-[#b8661d]" },
  { bar: "from-[#e1b83f] to-[#f6d978]", text: "text-[#a77b08]" },
  { bar: "from-[#a797ee] to-[#c9befb]", text: "text-[#7166b3]" },
]

export function AwardBarChart({ data, unit = "张" }: AwardBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.points))
  const chartLabel = `奖卡发放数量：${data.map((item) => `${item.level1}${item.points}${unit}`).join("、")}`

  return (
    <figure className="flex flex-col gap-3">
      <div role="img" aria-label={chartLabel} className="relative overflow-hidden rounded-2xl border border-[#e0e6f8] bg-[#f9fbff] px-3 pb-3 pt-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-5 bottom-12 flex flex-col justify-between">
          {[0, 1, 2, 3].map((line) => <span key={line} className="border-t border-dashed border-[#dfe5f5]" />)}
        </div>
        <div className="relative flex h-44 items-end gap-2 sm:gap-3">
          {data.map((item, index) => {
            const style = BAR_STYLES[index % BAR_STYLES.length]
            const heightPct = item.points > 0 ? Math.max((item.points / max) * 100, 10) : 6
            return (
              <div key={item.level1} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className={cn("min-h-4 text-xs font-bold tabular-nums", item.points > 0 ? style.text : "text-muted-foreground/70")}>
                  {item.points}
                </span>
                <div className="flex h-32 w-full items-end justify-center">
                  <div
                    className={cn(
                      "relative w-full max-w-12 rounded-t-[10px] shadow-[0_8px_14px_-10px_rgba(72,87,170,0.8)] transition-colors",
                      item.points > 0 ? `bg-gradient-to-t ${style.bar}` : "bg-[#dfe5f3]",
                    )}
                    style={{ height: `${heightPct}%` }}
                  >
                    {item.points > 0 && <span aria-hidden="true" className="absolute inset-x-1 top-1 h-1 rounded-full bg-white/45" />}
                  </div>
                </div>
                <span className="h-7 w-full truncate text-center text-xs font-semibold text-muted-foreground" title={item.level1}>
                  {item.level1}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </figure>
  )
}
