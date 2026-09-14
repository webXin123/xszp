"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Circle,
  FileSpreadsheet,
  HeartPulse,
  NotebookPen,
  Send,
  Upload,
  UsersRound,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { getSemesterRange, inRange } from "@/lib/points-utils"
import { PE_CLASSES, getSemesterLabel } from "@/lib/pe-scores"
import { readCommentRecords, type StudentCommentRecord } from "@/lib/comment-utils"
import { readSemesterEvaluationRecords, type SemesterEvaluationRecord } from "@/lib/semester-evaluation-utils"
import type { MainTab } from "../evaluation/evaluation-dashboard"
import styles from "../role-home.module.css"

const SCORE_ENTRY_TASKS_KEY = "mzlg-score-entry-tasks-v1"
const COMMENT_TASKS_KEY = "mzlg-comment-entry-tasks-v1"

type ProgressStatus = "未开始" | "录入中" | "已提交"
type AwardChartRange = "sevenDays" | "semester"

interface AwardTrendPoint {
  key: string
  label: string
  value: number
}

interface ScoreTaskCache {
  progress?: Array<{ teacher: string; classNames: string; status: ProgressStatus }>
}

interface CommentTaskCache {
  progress?: Array<{ teacherName: string; classNames: string; studentCount: number; status: ProgressStatus }>
}

interface SubjectDashboardProps {
  onNavigate: (tab: MainTab) => void
}

interface WorkClass {
  id: string
  name: string
  shortName?: string
  studentCount: number
}

interface ScoreClassProgress extends WorkClass {
  status: ProgressStatus
  completedFiles?: number
  totalFiles?: number
  uploadedGenders?: { male: boolean; female: boolean }
}

interface CommentClassProgress extends WorkClass {
  completedStudents: number
  status: ProgressStatus
}

function statusStyle(status: ProgressStatus) {
  if (status === "已提交") return "bg-[#eaf8f1] text-brand-green"
  if (status === "录入中") return "bg-[#eef2ff] text-primary"
  return "bg-[#fff4e5] text-brand-orange"
}

function statusLabel(status: ProgressStatus, type: "score" | "comment") {
  if (status === "已提交") return type === "score" ? "已上传" : "已完成"
  return type === "score" ? "待上传" : "待录入"
}

function ProgressBar({ value, total, tone = "primary" }: { value: number; total: number; tone?: "primary" | "green" | "purple" }) {
  const percent = total ? Math.round((value / total) * 100) : 0
  const color = tone === "green" ? "bg-brand-green" : tone === "purple" ? "bg-[#7166b3]" : "bg-primary"
  return <div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e7ebf8]"><div className={cn("h-full rounded-full transition-[width] duration-300", color)} style={{ width: `${percent}%` }} /></div><span className="w-10 text-right text-xs font-bold tabular-nums">{percent}%</span></div>
}

