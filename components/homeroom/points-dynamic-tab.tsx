"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { PointSourceBadge } from "@/components/ui/point-source-badge"
import {
  POINT_SOURCE_LABEL,
  POINT_SOURCE_STYLE,
  buildPointEntries,
  filterEntries,
  type TimeRange,
} from "@/lib/points-utils"
import { useEvaluation } from "@/lib/evaluation-context"

/** 创建时间显示为 MM-DD HH:mm */
function formatCreatedAt(createdAt: string) {
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return createdAt
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface PointsDynamicTabProps {
  classId: string
  /** 频次切换由父组件统一控制（与学生积分排名共用） */
  range: TimeRange
}

export function PointsDynamicTab({ classId, range }: PointsDynamicTabProps) {
  const { awardCards, honors } = useEvaluation()

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
      {filtered.length === 0 ? (
        <p className="rounded-xl bg-muted/40 px-3 py-8 text-center text-sm text-muted-foreground">
          暂无积分动态
        </p>
      ) : (
        <ul
          className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1"
          onScroll={dynamicScroll.onScroll}
        >
          {dynamicLoadMore.visible.map((e) => {
            const isNegative = e.points < 0
            return (
              <li
                key={e.id}
                className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-white px-3 py-2.5 shadow-sm"
              >
                <PointSourceBadge source={e.source} />
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    POINT_SOURCE_STYLE[e.source],
                  )}
                >
                  {POINT_SOURCE_LABEL[e.source]}
                </span>
                <span className="shrink-0 text-sm font-medium text-foreground">{e.studentName}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{e.level1}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatCreatedAt(e.createdAt)}</span>
                <span
                  className={cn(
                    "shrink-0 text-sm font-bold",
                    isNegative ? "text-brand-orange" : "text-brand-green",
                  )}
                >
                  {isNegative ? e.points : `+${e.points}`}
                </span>
              </li>
            )
          })}
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
