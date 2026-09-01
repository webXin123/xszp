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
}

/**
 * 表格分页器：上一页 / 页码指示 / 下一页。
 * 数据不足一页时不渲染。
 */
export function Pagination({ page, total, pageSize, onChange, className }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (page > pageCount) onChange(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount])

  if (total <= pageSize) return null

  return (
    <div className={cn("flex items-center justify-between gap-2 px-4 py-2.5 text-xs text-muted-foreground", className)}>
      <span>
        共 <span className="font-semibold text-foreground">{total}</span> 条 · 第{" "}
        <span className="font-semibold text-foreground">{Math.min(page, pageCount)}</span> /{" "}
        {pageCount} 页
      </span>
      <span className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-7 rounded-lg bg-transparent"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="上一页"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-7 rounded-lg bg-transparent"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          aria-label="下一页"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </span>
    </div>
  )
}