function commentCompleted(studentCount: number, status: ProgressStatus) {
  if (status === "已提交") return studentCount
  if (status === "录入中") return Math.max(1, Math.round(studentCount * 0.56))
  return 0
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatAwardTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function getRecentSevenDayRange(now = new Date()) {
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const start = startOfDay(now)
  start.setDate(start.getDate() - 6)
  return { start, end }
}

function AwardTrendChart({ points, title }: { points: AwardTrendPoint[]; title: string }) {
  const width = 640
  const height = 220
  const padding = { top: 18, right: 18, bottom: 38, left: 38 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const maxValue = Math.max(1, ...points.map((point) => point.value))
  const coordinates = points.map((point, index) => ({
    ...point,
    x: padding.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth),
    y: padding.top + chartHeight - (point.value / maxValue) * chartHeight,
  }))
  const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ")
  const areaPath = coordinates.length > 0 ? `${linePath} L ${coordinates.at(-1)!.x.toFixed(2)} ${height - padding.bottom} L ${coordinates[0].x.toFixed(2)} ${height - padding.bottom} Z` : ""
  const labelStep = Math.max(1, Math.ceil(points.length / 7))
  const titleId = `award-trend-${title.replace(/[^a-zA-Z0-9]+/g, "-")}`

  return <div className="mt-3 min-w-0 overflow-x-auto rounded-xl border border-[#e5e9f6] bg-[#fbfcff] px-2 pt-2 sm:px-3" role="img" aria-labelledby={titleId}>
    <span id={titleId} className="sr-only">{title}，纵轴为发放奖卡张数</span>
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full min-w-[520px]" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${titleId}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(63 81 188)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="rgb(63 81 188)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((ratio) => {
        const y = padding.top + chartHeight * ratio
        const value = Math.round(maxValue * (1 - ratio))
        return <g key={ratio}>
          <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e4e9f8" strokeDasharray="3 5" />
          <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-[#8b96b5] text-[11px]">{value}</text>
        </g>
      })}
      {areaPath && <path d={areaPath} fill={`url(#${titleId}-fill)`} />}
      {linePath && <path d={linePath} fill="none" stroke="#3f51bc" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />}
      {coordinates.map((point, index) => <g key={point.key}>
        <circle cx={point.x} cy={point.y} r="4" fill="#ffffff" stroke="#3f51bc" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {(index % labelStep === 0 || index === coordinates.length - 1) && <text x={point.x} y={height - 13} textAnchor="middle" className="fill-[#8b96b5] text-[11px]">{point.label}</text>}
      </g>)}
    </svg>
  </div>
}

export function SubjectDashboard({ onNavigate }: SubjectDashboardProps) {
  const { awardCards, currentTeacher, peScoreUploads, classes, students } = useEvaluation()
  const { role, awardClasses, peClassIds } = usePermission()
  const [chartRange, setChartRange] = useState<AwardChartRange>("sevenDays")
  const [scoreTasks, setScoreTasks] = useState<ScoreTaskCache[]>([])
  const [commentTasks, setCommentTasks] = useState<CommentTaskCache[]>([])
  const [commentRecords, setCommentRecords] = useState<StudentCommentRecord[]>([])
  const [evaluationRecords, setEvaluationRecords] = useState<SemesterEvaluationRecord[]>([])

  const isPe = role === "pe_teacher"
  const teacher = currentTeacher!

  useEffect(() => {
    try {
      const cachedScore = JSON.parse(localStorage.getItem(SCORE_ENTRY_TASKS_KEY) ?? "[]")
      const cachedComment = JSON.parse(localStorage.getItem(COMMENT_TASKS_KEY) ?? "[]")
      setScoreTasks(Array.isArray(cachedScore) ? cachedScore : [])
      setCommentTasks(Array.isArray(cachedComment) ? cachedComment : [])
      setCommentRecords(readCommentRecords())
      setEvaluationRecords(readSemesterEvaluationRecords())
    } catch {
      setScoreTasks([])
      setCommentTasks([])
    }
  }, [])

  const myAwardCards = useMemo(() => awardCards.filter((card) => card.operatorId === teacher.id), [awardCards, teacher.id])
  const recentWeekCards = useMemo(() => {
    const recentRange = getRecentSevenDayRange(new Date())
    return myAwardCards.filter((card) => inRange(card.createdAt, recentRange.start, recentRange.end)).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [myAwardCards])
  const recentWeekPoints = recentWeekCards.reduce((sum, card) => sum + card.points, 0)
  const recentCardsLoadMore = useLoadMore(recentWeekCards, 6)
  const recentCardsScroll = useScrollLoadMore(recentCardsLoadMore.hasMore, recentCardsLoadMore.loadMore)
  const trendPoints = useMemo<AwardTrendPoint[]>(() => {
    const now = new Date()
    if (chartRange === "sevenDays") {
      const start = getRecentSevenDayRange(now).start
      return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(start)
        day.setDate(start.getDate() + index)
        const key = dateKey(day)
        return {
          key,
          label: `${day.getMonth() + 1}/${day.getDate()}`,
          value: myAwardCards.filter((card) => dateKey(new Date(card.createdAt)) === key).length,
        }
      })
    }

    const semesterStart = startOfDay(getSemesterRange(now).start)
    const currentDay = startOfDay(now)
    const elapsedDays = Math.max(0, Math.floor((currentDay.getTime() - semesterStart.getTime()) / DAY_MS))
    const weekCount = Math.max(1, Math.floor(elapsedDays / 7) + 1)
    return Array.from({ length: weekCount }, (_, index) => {
      const weekStart = new Date(semesterStart)
      weekStart.setDate(semesterStart.getDate() + index * 7)
      const nextWeekStart = new Date(weekStart)
      nextWeekStart.setDate(weekStart.getDate() + 7)
      return {
        key: `semester-week-${index + 1}`,
        label: `第${index + 1}周`,
        value: myAwardCards.filter((card) => {
          const createdAt = new Date(card.createdAt).getTime()
          return createdAt >= weekStart.getTime() && createdAt < nextWeekStart.getTime()
        }).length,
      }
    })
  }, [chartRange, myAwardCards])
  const trendTotal = trendPoints.reduce((sum, point) => sum + point.value, 0)
  const classNameById = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes])

  const workClasses = useMemo<WorkClass[]>(() => {
    if (isPe) return PE_CLASSES.filter((item) => peClassIds.includes(item.id)).map((item) => ({ id: item.id, name: item.name, studentCount: item.maleCount + item.femaleCount }))
    return awardClasses.map((item) => ({ id: item.id, name: item.name, shortName: item.shortName, studentCount: classes.find((schoolClass) => schoolClass.id === item.id)?.studentCount ?? 0 }))
  }, [awardClasses, classes, isPe, peClassIds])

  const scoreProgress = useMemo<ScoreClassProgress[]>(() => {
    if (isPe) {
      return workClasses.map((item) => {
        const uploadedGenders = {
          male: peScoreUploads.some((upload) => upload.classId === item.id && upload.gender === "male"),
          female: peScoreUploads.some((upload) => upload.classId === item.id && upload.gender === "female"),
        }
        const uploaded = Number(uploadedGenders.male) + Number(uploadedGenders.female)
        return { ...item, completedFiles: uploaded, totalFiles: 2, uploadedGenders, status: uploaded === 2 ? "已提交" : uploaded > 0 ? "录入中" : "未开始" }
      })
    }
    const entries = scoreTasks.flatMap((task) => task.progress ?? []).filter((item) => item.teacher === teacher.name)
    return workClasses.map((item, index) => {
      const matched = entries.find((entry) => entry.classNames.split("、").includes(item.name))
      return { ...item, status: matched?.status ?? (index === 0 ? "录入中" : "未开始") }
    })
  }, [isPe, peScoreUploads, scoreTasks, teacher.name, workClasses])

  const commentProgress = useMemo<CommentClassProgress[]>(() => {
    const entries = commentTasks.flatMap((task) => task.progress ?? []).filter((item) => item.teacherName.startsWith(teacher.name))
    return workClasses.map((item, index) => {
      const savedForClass = commentRecords.filter((record) => record.teacherId === teacher.id && record.classId === item.id && record.comment.trim())
      const matched = entries.find((entry) => entry.classNames.split("、").some((name) => name === item.name || name === item.shortName))
      const studentCount = matched && matched.classNames.split("、").length === 1 ? matched.studentCount : item.studentCount
      const fallbackStatus = matched?.status ?? (index === 0 ? "录入中" : "未开始")
      const completedStudents = savedForClass.length > 0 ? savedForClass.length : commentCompleted(studentCount, fallbackStatus)
      const status = completedStudents >= studentCount ? "已提交" : completedStudents > 0 ? "录入中" : "未开始"
      return { ...item, studentCount, status, completedStudents }
    })
  }, [commentRecords, commentTasks, teacher.id, teacher.name, teacher.role, workClasses])

  const pendingScoreClasses = scoreProgress.filter((item) => item.status !== "已提交")
  const commentCompletedStudents = commentProgress.reduce((sum, item) => sum + item.completedStudents, 0)
  const pendingCommentClasses = commentProgress.filter((item) => item.completedStudents < item.studentCount)
  const evaluationProgress = useMemo(() => workClasses.map((item) => {
    const roster = students.filter((student) => student.classId === item.id)
    const completed = roster.filter((student) => evaluationRecords.some((record) => record.teacherId === teacher.id && record.classId === item.id && record.studentId === student.id && Object.keys(record.ratings).length >= 10)).length
    return { ...item, completed, total: roster.length || item.studentCount }
  }), [evaluationRecords, students, teacher.id, workClasses])
  const pendingEvaluationClasses = evaluationProgress.filter((item) => item.completed < item.total)

  const scoreHref = isPe ? "/pe-score-import" : "/score-entry"

  return <div className={cn("-m-4 flex flex-col gap-4 p-4 sm:-m-6 sm:gap-5 sm:p-6", styles.teacherHome, styles.subjectHome)}>
    <section className="overflow-hidden rounded-2xl border border-[#cbd6f7] border-t-[3px] border-t-primary bg-white shadow-[0_18px_38px_-30px_rgba(48,62,139,0.72)]" aria-label="任课教师工作概览">
      <div className="grid xl:grid-cols-[minmax(270px,0.68fr)_minmax(0,1.32fr)]">
        <div className="bg-[linear-gradient(135deg,#f5f7ff_0%,#ffffff_72%)] p-5 sm:p-6 xl:border-r xl:border-[#e4e9f8]">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary">教师工作台</p><h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">{isPe ? "体育教师首页" : "任课教师首页"}</h1>
          <div className="mt-6 min-w-0"><p className="truncate text-base font-bold text-foreground">{teacher.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{workClasses.map((item) => item.name).join("、") || "暂无任教班级"}</p><span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">本周工作概览</span></div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-foreground">本学期待办</p>
              <p className="mt-1 text-xs text-muted-foreground">任务较多时可在列表中继续查看</p>
            </div>
            <span className="inline-flex min-h-8 shrink-0 items-center rounded-lg bg-[#fff1e9] px-2.5 text-xs font-bold tabular-nums text-brand-orange">{pendingScoreClasses.length + pendingCommentClasses.length + pendingEvaluationClasses.length} 项待处理</span>
          </div>
          <div tabIndex={0} className="mt-3 max-h-36 space-y-2 overflow-y-auto overscroll-contain pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" aria-label="本学期待办列表">
            <TodoSummary href={scoreHref} icon={FileSpreadsheet} tone="green" title={isPe ? "体质健康上传" : "成绩上传"} value={`${pendingScoreClasses.length} 个班级待处理`} description={pendingScoreClasses.length ? pendingScoreClasses.map((item) => item.name).join("、") : "所有班级均已上传"} />
            <TodoSummary href="/comment-entry" icon={NotebookPen} tone="purple" title="评语录入" value={`${pendingCommentClasses.length} 个班级待处理`} description={pendingCommentClasses.length ? pendingCommentClasses.map((item) => item.name).join("、") : "本学期评语已完成"} />
            <TodoSummary href="/semester-evaluation" icon={ClipboardCheck} tone="blue" title="学期评价" value={`${pendingEvaluationClasses.length} 个班级待处理`} description={pendingEvaluationClasses.length ? pendingEvaluationClasses.map((item) => item.name).join("、") : "本学期评价已完成"} />
          </div>
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-[#cbd6f7] bg-white p-5 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-6" aria-labelledby="teacher-work-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="teacher-work-title" className="text-base font-bold text-foreground">{isPe ? "本学期工作进度" : "我发放的奖卡"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{isPe ? "体质健康上传按班级统计" : "查看最近七天明细与本学期发放趋势"}</p>
        </div>
        <button type="button" onClick={() => onNavigate("award")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><Send className="size-3.5" aria-hidden="true" />去发卡<ArrowRight className="size-3.5" aria-hidden="true" /></button>
      </div>
      {isPe ? <div className="mt-4"><PeUploadProgressCard items={scoreProgress} href={scoreHref} /></div> : <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="min-w-0 rounded-xl border border-[#e1e6f5] bg-[#fbfcff] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-bold text-foreground">奖卡发放趋势</p><p className="mt-1 text-xs text-muted-foreground">按{chartRange === "sevenDays" ? "日期" : "学期周次"}统计发放张数</p></div>
            <div className="flex rounded-xl border border-[#d8e0f7] bg-white p-1" role="tablist" aria-label="奖卡趋势时间范围">
              {([{ value: "sevenDays", label: "最近7天" }, { value: "semester", label: "本学期" }] as Array<{ value: AwardChartRange; label: string }>).map((item) => <button key={item.value} type="button" role="tab" aria-selected={chartRange === item.value} onClick={() => setChartRange(item.value)} className={cn("min-h-8 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", chartRange === item.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>{item.label}</button>)}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2"><span className="text-2xl font-bold tabular-nums text-foreground">{trendTotal}</span><span className="text-xs text-muted-foreground">{chartRange === "sevenDays" ? "最近7天发放张数" : "本学期累计发放张数"}</span></div>
          <AwardTrendChart points={trendPoints} title={chartRange === "sevenDays" ? "最近7天奖卡发放趋势" : "本学期奖卡发放趋势"} />
        </div>
        <div className="flex min-h-[330px] min-w-0 flex-col rounded-xl border border-[#e1e6f5] bg-[#fbfcff] p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-foreground">最近七天发放明细</p><p className="mt-1 text-xs text-muted-foreground">共 {recentWeekCards.length} 张 · 累计 {recentWeekPoints} 分</p></div><span className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">按创建时间倒序</span></div>
          {recentWeekCards.length === 0 ? <div className="mt-4 flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#d5def5] px-3 text-center text-sm text-muted-foreground">最近七天暂无奖卡发放记录</div> : <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-[#e6eaf6] bg-white"><div className="grid grid-cols-[76px_minmax(0,1fr)_48px] gap-2 border-b border-[#edf0fa] px-3 py-2 text-[11px] font-semibold text-muted-foreground"><span>获得时间</span><span>学生 / 班级</span><span className="text-right">分值</span></div><ul tabIndex={0} aria-label="最近七天发放的奖卡列表" className="max-h-[300px] overflow-y-auto px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" onScroll={recentCardsScroll.onScroll}>{recentCardsLoadMore.visible.map((card) => <li key={card.id} className="grid grid-cols-[76px_minmax(0,1fr)_48px] items-center gap-2 border-b border-[#edf0fa] py-2.5 last:border-0"><time dateTime={card.createdAt} className="text-[11px] tabular-nums text-muted-foreground">{formatAwardTime(card.createdAt)}</time><span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground">{card.studentName}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{classNameById.get(card.classId) ?? "未命名班级"}</span></span><span className="text-right text-xs font-bold tabular-nums text-brand-green">+{card.points}</span></li>)}<li><LoadMoreFooter hasMore={recentCardsLoadMore.hasMore} loaded={recentCardsLoadMore.visible.length} total={recentCardsLoadMore.total} onLoadMore={recentCardsLoadMore.loadMore} /></li></ul></div>}
        </div>
      </div>}
    </section>
  </div>
}

function PeUploadProgressCard({ items, href }: { items: ScoreClassProgress[]; href: string }) {
  const totalFiles = items.reduce((sum, item) => sum + (item.totalFiles ?? 2), 0)
  const uploadedFiles = items.reduce((sum, item) => sum + (item.completedFiles ?? 0), 0)
  const percentage = totalFiles ? Math.round((uploadedFiles / totalFiles) * 100) : 0
  const genderFiles = [
    { key: "male" as const, label: "男生" },
    { key: "female" as const, label: "女生" },
  ]

  return <section className="min-w-0 rounded-xl border border-[#d6e9e2] bg-[#fbfefd] p-4" aria-labelledby="pe-upload-progress-title">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e4f6ef] text-brand-green"><HeartPulse className="size-4.5" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h3 id="pe-upload-progress-title" className="text-sm font-bold text-foreground">本学期体质健康上传进度</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{getSemesterLabel()} · 按班级查看男女生文件</p>
        </div>
      </div>
      <Link href={href} className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-bold text-brand-green transition-colors hover:bg-[#eaf8f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40">去上传<ArrowRight className="size-3.5" aria-hidden="true" /></Link>
    </div>

    <div className="mt-4 rounded-xl border border-[#dcefe7] bg-[linear-gradient(135deg,#f0fbf6_0%,#ffffff_88%)] p-3" aria-label={`体质健康成绩已上传 ${uploadedFiles} / ${totalFiles} 份文件`}>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5"><span className="text-2xl font-bold tabular-nums text-foreground">{uploadedFiles}</span><span className="text-xs text-muted-foreground">/ {totalFiles} 份文件已上传</span></div>
        <span className="text-sm font-bold tabular-nums text-brand-green">{percentage}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dfeee8]" role="progressbar" aria-label="本学期体质健康总体上传进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <div className="h-full rounded-full bg-brand-green transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">每个班级需上传男生、女生各 1 份成绩文件</p>
    </div>

    <div className="mt-4 grid gap-2.5 sm:grid-cols-2" aria-label="各班级体质健康成绩上传情况">
      {items.map((item) => {
        const uploaded = item.completedFiles ?? 0
        const complete = uploaded === (item.totalFiles ?? 2)
        return <article key={item.id} className="rounded-xl border border-[#e1eee9] bg-white p-3 transition-colors hover:border-[#abd9c7]">
          <div className="flex items-center justify-between gap-2">
            <h4 className="min-w-0 truncate text-sm font-bold text-foreground">{item.name}</h4>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{uploaded} / {item.totalFiles ?? 2}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", complete ? "bg-[#eaf8f1] text-brand-green" : uploaded > 0 ? "bg-[#fff4e5] text-brand-orange" : "bg-[#f1f3f8] text-muted-foreground")}>
                {complete ? "已完成" : uploaded > 0 ? "部分上传" : "待上传"}
              </span>
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label={`${item.name} 男女生文件上传情况`}>
            {genderFiles.map((file) => {
              const isUploaded = item.uploadedGenders?.[file.key] ?? false
              return <div key={file.key} className={cn("flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs", isUploaded ? "bg-[#f1fbf6] text-brand-green" : "bg-[#f7f8fb] text-muted-foreground")} aria-label={`${item.name}${file.label}${isUploaded ? "已上传" : "待上传"}`}>
                {isUploaded ? <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" /> : <Circle className="size-3.5 shrink-0" aria-hidden="true" />}
                <span>{file.label}</span><span className="ml-auto text-[11px]">{isUploaded ? "已上传" : "待上传"}</span>
              </div>
            })}
          </div>
        </article>
      })}
    </div>
  </section>
}

function TodoSummary({ icon: Icon, tone, title, value, description, href }: { icon: typeof Upload; tone: "green" | "purple" | "blue"; title: string; value: string; description: string; href: string }) {
  const toneClass = tone === "green" ? "bg-[#eaf8f1] text-brand-green" : tone === "purple" ? "bg-[#f2f0ff] text-[#7166b3]" : "bg-primary/10 text-primary"
  return <Link href={href} className="group flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl border border-[#e1e6f5] bg-[#fbfcff] px-3 py-2 transition-colors hover:border-primary/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", toneClass)}><Icon className="size-3.5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-2"><span className="truncate text-xs font-semibold text-foreground">{title}</span><span className="shrink-0 text-xs font-bold tabular-nums text-primary">{value}</span></span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{description}</span></span><ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-hover:translate-x-0.5" aria-hidden="true" /></Link>
}

function ProgressSummary({ icon: Icon, tone, title, completed, total, href }: { icon: typeof Upload; tone: "green" | "purple"; title: string; completed: number; total: number; href: string }) {
  const percentage = total ? Math.round((completed / total) * 100) : 0
  return <Link href={href} className="group min-w-0 rounded-xl border border-[#e5e9f6] bg-[#fbfcff] p-3 transition-colors hover:border-primary/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><div className="flex items-center gap-2"><span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", tone === "green" ? "bg-[#eaf8f1] text-brand-green" : "bg-[#f2f0ff] text-[#7166b3]")}><Icon className="size-3.5" aria-hidden="true" /></span><span className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">{title}</span><ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-hover:translate-x-0.5" aria-hidden="true" /></div><div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7ebf8]"><div className={cn("h-full rounded-full transition-[width] duration-300", tone === "green" ? "bg-brand-green" : "bg-[#7166b3]")} style={{ width: `${percentage}%` }} /></div><span className="w-10 text-right text-xs font-bold tabular-nums text-foreground">{percentage}%</span></div><p className="mt-1 text-[11px] text-muted-foreground">已完成 {completed} / {total}</p></Link>
}

function TaskProgressCard({ title, description, icon: Icon, tone, completed, total, unit, items, action }: { title: string; description: string; icon: typeof Upload; tone: "green" | "purple"; completed: number; total: number; unit: string; items: Array<{ id: string; name: string; status: ProgressStatus; meta: string }>; action?: React.ReactNode }) {
  const toneClass = tone === "green" ? "bg-[#eaf8f1] text-brand-green" : "bg-[#f2f0ff] text-[#7166b3]"
  return <section className={cn("flex h-[330px] min-h-0 flex-col rounded-2xl border border-[#cbd6f7] border-t-2 bg-white p-5 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-6", tone === "green" ? "border-t-brand-green" : "border-t-[#7166b3]")} aria-label={title}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", toneClass)}><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><h2 className="text-base font-bold text-foreground">{title}</h2><p className="mt-1 truncate text-xs text-muted-foreground">{description}</p></div></div>{action}</div><div className="mt-4"><div className="mb-2 flex items-baseline justify-between gap-3"><span className="text-xs text-muted-foreground">已完成 <strong className="font-bold tabular-nums text-foreground">{completed}</strong> / {total} {unit}</span><span className={cn("text-xs font-bold tabular-nums", tone === "green" ? "text-brand-green" : "text-[#7166b3]")}>{total ? Math.round((completed / total) * 100) : 0}%</span></div><ProgressBar value={completed} total={total} tone={tone === "green" ? "green" : "purple"} /></div><ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">{items.map((item) => <li key={item.id} className="flex items-center gap-2.5 rounded-xl border border-[#e5e9f6] bg-[#fbfcff] px-3 py-2.5"><span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", item.status === "已提交" ? "bg-[#eaf8f1] text-brand-green" : "bg-[#fff4e5] text-brand-orange")}>{item.status === "已提交" ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{item.name}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.meta}</span></span><span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", statusStyle(item.status))}>{statusLabel(item.status, title.includes("成绩") ? "score" : "comment")}</span></li>)}</ul></section>
}
