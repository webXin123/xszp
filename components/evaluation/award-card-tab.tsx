"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, ChevronDown, ChevronRight, Info, Mic, Search, Sparkles, Trash2, User, Users } from "lucide-react"
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
import { useDraggableFab } from "@/components/ui/use-draggable-fab"
import { AWARD_GROUPS } from "@/lib/award-utils"
import { formatDate, getISOWeekKey } from "@/lib/scoring-utils"
import type { AwardCardRecord, AwardIndicatorLevel3, SchoolClass, Student } from "@/lib/types"

type ConfirmAwardIndicator = {
  level1: string
  level2: string
  indicator: AwardIndicatorLevel3
}

type IssueMode = "batch" | "single"
type MobileAwardStep = "selection" | "issue"
export function AwardCardTab() {
  const { grades, students, awardCards, addAwardCards, removeAwardCard } = useEvaluation()
  const { awardClasses } = usePermission()
  const weekKey = getISOWeekKey(new Date())
  const today = formatDate(new Date())

  const [search, setSearch] = useState("")
  const [collapsedGrades, setCollapsedGrades] = useState<string[]>([])
  const [collapsedClasses, setCollapsedClasses] = useState<string[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [issueMode, setIssueMode] = useState<IssueMode>("batch")
  const [mobileStep, setMobileStep] = useState<MobileAwardStep>("selection")
  const [singleClassId, setSingleClassId] = useState("")
  const [singleStudent, setSingleStudent] = useState<Student | null>(null)
  const [singleIndicator, setSingleIndicator] = useState<ConfirmAwardIndicator | null>(null)
  const [activeLevel2, setActiveLevel2] = useState(() => AWARD_GROUPS[0]?.items[0]?.level2 ?? "")
  const [confirmIndicator, setConfirmIndicator] = useState<ConfirmAwardIndicator | null>(null)
  const [zoomImage, setZoomImage] = useState<{ src: string; title: string } | null>(null)
  const [weeklyDetailStudent, setWeeklyDetailStudent] = useState<Student | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const {
    offset: voiceFabOffset,
    dragging: isVoiceFabDragging,
    consumeClick: consumeVoiceFabClick,
    onPointerDown: startVoiceFabDrag,
    onPointerMove: moveVoiceFab,
    onPointerUp: endVoiceFabDrag,
  } = useDraggableFab({ size: 52, mobileBottom: 88 })

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

  const weeklyStatsByStudent = useMemo(() => {
    const map = new Map<string, { count: number; points: number }>()
    for (const [studentId, cards] of weeklyCardsByStudent) {
      map.set(studentId, {
        count: cards.length,
        points: cards.reduce((sum, card) => sum + card.points, 0),
      })
    }
    return map
  }, [weeklyCardsByStudent])

  useEffect(() => {
    if (!awardClasses.some((cls) => cls.id === singleClassId)) {
      setSingleClassId(awardClasses[0]?.id ?? "")
    }
  }, [awardClasses, singleClassId])

  const visibleStudentsOf = (classId: string) => studentsByClass.get(classId) ?? []

  const selectedSingleClass =
    awardClasses.find((cls) => cls.id === singleClassId) ?? awardClasses[0]
  const singleModeStudents = selectedSingleClass ? visibleStudentsOf(selectedSingleClass.id) : []
  const singleStudentCards = singleStudent
    ? weeklyCardsByStudent.get(singleStudent.id) ?? []
    : []
  const singleStudentStats = singleStudent
    ? weeklyStatsByStudent.get(singleStudent.id) ?? { count: 0, points: 0 }
    : { count: 0, points: 0 }

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

  const handleVoiceAward = () => {
    if (consumeVoiceFabClick()) return
    if (selectedStudentIds.length === 0) {
      showHint("请先在左侧勾选要发放的学生")
      return
    }
    showHint(`已开启语音发放，可为 ${selectedStudentIds.length} 名学生录入奖卡`)
  }

  const handleCardClick = (level1: string, level2: string, indicator: AwardIndicatorLevel3) => {
    if (selectedStudentIds.length === 0) {
      showHint("请先在左侧勾选要发放的学生")
      return
    }
    if (activeLevel2 !== level2) {
      showHint("请先选择顶部的二级指标，再发放奖卡")
      return
    }
    setConfirmIndicator({ level1, level2, indicator })
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
          indicatorId: confirmIndicator.indicator.id,
          level1: confirmIndicator.level1,
          level2: confirmIndicator.level2,
          level3: confirmIndicator.indicator.level3,
          points: confirmIndicator.indicator.points,
          weekKey,
          date: today,
        })),
    )
    setConfirmIndicator(null)
  }

  const openSingleStudent = (student: Student) => {
    setSingleStudent(student)
    setSingleIndicator(null)
  }

  const handleSingleCardSelect = (indicator: AwardIndicatorLevel3) => {
    if (!activeLevel2Group) return
    setSingleIndicator({
      level1: activeLevel2Group.level1,
      level2: activeLevel2Group.level2,
      indicator,
    })
  }

  const handleSingleConfirmIssue = () => {
    if (!singleStudent || !singleIndicator) return
    addAwardCards([
      {
        studentId: singleStudent.id,
        studentName: singleStudent.name,
        classId: singleStudent.classId,
        indicatorId: singleIndicator.indicator.id,
        level1: singleIndicator.level1,
        level2: singleIndicator.level2,
        level3: singleIndicator.indicator.level3,
        points: singleIndicator.indicator.points,
        weekKey,
        date: today,
      },
    ])
    setSingleIndicator(null)
    setSingleStudent(null)
  }

  const level2Options = useMemo(
    () =>
      AWARD_GROUPS.flatMap((level1Group) =>
        level1Group.items.map((group) => ({ ...group, level1: level1Group.level1 })),
      ),
    [],
  )
  const activeLevel2Group = level2Options.find((group) => group.level2 === activeLevel2)
  const canContinueMobile = selectedStudentIds.length > 0

  return (
    <div className="relative w-full min-w-0 bg-transparent p-0 pb-24 lg:pb-0">
      <section id="award-online-panel" aria-labelledby="award-online-title">
      <section className="hidden mb-3 overflow-hidden rounded-[22px] border border-[#d2e1fa] bg-[linear-gradient(128deg,#edf3ff_0%,#fcfdff_54%,#fff7e8_100%)] p-4 shadow-[0_18px_34px_-30px_rgba(48,77,155,.65)] lg:hidden" aria-label="移动端奖卡发放提示">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-[.14em] text-primary">REWARD MOMENT</p><h1 className="mt-1 text-lg font-extrabold text-foreground">把肯定及时送达</h1><p className="mt-1 text-xs leading-5 text-muted-foreground">选择学生、挑选奖卡，一次点击完成鼓励。</p></div><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-[#e9951e] shadow-[0_8px_18px_-14px_rgba(190,125,28,.6)]"><Sparkles className="size-5" aria-hidden="true" /></span></div>
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold"><span className="rounded-full bg-white/85 px-3 py-1.5 text-foreground">1 · 选择对象</span><span className="h-px flex-1 bg-primary/15" /><span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">2 · 发放奖卡</span></div>
      </section>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#dce4fa] bg-[#f8f9ff] p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {issueMode === "batch" ? <Users className="size-5" aria-hidden="true" /> : <User className="size-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <h1 id="award-online-title" className="text-sm font-bold text-foreground">奖卡发放</h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {issueMode === "batch" ? "选择多名学生后批量发放奖卡" : "按班级查看学生本周奖卡，并单独发放"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded-xl border border-[#d6def7] bg-white p-1" role="tablist" aria-label="奖卡发放方式">
          <button
            id="award-batch-tab"
            type="button"
            role="tab"
            aria-selected={issueMode === "batch"}
            aria-controls="award-batch-panel"
            onClick={() => { setIssueMode("batch"); setMobileStep("selection") }}
            className={cn(
              "flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-4",
              issueMode === "batch"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
            )}
          >
            <Users className="size-3.5" aria-hidden="true" />
            批量发放
          </button>
          <button
            id="award-single-tab"
            type="button"
            role="tab"
            aria-selected={issueMode === "single"}
            aria-controls="award-single-panel"
            onClick={() => { setIssueMode("single"); setMobileStep("selection") }}
            className={cn(
              "flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-4",
              issueMode === "single"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
            )}
          >
            <User className="size-3.5" aria-hidden="true" />
            单学生发放
          </button>
          </div>
        </div>
      </div>

      {issueMode === "single" ? (
        <section id="award-single-panel" role="tabpanel" aria-labelledby="award-single-tab" className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#dbe2f8] bg-[#f7f8ff] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p id="single-student-issue-title" className="text-sm font-bold text-foreground">单学生发放</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              </div>
            </div>
            <div className="min-w-0 max-w-full touch-pan-x overscroll-x-contain overflow-x-auto pb-2" role="group" aria-label="切换班级">
              <div className="flex w-max gap-2">
              {awardClasses.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  aria-pressed={selectedSingleClass?.id === cls.id}
                  onClick={() => setSingleClassId(cls.id)}
                  className={cn(
                    "min-h-10 shrink-0 rounded-xl border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    selectedSingleClass?.id === cls.id
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_8px_18px_-14px_rgba(77,105,225,0.88)]"
                      : "border-[#dfe4f7] bg-white text-muted-foreground hover:border-primary/35 hover:bg-primary/[0.04] hover:text-foreground",
                  )}
                >
                  {cls.name}
                </button>
              ))}
              </div>
            </div>
          </div>

          {singleModeStudents.length > 0 ? (
            <div className="award-student-card-grid gap-2">
              {singleModeStudents.map((student) => {
                const stats = weeklyStatsByStudent.get(student.id) ?? { count: 0, points: 0 }
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => openSingleStudent(student)}
                    aria-label={`查看 ${student.name} 本周奖卡并发放奖卡`}
                    className="group flex min-h-20 min-w-0 touch-manipulation flex-col justify-between rounded-xl border border-[#dfe4f7] bg-white px-2.5 py-2.5 text-left shadow-[0_10px_24px_-24px_rgba(53,67,150,0.65)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_16px_28px_-22px_rgba(53,67,150,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 sm:px-3"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-semibold text-muted-foreground">{student.studentNo}</span>
                      <span className="min-w-0 truncate text-sm font-bold text-foreground">{student.name}</span>
                      <span className="hidden items-center gap-1 text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:flex">
                        详情 <ArrowRight className="size-3" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-[#edf0fa] pt-2 text-xs">
                      <span className="text-muted-foreground">发放 <strong className="ml-1 tabular-nums text-foreground">{stats.count}</strong> 次</span>
                      <span className="text-muted-foreground">积分 <strong className="ml-1 tabular-nums text-brand-green">+{stats.points}</strong> 分</span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#dbe3f8] bg-[#fafbff] px-4 text-center">
              <User className="size-8 text-primary/60" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">当前班级暂无学生</p>
              <p className="text-xs text-muted-foreground">请切换其他班级后继续发放。</p>
            </div>
          )}
        </section>
      ) : (
      <div id="award-batch-panel" role="tabpanel" aria-labelledby="award-batch-tab" className="flex flex-col items-start gap-4 lg:flex-row">
        {/* ---------------- 左侧：班级 / 学生选择 ---------------- */}
        <aside className={cn("w-full shrink-0 flex-col gap-3 rounded-2xl border border-[#dbe2f8] bg-[#f7f8ff] p-4 shadow-[0_10px_24px_-24px_rgba(53,67,150,0.65)] lg:flex lg:w-80", mobileStep === "selection" ? "flex" : "hidden")}>
          <div className="hidden items-center justify-between gap-3 rounded-xl border border-primary/15 bg-white/80 px-3 py-2 lg:hidden">
            <div><p className="text-sm font-bold">选择学生</p><p className="mt-0.5 text-[11px] text-muted-foreground">先选学生，再选择奖卡</p></div>
            <span className="rounded-full bg-brand-green/12 px-2.5 py-1 text-xs font-semibold text-brand-green">已选 {selectedStudentIds.length} 人</span>
          </div>
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
              aria-label="按姓名、学号或班级搜索学生"
              className="h-10 rounded-xl border-[#dbe2f5] bg-white pl-9 shadow-[0_6px_14px_-16px_rgba(53,67,150,0.75)]"
            />
          </div>

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
                              selectedInClass > 0 && "border border-primary/20 bg-primary/[0.07]",
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
                                      "flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm transition hover:bg-white",
                                      checked && "border-primary/35 bg-primary/[0.08]",
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
                                        className="rounded-full bg-brand-yellow/20 px-2 py-0.5 text-xs font-medium text-brand-yellow transition hover:bg-brand-yellow/30"
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
        <section className={cn("w-full flex-1 flex-col gap-4 rounded-2xl border border-[#dbe2f8] bg-white p-4 shadow-[0_10px_24px_-24px_rgba(53,67,150,0.65)] sm:p-6 lg:flex", mobileStep === "issue" ? "flex" : "hidden")}>
          <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-2 lg:hidden">
            <button type="button" onClick={() => setMobileStep("selection")} className="inline-flex min-h-9 items-center rounded-lg border border-primary/20 bg-white px-3 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">返回选择学生</button>
            <span className="text-xs text-muted-foreground">已选 {selectedStudentIds.length} 人</span>
          </div>
          <section className="rounded-2xl border border-[#dce4fa] bg-[#f8f9ff] p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">选择二级指标</p>
                <p className="mt-0.5 text-xs text-muted-foreground">点击指标后展示对应的奖卡图片</p>
              </div>
              {activeLevel2Group && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {activeLevel2Group.level1}
                </span>
              )}
            </div>
            <div className="scrollbar-none flex max-w-full gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0" aria-label="奖卡二级指标">
              {level2Options.map((group) => (
                <button
                  key={group.level2}
                  type="button"
                  aria-pressed={activeLevel2 === group.level2}
                  onClick={() => setActiveLevel2(group.level2)}
                  className={cn(
                    "shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                    activeLevel2 === group.level2
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_8px_18px_-14px_rgba(77,105,225,0.88)]"
                      : "border-[#dfe4f7] bg-white text-muted-foreground hover:border-primary/35 hover:bg-primary/[0.04] hover:text-foreground",
                  )}
                >
                  {group.level2}
                </button>
              ))}
            </div>
            {hint && <p className="mt-3 text-xs font-medium text-brand-orange" role="status">{hint}</p>}
          </section>

          <section className="rounded-2xl border border-[#dce4fa] bg-white p-3.5">
            {activeLevel2Group ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">{activeLevel2Group.level2}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">选择下方奖卡即可发放给已选学生</p>
                  </div>
                  <span className="text-xs font-semibold text-primary">{activeLevel2Group.items.length} 张奖卡</span>
                </div>
                <div className="data-card-grid gap-3">
                  {activeLevel2Group.items.map((item) => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardClick(activeLevel2Group.level1, activeLevel2Group.level2, item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleCardClick(activeLevel2Group.level1, activeLevel2Group.level2, item)
                        }
                      }}
                      className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-[#dfe4f7] bg-[#fbfcff] p-3 transition duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-white hover:shadow-[0_14px_24px_-22px_rgba(53,67,150,0.72)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-foreground">{item.level3} - {activeLevel2Group.level1}</p>
                        <span className="group/info relative flex">
                          <Info className="size-4 text-muted-foreground" />
                          <span className="pointer-events-none absolute right-0 top-6 z-10 w-56 rounded-xl border border-border/60 bg-popover p-3 text-left text-xs leading-relaxed text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover/info:opacity-100">
                            {item.description}
                          </span>
                        </span>
                      </div>

                      <button type="button" onClick={() => handleCardClick(activeLevel2Group.level1, activeLevel2Group.level2, item)} className="group/image relative min-h-24 overflow-hidden rounded-xl border border-[#dfe4f7] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" aria-label={`点击图片发放 ${item.level3} 奖卡`}>
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt={`${item.level3} - ${activeLevel2Group.level1} 奖卡正面`}
                            width={320}
                            height={240}
                            className="aspect-[4/3] w-full bg-white object-contain transition-transform duration-200 group-hover/image:scale-[1.03]"
                          />
                        ) : (
                          <span className="flex aspect-[4/3] w-full items-center justify-center bg-[#f7f8ff] text-xs text-muted-foreground">
                            暂无图片
                          </span>
                        )}
                      </button>

                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          +{item.points} 分
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium text-primary">
                          <Sparkles className="size-3.5" />
                          点击发放
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#dbe3f8] bg-[#fafbff] px-4 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">奖</span>
                <p className="text-sm font-semibold text-foreground">请选择一个二级指标</p>
                <p className="text-xs text-muted-foreground">对应的三级奖卡图片会显示在这里</p>
              </div>
            )}
          </section>
      </section>
      </div>
      )}
      </section>

      {issueMode === "batch" && <div className={cn("fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-[#d7def4] bg-white/96 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-16px_34px_-24px_rgba(44,63,132,.7)] backdrop-blur-xl lg:hidden", mobileStep !== "selection" && "hidden")}>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-green">已选 {selectedStudentIds.length} 人</span>
        <Button type="button" disabled={!canContinueMobile} onClick={() => setMobileStep("issue")} className="min-h-12 shrink-0 rounded-xl px-5 text-sm font-bold shadow-[0_10px_20px_-14px_rgba(44,99,196,.8)]">下一步：选择奖卡</Button>
      </div>}

      <div
        role="group"
        aria-label="语音发放奖卡"
        style={{ transform: `translate3d(${voiceFabOffset.x}px, ${voiceFabOffset.y}px, 0)` }}
        className={cn(
          "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 sm:right-5 lg:absolute lg:bottom-auto lg:right-4 lg:top-[54%]",
          isVoiceFabDragging && "cursor-grabbing",
        )}
      >
        <Button
          type="button"
          size="icon"
          onClick={handleVoiceAward}
          onPointerDown={startVoiceFabDrag}
          onPointerMove={moveVoiceFab}
          onPointerUp={endVoiceFabDrag}
          onPointerCancel={endVoiceFabDrag}
          aria-label="语音发放奖卡，点击开始，拖动调整位置"
          title="语音发放奖卡（可拖动）"
          className="size-13 cursor-grab touch-none select-none rounded-2xl border border-white/70 bg-primary p-0 text-primary-foreground shadow-[0_14px_28px_-12px_rgba(77,105,225,0.78)] transition hover:bg-primary/90 active:cursor-grabbing"
        >
          <Mic className="size-6" strokeWidth={2.4} aria-hidden="true" />
        </Button>
      </div>

      {/* ---------------- 单学生发卡弹窗 ---------------- */}
      <Dialog
        open={!!singleStudent}
        onOpenChange={(open) => {
          if (!open) {
            setSingleStudent(null)
            setSingleIndicator(null)
          }
        }}
      >
        <DialogContent className="glass-surface max-h-[90vh] overflow-y-auto overscroll-contain sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{singleStudent?.name} · 奖卡发放</DialogTitle>
            <p className="text-xs text-muted-foreground">{selectedSingleClass?.name ?? "当前班级"} · 选择指标与奖卡后确认发放</p>
          </DialogHeader>

          {singleStudent && (
            <div className="flex flex-col gap-4">
              <section className="rounded-2xl border border-[#dce4fa] bg-white p-3.5" aria-labelledby="single-award-picker-title">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p id="single-award-picker-title" className="text-sm font-bold text-foreground">指标选择</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">先选择二级指标，再选择带图片的具体奖卡。</p>
                  </div>
                  {singleIndicator && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      已选 · {singleIndicator.indicator.level3}
                    </span>
                  )}
                </div>
                <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="单学生发放二级指标">
                  {level2Options.map((group) => (
                    <button
                      key={group.level2}
                      type="button"
                      aria-pressed={activeLevel2 === group.level2}
                      onClick={() => {
                        setActiveLevel2(group.level2)
                        setSingleIndicator(null)
                      }}
                      className={cn(
                        "min-h-9 shrink-0 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        activeLevel2 === group.level2
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-[#dfe4f7] bg-[#fbfcff] text-muted-foreground hover:border-primary/35 hover:text-foreground",
                      )}
                    >
                      {group.level2}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activeLevel2Group?.items.map((item) => (
                    <div key={item.id} className={cn("flex min-h-19 gap-2 rounded-xl border p-2 transition-colors", singleIndicator?.indicator.id === item.id ? "border-primary bg-primary/[0.08]" : "border-[#dfe4f7] bg-[#fbfcff] hover:border-primary/35 hover:bg-primary/[0.04]")}>
                      <button type="button" onClick={() => handleSingleCardSelect(item)} aria-pressed={singleIndicator?.indicator.id === item.id} aria-label={`点击图片选择并发放 ${item.level3} 奖卡`} className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#dfe4f7] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                        {item.image ? <img src={item.image} alt={`${item.level3} 奖卡缩略图`} width={80} height={80} className="size-20 object-cover" /> : <span className="flex size-20 items-center justify-center text-xs font-bold text-primary">奖卡</span>}
                      </button>
                      <button type="button" aria-pressed={singleIndicator?.indicator.id === item.id} onClick={() => handleSingleCardSelect(item)} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground">{item.level3}</span><span className="mt-0.5 block line-clamp-2 text-[11px] text-muted-foreground">{item.description}</span></span>
                        <span className="shrink-0 rounded-full bg-brand-green/12 px-2 py-1 text-xs font-bold text-brand-green">+{item.points}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#dce4fa] bg-[#fafbff] p-3.5" aria-labelledby="single-award-history-title">
                <div className="flex items-center justify-between gap-3">
                  <p id="single-award-history-title" className="text-sm font-bold text-foreground">本周发放详情</p>
                  <span className="text-xs text-muted-foreground">{singleStudentCards.length} 条记录</span>
                </div>
                <div className="mt-3 flex max-h-40 flex-col gap-2 overflow-y-auto pr-1">
                  {singleStudentCards.length > 0 ? singleStudentCards.map((card) => (
                      <div key={card.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e4e8f7] bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{card.level1} · {card.level2} · {card.level3 ?? "奖卡"}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{card.date} · 发放人：{card.operatorName}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-brand-green/12 px-2 py-1 text-xs font-bold text-brand-green">+{card.points} 分</span><button type="button" onClick={() => removeAwardCard(card.id)} className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50" aria-label={`删除 ${card.level3 ?? "奖卡"} 记录`}><Trash2 className="size-4" aria-hidden="true" /></button></div>
                    </div>
                  )) : (
                    <p className="rounded-xl border border-dashed border-[#dbe3f8] px-3 py-5 text-center text-xs text-muted-foreground">本周还没有奖卡记录</p>
                  )}
                </div>
              </section>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => {
                setSingleStudent(null)
                setSingleIndicator(null)
              }}
            >
              关闭
            </Button>
            <Button type="button" disabled={!singleIndicator} onClick={handleSingleConfirmIssue}>
              确认发放
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <span className="mx-1 font-semibold">{confirmIndicator.level1} · {confirmIndicator.level2} · {confirmIndicator.indicator.level3}</span>
                奖卡（+{confirmIndicator.indicator.points} 分/人），确认发放？
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
              width={1024}
              height={768}
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
                    {card.level1} · {card.level2}{card.level3 ? ` · ${card.level3}` : ""}
                  </span>
                  <div className="flex items-center gap-2"><span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-xs font-semibold text-brand-green">+{card.points} 分</span><button type="button" onClick={() => removeAwardCard(card.id)} className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50" aria-label={`删除 ${card.level3 ?? "奖卡"} 记录`}><Trash2 className="size-4" aria-hidden="true" /></button></div>
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
