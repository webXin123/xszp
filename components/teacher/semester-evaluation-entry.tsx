"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, ChevronRight, ClipboardCheck, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { useEvaluation } from "@/lib/evaluation-context"
import { getSemesterLabel } from "@/lib/pe-scores"
import { usePermission } from "@/lib/use-permission"
import { cn } from "@/lib/utils"
import {
  readSemesterEvaluationRecords,
  writeSemesterEvaluationRecords,
  type SemesterEvaluationLevel,
  type SemesterEvaluationRecord,
} from "@/lib/semester-evaluation-utils"

type EvaluationMode = "student" | "indicator"

const INDICATORS = [
  { id: "responsibility", name: "责任担当", description: "承担班级、校园责任" },
  { id: "self-management", name: "自主管理", description: "自主反思与学习过程" },
  { id: "etiquette", name: "礼仪之美", description: "传承中华礼仪文化" },
  { id: "practice", name: "实践创新", description: "参与劳动实践创新活动" },
  { id: "positivity", name: "积极心理", description: "具备良好的人际交往心理" },
  { id: "safety", name: "安全意识", description: "掌握基础安全知识" },
  { id: "aesthetics", name: "爱国敬业", description: "热爱校园与集体" },
  { id: "service", name: "志愿服务", description: "参与校园、社区公益帮扶" },
  { id: "integrity", name: "诚信友善", description: "诚实守信、友善相处" },
  { id: "health", name: "健康习惯", description: "保持运动与健康生活" },
] as const

const LEVELS: SemesterEvaluationLevel[] = ["优秀", "良好", "达标", "待进步"]

function ratingClass(level: SemesterEvaluationLevel, active: boolean) {
  if (!active) return "border-[#dfe5f3] bg-white text-muted-foreground hover:border-primary/45 hover:bg-primary/[0.035]"
  if (level === "优秀") return "border-[#9bd8b7] bg-[#eaf8f1] text-[#18764d] shadow-[0_6px_14px_-10px_rgba(24,118,77,0.72)]"
  if (level === "良好") return "border-[#b9c8f0] bg-[#eef2ff] text-primary shadow-[0_6px_14px_-10px_rgba(63,81,188,0.72)]"
  if (level === "达标") return "border-[#f0c98d] bg-[#fff4e5] text-[#a85e08] shadow-[0_6px_14px_-10px_rgba(168,94,8,0.58)]"
  return "border-[#edb4b8] bg-[#fff0f0] text-[#b14f57] shadow-[0_6px_14px_-10px_rgba(177,79,87,0.58)]"
}

function isComplete(record: SemesterEvaluationRecord | undefined) {
  return INDICATORS.every((indicator) => record?.ratings[indicator.id])
}

