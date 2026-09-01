"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import {
  computeWeeklyScore,
  formatDateRangeLabel,
  getISOWeekKey,
} from "@/lib/scoring-utils"

/** Past N week keys, most recent first (includes current week) */
function getRecentWeekKeys(count: number) {
  const result: string[] = []
  const cursor = new Date()
  for (let i = 0; i < count; i++) {
    result.push(getISOWeekKey(cursor))
    cursor.setDate(cursor.getDate() - 7)
  }
  return result
}

/** "2026-W35" -> "第35周" */
function formatWeekLabel(weekKey: string) {
  const weekNo = Number(weekKey.split("-W")[1])
  return `第${weekNo}周`
}

export function WeeklyFlagTab() {
  const { classes, grades, records, flags, setFlag, issueFlagReward } = useEvaluation()
  const { visibleGrades, canManageFlags, scoringClasses } = usePermission()

  const weekOptions = useMemo(() => getRecentWeekKeys(12), [])
  const currentWeekKey = weekOptions[0]
  const [weekKey, setWeekKey] = useState<string>(currentWeekKey)
  const [gradeFilter, setGradeFilter] = useState<string>("all")
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  // 筛选条件变化时回到第一页
  useEffect(() => {
    setPage(1)
  }, [weekKey, gradeFilter])

  const rangeLabel = formatDateRangeLabel(weekKey)

  // 流动红旗颁发范围：年级组长/管理员 -> 其 scoringClassIds（年级范围），班主任 -> 仅本班
  const scoringSet = useMemo(() => new Set(scoringClasses.map((c) => c.id)), [scoringClasses])
  const visibleGradeIds = visibleGrades.map((g) => g.id)
  const eligibleClasses = classes.filter(
    (c) =>
      visibleGradeIds.includes(c.gradeId) &&
      (!canManageFlags || scoringSet.has(c.id)) &&
      (gradeFilter === "all" || c.gradeId === gradeFilter),
  )

  const ranking = useMemo(() => {
    return eligibleClasses
      .map((cls) => {
        const score = computeWeeklyScore(records, cls.id, weekKey)
        const flag = flags.find((f) => f.classId === cls.id && f.weekKey === weekKey)
        const grade = grades.find((g) => g.id === cls.gradeId)
        return { cls, grade, score, flag }
      })
      .sort((a, b) => b.score.total - a.score.total)
  }, [eligibleClasses, records, flags, weekKey, grades])

  // Sync pending selection from persisted flags whenever the week / flags change
  useEffect(() => {
    setPendingIds(flags.filter((f) => f.weekKey === weekKey && f.awarded).map((f) => f.classId))
  }, [flags, weekKey])

  const togglePending = (classId: string) => {
    if (!canManageFlags) return
    setPendingIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    )
  }

  const awardedIds = useMemo(
    () => new Set(flags.filter((f) => f.weekKey === weekKey && f.awarded).map((f) => f.classId)),
    [flags, weekKey],
  )

  const isDirty = useMemo(() => {
    if (pendingIds.length !== awardedIds.size) return true
    return pendingIds.some((id) => !awardedIds.has(id))
  }, [pendingIds, awardedIds])

  const pageCount = Math.max(1, Math.ceil(ranking.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagedRanking = ranking.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const handleConfirm = () => {
    awardedIds.forEach((classId) => {
      if (!pendingIds.includes(classId)) setFlag(classId, weekKey, false)
    })
    pendingIds.forEach((classId) => {
      if (!awardedIds.has(classId)) {
        setFlag(classId, weekKey, true)
        // 颁发流动红旗时自动为该班全部学生发一张“合作创享星”奖卡（+1）
        issueFlagReward(classId, weekKey)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={weekOptions.map((key) => ({
              value: key,
              label: key === currentWeekKey ? `本周（${formatWeekLabel(key)}）` : formatWeekLabel(key),
            }))}
            value={weekKey}
            onValueChange={(v) => v !== null && setWeekKey(v)}
          >
            <SelectTrigger className="glass-panel h-10 w-44 rounded-xl border-border/60 bg-transparent">
              <SelectValue placeholder="周次筛选" />
            </SelectTrigger>
            <SelectContent className="glass-surface">
              <SelectGroup>
                {weekOptions.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key === currentWeekKey ? `本周（${formatWeekLabel(key)}）` : formatWeekLabel(key)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            items={[
              { value: "all", label: "全部年级" },
              ...visibleGrades.map((g) => ({ value: g.id, label: g.name })),
            ]}
            value={gradeFilter}
            onValueChange={(v) => v !== null && setGradeFilter(v)}
          >
            <SelectTrigger className="glass-panel h-10 w-32 rounded-xl border-border/60 bg-transparent">
              <SelectValue placeholder="年级筛选" />
            </SelectTrigger>
            <SelectContent className="glass-surface">
              <SelectGroup>
                <SelectItem value="all">全部年级</SelectItem>
                {visibleGrades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">{rangeLabel}</span>
        </div>

        {canManageFlags && (
          <div className="flex items-center gap-3">
            {pendingIds.length > 0 && (
              <span className="text-xs text-muted-foreground">
                已选 <span className="font-semibold text-brand-yellow">{pendingIds.length}</span> 个班级
              </span>
            )}
            <Button
              className="gap-2 rounded-xl"
              onClick={handleConfirm}
              disabled={ranking.length === 0 || !isDirty}
            >
              <Check className="size-4" data-icon="inline-start" />
              确定颁发
            </Button>
          </div>
        )}
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-gradient-to-r from-primary/8 to-brand-blue/5">
              <th className="w-24 px-4 py-3 text-left font-semibold text-foreground">排名</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">班级</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">周总分</th>
              <th className="px-4 py-3 text-center font-semibold text-foreground">流动红旗</th>
            </tr>
          </thead>
          <tbody>
            {ranking.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  暂无可查看的排名数据
                </td>
              </tr>
            ) : (
              pagedRanking.map((row, idx) => {
                const rank = (currentPage - 1) * PAGE_SIZE + idx
                const awarded = row.flag?.awarded === true
                const selected = pendingIds.includes(row.cls.id)
                return (
                  <tr
                    key={row.cls.id}
                    className={cn(
                      "border-b border-border/40 transition-colors last:border-b-0",
                      selected && canManageFlags && "bg-brand-yellow/5",
                    )}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-full text-xs font-bold",
                          rank === 0 && "bg-brand-yellow/25 text-brand-yellow",
                          rank === 1 && "bg-brand-blue/15 text-brand-blue",
                          rank === 2 && "bg-brand-orange/15 text-brand-orange",
                          rank > 2 && "bg-white/5 text-muted-foreground",
                        )}
                      >
                        {rank + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.cls.name}
                      <span className="ml-2 text-xs text-muted-foreground">{row.grade?.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground">{row.score.total.toFixed(1)}</span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        /{row.score.maxScore}（扣{row.score.deduction}）
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {canManageFlags ? (
                          <button
                            type="button"
                            onClick={() => togglePending(row.cls.id)}
                            aria-pressed={selected}
                            aria-label={selected ? `取消 ${row.cls.name} 的流动红旗` : `为 ${row.cls.name} 颁发流动红旗`}
                            className={cn(
                              "flex size-9 items-center justify-center rounded-lg border transition-all duration-150 active:scale-95",
                              selected
                                ? "scale-105 border-brand-yellow/60 bg-brand-yellow/20 text-brand-yellow shadow-sm shadow-brand-yellow/20"
                                : "border-border/60 bg-transparent text-muted-foreground/40 hover:border-border hover:text-muted-foreground",
                            )}
                          >
                            <Flag
                              className={cn(
                                "size-4 transition-transform duration-150",
                                selected && "scale-110 fill-current",
                              )}
                            />
                          </button>
                        ) : awarded ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-yellow/15 px-2.5 py-1 text-xs font-medium text-brand-yellow">
                            <Flag className="size-3.5 fill-current" />
                            已获红旗
                          </span>
                        ) : (
                          <span className="flex size-9 items-center justify-center text-muted-foreground/40">
                            <Flag className="size-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <Pagination
          page={currentPage}
          total={ranking.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          className="border-t border-border/40"
        />
      </div>

      {canManageFlags && ranking.length > 0 && (
        <p className="text-xs text-muted-foreground">
          提示：点击红旗图标切换选中状态，选中后需点击右上角「确定颁发」方可生效。
        </p>
      )}
    </div>
  )
}
