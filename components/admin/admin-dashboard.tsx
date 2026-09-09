"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Award, ArrowRight, CalendarDays, ClipboardList, FileSpreadsheet, LayoutGrid, NotebookPen, Trophy, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { computeWeeklyScore, formatDate, getISOWeekKey } from "@/lib/scoring-utils"
import { buildPointEntries, getMonthRange, getSemesterRange, getWeekRange, inRange } from "@/lib/points-utils"
import { AwardLineChart } from "./award-line-chart"
import type { MainTab } from "../evaluation/evaluation-dashboard"
import { MoralDirectorDashboard } from "./moral-director-dashboard"

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

function LegacyAdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { records, awardCards, honors, activities, students, classes } = useEvaluation()

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

  const shortcuts = [
    { label: "班级评价", icon: LayoutGrid, href: "/class-evaluation", tone: "bg-primary/10 text-primary", labelTone: "group-hover:text-primary", hover: "hover:border-primary/45 hover:bg-primary/[0.05]" },
    { label: "奖卡发放", icon: Award, onClick: () => onNavigate("award"), tone: "bg-[#fff3db] text-[#c27a12]", labelTone: "group-hover:text-[#a9650c]", hover: "hover:border-[#e8bd70] hover:bg-[#fffaf1]" },
    { label: "活动管理", icon: CalendarDays, onClick: () => onNavigate("activity"), tone: "bg-[#f2f0ff] text-[#7166b3]", labelTone: "group-hover:text-[#5d539d]", hover: "hover:border-[#a39bd0] hover:bg-[#faf9ff]" },
    { label: "成绩录入管理", icon: FileSpreadsheet, href: "/score-entry-management", tone: "bg-[#e7f7ef] text-[#21845b]", labelTone: "group-hover:text-[#1a704c]", hover: "hover:border-[#89c9a9] hover:bg-[#f5fcf8]" },
    { label: "学期评语管理", icon: NotebookPen, href: "/comment-entry-management", tone: "bg-[#fff0ee] text-[#c1645d]", labelTone: "group-hover:text-[#a94f49]", hover: "hover:border-[#e1aaa4] hover:bg-[#fff8f7]" },
  ]

  return (
    <div className="flex min-h-0 flex-col gap-4 bg-transparent p-0">
      <section className="overflow-hidden rounded-2xl border border-[#cfd7f6] border-t-[3px] border-t-primary bg-white px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">管理员首页</h2>
          <span className="rounded-full border border-[#dbe3fa] bg-[#f8faff] px-3 py-1.5 text-xs font-medium tabular-nums text-primary">{formatDate(currentWeek.start)} 至 {formatDate(currentWeek.end)}</span>
        </div>
        <div className="mt-5 grid gap-2.5 border-t border-[#e4e9fa] pt-4 sm:grid-cols-2 lg:grid-cols-5">
          {shortcuts.map((shortcut) => {
            const content = <><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", shortcut.tone)}><shortcut.icon className="size-5" aria-hidden="true" /></span><span className={cn("min-w-0 text-sm font-semibold text-foreground transition-colors", shortcut.labelTone)}>{shortcut.label}</span></>
            const className = cn("group flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-[#dce3fa] bg-[#fafbff] px-3.5 py-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", shortcut.hover)
            return shortcut.href ? <Link key={shortcut.label} href={shortcut.href} className={className}>{content}</Link> : <button key={shortcut.label} type="button" onClick={shortcut.onClick} className={className}>{content}</button>
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <section className="flex h-[322px] min-h-0 flex-col overflow-hidden rounded-2xl border border-[#cfd7f6] border-t-2 border-t-primary bg-white p-5 sm:h-[338px] sm:p-6" aria-labelledby="class-ranking-title">
          <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ClipboardList className="size-5" aria-hidden="true" /></span><div><h3 id="class-ranking-title" className="text-pretty text-[15px] font-bold tracking-tight text-[#5063bb]">上周班级总分排名</h3><p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{formatDate(previousWeek.start)} 至 {formatDate(previousWeek.end)}</p></div></div><Link href="/class-ranking" aria-label="查看班级排行榜" className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#5063bb] transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看班级排行榜<ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>
          {lastWeekClassRanking.length > 0 ? <ol tabIndex={0} aria-label="上周班级总分排名（同分并列）" className="mt-4 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fbfcff] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{lastWeekClassRanking.map((schoolClass) => <li key={schoolClass.id} className="flex items-center gap-3 py-2.5 transition-colors hover:bg-primary/[0.04]"><RankMark rank={schoolClass.rank} /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{schoolClass.name}</span><span className="shrink-0 text-sm font-bold tabular-nums text-primary">{schoolClass.total} 分</span></li>)}</ol> : <div className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">上周暂无班级评价记录</div>}
        </section>

        <section className="flex h-[322px] min-h-0 flex-col overflow-hidden rounded-2xl border border-[#cfd7f6] border-t-2 border-t-[#6675cf] bg-white p-5 sm:h-[338px] sm:p-6" aria-labelledby="award-trend-title">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-[#e8f7f6] text-[#238c87]"><TrendingUp className="size-5" aria-hidden="true" /></span><h3 id="award-trend-title" className="text-[15px] font-bold tracking-tight text-[#176864]">最近一周奖卡发放趋势</h3></div>
          <div className="mt-3 min-h-0 flex-1"><AwardLineChart data={dailyAwardData} /></div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)]">
        <section className="flex h-[322px] min-h-0 flex-col overflow-hidden rounded-2xl border border-[#cfd7f6] border-t-2 border-t-[#8172c4] bg-white p-5 sm:h-[338px] sm:p-6" aria-labelledby="activity-title">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-[#f2f0ff] text-[#7166b3]"><CalendarDays className="size-5" aria-hidden="true" /></span><h3 id="activity-title" className="text-[15px] font-bold tracking-tight text-[#7166b3]">本月举办活动</h3></div><button type="button" onClick={() => onNavigate("activity")} className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-[#7166b3] transition-colors hover:bg-[#f2f0ff] hover:text-[#5d539d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">全部活动<ArrowRight className="size-3.5" aria-hidden="true" /></button></div>
          {monthActivities.length > 0 ? <div tabIndex={0} aria-label="本月举办活动" className="mt-4 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fbfcff] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{monthActivities.map((activity) => <button key={activity.id} type="button" onClick={() => onNavigate("activity")} className="group flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-[#f3f1ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f0ff] text-[#7166b3]"><CalendarDays className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground group-hover:text-[#7166b3]">{activity.title}</span><span className="mt-1 block truncate text-xs tabular-nums text-muted-foreground">{activity.startDate.replace("T", " ")}</span></span></button>)}</div> : <div className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">本月暂无活动</div>}
        </section>

        <section className="flex h-[322px] min-h-0 flex-col overflow-hidden rounded-2xl border border-[#cfd7f6] border-t-2 border-t-[#e0a33a] bg-white p-5 sm:h-[338px] sm:p-6" aria-labelledby="points-ranking-title">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-[#fff3db] text-[#c27a12]"><Trophy className="size-5" aria-hidden="true" /></span><h3 id="points-ranking-title" className="text-[15px] font-bold tracking-tight text-[#9a5e08]">本学期五育积分总分排行</h3></div><button type="button" onClick={() => onNavigate("dashboard")} className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-[#9a5e08] transition-colors hover:bg-[#fff3db] hover:text-[#8f5708] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看全部<ArrowRight className="size-3.5" aria-hidden="true" /></button></div>
          {pointsRanking.length > 0 ? <ol tabIndex={0} className="mt-4 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fffcf6] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" aria-label="五育积分排名（同分并列）">{pointsRanking.map((student) => <li key={student.id} className="flex min-h-14 items-center gap-3 py-2 transition-colors hover:bg-[#fff8ea]"><RankMark rank={student.rank} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{student.name}</span><span className="block truncate text-xs text-muted-foreground">{student.className}</span></span><span className="shrink-0 text-sm font-bold tabular-nums text-[#b66d0a]">{student.points} 分</span></li>)}</ol> : <div className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">本学期暂无学生积分记录</div>}
        </section>
      </div>
    </div>
  )
}
