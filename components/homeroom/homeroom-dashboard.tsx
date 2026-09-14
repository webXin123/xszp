"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  LayoutGrid,
  Medal,
  MinusCircle,
  NotebookPen,
  Search,
  TrendingDown,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { getActivityStatus, requiresActivityEnrollment } from "@/lib/activity-utils"
import { formatDate, formatDateRangeLabel, getISOWeekKey, getRecordsForWeek, getWeekRange } from "@/lib/scoring-utils"
import { TIME_RANGE_LABEL, type TimeRange } from "@/lib/points-utils"
import { readSemesterEvaluationRecords } from "@/lib/semester-evaluation-utils"
import { PointsRankingTab } from "./points-ranking-tab"
import { HonorUploadTab } from "../evaluation/honor-upload-tab"
import { ParentHonorReview } from "./parent-honor-review"
import type { MainTab } from "../evaluation/evaluation-dashboard"
import styles from "../role-home.module.css"

interface HomeroomDashboardProps {
  onNavigate: (tab: MainTab) => void
}

type MessageTone = "blue" | "green" | "orange" | "purple"
type ProgressStatus = "未开始" | "录入中" | "已提交"

interface DashboardMessage {
  id: string
  category: string
  title: string
  summary: string
  detail: string
  icon: typeof Award
  tone: MessageTone
}

interface DashboardTodo {
  id: string
  title: string
  description: string
  count: number
  icon: typeof LayoutGrid
  actionLabel: string
  onClick?: () => void
  href?: string
}

interface CommentProgressItem {
  id: string
  subject: string
  teacher: string
  status: ProgressStatus
}

const RANGES: TimeRange[] = ["week", "month", "semester"]
const COMMENT_TASKS_KEY = "mzlg-comment-entry-tasks-v1"
const FALLBACK_COMMENT_PROGRESS: CommentProgressItem[] = [
  { id: "comment-homeroom", subject: "班主任评语", teacher: "班主任", status: "录入中" },
  { id: "comment-chinese", subject: "语文", teacher: "刘敏", status: "已提交" },
  { id: "comment-math", subject: "数学", teacher: "张哲", status: "录入中" },
]

