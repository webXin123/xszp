"use client"

import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getGroupByLevel2 } from "@/lib/scoring-utils"
import type { ScoreRecord } from "@/lib/types"

interface DeductionDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  className: string
  level1: string
  level2: string
  records: ScoreRecord[]
  canEdit: boolean
  onAddDeduction: () => void
}

export function DeductionDetailDialog({
  open,
  onOpenChange,
  className,
  level1,
  level2,
  records,
  canEdit,
  onAddDeduction,
}: DeductionDetailDialogProps) {
  const group = getGroupByLevel2(level1, level2)
  const totalDeduction = records.reduce((sum, r) => sum + r.totalDeduction, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-surface max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>扣分详情</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="glass-panel rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">当前评价班级</p>
            <p className="mt-1 text-base font-semibold text-foreground">{className}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {level1} · {level2}
              <span className="ml-2 font-medium text-brand-orange">合计 {totalDeduction} 分</span>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">当日扣分记录</p>
            <div className="flex flex-col gap-2">
              {records.map((record) => (
                <div key={record.id} className="glass-panel rounded-xl px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-brand-orange">{record.totalDeduction} 分</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(record.createdAt).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {record.operatorName}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {record.entries.map((entry) => {
                      const item = group?.items.find((i) => i.id === entry.itemId)
                      return (
                        <Badge key={entry.itemId} variant="secondary" className="text-xs">
                          {item?.name ?? entry.itemId} ×{entry.count}
                        </Badge>
                      )
                    })}
                  </div>
                  {record.studentNames.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      涉及学生：{record.studentNames.join("、")}
                    </p>
                  )}
                  {record.note && (
                    <p className="mt-1 text-xs text-muted-foreground">备注：{record.note}</p>
                  )}
                  {record.imageDataUrl && (
                    <img
                      src={record.imageDataUrl}
                      alt="扣分记录图片"
                      className="mt-2 h-16 w-16 rounded-lg border border-border/60 object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          {canEdit && (
            <Button onClick={onAddDeduction} className="gap-1.5">
              <Plus className="size-4" data-icon="inline-start" />
              新增扣分
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
