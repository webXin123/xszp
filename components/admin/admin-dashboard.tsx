"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Award, ArrowRight, CalendarDays, ClipboardList, FileSpreadsheet, LayoutGrid, NotebookPen, ShoppingBag, Trophy, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { computeWeeklyScore, formatDate, getISOWeekKey } from "@/lib/scoring-utils"
import { buildPointEntries, getMonthRange, getSemesterRange, getWeekRange, inRange } from "@/lib/points-utils"
import { getSemesterLabel } from "@/lib/pe-scores"
import { AwardLineChart } from "./award-line-chart"
import type { MainTab } from "../evaluation/evaluation-dashboard"
import { MoralDirectorDashboard } from "./moral-director-dashboard"
import styles from "./admin-dashboard.module.css"

interface AdminDashboardProps {
  onNavigate: (tab: MainTab) => void
}

function RankMark({ rank }: { rank: number }) {
  const sharedClassName = "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums shadow-sm"

  if (rank === 1) return <span role="img" aria-label="第 1 名" className={cn(sharedClassName, "bg-[#ffb21c] text-[#6f4300]")}>1</span>
  if (rank === 2) return <span role="img" aria-label="第 2 名" className={cn(sharedClassName, "bg-[#b8b8b8] text-[#484848]")}>2</span>
  if (rank === 3) return <span role="img" aria-label="第 3 名" className={cn(sharedClassName, "bg-[#d98168] text-[#5e2d22]")}>3</span>
  return <span className={cn(sharedClassName, "bg-[#e9edff] text-[#5869bd] shadow-none")}>{rank}</span>
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { role } = usePermission()
  if (role === "moral_director") return <MoralDirectorDashboard onNavigate={onNavigate} />
  return <LegacyAdminDashboard onNavigate={onNavigate} />
}

type TaskProgressSummary = { completed: number; inProgress: number; total: number }

const EMPTY_TASK_PROGRESS: TaskProgressSummary = { completed: 0, inProgress: 0, total: 0 }

function readTaskProgress(storageKey: string): TaskProgressSummary {
  try {
    const raw = localStorage.getItem(storageKey)
    const tasks = raw ? JSON.parse(raw) : []
    if (!Array.isArray(tasks)) return EMPTY_TASK_PROGRESS
    const currentSemester = getSemesterLabel()
    const progress = tasks
      .filter((task) => task?.semester === currentSemester)
      .flatMap((task) => Array.isArray(task?.progress) ? task.progress : [])
    return {
      completed: progress.filter((item) => item?.status === "已提交").length,
      inProgress: progress.filter((item) => item?.status === "录入中").length,
      total: progress.length,
    }
  } catch {
    return EMPTY_TASK_PROGRESS
  }
}

function LegacyAdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { records, awardCards, honors, activities, students, classes } = useEvaluation()
  const [entryProgress, setEntryProgress] = useState({
    score: EMPTY_TASK_PROGRESS,
    evaluation: EMPTY_TASK_PROGRESS,
    comment: EMPTY_TASK_PROGRESS,
  })

  useEffect(() => {
    const syncProgress = () => setEntryProgress({
      score: readTaskProgress("mzlg-score-entry-tasks-v1"),
      evaluation: readTaskProgress("mzlg-semester-evaluation-tasks-v1"),
      comment: readTaskProgress("mzlg-comment-entry-tasks-v1"),
    })
    syncProgress()
    window.addEventListener("storage", syncProgress)
    return () => window.removeEventListener("storage", syncProgress)
  }, [])

  const now = new Date()
  const currentWeek = getWeekRange(now)
  const previousWeekDate = new Date(currentWeek.start)
  previousWeekDate.setDate(previousWeekDate.getDate() - 7)
  const previousWeek = getWeekRange(previousWeekDate)
  const previousWeekKey = getISOWeekKey(previousWeek.start)
  const { start: monthStart, end: monthEnd } = getMonthRange(now)
  const { start: semesterStart, end: semesterEnd } = getSemesterRange(now)

  const lastWeekClassRanking = useMemo(() => {
    const sorted = classes
      .map((schoolClass) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        total: computeWeeklyScore(records, schoolClass.id, previousWeekKey).total,
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))

    let previousTotal: number | undefined
    let rank = 0
    return sorted.map((schoolClass, index) => {
      if (schoolClass.total !== previousTotal) rank = index + 1
      previousTotal = schoolClass.total
      return { ...schoolClass, rank }
    })
  }, [classes, records, previousWeekKey])

  const dailyAwardData = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - 6 + index)
    const dateText = formatDate(date)
    return { date: dateText, count: awardCards.filter((item) => item.date === dateText).length }
  }), [awardCards])

  const monthActivities = useMemo(
    () => activities.filter((activity) => inRange(activity.startDate, monthStart, monthEnd)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [activities, monthStart, monthEnd],
  )

  const pointsRanking = useMemo(() => {
    const totals = new Map<string, number>()
    for (const entry of buildPointEntries(awardCards, honors)) {
      if (inRange(entry.date, semesterStart, semesterEnd)) totals.set(entry.studentId, (totals.get(entry.studentId) ?? 0) + entry.points)
    }
    const classById = new Map(classes.map((item) => [item.id, item.name]))
    const sorted = students
      .map((student) => ({ ...student, points: totals.get(student.id) ?? 0, className: classById.get(student.classId) ?? "—" }))
      .filter((student) => student.points > 0)
      .sort((a, b) => b.points - a.points || a.studentNo.localeCompare(b.studentNo))

    let previousPoints: number | undefined
    let rank = 0
    return sorted.map((student, index) => {
      if (student.points !== previousPoints) rank = index + 1
      previousPoints = student.points
      return { ...student, rank }
    })
  }, [awardCards, honors, students, classes, semesterStart, semesterEnd])

  const weeklyAwardCount = useMemo(() => dailyAwardData.reduce((sum, item) => sum + item.count, 0), [dailyAwardData])

  const overviewItems = [
    {
      label: "本周奖卡发放",
      value: `${weeklyAwardCount} 张`,
      helper: "近 7 天累计发放数量",
      icon: Award,
      progress: Math.min(100, weeklyAwardCount * 10),
      tone: "bg-[#fff3db] text-[#b66d0a]",
    },
    {
      label: "成绩录入进度",
      value: `${entryProgress.score.completed} / ${entryProgress.score.total}`,
      helper: entryProgress.score.total ? `进行中 ${entryProgress.score.inProgress} 项` : "暂无发布任务",
      icon: FileSpreadsheet,
      progress: entryProgress.score.total ? (entryProgress.score.completed / entryProgress.score.total) * 100 : 0,
      tone: "bg-[#e7f7ef] text-[#21845b]",
    },
    {
      label: "学期评价进度",
      value: `${entryProgress.evaluation.completed} / ${entryProgress.evaluation.total}`,
      helper: entryProgress.evaluation.total ? `进行中 ${entryProgress.evaluation.inProgress} 项` : "暂无发布任务",
      icon: ClipboardList,
      progress: entryProgress.evaluation.total ? (entryProgress.evaluation.completed / entryProgress.evaluation.total) * 100 : 0,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "学期评语录入进度",
      value: `${entryProgress.comment.completed} / ${entryProgress.comment.total}`,
      helper: entryProgress.comment.total ? `进行中 ${entryProgress.comment.inProgress} 项` : "暂无发布任务",
      icon: NotebookPen,
      progress: entryProgress.comment.total ? (entryProgress.comment.completed / entryProgress.comment.total) * 100 : 0,
      tone: "bg-[#f2f0ff] text-[#7166b3]",
    },
  ]

  const shortcuts = [
    { label: "班级评价", icon: LayoutGrid, href: "/class-evaluation", tone: "bg-primary/10 text-primary", labelTone: "group-hover:text-primary", hover: "hover:border-primary/45 hover:bg-primary/[0.05]" },
    { label: "奖卡发放", icon: Award, onClick: () => onNavigate("award"), tone: "bg-[#fff3db] text-[#c27a12]", labelTone: "group-hover:text-[#a9650c]", hover: "hover:border-[#e8bd70] hover:bg-[#fffaf1]" },
    { label: "活动管理", icon: CalendarDays, onClick: () => onNavigate("activity"), tone: "bg-[#f2f0ff] text-[#7166b3]", labelTone: "group-hover:text-[#5d539d]", hover: "hover:border-[#a39bd0] hover:bg-[#faf9ff]" },
    { label: "成绩录入管理", icon: FileSpreadsheet, href: "/score-entry-management", tone: "bg-[#e7f7ef] text-[#21845b]", labelTone: "group-hover:text-[#1a704c]", hover: "hover:border-[#89c9a9] hover:bg-[#f5fcf8]" },
    { label: "学期评价管理", icon: NotebookPen, href: "/comment-entry-management", tone: "bg-[#fff0ee] text-[#c1645d]", labelTone: "group-hover:text-[#a94f49]", hover: "hover:border-[#e1aaa4] hover:bg-[#fff8f7]" },
    { label: "商城管理", icon: ShoppingBag, href: "/mall-management", tone: "bg-primary/10 text-primary", labelTone: "group-hover:text-primary", hover: "hover:border-primary/45 hover:bg-primary/[0.05]" },
  ]

  return (
    <div className={cn("flex min-h-0 flex-col gap-4 bg-transparent p-0", styles.dashboard)}>
      <section className={cn("p-5 sm:p-6", styles.card, styles.overviewCard)} aria-labelledby="admin-overview-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="admin-overview-title" className="text-xl font-bold tracking-tight text-foreground">管理员首页</h2><p className="mt-1 text-sm text-muted-foreground">聚焦本周重点，轻松掌握录入与激励进展</p></div>
          <span className="inline-flex min-h-9 items-center rounded-full bg-white/70 px-3 text-xs font-semibold tabular-nums text-primary ring-1 ring-[#dce3fa]">{formatDate(currentWeek.start)} 至 {formatDate(currentWeek.end)}</span>
        </div>

        <div className={cn("mt-4", styles.statsGrid)}>
          <div className="grid divide-y divide-[#e5e9f7] sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
            {overviewItems.map((item) => <article key={item.label} className={cn("p-3.5 sm:p-4", styles.statItem)}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{item.label}</p><p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-foreground">{item.value}</p></div><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", item.tone)}><item.icon className="size-4" aria-hidden="true" /></span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-[#e9edf9]" aria-hidden="true"><div className="h-full rounded-full bg-primary" style={{ width: `${item.progress}%` }} /></div><p className="mt-2 truncate text-xs text-muted-foreground">{item.helper}</p></article>)}
          </div>
        </div>

      </section>

      <nav aria-label="快捷入口" className={cn("flex flex-col gap-2 sm:flex-row sm:items-center p-3", styles.card)}>
        <div className="grid flex-1 grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{shortcuts.map((shortcut) => { const content = <><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none", shortcut.tone)}><shortcut.icon className="size-4" aria-hidden="true" /></span><span className={cn("min-w-0 truncate text-sm font-semibold transition-colors", shortcut.labelTone)}>{shortcut.label}</span></>; const className = cn("group flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-2.5 text-left transition duration-200 hover:bg-[#fbfcff] hover:shadow-[0_8px_16px_-14px_rgba(70,88,160,.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", shortcut.hover); return shortcut.href ? <Link key={shortcut.label} href={shortcut.href} className={className}>{content}</Link> : <button key={shortcut.label} type="button" onClick={shortcut.onClick} className={className}>{content}</button> })}</div>
      </nav>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(350px,.85fr)]">
        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="award-trend-title">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><TrendingUp className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold text-primary">激励活跃度</p><h3 id="award-trend-title" className="mt-0.5 text-[15px] font-bold tracking-tight text-foreground">最近一周奖卡发放趋势</h3></div></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold tabular-nums text-primary">本周 {weeklyAwardCount} 张</span></div>
          <div className="mt-3 min-h-0 flex-1"><AwardLineChart data={dailyAwardData} /></div>
        </section>

        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="class-ranking-title">
          <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold text-primary">班级运营</p><h3 id="class-ranking-title" className="mt-0.5 text-[15px] font-bold tracking-tight text-foreground">上周班级总分排名</h3><p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{formatDate(previousWeek.start)} 至 {formatDate(previousWeek.end)}</p></div></div><Link href="/class-ranking" aria-label="查看班级排行榜" className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-bold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看排行<ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>
          {lastWeekClassRanking.length > 0 ? <ol tabIndex={0} aria-label="上周班级总分排名（同分并列）" className="mt-3 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fbfcff] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{lastWeekClassRanking.map((schoolClass) => <li key={schoolClass.id} className="flex items-center gap-3 py-2.5 transition-colors hover:bg-primary/[0.04]"><RankMark rank={schoolClass.rank} /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{schoolClass.name}</span><span className="shrink-0 text-sm font-bold tabular-nums text-primary">{schoolClass.total} 分</span></li>)}</ol> : <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">上周暂无班级评价记录</div>}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(350px,.85fr)]">
        <section className={cn("flex h-[300px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="activity-title">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#f2f0ff] text-[#7166b3]"><CalendarDays className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold text-[#7166b3]">校园日程</p><h3 id="activity-title" className="mt-0.5 text-[15px] font-bold tracking-tight text-foreground">本月举办活动</h3></div></div><button type="button" onClick={() => onNavigate("activity")} className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[#7166b3] transition hover:bg-[#f2f0ff] hover:text-[#5d539d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">全部活动<ArrowRight className="size-3.5" aria-hidden="true" /></button></div>
          {monthActivities.length > 0 ? <div tabIndex={0} aria-label="本月举办活动" className="mt-3 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fbfcff] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{monthActivities.map((activity) => <button key={activity.id} type="button" onClick={() => onNavigate("activity")} className="group flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-[#f3f1ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f0ff] text-[#7166b3]"><CalendarDays className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground group-hover:text-[#7166b3]">{activity.title}</span><span className="mt-1 block truncate text-xs tabular-nums text-muted-foreground">{activity.startDate.replace("T", " ")}</span></span><ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" /></button>)}</div> : <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">本月暂无活动</div>}
        </section>

        <section className={cn("flex h-[300px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="points-ranking-title">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#fff3db] text-[#b66d0a]"><Trophy className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold text-[#b66d0a]">成长激励</p><h3 id="points-ranking-title" className="mt-0.5 text-[15px] font-bold tracking-tight text-foreground">本学期五育积分总分排行</h3></div></div><button type="button" onClick={() => onNavigate("dashboard")} className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[#9a5e08] transition hover:bg-[#fff3db] hover:text-[#8f5708] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看全部<ArrowRight className="size-3.5" aria-hidden="true" /></button></div>
          {pointsRanking.length > 0 ? <ol tabIndex={0} className="mt-3 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fffcf6] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" aria-label="五育积分排名（同分并列）">{pointsRanking.map((student) => <li key={student.id} className="flex min-h-14 items-center gap-3 py-2 transition-colors hover:bg-[#fff8ea]"><RankMark rank={student.rank} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{student.name}</span><span className="block truncate text-xs text-muted-foreground">{student.className}</span></span><span className="shrink-0 text-sm font-bold tabular-nums text-[#b66d0a]">{student.points} 分</span></li>)}</ol> : <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">本学期暂无学生积分记录</div>}
        </section>
      </div>
    </div>
  )
}