export function HomeroomDashboard({ onNavigate }: HomeroomDashboardProps) {
  const { records, awardCards, classes, flags, flagConfigs, activities, currentTeacher, students } = useEvaluation()
  const { scoringClasses } = usePermission()
  const [classId, setClassId] = useState(scoringClasses[0]?.id ?? "")
  const [range, setRange] = useState<TimeRange>("semester")
  const [studentSearch, setStudentSearch] = useState("")
  const [classSwitchOpen, setClassSwitchOpen] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<DashboardMessage | null>(null)
  const [topPanelTab, setTopPanelTab] = useState<"messages" | "todos">("messages")
  const [honorDrawerOpen, setHonorDrawerOpen] = useState(false)
  const [commentProgress, setCommentProgress] = useState<CommentProgressItem[]>(FALLBACK_COMMENT_PROGRESS)
  const [pendingEvaluationCount, setPendingEvaluationCount] = useState(0)

  const currentClass = classes.find((item) => item.id === classId) ?? scoringClasses[0]
  const now = new Date()
  const today = formatDate(now)
  const weekKey = getISOWeekKey(now)
  const currentWeek = getWeekRange(now)
  const weekRangeLabel = formatDateRangeLabel(weekKey)
  const previousWeekDate = new Date(currentWeek.start)
  previousWeekDate.setDate(previousWeekDate.getDate() - 7)
  const previousWeekKey = getISOWeekKey(previousWeekDate)

  useEffect(() => {
    if (!currentClass) return
    try {
      const commentCache = JSON.parse(localStorage.getItem(COMMENT_TASKS_KEY) ?? "null") as Array<{ progress?: Array<{ id: string; teacherName: string; classNames: string; role: "homeroom" | "subject"; status: ProgressStatus }> }> | null
      const cachedComments = commentCache?.flatMap((task) => task.progress ?? [])
        .filter((item) => item.classNames === currentClass.name)
        .map((item) => ({
          id: item.id,
          subject: item.role === "homeroom" ? "班主任评语" : item.teacherName === "刘敏" ? "语文" : item.teacherName === "张哲" ? "数学" : "任课教师评语",
          teacher: item.role === "homeroom" ? "班主任" : item.teacherName,
          status: item.status,
        }))
      setCommentProgress(cachedComments && cachedComments.length > 0 ? cachedComments : FALLBACK_COMMENT_PROGRESS)
    } catch {
      setCommentProgress(FALLBACK_COMMENT_PROGRESS)
    }
  }, [currentClass])

  useEffect(() => {
    if (!currentClass || !currentTeacher) return
    const roster = students.filter((student) => student.classId === currentClass.id)
    const completed = roster.filter((student) => {
      const record = readSemesterEvaluationRecords().find((item) => item.teacherId === currentTeacher.id && item.classId === currentClass.id && item.studentId === student.id)
      return Object.keys(record?.ratings ?? {}).length >= 10
    }).length
    setPendingEvaluationCount(Math.max(roster.length - completed, 0))
  }, [currentClass, currentTeacher, students])

  const classFlagConfigs = useMemo(() => new Map(flagConfigs.map((item) => [item.id, item])), [flagConfigs])

  const weekDeductions = useMemo(() => {
    if (!currentClass) return []
    return getRecordsForWeek(records, currentClass.id, weekKey)
      .filter((record) => record.totalDeduction < 0)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [currentClass, records, weekKey])
  const deductionsLoadMore = useLoadMore(weekDeductions, 6)
  const deductionsScroll = useScrollLoadMore(deductionsLoadMore.hasMore, deductionsLoadMore.loadMore)

  const weekAwards = useMemo(() => {
    if (!currentClass) return []
    return awardCards
      .filter((award) => award.classId === currentClass.id && getISOWeekKey(new Date(award.date)) === weekKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [awardCards, currentClass, weekKey])
  const awardsLoadMore = useLoadMore(weekAwards, 6)
  const awardsScroll = useScrollLoadMore(awardsLoadMore.hasMore, awardsLoadMore.loadMore)
  const weekAwardPoints = useMemo(() => weekAwards.reduce((sum, award) => sum + award.points, 0), [weekAwards])

  const weekEvaluationTotals = useMemo(() => {
    if (!currentClass) return { deduction: 0, addition: 0 }
    return getRecordsForWeek(records, currentClass.id, weekKey).reduce((totals, record) => {
      if (record.totalDeduction < 0) totals.deduction += Math.abs(record.totalDeduction)
      if (record.totalDeduction > 0) totals.addition += record.totalDeduction
      return totals
    }, { deduction: 0, addition: 0 })
  }, [currentClass, records, weekKey])

  const todayAwards = useMemo(() => weekAwards.filter((award) => award.date === today).slice(0, 4), [today, weekAwards])
  const lastWeekFlags = useMemo(() => flags
    .filter((flag) => flag.classId === currentClass?.id && flag.awarded && flag.weekKey === previousWeekKey && (flag.period ?? "week") === "week")
    .map((flag) => ({ ...flag, config: classFlagConfigs.get(flag.configId ?? "") })), [classFlagConfigs, currentClass, flags, previousWeekKey])

  const classActivities = useMemo(() => {
    if (!currentClass) return []
    return activities
      .map((activity) => ({ activity, computedStatus: getActivityStatus(activity, now) }))
      .filter(({ activity, computedStatus }) => {
        const belongsToClass = activity.classIds.length > 0
          ? activity.classIds.includes(currentClass.id)
          : activity.gradeIds.includes(currentClass.gradeId)
        const start = activity.startDate ? new Date(activity.startDate).getTime() : Number.NaN
        const end = activity.endDate ? new Date(activity.endDate).getTime() : Number.NaN
        const overlapsWeek = (!Number.isNaN(start) && !Number.isNaN(end)) && start <= currentWeek.end.getTime() && end >= currentWeek.start.getTime()
        const activeOrRecruiting = computedStatus === "recruiting" || computedStatus === "ongoing"
        return belongsToClass && (activeOrRecruiting || (!requiresActivityEnrollment(activity) && overlapsWeek))
      })
      .sort((a, b) => a.activity.startDate.localeCompare(b.activity.startDate))
      .slice(0, 5)
  }, [activities, currentClass, currentWeek.end, currentWeek.start, now])

  const latestMessages = useMemo<DashboardMessage[]>(() => [
    ...todayAwards.map((award) => ({
      id: `award-${award.id}`,
      category: "今日奖卡",
      title: `${award.studentName} 获得「${award.level2}」奖卡`,
      summary: `${award.level1} · +${award.points} 积分 · 发放人：${award.operatorName}`,
      detail: `${award.studentName}于 ${award.date} 获得 ${award.level1}「${award.level2}」奖卡，本次获得 ${award.points} 积分，发放人为 ${award.operatorName}。`,
      icon: Award,
      tone: "blue" as const,
    })),
    ...lastWeekFlags.map((flag) => ({
      id: `flag-${flag.classId}-${flag.configId ?? flag.weekKey}`,
      category: "上周流动红旗",
      title: `${currentClass?.name ?? "本班"} 获得「${flag.config?.name ?? "流动红旗"}」`,
      summary: "上周班级荣誉",
      detail: `${currentClass?.name ?? "本班"}在上周获得「${flag.config?.name ?? "流动红旗"}」班级荣誉。`,
      icon: Trophy,
      tone: "orange" as const,
    })),
    ...classActivities.map(({ activity, computedStatus }) => ({
      id: `activity-${activity.id}`,
      category: "本周活动",
      title: activity.title,
      summary: computedStatus === "recruiting" ? "本周可报名参加" : "本周需参加",
      detail: activity.description || `${activity.title}安排在本周进行，${computedStatus === "recruiting" ? "当前可报名参加" : "请按要求组织学生参加"}。`,
      icon: CalendarDays,
      tone: "purple" as const,
    })),
  ], [classActivities, currentClass?.name, lastWeekFlags, todayAwards])
  const messagesLoadMore = useLoadMore(latestMessages, 2)
  const messagesScroll = useScrollLoadMore(messagesLoadMore.hasMore, messagesLoadMore.loadMore)

  const commentCompleted = commentProgress.filter((item) => item.status === "已提交").length
  const pendingCommentCount = commentProgress.length - commentCompleted
  const pendingTodoCount = weekDeductions.length + pendingCommentCount + pendingEvaluationCount
  const dashboardTodos = useMemo<DashboardTodo[]>(() => [
    {
      id: "score-review",
      title: "班级评价待审核",
      description: weekDeductions.length > 0 ? `本周有 ${weekDeductions.length} 条评价记录待查看` : "本周暂无待审核评价记录",
      count: weekDeductions.length,
      icon: LayoutGrid,
      actionLabel: "去查看",
      onClick: () => onNavigate("score"),
    },
    {
      id: "comment-review",
      title: "学期评语待完成",
      description: pendingCommentCount > 0 ? `还有 ${pendingCommentCount} 项教师评语待跟进` : "学期评语录入已完成",
      count: pendingCommentCount,
      icon: NotebookPen,
      actionLabel: "去完成",
      href: "/comment-entry",
    },
    {
      id: "semester-evaluation",
      title: "学期评价待完成",
      description: pendingEvaluationCount > 0 ? `还有 ${pendingEvaluationCount} 名学生待完成学期评价` : "本班学期评价已完成",
      count: pendingEvaluationCount,
      icon: ClipboardCheck,
      actionLabel: "去评价",
      href: "/semester-evaluation",
    },
    {
      id: "honor-entry",
      title: "班级荣誉记录",
      description: "为获奖学生补录荣誉信息并同步加分",
      count: 0,
      icon: Medal,
      actionLabel: "去录入",
      onClick: () => setHonorDrawerOpen(true),
    },
    {
      id: "activity-follow-up",
      title: "本周活动待跟进",
      description: classActivities.length > 0 ? `本周有 ${classActivities.length} 项活动需要组织` : "本周暂无需要跟进的活动",
      count: classActivities.length,
      icon: CalendarDays,
      actionLabel: "去查看",
      onClick: () => onNavigate("activity"),
    },
  ], [classActivities.length, onNavigate, pendingCommentCount, pendingEvaluationCount, weekDeductions.length])
  const todosLoadMore = useLoadMore(dashboardTodos, 3)
  const todosScroll = useScrollLoadMore(todosLoadMore.hasMore, todosLoadMore.loadMore)

  if (!currentClass) {
    return <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#cfd7f6] bg-white p-12 text-center"><LayoutGrid className="size-10 text-muted-foreground/40" aria-hidden="true" /><p className="text-sm text-muted-foreground">当前班主任未关联班级，暂无首页数据。</p></div>
  }

  return (
    <div className={cn("relative -m-4 flex flex-col gap-4 p-4 sm:-m-6 sm:gap-5 sm:p-6", styles.teacherHome, styles.homeroomHome)}>
      <section className="overflow-hidden rounded-2xl border border-[#cbd6f7] border-t-[3px] border-t-primary bg-white shadow-[0_18px_38px_-30px_rgba(48,62,139,0.72)]" aria-label="班主任信息、最新消息与待办事项">
        <div className="grid xl:grid-cols-[minmax(340px,0.82fr)_minmax(0,1.18fr)]">
          <div className="bg-[linear-gradient(135deg,#f5f7ff_0%,#ffffff_72%)] p-5 sm:p-6 xl:border-r xl:border-[#e4e9f8]">
            <p className="text-xs font-semibold tracking-[0.16em] text-primary">班级成长工作台</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">班主任首页</h1>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setClassSwitchOpen(true)} aria-haspopup="dialog" className="flex min-h-10 items-center gap-2 rounded-xl border border-[#dbe3fa] bg-white px-3 text-left transition-colors hover:border-primary/45 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{currentClass.name.slice(0, 1)}</span><span className="text-sm font-bold text-foreground">{currentClass.name}</span><span className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">切换班级<ChevronDown className="size-3.5" aria-hidden="true" /></span></button>
              <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#dbe3fa] bg-white px-3 text-xs font-medium tabular-nums text-primary"><CalendarDays className="size-3.5" aria-hidden="true" />{weekRangeLabel}</span>
            </div>
            <div className="mt-5 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">班</span><div><p className="text-sm font-bold text-foreground">{currentClass.homeroomTeacher}</p><p className="mt-0.5 text-xs text-muted-foreground">{currentClass.name} 班主任 · 本周工作概览</p></div></div>
          </div>
          <div className="min-w-0 p-5 sm:p-6">
            <div role="tablist" aria-label="班级消息与待办事项" className="flex items-center gap-5 border-b border-[#e5e9f6]">
              <button id="top-messages-tab" type="button" role="tab" aria-selected={topPanelTab === "messages"} aria-controls="top-information-panel" onClick={() => setTopPanelTab("messages")} className={cn("relative inline-flex min-h-10 items-center gap-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", topPanelTab === "messages" ? "text-primary" : "text-muted-foreground hover:text-foreground")}>最新消息{topPanelTab === "messages" && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}</button>
              <button id="top-todos-tab" type="button" role="tab" aria-selected={topPanelTab === "todos"} aria-controls="top-information-panel" onClick={() => setTopPanelTab("todos")} className={cn("relative inline-flex min-h-10 items-center gap-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", topPanelTab === "todos" ? "text-brand-orange" : "text-muted-foreground hover:text-foreground")}>待办事项<span className={cn("inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold tabular-nums", pendingTodoCount > 0 ? "bg-[#fff1e9] text-brand-orange" : "bg-[#eaf8f1] text-brand-green")}>{pendingTodoCount}</span>{topPanelTab === "todos" && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-orange" />}</button>
            </div>
            <div id="top-information-panel" role="tabpanel" aria-labelledby={topPanelTab === "messages" ? "top-messages-tab" : "top-todos-tab"} className="pt-4">
              {topPanelTab === "messages" ? latestMessages.length > 0 ? <ul tabIndex={0} aria-label="最新消息列表" className="h-[154px] space-y-2.5 overflow-y-auto overscroll-contain rounded-xl pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" onScroll={messagesScroll.onScroll}>{messagesLoadMore.visible.map((message) => <li key={message.id}><MessageCard message={message} onClick={() => setSelectedMessage(message)} /></li>)}<li><LoadMoreFooter hasMore={messagesLoadMore.hasMore} loaded={messagesLoadMore.visible.length} total={messagesLoadMore.total} onLoadMore={messagesLoadMore.loadMore} /></li></ul> : <EmptyPanel text="暂无班级最新消息" /> : <ul tabIndex={0} aria-label="待办事项列表" className="h-[228px] space-y-2.5 overflow-y-auto overscroll-contain rounded-xl pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" onScroll={todosScroll.onScroll}>{todosLoadMore.visible.map((todo) => <li key={todo.id}><TodoItem {...todo} /></li>)}<li><LoadMoreFooter hasMore={todosLoadMore.hasMore} loaded={todosLoadMore.visible.length} total={todosLoadMore.total} onLoadMore={todosLoadMore.loadMore} /></li></ul>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="flex h-[320px] min-h-0 flex-col rounded-2xl border border-[#cbd6f7] border-t-2 border-t-brand-orange bg-white p-5 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-6" aria-labelledby="week-deductions-title"><SectionHeading id="week-deductions-title" icon={TrendingDown} tone="orange" title="本周班级评价扣分动态" description={`共 ${weekDeductions.length} 条扣分记录 · 按记录时间倒序`} action={<div className="flex items-center gap-1.5"><span className="inline-flex min-h-8 items-center rounded-lg bg-[#fff1e9] px-2 text-[11px] font-bold tabular-nums text-brand-orange">扣分 -{weekEvaluationTotals.deduction}</span><span className="inline-flex min-h-8 items-center rounded-lg bg-[#eaf8f1] px-2 text-[11px] font-bold tabular-nums text-brand-green">加分 +{weekEvaluationTotals.addition}</span></div>} />{weekDeductions.length === 0 ? <EmptyPanel text="本周暂无扣分记录，继续保持！" /> : <ul tabIndex={0} aria-label="本周班级评价扣分动态" className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#e6eaf6] bg-[#fbfcff] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" onScroll={deductionsScroll.onScroll}>{deductionsLoadMore.visible.map((record) => <li key={record.id} className="flex items-start gap-2.5 border-b border-[#edf0fa] py-2.5 last:border-0"><MinusCircle className="mt-0.5 size-4 shrink-0 text-brand-orange" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{record.level1}<span className="font-normal text-muted-foreground"> · {record.level2}</span></span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{record.studentNames.length > 0 ? `涉及：${record.studentNames.join("、")}` : record.note || "班级评价记录"}</span></span><span className="shrink-0 text-right"><span className="block text-sm font-bold tabular-nums text-brand-orange">-{Math.abs(record.totalDeduction)}</span><span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">{record.date}</span></span></li>)}<li><LoadMoreFooter hasMore={deductionsLoadMore.hasMore} loaded={deductionsLoadMore.visible.length} total={deductionsLoadMore.total} onLoadMore={deductionsLoadMore.loadMore} /></li></ul>}</section>
        <section className="flex h-[320px] min-h-0 flex-col rounded-2xl border border-[#cbd6f7] border-t-2 border-t-brand-green bg-white p-5 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-6" aria-labelledby="week-awards-title"><SectionHeading id="week-awards-title" icon={Award} tone="green" title="本周班级奖卡记录动态" description="按发放时间倒序" action={<div className="flex items-center gap-2"><span className="inline-flex min-h-8 items-center rounded-lg bg-[#eaf8f1] px-2 text-[11px] font-bold tabular-nums text-brand-green">{weekAwards.length} 张 · +{weekAwardPoints} 分</span><button type="button" onClick={() => onNavigate("award")} className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">去发放<ChevronRight className="size-3.5" aria-hidden="true" /></button></div>} />{weekAwards.length === 0 ? <EmptyPanel text="本周暂无奖卡记录" /> : <ul tabIndex={0} aria-label="本周班级奖卡记录动态" className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#e6eaf6] bg-[#fbfcff] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" onScroll={awardsScroll.onScroll}>{awardsLoadMore.visible.map((award) => <li key={award.id} className="flex items-center gap-3 border-b border-[#edf0fa] py-2.5 last:border-0"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eaf8f1] text-brand-green"><Award className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{award.studentName}<span className="font-normal text-muted-foreground"> · {award.level2}</span></span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{award.level1} · 发放人：{award.operatorName}</span></span><span className="shrink-0 text-right"><span className="block text-xs font-bold tabular-nums text-brand-green">+{award.points} 分</span><span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">{award.date}</span></span></li>)}<li><LoadMoreFooter hasMore={awardsLoadMore.hasMore} loaded={awardsLoadMore.visible.length} total={awardsLoadMore.total} onLoadMore={awardsLoadMore.loadMore} /></li></ul>}</section>
      </div>

      <section className="rounded-2xl border border-[#cbd6f7] bg-white p-5 shadow-[0_16px_32px_-26px_rgba(48,62,139,0.62)] sm:p-6" aria-labelledby="student-ranking-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading id="student-ranking-title" icon={Trophy} tone="purple" title="班级学生积分排名" description="五育一级指标学期总分、学期总积分与累计总积分" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input name="student-ranking-search" autoComplete="off" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="搜索姓名/学号" aria-label="搜索学生姓名或学号" className="h-10 w-44 rounded-xl border-[#d8e0f7] bg-[#f8faff] pl-8 text-sm" /></div>
            <div className="flex rounded-xl border border-[#d8e0f7] bg-[#f8faff] p-1" role="tablist" aria-label="积分查看范围">{RANGES.map((item) => <button key={item} type="button" role="tab" aria-selected={range === item} onClick={() => setRange(item)} className={cn("min-h-8 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", range === item ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>{TIME_RANGE_LABEL[item]}</button>)}</div>
          </div>
        </div>
        <div className="mt-4"><PointsRankingTab classId={currentClass.id} range={range} search={studentSearch} /></div>
      </section>

      <Dialog open={classSwitchOpen} onOpenChange={setClassSwitchOpen}>
        <DialogContent className="max-w-md border border-[#dce3f7] p-0">
          <DialogHeader className="border-b border-[#e8ecf8] bg-[#f8faff] px-5 py-5 pr-12">
            <DialogTitle className="text-lg font-bold">切换班级</DialogTitle>
            <DialogDescription>选择后将同步刷新班级评价、奖卡和学生积分数据。</DialogDescription>
          </DialogHeader>
          <div className="p-4" role="listbox" aria-label="选择班级">
            <div className="grid gap-2 sm:grid-cols-2">
              {scoringClasses.map((item) => <button key={item.id} type="button" role="option" aria-selected={item.id === currentClass.id} onClick={() => { setClassId(item.id); setClassSwitchOpen(false) }} className={cn("flex min-h-12 items-center justify-between rounded-xl border px-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", item.id === currentClass.id ? "border-primary/35 bg-primary/10 text-primary" : "border-[#dbe3fa] bg-white text-foreground hover:border-primary/35 hover:bg-primary/[0.04]") }><span className="flex min-w-0 items-center gap-2.5"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold", item.id === currentClass.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>{item.name.slice(0, 1)}</span><span className="truncate text-sm font-semibold">{item.name}</span></span>{item.id === currentClass.id && <CheckCircle2 className="size-4 shrink-0" aria-label="当前班级" />}</button>)}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedMessage)} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        {selectedMessage ? <MessageDetailDialog message={selectedMessage} /> : null}
      </Dialog>

      <button
        type="button"
        onClick={() => setHonorDrawerOpen(true)}
        aria-label="打开荣誉录入"
        title="荣誉录入"
        className="absolute right-4 top-[54%] z-40 flex size-[52px] items-center justify-center rounded-2xl border border-white/70 bg-primary text-primary-foreground shadow-[0_14px_28px_-12px_rgba(77,105,225,0.78)] transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:right-5"
      >
        <Medal className="size-6" aria-hidden="true" />
      </button>

      <Dialog open={honorDrawerOpen} onOpenChange={setHonorDrawerOpen}>
        <DialogContent
          className="!top-0 !right-0 !left-auto !flex !h-[100dvh] !w-full !max-w-full !translate-x-0 !translate-y-0 !flex-col gap-0 overflow-hidden overscroll-contain rounded-none border-l border-[#cfd8f6] bg-[#f7f8ff] p-0 shadow-[-20px_0_56px_-28px_rgba(53,67,150,0.75)] data-open:slide-in-from-right-4 sm:!w-[70vw] sm:!max-w-[70vw]"
        >
          <DialogHeader className="shrink-0 border-b border-[#dbe3f8] bg-gradient-to-r from-[#f1f3ff] via-white to-[#faf8ff] px-5 py-5 pr-14 sm:px-7">
            <DialogTitle className="text-xl font-bold text-foreground">荣誉录入</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <ParentHonorReview classId={currentClass.id} />
            <HonorUploadTab classId={currentClass.id} compact />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SectionHeading({ id, icon: Icon, tone, title, description, action }: { id?: string; icon: typeof LayoutGrid; tone: "blue" | "green" | "orange" | "purple"; title: React.ReactNode; description: string; action?: React.ReactNode }) {
  const styles = { blue: "bg-[#eef2ff] text-primary", green: "bg-[#eaf8f1] text-brand-green", orange: "bg-[#fff1e9] text-brand-orange", purple: "bg-[#f2f0ff] text-[#7166b3]" }
  return <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", styles[tone])}><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><h2 id={id} className="text-base font-bold text-foreground">{title}</h2><p className="mt-1 truncate text-xs text-muted-foreground">{description}</p></div></div>{action}</div>
}

function MessageCard({ message, onClick }: { message: DashboardMessage; onClick: () => void }) {
  const styles = { blue: "bg-[#eef2ff] text-primary", green: "bg-[#eaf8f1] text-brand-green", orange: "bg-[#fff1e9] text-brand-orange", purple: "bg-[#f2f0ff] text-[#7166b3]" }
  const Icon = message.icon
  return <button type="button" onClick={onClick} className="group flex h-[68px] w-full items-center gap-3 rounded-xl border border-[#e1e6f5] bg-[#fbfcff] px-3 py-2.5 text-left transition-colors hover:border-primary/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", styles[message.tone])}><Icon className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-2"><span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground ring-1 ring-[#e4e8f5]">{message.category}</span><span className="truncate text-sm font-semibold text-foreground">{message.title}</span></span><span className="mt-1 block truncate text-xs text-muted-foreground">{message.summary}</span></span><span className="hidden shrink-0 text-xs font-semibold text-primary sm:inline">查看详情</span><ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-hover:translate-x-0.5" aria-hidden="true" /></button>
}

function TodoItem({ icon: Icon, title, description, count, actionLabel, onClick, href }: DashboardTodo) {
  const actionClassName = "group inline-flex min-h-9 shrink-0 items-center rounded-lg px-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
  const actionContent = <><span>{actionLabel}</span><ChevronRight className="size-4 transition-transform motion-reduce:transition-none group-hover:translate-x-0.5" aria-hidden="true" /></>
  return <div className="flex h-[76px] items-center gap-3 rounded-xl border border-[#e1e6f5] bg-[#fbfcff] p-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-primary"><Icon className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-foreground">{title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span></span><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums", count > 0 ? "bg-[#fff1e9] text-brand-orange" : "bg-[#eaf8f1] text-brand-green")}>{count > 0 ? count : <CheckCircle2 className="size-4" aria-label="已完成" />}</span>{href ? <Link href={href} className={actionClassName}>{actionContent}</Link> : <button type="button" onClick={onClick} className={actionClassName}>{actionContent}</button>}</div>
}

function MessageDetailDialog({ message }: { message: DashboardMessage }) {
  const styles = { blue: "bg-[#eef2ff] text-primary", green: "bg-[#eaf8f1] text-brand-green", orange: "bg-[#fff1e9] text-brand-orange", purple: "bg-[#f2f0ff] text-[#7166b3]" }
  const Icon = message.icon
  return <DialogContent className="max-w-md border border-[#dce3f7] p-0"><DialogHeader className="border-b border-[#e8ecf8] bg-[#f8faff] px-5 py-5 pr-12"><div className="flex min-w-0 items-center gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", styles[message.tone])}><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><span className="text-xs font-bold text-muted-foreground">{message.category}</span><DialogTitle className="mt-1 truncate text-base font-bold text-foreground">{message.title}</DialogTitle></div></div></DialogHeader><div className="px-5 py-5"><DialogDescription className="leading-6 text-muted-foreground">{message.detail}</DialogDescription></div></DialogContent>
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#d5def5] bg-[#fbfcff] px-3 text-sm text-muted-foreground">{text}</div>
}
