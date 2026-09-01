"use client"

import { useEffect, useState } from "react"
import { LockKeyhole } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { formatDate, getISOWeekKey, getLevel2Groups, getRecordsForCell } from "@/lib/scoring-utils"
import { ScoreDialog } from "./score-dialog"
import { DeductionDetailDialog } from "./deduction-detail-dialog"
import { WeeklyRecordsDialog } from "./weekly-records-dialog"

interface ClassEvaluationTableProps {
  level1: string
  selectedDate: Date
  gradeFilter: string
}

type DetailTarget = { classId: string; className: string; level2: string }
type EditTarget = { classId: string; className: string; level2: string }
type WeeklyTarget = { classId: string; className: string }

export function ClassEvaluationTable({ level1, selectedDate, gradeFilter }: ClassEvaluationTableProps) {
  const { records } = useEvaluation()
  const { scoringClasses } = usePermission()
  const level2Groups = getLevel2Groups(level1)
  const dateStr = formatDate(selectedDate)
  const weekKey = getISOWeekKey(selectedDate)
  const isToday = dateStr === formatDate(new Date())

  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [weeklyTarget, setWeeklyTarget] = useState<WeeklyTarget | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const visibleClasses = scoringClasses.filter((c) => gradeFilter === "all" || c.gradeId === gradeFilter)
  // 筛选条件变化时回到第一页
  useEffect(() => {
    setPage(1)
  }, [gradeFilter])
  const pageCount = Math.max(1, Math.ceil(visibleClasses.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagedClasses = visibleClasses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const handleCellClick = (cls: { id: string; name: string }, level2: string, hasRecords: boolean) => {
    if (hasRecords) {
      setDetailTarget({ classId: cls.id, className: cls.name, level2 })
    } else if (isToday) {
      setEditTarget({ classId: cls.id, className: cls.name, level2 })
    }
  }

  const handleAddFromDetail = () => {
    if (!detailTarget) return
    setEditTarget({ ...detailTarget })
    setDetailTarget(null)
  }

  const handleOpenWeeklyFromEdit = () => {
    if (!editTarget) return
    setWeeklyTarget({ classId: editTarget.classId, className: editTarget.className })
    setEditTarget(null)
  }

  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-gradient-to-r from-primary/8 to-brand-blue/5">
              <th className="min-w-[140px] px-4 py-3 text-left font-semibold text-foreground">班级</th>
              {level2Groups.map((group) => (
                <th key={group.level2} className="min-w-[160px] px-4 py-3 text-left font-semibold text-foreground">
                  {group.level2}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleClasses.length === 0 ? (
              <tr>
                <td
                  colSpan={level2Groups.length + 1}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  暂无可评分班级
                </td>
              </tr>
            ) : (
              pagedClasses.map((cls) => (
                <tr key={cls.id} className="border-b border-border/40 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-foreground">{cls.name}</td>
                  {level2Groups.map((group) => {
                    const cellRecords = getRecordsForCell(records, cls.id, dateStr, level1, group.level2)
                    const totalDeduction = cellRecords.reduce((sum, r) => sum + r.totalDeduction, 0)
                    const hasRecords = cellRecords.length > 0
                    return (
                      <td key={group.level2} className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleCellClick(cls, group.level2, hasRecords)}
                          className={cn(
                            "flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition hover:bg-accent/50",
                          )}
                        >
                          {hasRecords ? (
                            <Badge
                              variant="secondary"
                              className="bg-brand-orange/15 text-brand-orange hover:bg-brand-orange/20"
                            >
                              {totalDeduction}分 · {cellRecords.length}条
                            </Badge>
                          ) : isToday ? (
                            <span className="text-xs text-muted-foreground">点击评价</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <LockKeyhole className="size-3" />
                              无记录
                            </span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={currentPage}
        total={visibleClasses.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        className="border-t border-border/40"
      />

      {detailTarget && (
        <DeductionDetailDialog
          open={!!detailTarget}
          onOpenChange={(open) => !open && setDetailTarget(null)}
          className={detailTarget.className}
          level1={level1}
          level2={detailTarget.level2}
          records={getRecordsForCell(records, detailTarget.classId, dateStr, level1, detailTarget.level2)}
          canEdit={isToday}
          onAddDeduction={handleAddFromDetail}
        />
      )}

      {editTarget && (
        <ScoreDialog
          open={!!editTarget}
          onOpenChange={(open) => !open && setEditTarget(null)}
          classId={editTarget.classId}
          className={editTarget.className}
          date={dateStr}
          level1={level1}
          level2={editTarget.level2}
          canEdit={isToday}
          onShowWeeklyRecords={handleOpenWeeklyFromEdit}
        />
      )}

      {weeklyTarget && (
        <WeeklyRecordsDialog
          open={!!weeklyTarget}
          onOpenChange={(open) => !open && setWeeklyTarget(null)}
          classId={weeklyTarget.classId}
          className={weeklyTarget.className}
          weekKey={weekKey}
          records={records}
        />
      )}
    </div>
  )
}
