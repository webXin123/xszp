"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Award,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Circle,
  FileSpreadsheet,
  HeartPulse,
  NotebookPen,
  PieChart,
  Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { inRange } from "@/lib/points-utils"
import { PE_CLASSES, getSemesterLabel } from "@/lib/pe-scores"
import { getISOWeekKey } from "@/lib/scoring-utils"
import { readCommentRecords, type StudentCommentRecord } from "@/lib/comment-utils"
import { readSemesterEvaluationRecords, type SemesterEvaluationRecord } from "@/lib/semester-evaluation-utils"
import { AWARD_LEVEL1_LIST, getFiveEducationLevel1 } from "@/lib/award-utils"
import type { AwardCardRecord } from "@/lib/types"
import type { MainTab } from "../evaluation/evaluation-dashboard"
import styles from "../role-home.module.css"

const SCORE_ENTRY_TASKS_KEY = "mzlg-score-entry-tasks-v2"
const COMMENT_TASKS_KEY = "mzlg-comment-entry-tasks-v1"

type ProgressStatus = "未开始" | "录入中" | "已提交"
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

function commentCompleted(studentCount: number, status: ProgressStatus) {
  if (status === "已提交") return studentCount
  if (status === "录入中") return Math.max(1, Math.round(studentCount * 0.56))
  return 0
}

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function formatAwardTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date)
}

function getRecentSevenDayRange(now = new Date()) {
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const start = startOfDay(now)
  start.setDate(start.getDate() - 6)
  return { start, end }
}

const AWARD_PIE_COLORS = ["#6f86e8", "#63b58f", "#dfa25f", "#9a86d5", "#df8c78"]

function MiniAwardPie({ title, description, cards }: { title: string; description: string; cards: Array<{ level1: string }> }) {
  const distribution = AWARD_LEVEL1_LIST.map((level1) => ({ level1, count: cards.filter((card) => getFiveEducationLevel1(card.level1) === level1).length })).filter((item) => item.count > 0)
  const total = distribution.reduce((sum, item) => sum + item.count, 0)
  let cursor = 0
  const slices = distribution.map((item, index) => {
    const start = cursor
    cursor += (item.count / total) * 100
    return { ...item, index, start, end: cursor }
  })
  const gap = total > 0 ? Math.min(1.8, 100 / slices.length * 0.18) : 0
  const distributionLabel = distribution.map((item) => `${item.level1}${item.count}张`).join("、") || "暂无发放记录"
  const gradient = total > 0
    ? [`#ffffff 0% ${gap / 2}%`, ...slices.flatMap((item) => {
      const segmentStart = item.start + gap / 2
      const segmentEnd = item.end - gap / 2
      return [
        `${AWARD_PIE_COLORS[item.index % AWARD_PIE_COLORS.length]} ${segmentStart}% ${Math.max(segmentStart, segmentEnd)}%`,
        `#ffffff ${Math.max(segmentStart, segmentEnd)}% ${item.end + gap / 2}%`,
      ]
    })].join(", ")
    : "#edf1f8 0% 100%"

  return <article className="min-h-[390px] min-w-0 rounded-2xl border border-[#dce4f6] bg-[linear-gradient(145deg,#fbfcff_0%,#f4f7ff_100%)] p-5 shadow-[0_14px_28px_-24px_rgba(45,62,139,0.6)] sm:p-6" aria-label={`${title}：${total} 张`}>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><PieChart className="size-4.5 shrink-0 text-primary" aria-hidden="true" /><h3 className="truncate text-sm font-bold text-foreground sm:text-base">{title}</h3></div><p className="mt-1.5 truncate text-xs text-muted-foreground">{description}</p></div><span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold tabular-nums text-primary">{total} 张</span></div>
    <div className="relative mx-auto mt-3 size-[270px] max-w-full sm:size-[292px]" role="img" aria-label={`${title}共 ${total} 张，${distributionLabel}`}>
      <div className="absolute left-1/2 top-1/2 flex size-[172px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full p-1 shadow-[0_12px_24px_-18px_rgba(63,81,188,0.7)] sm:size-[190px]" style={{ background: `conic-gradient(from -90deg, ${gradient})` }}>
        <div className="flex size-full items-center justify-center rounded-full border border-white/80 bg-white/60 p-1 backdrop-blur-[1px]"><div className="flex size-[108px] flex-col items-center justify-center rounded-full border border-[#e4e9f8] bg-white shadow-[0_8px_18px_-16px_rgba(45,62,139,0.8)] sm:size-[120px]"><span className="text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-[30px]">{total}</span><span className="mt-0.5 text-[11px] font-medium text-muted-foreground">张奖卡</span></div></div>
      </div>
      {slices.map((item) => {
        const angle = ((item.start + item.end) / 2 / 100) * Math.PI * 2 - Math.PI / 2
        const left = 50 + Math.cos(angle) * 44
        const top = 50 + Math.sin(angle) * 44
        return <span key={item.level1} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-white/80 px-1 text-center text-[11px] leading-4 text-[#60718b] shadow-[0_4px_10px_-9px_rgba(45,62,139,0.7)]" style={{ left: `${left}%`, top: `${top}%` }}>{item.level1}<br /><strong className="font-semibold text-foreground">{item.count} 张</strong></span>
      })}
    </div>
    {distribution.length > 0 ? <ul className="mx-auto flex max-w-[330px] flex-wrap justify-center gap-x-4 gap-y-2 border-t border-[#e6eaf6] pt-3">{slices.map((item) => <li key={item.level1} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: AWARD_PIE_COLORS[item.index % AWARD_PIE_COLORS.length] }} aria-hidden="true" /><span>{item.level1}</span></li>)}</ul> : <p className="mt-2 text-center text-xs text-muted-foreground">暂无发放记录</p>}
  </article>
}

