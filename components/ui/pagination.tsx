"use client"

import { useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  /** 当前页码（从 1 开始） */
  page: number
  /** 总条数 */
  total: number
  /** 每页条数 */
  pageSize: number
  onChange: (page: number) => void
  className?: string
  showWhenSinglePage?: boolean
}

/**
 * 表格分页器：上一页 / 页码指示 / 下一页。
 * 默认在数据超过一页时显示；可按需保留单页状态。
 */
export function Pagination({ page, total, pageSize, onChange, className, showWhenSinglePage = false }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (page > pageCount) onChange(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount])

  if (!showWhenSinglePage && total <= pageSize) return null

  return (
    <nav
      aria-label="表格分页"
      className={cn("flex items-center justify-between gap-2 px-2 py-2.5 text-[11px] text-muted-foreground sm:gap-3 sm:px-4 sm:text-xs", className)}
    >
      <span aria-live="polite" className="whitespace-nowrap">
        共 <span className="font-semibold tabular-nums text-foreground">{total}</span> 条 · 第{" "}
        <span className="font-semibold tabular-nums text-foreground">{Math.min(page, pageCount)}</span> /{" "}
        {pageCount} 页
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#dbe3fa] bg-white p-1 shadow-[0_4px_12px_-10px_rgba(48,62,139,0.6)]">
        <Button
          variant="outline"
          size="icon"
          className="size-9 min-h-11 min-w-11 rounded-lg border-transparent bg-transparent text-primary hover:border-[#dbe3fa] hover:bg-[#f3f6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="上一页"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <span
          aria-label={"第 " + Math.min(page, pageCount) + " 页，共 " + pageCount + " 页"}
          aria-current="page"
          className="min-w-12 rounded-lg bg-[#eef2ff] px-2 py-2 sm:min-w-14 sm:px-2.5 text-center font-bold tabular-nums text-primary"
        >
          {Math.min(page, pageCount)} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-9 min-h-11 min-w-11 rounded-lg border-transparent bg-transparent text-primary hover:border-[#dbe3fa] hover:bg-[#f3f6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          aria-label="下一页"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </span>
    </nav>
  )
}
