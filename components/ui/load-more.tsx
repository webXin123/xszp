"use client"

import { ChevronsDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadMoreFooterProps {
  hasMore: boolean
  /** 已渲染条数 */
  loaded: number
  /** 总条数 */
  total: number
  onLoadMore: () => void
  className?: string
}

/**
 * 消息记录类列表底部的「上拉加载更多」提示：
 * 滚动到底部自动加载，也可点击手动加载。
 */
export function LoadMoreFooter({
  hasMore,
  loaded,
  total,
  onLoadMore,
  className,
}: LoadMoreFooterProps) {
  if (total === 0) return null

  if (!hasMore) {
    if (loaded <= 8) return null
    return (
      <p className={cn("shrink-0 py-1.5 text-center text-xs text-muted-foreground", className)}>
        已加载全部 {total} 条
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={onLoadMore}
      className={cn(
        "flex w-full shrink-0 items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-muted-foreground transition hover:bg-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
        className,
      )}
    >
      <ChevronsDown className="size-3.5 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
      上拉加载更多（{loaded}/{total}）
    </button>
  )
}