export function SubjectDashboard({ onNavigate }: SubjectDashboardProps) {
  const { awardCards, currentTeacher, peScoreUploads, classes, students } = useEvaluation()
  const { role, awardClasses, peClassIds } = usePermission()
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
  const recentCardsLoadMore = useLoadMore(recentWeekCards, 5)
  const recentCardsScroll = useScrollLoadMore(recentCardsLoadMore.hasMore, recentCardsLoadMore.loadMore)
  const currentWeekKey = getISOWeekKey(new Date())
  const onlineWeekCards = useMemo(() => myAwardCards.filter((card) => card.source === "online" && card.weekKey === currentWeekKey), [currentWeekKey, myAwardCards])
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
  const pendingCommentClasses = commentProgress.filter((item) => item.completedStudents < item.studentCount)
  const evaluationProgress = useMemo(() => workClasses.map((item) => {
    const roster = students.filter((student) => student.classId === item.id)
    const completed = roster.filter((student) => evaluationRecords.some((record) => record.teacherId === teacher.id && record.classId === item.id && record.studentId === student.id && Object.keys(record.ratings).length >= 10)).length
    return { ...item, completed, total: roster.length || item.studentCount }
  }), [evaluationRecords, students, teacher.id, workClasses])
  const pendingEvaluationClasses = evaluationProgress.filter((item) => item.completed < item.total)

  const scoreHref = isPe ? "/pe-score-import" : "/score-entry"
  const teachingSubjects = teacher.teachingSubjects ?? []
  const todoCount = pendingScoreClasses.length + pendingCommentClasses.length + pendingEvaluationClasses.length
  const scoreCompleted = scoreProgress.filter((item) => item.status === "已提交").length
  const commentCompletedStudents = commentProgress.reduce((sum, item) => sum + item.completedStudents, 0)
  const commentTotalStudents = commentProgress.reduce((sum, item) => sum + item.studentCount, 0)
  const evaluationCompleted = evaluationProgress.reduce((sum, item) => sum + item.completed, 0)
  const evaluationTotal = evaluationProgress.reduce((sum, item) => sum + item.total, 0)

  return <div className={cn("-m-4 flex flex-col gap-4 p-4 sm:-m-6 sm:gap-5 sm:p-6", styles.teacherHome, styles.subjectHome)}>
    <section className="overflow-hidden rounded-2xl border border-[#cbd6f7] border-t-[3px] border-t-primary bg-white shadow-[0_18px_38px_-30px_rgba(48,62,139,0.72)]" aria-label="任课教师工作台">
      <div className="bg-[linear-gradient(135deg,#f5f7ff_0%,#ffffff_72%)] px-4 py-3.5 sm:px-5 sm:py-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary">教师工作台</p><h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">{isPe ? "体育教师首页" : "任课教师首页"}</h1>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-base font-bold text-foreground">{teacher.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{workClasses.map((item) => item.name).join("、") || "暂无任教班级"}</p></div><span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">本周工作概览</span></div>
      </div>
    </section>

    <section className="rounded-2xl border border-[#cbd6f7] border-t-2 border-t-brand-orange bg-white p-5 shadow-[0_16px_34px_-28px_rgba(48,62,139,0.7)] sm:p-6" aria-labelledby="teacher-todo-title">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-xl bg-[#fff1e9] text-brand-orange"><ClipboardCheck className="size-4.5" aria-hidden="true" /></span><div><h2 id="teacher-todo-title" className="text-base font-bold text-foreground">待办事项</h2><p className="mt-1 text-xs text-muted-foreground">优先处理当前学期尚未完成的工作</p></div></div><span className="inline-flex min-h-8 shrink-0 items-center rounded-lg bg-[#fff1e9] px-2.5 text-xs font-bold tabular-nums text-brand-orange">{todoCount} 项待处理</span></div>
      <div className="mt-4 grid gap-3 md:grid-cols-3" aria-label="本学期待办列表">
        <TodoSummary href={scoreHref} icon={FileSpreadsheet} tone="green" title={isPe ? "体质健康上传" : "成绩上传"} completed={scoreCompleted} total={scoreProgress.length} unit="班级" />
        <TodoSummary href="/comment-entry" icon={NotebookPen} tone="purple" title="评语录入" completed={commentCompletedStudents} total={commentTotalStudents} unit="名学生" />
        <TodoSummary href="/semester-evaluation" icon={ClipboardCheck} tone="blue" title="学期评价" completed={evaluationCompleted} total={evaluationTotal} unit="名学生" />
      </div>
    </section>

    {isPe ? <section className="rounded-2xl border border-[#cbd6f7] bg-white p-5 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-6" aria-labelledby="teacher-work-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="teacher-work-title" className="text-base font-bold text-foreground">本学期工作进度</h2><p className="mt-1 text-xs text-muted-foreground">体质健康上传按班级统计</p></div><Link href={scoreHref} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><Upload className="size-3.5" aria-hidden="true" />去上传<ArrowRight className="size-3.5" aria-hidden="true" /></Link></div><div className="mt-4"><PeUploadProgressCard items={scoreProgress} href={scoreHref} /></div></section> : <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.42fr)]"><SubjectScoreUploadCard items={scoreProgress} subjects={teachingSubjects} href={scoreHref} /><section className="rounded-2xl border border-[#cbd6f7] bg-white p-5 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-6" aria-labelledby="award-insights-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="award-insights-title" className="text-base font-bold text-foreground">奖卡发放概览</h2><p className="mt-1 text-xs text-muted-foreground">最近七天发卡明细与本周线上发卡分布</p></div><button type="button" onClick={() => onNavigate("award")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><Award className="size-3.5" aria-hidden="true" />去发卡<ArrowRight className="size-3.5" aria-hidden="true" /></button></div><div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(380px,1fr)]"><RecentAwardDetailList cards={recentWeekCards} classNameById={classNameById} visibleCards={recentCardsLoadMore.visible} hasMore={recentCardsLoadMore.hasMore} loaded={recentCardsLoadMore.visible.length} total={recentCardsLoadMore.total} onLoadMore={recentCardsLoadMore.loadMore} onScroll={recentCardsScroll.onScroll} /><MiniAwardPie title="本周线上发卡一级指标分布" description={`共 ${onlineWeekCards.length} 张 · 仅统计线上发卡`} cards={onlineWeekCards} /></div></section></div>}
  </div>
}

function RecentAwardDetailList({ cards, classNameById, visibleCards, hasMore, loaded, total, onLoadMore, onScroll }: { cards: AwardCardRecord[]; classNameById: Map<string, string>; visibleCards: AwardCardRecord[]; hasMore: boolean; loaded: number; total: number; onLoadMore: () => void; onScroll: (event: React.UIEvent<HTMLUListElement>) => void }) {
  return <article className="min-w-0 rounded-xl border border-[#e1e6f5] bg-[#fbfcff] p-4" aria-labelledby="recent-award-detail-title">
    <div className="flex items-center justify-between gap-3"><div><h3 id="recent-award-detail-title" className="text-sm font-bold text-foreground">最近一周发卡明细</h3><p className="mt-1 text-[11px] text-muted-foreground">按发放时间倒序展示</p></div><span className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold tabular-nums text-primary">{cards.length} 张</span></div>
    {visibleCards.length > 0 ? <ul tabIndex={0} aria-label="最近一周发卡明细" onScroll={onScroll} className="mt-3 max-h-[360px] divide-y divide-[#edf0fa] overflow-y-auto overscroll-contain rounded-lg border border-[#e6eaf6] bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{visibleCards.map((card) => <li key={card.id} className="flex min-w-0 items-center gap-2.5 py-2.5"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#fff1e9] text-brand-orange"><Award className="size-3.5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-foreground">{card.studentName}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{classNameById.get(card.classId) ?? "未命名班级"} · {getFiveEducationLevel1(card.level1)}</span></span><span className="shrink-0 text-right"><span className="block text-xs font-bold tabular-nums text-brand-green">+{card.points}</span><time dateTime={card.createdAt} className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground">{formatAwardTime(card.createdAt)}</time></span></li>)}<li><LoadMoreFooter hasMore={hasMore} loaded={loaded} total={total} onLoadMore={onLoadMore} /></li></ul> : <div className="mt-3 rounded-lg border border-dashed border-[#d5def5] px-3 py-5 text-center text-xs text-muted-foreground">最近一周暂无发卡记录</div>}
  </article>
}

function PeUploadProgressCard({ items, href }: { items: ScoreClassProgress[]; href: string }) {
  const totalFiles = items.reduce((sum, item) => sum + (item.totalFiles ?? 2), 0)
  const uploadedFiles = items.reduce((sum, item) => sum + (item.completedFiles ?? 0), 0)
  const percentage = totalFiles ? Math.round((uploadedFiles / totalFiles) * 100) : 0
  const genderFiles = [
    { key: "male" as const, label: "男生" },
    { key: "female" as const, label: "女生" },
  ]

  return <section className="min-w-0 rounded-xl border border-[#dfe8e5] bg-[#fdfefe] p-5" aria-labelledby="pe-upload-progress-title">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#edf5f2] text-[#497c69]"><HeartPulse className="size-4.5" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h3 id="pe-upload-progress-title" className="text-sm font-bold text-foreground">本学期体质健康上传进度</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{getSemesterLabel()} · 按班级查看男女生文件</p>
        </div>
      </div>
      <Link href={href} className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-bold text-[#497c69] transition-colors hover:bg-[#edf5f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#729988]/45">去上传<ArrowRight className="size-3.5" aria-hidden="true" /></Link>
    </div>

    <div className="mt-5 rounded-xl border border-[#e0e9e5] bg-[linear-gradient(135deg,#f6faf8_0%,#ffffff_88%)] p-3.5" aria-label={`体质健康成绩已上传 ${uploadedFiles} / ${totalFiles} 份文件`}>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5"><span className="text-2xl font-bold tabular-nums text-foreground">{uploadedFiles}</span><span className="text-xs text-muted-foreground">/ {totalFiles} 份文件已上传</span></div>
        <span className="text-sm font-bold tabular-nums text-[#497c69]">{percentage}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5eee9]" role="progressbar" aria-label="本学期体质健康总体上传进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <div className="h-full rounded-full bg-[#92b7a7] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">每个班级需上传男生、女生各 1 份成绩文件</p>
    </div>

    {items.length === 0 ? <div className="mt-5 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-[#d7e4de] bg-[#fafdfb] px-4 text-center text-sm text-muted-foreground">暂无可上传的班级</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="班级体质健康成绩录入情况">
      {items.map((item) => {
        const uploaded = item.completedFiles ?? 0
        const total = item.totalFiles ?? 2
        const completed = uploaded === total
        return <Link
          key={item.id}
          href={href}
          aria-label={`${item.name}体质健康成绩，${completed ? "已录入" : "未录入"}，点击进入录入页面`}
          className={cn(
            "group flex min-w-0 flex-col gap-3 rounded-xl border px-3.5 py-3 transition-[border-color,background-color,box-shadow] hover:shadow-[0_10px_20px_-18px_rgba(73,124,105,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#729988]/45",
            completed ? "border-[#bfe6d1] bg-[#f8fffb] hover:border-[#8fc8a9]" : "border-[#eadfcf] bg-[#fffdf8] hover:border-[#d5bc91]",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-sm font-bold text-foreground">{item.name}</h4>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.studentCount} 名学生 · {uploaded}/{total} 份文件</p>
            </div>
            <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", completed ? "bg-[#eaf8f1] text-[#397463]" : "bg-[#fff1e1] text-[#9b6b32]")}>{completed ? "已录入" : "未录入"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label={`${item.name}男女生成绩录入情况`}>
            {genderFiles.map((file) => {
              const isUploaded = item.uploadedGenders?.[file.key] ?? false
              const isMale = file.key === "male"
              return <div
                key={file.key}
                className={cn(
                  "flex min-h-[58px] items-center justify-between gap-2 rounded-lg border px-2.5 py-2",
                  isMale
                    ? isUploaded ? "border-[#c9d6fb] bg-[#f1f5ff] text-[#536db9]" : "border-[#dbe3f7] bg-[#f8faff] text-[#7a86aa]"
                    : isUploaded ? "border-[#f1cbd4] bg-[#fff1f4] text-[#a65c71]" : "border-[#f4dce2] bg-[#fff9fa] text-[#b37c8a]",
                )}
                aria-label={`${item.name}${file.label}${isUploaded ? "已录入" : "未录入"}`}
              >
                <span className="text-xs font-semibold">{file.label}</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold" aria-label={isUploaded ? "已录入" : "未录入"}>
                  {isUploaded ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}
                  <span className="sr-only">{isUploaded ? "已录入" : "未录入"}</span>
                </span>
              </div>
            })}
          </div>
        </Link>
      })}
    </div>}
  </section>
}

function SubjectScoreUploadCard({ items, subjects, href }: { items: ScoreClassProgress[]; subjects: string[]; href: string }) {
  const completed = items.filter((item) => item.status === "已提交").length

  return <section className="rounded-2xl border border-[#cbd6f7] border-t-2 border-t-brand-green bg-[linear-gradient(145deg,#f7fdf9_0%,#ffffff_78%)] p-5 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-6" aria-labelledby="subject-score-upload-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-2.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf8f1] text-brand-green"><FileSpreadsheet className="size-4.5" aria-hidden="true" /></span><div><h2 id="subject-score-upload-title" className="text-base font-bold text-foreground">本学期成绩上传</h2><p className="mt-1 text-xs text-muted-foreground">按本班、本学科下载模板并上传</p></div></div><span className="rounded-lg bg-[#eaf8f1] px-2 py-1 text-xs font-bold tabular-nums text-brand-green">{completed} / {items.length} 班</span></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{subjects.map((subject) => <span key={subject} className="rounded-full border border-primary/15 bg-white px-2 py-1 text-[11px] font-semibold text-primary">{subject}</span>)}</div>
    <div className="mt-4 space-y-2.5">{items.map((item) => <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#dfe8e5] bg-white/85 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{item.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.studentCount} 名学生 · 学期成绩</p></div><span className={cn("shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold", item.status === "已提交" ? "bg-[#eaf8f1] text-brand-green" : item.status === "录入中" ? "bg-[#fff4e5] text-brand-orange" : "bg-[#eef2ff] text-primary")}>{item.status}</span></div>)}</div>
    <Link href={href} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-green px-3 text-xs font-bold text-white shadow-sm shadow-brand-green/20 transition-colors hover:bg-brand-green/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/45"><Upload className="size-3.5" aria-hidden="true" />上传学期成绩<ArrowRight className="size-3.5" aria-hidden="true" /></Link>
  </section>
}

function TodoSummary({ icon: Icon, tone, title, completed, total, unit, href }: { icon: typeof Upload; tone: "green" | "purple" | "blue"; title: string; completed: number; total: number; unit: string; href: string }) {
  const toneClass = tone === "green" ? "bg-[#eaf8f1] text-brand-green" : tone === "purple" ? "bg-[#f2f0ff] text-[#7166b3]" : "bg-primary/10 text-primary"
  const percentage = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0
  return <Link href={href} className="group flex min-h-[112px] min-w-0 flex-col justify-between rounded-xl border border-[#e1e6f5] bg-[#fbfcff] px-4 py-3.5 transition-colors hover:border-primary/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><div className="flex items-center gap-3"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", toneClass)}><Icon className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{title}</span><span className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-primary/15 bg-white px-2 text-[11px] font-bold text-primary">去填写<ArrowRight className="size-3" aria-hidden="true" /></span></div><div className="mt-3"><div className="flex items-center justify-between gap-2 text-[11px]"><span className="text-muted-foreground">已完成 <strong className="font-bold tabular-nums text-foreground">{completed}</strong> / {total} {unit}</span><span className="font-bold tabular-nums text-primary">{percentage}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e7ebf8]" role="progressbar" aria-label={`${title}完成进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><div className={cn("h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none", tone === "green" ? "bg-brand-green" : tone === "purple" ? "bg-[#8d7bc7]" : "bg-primary")} style={{ width: `${percentage}%` }} /></div></div></Link>
}
