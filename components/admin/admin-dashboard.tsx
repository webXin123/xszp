"use client"

import { useMemo, useState } from "react"
import type { EChartsOption } from "echarts"
import { Award, ArrowRight, CalendarDays, ClipboardList, FileSpreadsheet, LayoutGrid, NotebookPen, PieChart, ShoppingBag, Trophy, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { computeWeeklyScore, formatDate, getISOWeekKey } from "@/lib/scoring-utils"
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

const AWARD_RANGE_LABEL: Record<AwardRange, string> = { week: "本周", month: "本月", semester: "本学期" }

function LegacyAdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { records, awardCards, honors, activities, students, classes } = useEvaluation()
  const [awardRange, setAwardRange] = useState<AwardRange>("week")

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

  const issuedAwardCards = useMemo(
    () => awardCards.filter((award) => award.source === "online" || award.source === "offline_scan"),
    [awardCards],
  )

  const dailyAwardData = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - 6 + index)
    const dateText = formatDate(date)
    return { date: dateText, count: issuedAwardCards.filter((item) => item.date === dateText).length }
  }), [issuedAwardCards])

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

  const awardTotal = useMemo(() => awardPieData.reduce((total, item) => total + item.count, 0), [awardPieData])

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
        <div><h1 id="admin-overview-title" className="text-xl font-bold tracking-tight text-foreground">管理员首页</h1><p className="mt-1 text-sm text-muted-foreground">聚焦本周重点，轻松掌握录入与激励进展</p></div>
        <div className={roleStyles.homeMetaGrid} aria-label="学校工作摘要"><div className={roleStyles.homeMetaItem}><p className={roleStyles.homeMetaLabel}>在校班级</p><strong className={roleStyles.homeMetaValue}>{classes.length}<span className={roleStyles.homeMetaHint}>个</span></strong></div><div className={roleStyles.homeMetaItem}><p className={roleStyles.homeMetaLabel}>学生总数</p><strong className={roleStyles.homeMetaValue}>{students.length}<span className={roleStyles.homeMetaHint}>名</span></strong></div><div className={roleStyles.homeMetaItem}><p className={roleStyles.homeMetaLabel}>本周奖卡发放</p><strong className={roleStyles.homeMetaValue}>{weeklyAwardCount}<span className={roleStyles.homeMetaHint}>张</span></strong></div></div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="award-trend-title">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><TrendingUp className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold text-primary">激励活跃度</p><h3 id="award-trend-title" className="mt-0.5 text-[15px] font-bold tracking-tight text-foreground">最近一周奖卡发放趋势</h3></div></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold tabular-nums text-primary">本周 {weeklyAwardCount} 张</span></div>
          <div className="mt-3 min-h-0 flex-1"><AwardLineChart data={dailyAwardData} /></div>
        </section>

        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.awardPieCard)} aria-labelledby="award-count-title">
          <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f7ef] text-[#21845b]"><PieChart className="size-5" aria-hidden="true" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-2"><h3 id="award-count-title" className="text-[15px] font-bold tracking-tight text-foreground">奖卡发放数量</h3><div className="flex rounded-lg bg-[#edf7f3] p-0.5" role="group" aria-label="奖卡发放数量统计周期">{(["week", "month", "semester"] as AwardRange[]).map((range) => <button key={range} type="button" aria-pressed={awardRange === range} onClick={() => setAwardRange(range)} className={cn("min-h-7 rounded-md px-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", awardRange === range ? "bg-white text-[#21845b] shadow-sm" : "text-muted-foreground hover:text-[#21845b]")}>{AWARD_RANGE_LABEL[range]}</button>)}</div></div><p className="mt-1 text-xs text-muted-foreground">线上、线下发放 · 按五育指标分布</p></div></div>
          <div className="mt-2 min-h-0 flex-1"><EChart className={styles.chart} option={awardPieOption} ariaLabel={`${AWARD_RANGE_LABEL[awardRange]}奖卡发放数量分布：${awardPieData.map((item) => `${item.level1}${item.count}张`).join("、")}`} /></div>
          <p className="mt-1 text-[11px] text-muted-foreground">共 {awardTotal} 张奖卡，不含流动红旗奖励。</p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="class-ranking-title">
          <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold text-primary">班级运营</p><h3 id="class-ranking-title" className="mt-0.5 text-[15px] font-bold tracking-tight text-foreground">上周班级总分排名</h3><p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{formatDate(previousWeek.start)} 至 {formatDate(previousWeek.end)}</p></div></div><button type="button" onClick={() => onNavigate("ranking")} aria-label="查看班级排行榜" className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-bold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看排行<ArrowRight className="size-3.5" aria-hidden="true" /></button></div>
          {lastWeekClassRanking.length > 0 ? <ol tabIndex={0} aria-label="上周班级总分排名（同分并列）" className="mt-3 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fbfcff] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{lastWeekClassRanking.map((schoolClass) => <li key={schoolClass.id} className="flex items-center gap-3 py-2.5 transition-colors hover:bg-primary/[0.04]"><RankMark rank={schoolClass.rank} /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{schoolClass.name}</span><span className="shrink-0 text-sm font-bold tabular-nums text-primary">{schoolClass.total} 分</span></li>)}</ol> : <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">上周暂无班级评价记录</div>}
        </section>

        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="activity-title">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#f2f0ff] text-[#7166b3]"><CalendarDays className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold text-[#7166b3]">校园日程</p><h3 id="activity-title" className="mt-0.5 text-[15px] font-bold tracking-tight text-foreground">本月举办活动</h3></div></div><button type="button" onClick={() => onNavigate("activity")} className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[#7166b3] transition hover:bg-[#f2f0ff] hover:text-[#5d539d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">全部活动<ArrowRight className="size-3.5" aria-hidden="true" /></button></div>
          {monthActivities.length > 0 ? <div tabIndex={0} aria-label="本月举办活动" className="mt-3 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fbfcff] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{monthActivities.map((activity) => <button key={activity.id} type="button" onClick={() => onNavigate("activity")} className="group flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-[#f3f1ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f0ff] text-[#7166b3]"><CalendarDays className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground group-hover:text-[#7166b3]">{activity.title}</span><span className="mt-1 block truncate text-xs tabular-nums text-muted-foreground">{activity.startDate.replace("T", " ")}</span></span><ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" /></button>)}</div> : <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">本月暂无活动</div>}
        </section>

        <section className={cn("flex h-[320px] min-h-0 flex-col p-4 sm:p-5", styles.card, styles.contentCard)} aria-labelledby="points-ranking-title">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#fff3db] text-[#b66d0a]"><Trophy className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold text-[#b66d0a]">成长激励</p><h3 id="points-ranking-title" className="mt-0.5 text-[15px] font-bold tracking-tight text-foreground">本学期五育积分总分排行</h3></div></div><button type="button" onClick={() => onNavigate("dashboard")} className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[#9a5e08] transition hover:bg-[#fff3db] hover:text-[#8f5708] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看全部<ArrowRight className="size-3.5" aria-hidden="true" /></button></div>
          {pointsRanking.length > 0 ? <ol tabIndex={0} className="mt-3 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fffcf6] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" aria-label="五育积分排名（同分并列）">{pointsRanking.map((student) => <li key={student.id} className="flex min-h-14 items-center gap-3 py-2 transition-colors hover:bg-[#fff8ea]"><RankMark rank={student.rank} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{student.name}</span><span className="block truncate text-xs text-muted-foreground">{student.className}</span></span><span className="shrink-0 text-sm font-bold tabular-nums text-[#b66d0a]">{student.points} 分</span></li>)}</ol> : <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">本学期暂无学生积分记录</div>}
        </section>
      </div>
    </div>
  )
}
