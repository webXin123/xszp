"use client"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDateRangeLabel, getRecordsForWeek } from "@/lib/scoring-utils"
import type { ScoreRecord } from "@/lib/types"

interface WeeklyRecordsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: string
  className: string
  weekKey: string
  records: ScoreRecord[]
}

export function WeeklyRecordsDialog({
  open,
  onOpenChange,
  classId,
  className,
  weekKey,
  records,
}: WeeklyRecordsDialogProps) {
  const weekRecords = getRecordsForWeek(records, classId, weekKey)
  const totalDeduction = weekRecords.reduce((sum, r) => sum + r.totalDeduction, 0)
  const rangeLabel = formatDateRangeLabel(weekKey)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-surface max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>本周扣分记录</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="glass-panel rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{rangeLabel}</p>
            <p className="mt-1 text-base font-semibold text-foreground">{className}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              共 {weekRecords.length} 条
              <span className="ml-2 font-medium text-brand-orange">合计 {totalDeduction} 分</span>
            </p>
          </div>

          {weekRecords.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
              本周暂无扣分记录
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {weekRecords.map((record) => (
                <div key={record.id} className="glass-panel rounded-xl px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-brand-orange">{record.totalDeduction} 分</span>
                    <span className="text-xs text-muted-foreground">
                      {record.date}
                      {" · "}
                      {record.operatorName}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.level1} · {record.level2}
                  </p>
                  {record.studentNames.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {record.studentNames.map((name) => (
                        <Badge key={name} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {record.note && (
                    <p className="mt-1 text-xs text-muted-foreground">备注:{record.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
