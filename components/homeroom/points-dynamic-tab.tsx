"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import {
  POINT_SOURCE_LABEL,
  POINT_SOURCE_STYLE,
  TIME_RANGE_LABEL,
  buildPointEntries,
  filterEntries,
  type TimeRange,
} from "@/lib/points-utils"
import { useEvaluation } from "@/lib/evaluation-context"

interface PointsDynamicTabProps {
  classId: string
}

const RANGES: TimeRange[] = ["week", "month", "semester"]

export function PointsDynamicTab({ classId }: PointsDynamicTabProps) {
  const { awardCards, honors } = useEvaluation()
  const [range, setRange] = useState<TimeRange>("week")

  const entries = useMemo(() => buildPointEntries(awardCards, honors), [awardCards, honors])
  const filtered = useMemo(() => {
    const list = filterEntries(entries, classId, range)
    // 按创建时间降序
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [entries, classId, range])

  const dynamicLoadMore = useLoadMore(filtered, 12)
  const dynamicScroll = useScrollLoadMore(dynamicLoadMore.hasMore, dynamicLoadMore.loadMore)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                range === r
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "glass-panel text-muted-foreground hover:text-foreground",
              )}
            >
              {TIME_RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">共 {filtered.length} 条动态</span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-muted/40 px-3 py-8 text-center text-sm text-muted-foreground">
          暂无积分动态
        </p>
      ) : (
        <ul
          className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1"
          onScroll={dynamicScroll.onScroll}
        >
          {dynamicLoadMore.visible.map((e) => (
            <li
              key={e.id}
              className="glass-panel flex items-center gap-3 rounded-xl px-3 py-2.5"
            >
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  POINT_SOURCE_STYLE[e.source],
                )}
              >
                {POINT_SOURCE_LABEL[e.source]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {e.studentName}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {e.level1}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{e.detail}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="text-sm font-bold text-brand-green">+{e.points}</span>
                <span className="text-[11px] text-muted-foreground">{e.date}</span>
              </div>
            </li>
          ))}
          <li>
            <LoadMoreFooter
              hasMore={dynamicLoadMore.hasMore}
              loaded={dynamicLoadMore.visible.length}
              total={dynamicLoadMore.total}
              onLoadMore={dynamicLoadMore.loadMore}
            />
          </li>
        </ul>
      )}
    </div>
  )
}
