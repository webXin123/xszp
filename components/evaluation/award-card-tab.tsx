"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Info, RotateCcw, Search, Sparkles } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { AWARD_LEVEL1_LIST, getAwardGroup } from "@/lib/award-utils"
import { formatDate, getISOWeekKey } from "@/lib/scoring-utils"
import type { AwardCardRecord, AwardIndicatorLevel2, SchoolClass, Student } from "@/lib/types"

export function AwardCardTab() {
  const { grades, students, awardCards, addAwardCards } = useEvaluation()
  const { awardClasses } = usePermission()

  const weekKey = getISOWeekKey(new Date())
  const today = formatDate(new Date())

  const [search, setSearch] = useState("")
  const [collapsedGrades, setCollapsedGrades] = useState<string[]>([])
  const [collapsedClasses, setCollapsedClasses] = useState<string[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [activeLevel1, setActiveLevel1] = useState(AWARD_LEVEL1_LIST[0])
  const [confirmIndicator, setConfirmIndicator] = useState<AwardIndicatorLevel2 | null>(null)
  const [zoomImage, setZoomImage] = useState<{ src: string; title: string } | null>(null)
  const [weeklyDetailStudent, setWeeklyDetailStudent] = useState<Student | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const studentsByClass = useMemo(() => {
    const map = new Map<string, Student[]>()
    for (const s of students) {
      const list = map.get(s.classId)
      if (list) list.push(s)
      else map.set(s.classId, [s])
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.studentNo.localeCompare(b.studentNo))
    }
    return map
  }, [students])

  const gradeGroups = useMemo(() => {
    const byGrade = new Map<string, SchoolClass[]>()
    for (const c of awardClasses) {
      const list = byGrade.get(c.gradeId)
      if (list) list.push(c)
      else byGrade.set(c.gradeId, [c])
    }
    return grades
      .filter((g) => byGrade.has(g.id))
      .map((g) => ({ grade: g, classes: byGrade.get(g.id) ?? [] }))
  }, [awardClasses, grades])

  const weeklyCardsByStudent = useMemo(() => {
    const map = new Map<string, AwardCardRecord[]>()
    for (const a of awardCards) {
      if (a.weekKey !== weekKey) continue
      const list = map.get(a.studentId)
      if (list) list.push(a)
      else map.set(a.studentId, [a])
    }
    return map
  }, [awardCards, weekKey])

  const visibleStudentsOf = (classId: string) => studentsByClass.get(classId) ?? []

  const matchesSearch = (student: Student, cls: SchoolClass) => {
    if (!search) return true
    return (
      student.name.includes(search) ||
      student.studentNo.includes(search) ||
      cls.name.includes(search)
    )
  }

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const toggleClass = (classId: string) => {
    const ids = visibleStudentsOf(classId).map((s) => s.id)
    setSelectedStudentIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id))
      if (allSelected) return prev.filter((id) => !ids.includes(id))
      return [...prev, ...ids.filter((id) => !prev.includes(id))]
    })
  }

  const allVisibleStudentIds = useMemo(
    () => awardClasses.flatMap((c) => visibleStudentsOf(c.id).map((s) => s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [awardClasses, studentsByClass],
  )

  const allSelected =
    allVisibleStudentIds.length > 0 &&
    allVisibleStudentIds.every((id) => selectedStudentIds.includes(id))

  const toggleAll = () => {
    setSelectedStudentIds(allSelected ? [] : allVisibleStudentIds)
  }

  const toggleGrade = (gradeId: string) => {
    setCollapsedGrades((prev) =>
      prev.includes(gradeId) ? prev.filter((id) => id !== gradeId) : [...prev, gradeId],
    )
  }

  const toggleClassCollapse = (classId: string) => {
    setCollapsedClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    )
  }

  const showHint = (message: string) => {
    setHint(message)
    window.setTimeout(() => setHint(null), 2000)
  }

  const handleCardClick = (item: AwardIndicatorLevel2) => {
    if (selectedStudentIds.length === 0) {
      showHint("请先在左侧勾选要发放的学生")
      return
    }
    setConfirmIndicator(item)
  }

  const handleConfirmIssue = () => {
    if (!confirmIndicator) return
    const byId = new Map(students.map((s) => [s.id, s]))
    addAwardCards(
      selectedStudentIds
        .map((id) => byId.get(id))
        .filter((s): s is Student => !!s)
        .map((s) => ({
          studentId: s.id,
          studentName: s.name,
          classId: s.classId,
          indicatorId: confirmIndicator.id,
          level1: activeLevel1,
          level2: confirmIndicator.level2,
          points: confirmIndicator.points,
          weekKey,
          date: today,
        })),
    )
    setConfirmIndicator(null)
  }

  const activeGroup = getAwardGroup(activeLevel1)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-4 lg:flex-row">
        {/* ---------------- 左侧：班级 / 学生选择 ---------------- */}
        <aside className="glass-panel flex w-full shrink-0 flex-col gap-3 rounded-2xl p-4 lg:w-80">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">选择学生</p>
            <span className="rounded-full bg-brand-green/15 px-2.5 py-0.5 text-xs font-medium text-brand-green">
              已选 {selectedStudentIds.length} 人
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="姓名、学号或班级…"
              className="glass-panel h-9 rounded-xl border-border/60 bg-transparent pl-9"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="glass-panel self-start rounded-lg border-border/60 bg-transparent"
            onClick={toggleAll}
          >
            {allSelected ? "取消全选" : "全选"}
          </Button>

          <div className="scrollbar-none flex max-h-[560px] flex-col gap-1 overflow-y-auto pr-1">
            {gradeGroups.map(({ grade, classes }) => {
              const gradeCollapsed = collapsedGrades.includes(grade.id)
              return (
                <div key={grade.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => toggleGrade(grade.id)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-foreground hover:bg-accent/50"
                  >
                    {gradeCollapsed ? (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                    {grade.name}
                  </button>

                  {!gradeCollapsed &&
                    classes.map((cls) => {
                      const roster = visibleStudentsOf(cls.id)
                      const shownRoster = search ? roster.filter((s) => matchesSearch(s, cls)) : roster
                      const classCollapsed = collapsedClasses.includes(cls.id) && !search
                      const selectedInClass = roster.filter((s) =>
                        selectedStudentIds.includes(s.id),
                      ).length
                      const allInClass = roster.length > 0 && selectedInClass === roster.length
                      const someInClass = selectedInClass > 0 && !allInClass
                      return (
                        <div key={cls.id} className="ml-3 flex flex-col gap-1">
                          <div
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2 py-1.5",
                              selectedInClass > 0 && "bg-brand-green/10",
                            )}
                          >
                            <Checkbox
                              checked={allInClass}
                              indeterminate={someInClass}
                              onCheckedChange={() => toggleClass(cls.id)}
                              aria-label={`全选 ${cls.name}`}
                            />
                            <button
                              type="button"
                              onClick={() => toggleClassCollapse(cls.id)}
                              className="flex flex-1 items-center gap-1 text-left text-sm font-medium text-foreground"
                            >
                              {classCollapsed ? (
                                <ChevronRight className="size-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="size-3.5 text-muted-foreground" />
                              )}
                              {cls.name}
                              <span className="text-xs text-muted-foreground">
                                （{roster.length}人）
                              </span>
                            </button>
                          </div>

                          {!classCollapsed && (
                            <div className="ml-6 flex flex-col gap-1">
                              {shownRoster.map((student) => {
                                const checked = selectedStudentIds.includes(student.id)
                                const weekly = weeklyCardsByStudent.get(student.id)?.length ?? 0
                                return (
                                  <div
                                    key={student.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleStudent(student.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") toggleStudent(student.id)
                                    }}
                                    className={cn(
                                      "flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm transition hover:bg-accent/50",
                                      checked && "border-brand-green/40 bg-brand-green/10",
                                    )}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => toggleStudent(student.id)}
                                      aria-label={`选择 ${student.name}`}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="w-6 text-xs text-muted-foreground">
                                      {student.studentNo}
                                    </span>
                                    <span className="flex-1 font-medium text-foreground">
                                      {student.name}
                                    </span>
                                    {weekly > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setWeeklyDetailStudent(student)
                                        }}
                                        className="rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[11px] font-medium text-brand-yellow transition hover:bg-brand-yellow/30"
                                        aria-label={`查看 ${student.name} 本周获得奖卡详情`}
                                      >
                                        本周获得 {weekly} 张
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
                              {search && shownRoster.length === 0 && (
                                <p className="px-2 py-1 text-xs text-muted-foreground">无匹配学生</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </div>
        </aside>

        {/* ---------------- 右侧：奖卡指标 ---------------- */}
        <section className="glass-panel flex w-full flex-1 flex-col gap-4 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">选择奖卡指标</p>
              <p className="mt-0.5 text-xs text-muted-foreground">点击奖卡卡片，即可给已选学生发放</p>
            </div>
            <div className="flex items-center gap-2">
              {hint && <span className="text-xs text-brand-orange">{hint}</span>}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 rounded-lg bg-transparent"
                onClick={() => {
                  setSelectedStudentIds([])
                  setSearch("")
                }}
                aria-label="重置选择"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {AWARD_LEVEL1_LIST.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setActiveLevel1(name)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5",
                  name === activeLevel1
                    ? "bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-md shadow-primary/30"
                    : "glass-panel text-muted-foreground hover:text-foreground",
                )}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeGroup?.items.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleCardClick(item)
                }}
                className="glass-panel group flex cursor-pointer flex-col gap-3 rounded-2xl p-3 transition hover:border-brand-green/50 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.level2}</p>
                  <span className="group/info relative flex">
                    <Info className="size-4 text-muted-foreground" />
                    <span className="pointer-events-none absolute right-0 top-6 z-10 w-56 rounded-xl border border-border/60 bg-popover p-3 text-left text-xs leading-relaxed text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover/info:opacity-100">
                      {item.description}
                    </span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (item.image) setZoomImage({ src: item.image, title: `${activeLevel1} · ${item.level2}` })
                  }}
                  className="overflow-hidden rounded-xl border border-border/40"
                  aria-label={`放大查看 ${item.level2} 奖卡正面`}
                >
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={`${item.level2} 奖卡正面`}
                      className="aspect-[4/3] w-full bg-white object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="flex aspect-[4/3] w-full items-center justify-center bg-white/5 text-xs text-muted-foreground">
                      暂无图片
                    </span>
                  )}
                </button>

                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-brand-green/15 px-2.5 py-0.5 text-xs font-semibold text-brand-green">
                    +{item.points} 分
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    <Sparkles className="size-3.5" />
                    点击发放
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---------------- 发卡二次确认 ---------------- */}
      <Dialog open={!!confirmIndicator} onOpenChange={(open) => !open && setConfirmIndicator(null)}>
        <DialogContent className="glass-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认发放奖卡</DialogTitle>
          </DialogHeader>
          {confirmIndicator && (
            <div className="flex flex-col gap-3 text-sm text-foreground">
              <p>
                将为 <span className="font-semibold text-brand-green">{selectedStudentIds.length}</span>{" "}
                名学生发放
                <span className="mx-1 font-semibold">{activeLevel1} · {confirmIndicator.level2}</span>
                奖卡（+{confirmIndicator.points} 分/人），确认发放？
              </p>
              <p className="text-xs text-muted-foreground">发放后学生本周获得奖卡数量将即时更新。</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setConfirmIndicator(null)}>
              取消
            </Button>
            <Button onClick={handleConfirmIssue}>确认发放</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- 奖卡图片放大 ---------------- */}
      <Dialog open={!!zoomImage} onOpenChange={(open) => !open && setZoomImage(null)}>
        <DialogContent className="glass-surface sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{zoomImage?.title}</DialogTitle>
          </DialogHeader>
          {zoomImage?.src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={zoomImage.src}
              alt={`${zoomImage.title} 奖卡正面`}
              className="max-h-[70vh] w-full rounded-xl object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- 本周获得奖卡详情 ---------------- */}
      <Dialog
        open={!!weeklyDetailStudent}
        onOpenChange={(open) => !open && setWeeklyDetailStudent(null)}
      >
        <DialogContent className="glass-surface max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {weeklyDetailStudent?.name} 本周获得奖卡（
              {weeklyDetailStudent ? weeklyCardsByStudent.get(weeklyDetailStudent.id)?.length ?? 0 : 0}
              张）
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {(weeklyDetailStudent
              ? weeklyCardsByStudent.get(weeklyDetailStudent.id) ?? []
              : []
            ).map((card: AwardCardRecord) => (
              <div key={card.id} className="glass-panel rounded-xl px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {card.level1} · {card.level2}
                  </span>
                  <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-xs font-semibold text-brand-green">
                    +{card.points} 分
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.date} · 发放人：{card.operatorName}
                </p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setWeeklyDetailStudent(null)}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