export function SemesterEvaluationEntry() {
  const { currentTeacher, students, classes, grades } = useEvaluation()
  const { scoringClasses } = usePermission()
  const teacher = currentTeacher
  const targetClasses = scoringClasses.length > 0
    ? scoringClasses
    : classes.filter((item) => teacher?.teachingClassIds?.includes(item.id) || item.homeroomTeacher === teacher?.name)
  const [classId, setClassId] = useState(targetClasses[0]?.id ?? "")
  const [mode, setMode] = useState<EvaluationMode>("student")
  const [indicatorId, setIndicatorId] = useState<(typeof INDICATORS)[number]["id"]>(INDICATORS[0].id)
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [search, setSearch] = useState("")
  const [records, setRecords] = useState<SemesterEvaluationRecord[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [feedback, setFeedback] = useState("")

  const currentClass = targetClasses.find((item) => item.id === classId) ?? targetClasses[0]
  const currentGrade = grades.find((item) => item.id === currentClass?.gradeId)
  const roster = useMemo(() => students.filter((student) => student.classId === currentClass?.id), [currentClass?.id, students])
  const filteredRoster = useMemo(() => roster.filter((student) => `${student.name}${student.studentNo}`.includes(search.trim())), [roster, search])
  const selectedStudent = roster.find((student) => student.id === selectedStudentId) ?? roster[0]
  const activeIndicator = INDICATORS.find((item) => item.id === indicatorId) ?? INDICATORS[0]

  useEffect(() => {
    setRecords(readSemesterEvaluationRecords())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (targetClasses.length > 0 && !targetClasses.some((item) => item.id === classId)) setClassId(targetClasses[0].id)
  }, [classId, targetClasses])

  useEffect(() => {
    if (!roster.some((student) => student.id === selectedStudentId)) setSelectedStudentId(roster[0]?.id ?? "")
  }, [roster, selectedStudentId])

  useEffect(() => {
    if (hydrated) writeSemesterEvaluationRecords(records)
  }, [hydrated, records])

  const getRecord = (studentId: string) => records.find((record) => record.teacherId === teacher?.id && record.classId === currentClass?.id && record.studentId === studentId && record.semester === getSemesterLabel())
  const completedStudents = roster.filter((student) => isComplete(getRecord(student.id))).length
  const completedIndicators = INDICATORS.filter((indicator) => roster.length > 0 && roster.every((student) => getRecord(student.id)?.ratings[indicator.id])).length
  const currentIndicatorCompleted = roster.filter((student) => getRecord(student.id)?.ratings[activeIndicator.id]).length
  const progressCompleted = mode === "student" ? completedStudents : completedIndicators
  const progressTotal = mode === "student" ? roster.length : INDICATORS.length
  const progressLabel = mode === "student" ? "学生完成" : "指标完成"

  const setRating = (studentId: string, targetIndicatorId: string, level: SemesterEvaluationLevel) => {
    if (!teacher || !currentClass) return
    setRecords((current) => {
      const existingIndex = current.findIndex((record) => record.teacherId === teacher.id && record.classId === currentClass.id && record.studentId === studentId && record.semester === getSemesterLabel())
      if (existingIndex === -1) {
        return [...current, {
          id: `semester-evaluation-${teacher.id}-${currentClass.id}-${studentId}-${Date.now()}`,
          semester: getSemesterLabel(),
          teacherId: teacher.id,
          classId: currentClass.id,
          studentId,
          ratings: { [targetIndicatorId]: level },
          updatedAt: new Date().toISOString(),
        }]
      }
      const next = [...current]
      next[existingIndex] = {
        ...next[existingIndex],
        ratings: { ...next[existingIndex].ratings, [targetIndicatorId]: level },
        updatedAt: new Date().toISOString(),
      }
      return next
    })
  }

  const rateSelectedStudentAll = (level: SemesterEvaluationLevel) => {
    if (!selectedStudent) return
    INDICATORS.forEach((indicator) => setRating(selectedStudent.id, indicator.id, level))
    setFeedback(`已将 ${selectedStudent.name} 的全部指标设为${level}`)
  }

  const rateCurrentIndicatorAll = (level: SemesterEvaluationLevel) => {
    roster.forEach((student) => setRating(student.id, activeIndicator.id, level))
    setFeedback(`已将「${activeIndicator.name}」批量设为${level}`)
  }

  const advance = () => {
    if (mode === "student") {
      const next = roster.find((student) => !isComplete(getRecord(student.id)))
      if (next) {
        setSelectedStudentId(next.id)
        setFeedback(`已切换至 ${next.name}`)
      } else setFeedback("本班学生评价已全部完成")
      return
    }
    const index = INDICATORS.findIndex((item) => item.id === activeIndicator.id)
    const next = INDICATORS[(index + 1) % INDICATORS.length]
    setIndicatorId(next.id)
    setFeedback(`已切换至「${next.name}」`)
  }

  if (!teacher || !currentClass) {
    return <section className="rounded-2xl border border-[#cbd6f7] bg-white p-10 text-center shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)]"><ClipboardCheck className="mx-auto size-10 text-primary/40" aria-hidden="true" /><h1 className="mt-3 text-lg font-bold text-foreground">暂无学期评价班级</h1><p className="mt-1 text-sm text-muted-foreground">当前账号尚未关联可评价班级。</p></section>
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-[20px] border border-primary/25 bg-[linear-gradient(110deg,#f8faff_0%,#f3fbfa_56%,#f8fbff_100%)] px-4 py-3 shadow-[0_14px_30px_-28px_rgba(48,62,139,0.65)] sm:px-6">
        <div className="grid items-center gap-3 lg:grid-cols-[minmax(230px,0.85fr)_minmax(440px,1.5fr)_minmax(180px,0.65fr)]">
          <div><div className="flex flex-wrap items-center gap-2"><Link href="/" className="inline-flex min-h-7 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><ArrowLeft className="size-3.5" aria-hidden="true" />返回首页</Link><span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{currentGrade?.name ?? "当前年级"} · {getSemesterLabel()}</span></div><h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">学期评价</h1></div>
          <div className="grid overflow-hidden rounded-[24px] border border-[#d5e1f7] bg-white shadow-[0_8px_18px_-15px_rgba(48,62,139,0.72)] sm:grid-cols-[minmax(170px,0.9fr)_minmax(230px,1.1fr)]">
            <div className="flex min-h-[52px] items-center border-b border-[#e7edf8] px-4 py-2 sm:border-b-0 sm:border-r"><div className="min-w-0 flex-1"><Select value={currentClass.id} onValueChange={(value) => value && setClassId(value)}><SelectTrigger aria-label="切换评价班级" className="h-auto w-full border-0 bg-transparent p-0 text-sm font-bold text-primary hover:border-0 focus-visible:ring-0"><span className="truncate">{currentClass.name}</span></SelectTrigger><SelectContent>{targetClasses.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div></div>
            <div role="tablist" aria-label="评价方式" className="grid h-full w-full grid-cols-2 gap-1 rounded-[18px] bg-[#f3f5ff] p-1">
              {([{ value: "student", label: "按学生评价" }, { value: "indicator", label: "按指标评价" }] as Array<{ value: EvaluationMode; label: string }>).map((item) => <button key={item.value} type="button" role="tab" aria-selected={mode === item.value} tabIndex={mode === item.value ? 0 : -1} onClick={() => setMode(item.value)} className={cn("flex min-h-10 w-full items-center justify-center rounded-[14px] px-3 text-center text-sm font-semibold transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", mode === item.value ? "bg-white text-primary shadow-[0_5px_12px_-9px_rgba(63,81,188,0.8)]" : "text-muted-foreground hover:bg-white/70 hover:text-primary")}>{item.label}</button>)}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 lg:justify-end"><div><p className="text-xs text-muted-foreground">{progressLabel}</p><p className="mt-0.5 text-xl font-bold tabular-nums text-primary">{progressCompleted} / {progressTotal}</p><div className="mt-1.5 h-1.5 w-36 overflow-hidden rounded-full bg-[#dfe8e9]"><div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progressTotal ? (progressCompleted / progressTotal) * 100 : 0}%` }} /></div></div></div>
        </div>
      </section>

      {mode === "indicator" ? <div className="flex flex-wrap gap-2 rounded-2xl border border-[#d8e2f4] bg-white p-3 shadow-[0_12px_26px_-26px_rgba(48,62,139,0.55)]" aria-label="评价指标">
        <span className="mr-1 flex min-w-24 flex-col justify-center px-1"><strong className="text-sm text-foreground">评价指标</strong><span className="mt-0.5 text-xs text-muted-foreground">共 {INDICATORS.length} 项</span></span>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">{INDICATORS.map((indicator) => <button key={indicator.id} type="button" onClick={() => { setIndicatorId(indicator.id); setMode("indicator") }} aria-pressed={indicator.id === activeIndicator.id && mode === "indicator"} className={cn("min-h-10 shrink-0 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", indicator.id === activeIndicator.id && mode === "indicator" ? "border-primary bg-primary/10 text-primary" : "border-[#dfe5f3] bg-[#fbfcff] text-muted-foreground hover:border-primary/35 hover:text-foreground")}>{indicator.name}</button>)}</div>
      </div> : null}

      {mode === "student" ? <div className="grid min-h-[610px] gap-4 lg:h-[680px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col rounded-2xl border border-[#d8e2f4] bg-white shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)]"><div className="border-b border-[#e8edf7] p-4"><div className="flex items-start justify-between gap-2"><div><h2 className="text-sm font-bold text-foreground">学生名单</h2><p className="mt-1 text-xs text-muted-foreground">优先处理未完成学生</p></div><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold tabular-nums text-primary">剩余 {roster.length - completedStudents} 人</span></div><div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><label className="sr-only" htmlFor="semester-evaluation-search">搜索学生</label><Input id="semester-evaluation-search" name="semester-evaluation-search" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索姓名或学号…" className="h-10 rounded-xl border-[#dbe3f4] bg-[#fbfcff] pl-9" /></div></div><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">{filteredRoster.map((student) => { const completed = isComplete(getRecord(student.id)); return <button key={student.id} type="button" onClick={() => setSelectedStudentId(student.id)} aria-pressed={student.id === selectedStudent?.id} className={cn("mb-1 flex min-h-12 w-full items-center gap-2 rounded-xl px-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", student.id === selectedStudent?.id ? "bg-primary/10 text-primary" : "hover:bg-[#f7f9ff]")}><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-foreground">{student.name}</span><span className="block text-[11px] tabular-nums text-muted-foreground">{student.studentNo}</span></span><span className={cn("rounded-full px-2 py-1 text-[11px] font-bold", completed ? "bg-[#eaf8f1] text-brand-green" : "bg-[#fff4e5] text-brand-orange")}>{completed ? "已完成" : "评价中"}</span></button>})}</div></aside>
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#d8e2f4] bg-white shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf7] px-5 py-4"><div><p className="text-xs text-muted-foreground">当前评价学生 · {selectedStudent?.studentNo}</p><h2 className="mt-1 text-xl font-bold text-foreground">{selectedStudent?.name}</h2></div><span className={cn("rounded-full px-3 py-1.5 text-xs font-bold", selectedStudent && isComplete(getRecord(selectedStudent.id)) ? "bg-[#eaf8f1] text-brand-green" : "bg-primary/10 text-primary")}>{selectedStudent && isComplete(getRecord(selectedStudent.id)) ? "已完成" : "评价中"}</span></div><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><div className="grid items-center gap-3 border-b border-[#e8edf7] bg-[#fbfcff] px-5 py-3 md:grid-cols-[minmax(190px,1fr)_minmax(340px,1.35fr)]"><div><p className="text-sm font-bold text-foreground">评价指标</p><p className="mt-1 text-xs text-muted-foreground">点击等级自动保存</p></div><LevelActions prefix="全部设为" onChoose={rateSelectedStudentAll} /></div>{INDICATORS.map((indicator, index) => <div key={indicator.id} className="grid items-center gap-3 border-b border-[#edf0f8] px-5 py-3 last:border-b-0 md:grid-cols-[minmax(190px,1fr)_minmax(340px,1.35fr)]"><div className="flex min-w-0 items-center gap-3"><span className="text-xs font-bold tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><p className="font-bold text-foreground">{indicator.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{indicator.description}</p></div></div><LevelActions selected={selectedStudent ? getRecord(selectedStudent.id)?.ratings[indicator.id] : undefined} onChoose={(level) => selectedStudent && setRating(selectedStudent.id, indicator.id, level)} /></div>)}</div><EvaluationFooter text={`已完成 ${completedStudents} 名学生 · 还剩 ${roster.length - completedStudents} 名待完成`} actionLabel="完成并评价下一位" onClick={advance} feedback={feedback} /></section>
      </div> : <section className="flex min-h-[610px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d8e2f4] bg-white shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] lg:h-[680px]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf7] px-5 py-4"><div><p className="text-xs text-muted-foreground">当前评价指标</p><h2 className="mt-1 text-xl font-bold text-foreground">{activeIndicator.name}</h2><p className="mt-1 text-xs text-muted-foreground">{activeIndicator.description}</p></div><span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold tabular-nums text-primary">已评价 {currentIndicatorCompleted} / {roster.length} 人</span></div><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><div className="grid items-center gap-3 border-b border-[#e8edf7] bg-[#fbfcff] px-5 py-3 md:grid-cols-[minmax(230px,1fr)_minmax(340px,1.35fr)]"><div><p className="text-sm font-bold text-foreground">班级学生</p><p className="mt-1 text-xs text-muted-foreground">可批量设置当前指标等级</p></div><LevelActions prefix="批量设为" onChoose={rateCurrentIndicatorAll} /></div>{roster.map((student, index) => <div key={student.id} className="grid items-center gap-3 border-b border-[#edf0f8] px-5 py-3 last:border-b-0 md:grid-cols-[minmax(230px,1fr)_minmax(340px,1.35fr)]"><div className="flex items-center gap-3"><span className="text-xs font-bold tabular-nums text-muted-foreground">{String(index +1).padStart(2, "0")}</span><div><p className="font-bold text-foreground">{student.name}</p><p className="mt-0.5 text-xs tabular-nums text-muted-foreground">学号 {student.studentNo}</p></div></div><LevelActions selected={getRecord(student.id)?.ratings[activeIndicator.id]} onChoose={(level) => setRating(student.id, activeIndicator.id, level)} /></div>)}</div><EvaluationFooter text={`当前指标已评价 ${currentIndicatorCompleted} 人，待评价 ${roster.length - currentIndicatorCompleted} 人`} actionLabel="提交并进入下一指标" onClick={advance} feedback={feedback} /></section>}

    </div>
  )
}

function LevelActions({ selected, onChoose, prefix }: { selected?: SemesterEvaluationLevel; onChoose: (level: SemesterEvaluationLevel) => void; prefix?: string }) {
  return <div className="grid grid-cols-4 gap-2">{LEVELS.map((level) => <button key={level} type="button" onClick={() => onChoose(level)} aria-pressed={selected === level} className={cn("min-h-11 rounded-xl border px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", ratingClass(level, selected === level))}>{prefix ? <span className="block text-[11px] font-medium opacity-80">{prefix}</span> : null}{level}</button>)}</div>
}

function EvaluationFooter({ text, actionLabel, onClick, feedback }: { text: string; actionLabel: string; onClick: () => void; feedback: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8edf7] bg-[#fbfcff] px-5 py-3"><div><p className="text-sm text-muted-foreground">{text}</p>{feedback ? <p className="mt-1 text-xs font-medium text-brand-green" role="status" aria-live="polite"><CheckCircle2 className="mr-1 inline size-3.5" aria-hidden="true" />{feedback}</p> : null}</div><Button onClick={onClick} className="h-11 rounded-xl px-4 shadow-[0_8px_18px_-12px_rgba(63,81,188,0.86)]">{actionLabel}<ChevronRight className="size-4" aria-hidden="true" /></Button></div>
}
