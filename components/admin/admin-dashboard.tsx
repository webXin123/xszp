"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { EChartsOption } from "echarts"
import { Award, ArrowRight, CalendarDays, ClipboardCheck, FileSpreadsheet, LayoutGrid, NotebookPen, PieChart, ShoppingBag, Trophy, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { formatDate } from "@/lib/scoring-utils"
import { buildPointEntries, getMonthRange, getSemesterRange, getWeekRange, inRange } from "@/lib/points-utils"
import { AWARD_LEVEL1_LIST, getFiveEducationLevel1 } from "@/lib/award-utils"
import { EChart } from "../command-center/echart"
import { AwardLineChart } from "./award-line-chart"
import type { MainTab } from "../evaluation/evaluation-dashboard"
import { MoralDirectorDashboard } from "./moral-director-dashboard"
import styles from "./admin-dashboard.module.css"
import roleStyles from "../role-home.module.css"

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

type AwardRange = "week" | "month" | "semester"
type AwardTrendRange = "week" | "semester"

const AWARD_RANGE_LABEL: Record<AwardRange, string> = { week: "本周", month: "本月", semester: "本学期" }
const AWARD_TREND_RANGE_LABEL: Record<AwardTrendRange, string> = { week: "本周", semester: "本学期" }

function LegacyAdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { awardCards, honors, activities, enrollments, students, classes } = useEvaluation()
  const [awardRange, setAwardRange] = useState<AwardRange>("week")
  const [trendRange, setTrendRange] = useState<AwardTrendRange>("week")

  const now = new Date()
  const currentWeek = getWeekRange(now)
  const { start: monthStart, end: monthEnd } = getMonthRange(now)
  const { start: semesterStart, end: semesterEnd } = getSemesterRange(now)

  const issuedAwardCards = useMemo(
    () => awardCards.filter((award) => award.source === "online" || award.source === "offline_scan"),
    [awardCards],
  )

  const weeklyAwardData = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(currentWeek.start)
    date.setDate(currentWeek.start.getDate() + index)
    const dateText = formatDate(date)
    return {
      date: dateText,
      label: dateText.slice(5),
      count: issuedAwardCards.filter((item) => item.date.slice(0, 10) === dateText).length,
    }
  }), [currentWeek.start, issuedAwardCards])

  const semesterAwardData = useMemo(() => {
    const monthCount = (semesterEnd.getFullYear() - semesterStart.getFullYear()) * 12 + semesterEnd.getMonth() - semesterStart.getMonth() + 1
    return Array.from({ length: monthCount }, (_, index) => {
      const monthDate = new Date(semesterStart.getFullYear(), semesterStart.getMonth() + index, 1)
      const monthPrefix = formatDate(monthDate).slice(0, 7)
      return {
        date: `${monthPrefix}-01`,
        label: `${monthDate.getMonth() + 1}月`,
        count: issuedAwardCards.filter((item) => item.date.slice(0, 7) === monthPrefix).length,
      }
    })
  }, [issuedAwardCards, semesterEnd, semesterStart])

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

  const weeklyAwardCount = useMemo(() => weeklyAwardData.reduce((sum, item) => sum + item.count, 0), [weeklyAwardData])
  const awardTrendData = trendRange === "week" ? weeklyAwardData : semesterAwardData
  const awardTrendRangeLabel = trendRange === "week" ? "本周每日" : "本学期每月"

  const todoTasks = useMemo(() => {
    const pendingEnrollmentsByActivity = new Map<string, number>()
    for (const enrollment of enrollments) {
      if (enrollment.status !== "pending") continue
      pendingEnrollmentsByActivity.set(enrollment.activityId, (pendingEnrollmentsByActivity.get(enrollment.activityId) ?? 0) + 1)
    }

    const enrollmentReviews = Array.from(pendingEnrollmentsByActivity, ([activityId, count]) => {
      const activity = activities.find((item) => item.id === activityId)
      return activity ? { id: `review-${activityId}`, title: "审核活动报名", detail: activity.title, status: `${count} 人待审核`, kind: "review" as const } : null
    }).filter((task): task is NonNullable<typeof task> => task !== null)
    const draftActivities = activities
      .filter((activity) => activity.status === "draft")
      .map((activity) => ({ id: `publish-${activity.id}`, title: "发布活动", detail: activity.title, status: "待发布", kind: "publish" as const }))

    return [...enrollmentReviews, ...draftActivities]
  }, [activities, enrollments])

  const awardPieData = useMemo(() => {
    const range = awardRange === "week" ? currentWeek : awardRange === "month" ? { start: monthStart, end: monthEnd } : { start: semesterStart, end: semesterEnd }
    const counts = new Map<string, number>(AWARD_LEVEL1_LIST.map((level1) => [level1, 0]))
    for (const award of issuedAwardCards) {
      if (!inRange(award.date, range.start, range.end)) continue
      const level1 = getFiveEducationLevel1(award.level1)
      counts.set(level1, (counts.get(level1) ?? 0) + 1)
    }
    return AWARD_LEVEL1_LIST.map((level1) => ({ level1, count: counts.get(level1) ?? 0 }))
  }, [awardRange, currentWeek, issuedAwardCards, monthEnd, monthStart, semesterEnd, semesterStart])

  const awardPieOption = useMemo<EChartsOption>(() => ({
    animationDuration: 360,
    animationEasing: "cubicOut",
    color: ["#5296dc", "#55b691", "#e4a354", "#d8bd54", "#9d86d9"],
    tooltip: { trigger: "item", backgroundColor: "#ffffff", borderColor: "#d7e2ef", borderWidth: 1, textStyle: { color: "#304554", fontSize: 12 }, formatter: "{b}：<strong>{c}</strong> 张（{d}%）" },
    legend: { bottom: 0, itemWidth: 9, itemHeight: 9, itemGap: 11, textStyle: { color: "#71808a", fontSize: 10 } },
    series: [{ type: "pie", radius: ["46%", "72%"], center: ["50%", "43%"], padAngle: 2, itemStyle: { borderColor: "#ffffff", borderWidth: 2, borderRadius: 5 }, label: { show: true, color: "#536671", fontSize: 10, formatter: "{b}\n{c} 张" }, labelLine: { length: 7, length2: 5, lineStyle: { color: "#b9c9d0" } }, data: awardPieData.map((item) => ({ name: item.level1, value: item.count })) }],
  }), [awardPieData])

  return (
    <div className={cn("flex min-h-0 flex-col gap-5 bg-transparent p-0 sm:gap-6", styles.dashboard, roleStyles.workspaceHome)}>
      <section className={cn("p-5 sm:p-6", styles.card, styles.overviewCard)} aria-labelledby="admin-overview-title">
        <div><h1 id="admin-overview-title" className="text-xl font-bold tracking-tight text-foreground">管理员首页</h1></div>
        <div className={cn(roleStyles.homeMetaGrid, styles.overviewMetrics)} aria-label="学校工作摘要"><div className={roleStyles.homeMetaItem}><p className={roleStyles.homeMetaLabel}>在校班级</p><strong className={roleStyles.homeMetaValue}>{classes.length}<span className={roleStyles.homeMetaHint}>个</span></strong></div><div className={roleStyles.homeMetaItem}><p className={roleStyles.homeMetaLabel}>学生总数</p><strong className={roleStyles.homeMetaValue}>{students.length}<span className={roleStyles.homeMetaHint}>名</span></strong></div><div className={roleStyles.homeMetaItem}><p className={roleStyles.homeMetaLabel}>本周奖卡发放</p><strong className={roleStyles.homeMetaValue}>{weeklyAwardCount}<span className={roleStyles.homeMetaHint}>张</span></strong></div><div className={roleStyles.homeMetaItem}><p className={roleStyles.homeMetaLabel}>待办事项</p><strong className={roleStyles.homeMetaValue}>{todoTasks.length}<span className={roleStyles.homeMetaHint}>项</span></strong></div></div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="award-trend-title">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><TrendingUp className="size-5" aria-hidden="true" /></span><div><h2 id="award-trend-title" className="text-[15px] font-bold tracking-tight text-foreground">奖卡发放趋势</h2></div></div><div className="flex shrink-0 rounded-lg bg-primary/10 p-0.5" role="group" aria-label="奖卡发放趋势统计周期">{(["week", "semester"] as AwardTrendRange[]).map((range) => <button key={range} type="button" aria-pressed={trendRange === range} onClick={() => setTrendRange(range)} className={cn("min-h-11 rounded-md px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", trendRange === range ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-primary")}>{AWARD_TREND_RANGE_LABEL[range]}</button>)}</div></div>
          <div className="mt-3 min-h-0 flex-1"><AwardLineChart data={awardTrendData} rangeLabel={awardTrendRangeLabel} /></div>
        </section>

        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="admin-todos-title">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff3db] text-[#a66a12]"><ClipboardCheck className="size-5" aria-hidden="true" /></span><div><h2 id="admin-todos-title" className="text-[15px] font-bold tracking-tight text-foreground">待办事项</h2></div></div><span className="rounded-full bg-[#fff3db] px-2.5 py-1 text-xs font-bold tabular-nums text-[#9a5e08]">{todoTasks.length} 项</span></div>
          {todoTasks.length > 0 ? <ul aria-label="管理员待办任务列表" className="mt-3 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fffdf9] px-3 pr-2">{todoTasks.map((task) => <li key={task.id}><button type="button" onClick={() => onNavigate("activity")} className="group flex min-h-[60px] w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-[#fff8ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", task.kind === "review" ? "bg-[#fff3db] text-[#a66a12]" : "bg-[#edf1ff] text-primary")}>{task.kind === "review" ? <ClipboardCheck className="size-4" aria-hidden="true" /> : <CalendarDays className="size-4" aria-hidden="true" />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground group-hover:text-primary">{task.title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{task.detail}</span></span><span className="shrink-0 text-xs font-semibold text-[#9a5e08]">{task.status}</span><ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></button></li>)}</ul> : <div className="mt-3 flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] bg-[#fffdf9] text-sm text-muted-foreground"><ClipboardCheck className="mb-2 size-5 text-brand-green" aria-hidden="true" />当前暂无待处理任务</div>}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.awardPieCard)} aria-labelledby="award-distribution-title">
          <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f7ef] text-[#21845b]"><PieChart className="size-5" aria-hidden="true" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-2"><h2 id="award-distribution-title" className="text-[15px] font-bold tracking-tight text-foreground">奖卡分布</h2><div className="flex rounded-lg bg-[#edf7f3] p-0.5" role="group" aria-label="奖卡分布统计周期">{(["week", "month", "semester"] as AwardRange[]).map((range) => <button key={range} type="button" aria-pressed={awardRange === range} onClick={() => setAwardRange(range)} className={cn("min-h-7 rounded-md px-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", awardRange === range ? "bg-white text-[#21845b] shadow-sm" : "text-muted-foreground hover:text-[#21845b]")}>{AWARD_RANGE_LABEL[range]}</button>)}</div></div></div></div>
          <div className="mt-2 min-h-0 flex-1"><EChart className={styles.chart} option={awardPieOption} ariaLabel={`${AWARD_RANGE_LABEL[awardRange]}奖卡分布：${awardPieData.map((item) => `${item.level1}${item.count}张`).join("、")}`} /></div>
        </section>

        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="activity-title">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#f2f0ff] text-[#7166b3]"><CalendarDays className="size-5" aria-hidden="true" /></span><div><h2 id="activity-title" className="text-[15px] font-bold tracking-tight text-foreground">本月举办活动</h2></div></div><button type="button" onClick={() => onNavigate("activity")} className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[#7166b3] transition hover:bg-[#f2f0ff] hover:text-[#5d539d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">全部活动<ArrowRight className="size-3.5" aria-hidden="true" /></button></div>
          {monthActivities.length > 0 ? <div tabIndex={0} aria-label="本月举办活动" className="mt-3 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fbfcff] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{monthActivities.map((activity) => <button key={activity.id} type="button" onClick={() => onNavigate("activity")} className="group flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-[#f3f1ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f0ff] text-[#7166b3]"><CalendarDays className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground group-hover:text-[#7166b3]">{activity.title}</span><span className="mt-1 block truncate text-xs tabular-nums text-muted-foreground">{activity.startDate.replace("T", " ")}</span></span><ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" /></button>)}</div> : <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">本月暂无活动</div>}
        </section>

        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="points-ranking-title">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#fff3db] text-[#b66d0a]"><Trophy className="size-5" aria-hidden="true" /></span><div><h2 id="points-ranking-title" className="text-[15px] font-bold tracking-tight text-foreground">本学期五育积分总分排行</h2></div></div><Link href="/admin-data-dashboard" target="_top" className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[#9a5e08] transition hover:bg-[#fff3db] hover:text-[#8f5708] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看全部<ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>
          {pointsRanking.length > 0 ? <ol tabIndex={0} className="mt-3 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fffcf6] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" aria-label="五育积分排名（同分并列）">{pointsRanking.map((student) => <li key={student.id} className="flex min-h-14 items-center gap-3 py-2 transition-colors hover:bg-[#fff8ea]"><RankMark rank={student.rank} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{student.name}</span><span className="block truncate text-xs text-muted-foreground">{student.className}</span></span><span className="shrink-0 text-sm font-bold tabular-nums text-[#b66d0a]">{student.points} 分</span></li>)}</ol> : <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">本学期暂无学生积分记录</div>}
        </section>
      </div>
    </div>
  )
}
