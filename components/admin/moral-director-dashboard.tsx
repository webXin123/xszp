"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Award,
  ArrowRight,
  ClipboardCheck,
  Flag,
  LayoutGrid,
  MinusCircle,
  Settings2,
  TrendingDown,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { formatDate, getISOWeekKey, getWeekRange } from "@/lib/scoring-utils"
import { getMonthRange, getSemesterRange, inRange, TIME_RANGE_LABEL, type TimeRange } from "@/lib/points-utils"
import { AWARD_LEVEL1_LIST, getFiveEducationLevel1 } from "@/lib/award-utils"
import { AwardBarChart } from "../homeroom/award-bar-chart"
import type { MainTab } from "../evaluation/evaluation-dashboard"

interface MoralDirectorDashboardProps {
  onNavigate: (tab: MainTab) => void
}

function ShortcutCard({
  label,
  description,
  icon: Icon,
  href,
  onClick,
  tone,
}: {
  label: string
  description: string
  icon: typeof LayoutGrid
  href?: string
  onClick?: () => void
  tone: string
}) {
  const content = (
    <>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-foreground">{label}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </>
  )
  const className = "group flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl border border-[#dbe3f6] bg-white px-3.5 py-3 text-left shadow-[0_10px_22px_-22px_rgba(48,62,139,0.7)] transition-colors duration-200 hover:border-primary/40 hover:bg-[#fbfcff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
  return href ? <Link href={href} className={className}>{content}</Link> : <button type="button" onClick={onClick} className={className}>{content}</button>
}

export function MoralDirectorDashboard({ onNavigate }: MoralDirectorDashboardProps) {
  const { records, classes, flags, flagConfigs, awardCards, teachers } = useEvaluation()
  const now = new Date()
  const weekKey = getISOWeekKey(now)
  const currentWeek = getWeekRange(now)
  const previousWeekDate = new Date(currentWeek.start)
  previousWeekDate.setDate(previousWeekDate.getDate() - 7)
  const previousWeekKey = getISOWeekKey(previousWeekDate)
  const classNameById = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes])
  const flagConfigById = useMemo(() => new Map(flagConfigs.map((item) => [item.id, item])), [flagConfigs])
  const defaultWeekFlagConfig = useMemo(() => flagConfigs.find((item) => item.enabled && item.period === "week"), [flagConfigs])
  const teacherIds = useMemo(() => new Set(teachers.map((teacher) => teacher.id)), [teachers])

  const weekDeductionRecords = useMemo(
    () => records
      .filter((record) => record.totalDeduction < 0 && getISOWeekKey(new Date(record.date)) === weekKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [records, weekKey],
  )
  const deductionsLoadMore = useLoadMore(weekDeductionRecords, 6)
  const deductionsScroll = useScrollLoadMore(deductionsLoadMore.hasMore, deductionsLoadMore.loadMore)

  const weeklyTotals = useMemo(() => records
    .filter((record) => getISOWeekKey(new Date(record.date)) === weekKey)
    .reduce((totals, record) => {
      if (record.totalDeduction < 0) totals.deduction += Math.abs(record.totalDeduction)
      if (record.totalDeduction > 0) totals.addition += record.totalDeduction
      return totals
    }, { deduction: 0, addition: 0 }), [records, weekKey])

  const lastWeekFlags = useMemo(() => {
    const seen = new Set<string>()
    return flags
      .filter((flag) => flag.awarded && flag.weekKey === previousWeekKey && (flag.period ?? "week") === "week")
      .filter((flag) => {
        if (seen.has(flag.classId)) return false
        seen.add(flag.classId)
        return true
      })
      .map((flag) => {
        const config = flagConfigById.get(flag.configId ?? "") ?? defaultWeekFlagConfig
        return {
          ...flag,
          className: classNameById.get(flag.classId) ?? "未命名班级",
          flagName: config?.name ?? "流动红旗",
          image: config?.image ?? "/xszp/images/flag-issued.svg",
        }
      })
  }, [classNameById, defaultWeekFlagConfig, flagConfigById, flags, previousWeekKey])

  const onlineTeacherAwards = useMemo(
    () => awardCards.filter((award) => award.source === "online" && teacherIds.has(award.operatorId)),
    [awardCards, teacherIds],
  )
  const [awardRange, setAwardRange] = useState<TimeRange>("week")
  const awardBarData = useMemo(() => {
    const range = awardRange === "week" ? currentWeek : awardRange === "month" ? getMonthRange(now) : getSemesterRange(now)
    const counts = new Map<string, number>()
    for (const level1 of AWARD_LEVEL1_LIST) counts.set(level1, 0)
    for (const award of onlineTeacherAwards) {
      if (!inRange(award.date, range.start, range.end)) continue
      const level1 = getFiveEducationLevel1(award.level1)
      counts.set(level1, (counts.get(level1) ?? 0) + 1)
    }
    return AWARD_LEVEL1_LIST.map((level1) => ({ level1, points: counts.get(level1) ?? 0 }))
  }, [awardRange, currentWeek, now, onlineTeacherAwards])
  const latestAwardRecords = useMemo(
    () => onlineTeacherAwards
      .filter((award) => getISOWeekKey(new Date(award.date)) === weekKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [onlineTeacherAwards, weekKey],
  )
  const latestAwardsLoadMore = useLoadMore(latestAwardRecords, 5)
  const latestAwardsScroll = useScrollLoadMore(latestAwardsLoadMore.hasMore, latestAwardsLoadMore.loadMore)

  const shortcuts = [
    { label: "班级评价", description: "查看与录入班级表现", icon: LayoutGrid, href: "/class-evaluation", tone: "bg-[#edf1ff] text-primary" },
    { label: "流动红旗颁发", description: "按班级排行颁发荣誉", icon: Flag, href: "/class-ranking", tone: "bg-[#fff3db] text-[#c27a12]" },
    { label: "班级评价配置", description: "维护指标与红旗规则", icon: Settings2, href: "/class-evaluation-config", tone: "bg-[#f2f0ff] text-[#7166b3]" },
    { label: "奖卡发放", description: "为学生发放五育奖卡", icon: Award, onClick: () => onNavigate("award"), tone: "bg-[#e7f7ef] text-[#21845b]" },
  ]

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <section className="overflow-hidden rounded-2xl border border-[#cfd7f6] border-t-[3px] border-t-brand-green bg-white px-5 py-5 shadow-[0_15px_34px_-28px_rgba(48,62,139,0.68)] sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-brand-green">德育工作台</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">德育主任首页</h2>
            <p className="mt-1 text-xs text-muted-foreground">班级评价、流动红旗与奖卡发放一站式管理</p>
          </div>
          <span className="rounded-full border border-[#dbe3fa] bg-[#f8faff] px-3 py-1.5 text-xs font-medium tabular-nums text-primary">本周 {formatDate(currentWeek.start)} 至 {formatDate(currentWeek.end)}</span>
        </div>
        <div className="mt-5 grid gap-2.5 border-t border-[#e4e9fa] pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((shortcut) => <ShortcutCard key={shortcut.label} {...shortcut} />)}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
        <section className="flex h-[360px] min-h-0 flex-col overflow-hidden rounded-2xl border border-[#cfd7f6] border-t-2 border-t-brand-orange bg-white p-5 shadow-[0_15px_34px_-28px_rgba(48,62,139,0.68)] sm:h-[380px] sm:p-6" aria-labelledby="weekly-deductions-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0e9] text-brand-orange"><TrendingDown className="size-5" aria-hidden="true" /></span>
              <div><h3 id="weekly-deductions-title" className="text-base font-bold text-foreground">本周班级扣分情况</h3><p className="mt-1 text-xs text-muted-foreground">共 {weekDeductionRecords.length} 条扣分记录 · 上拉可加载更多</p></div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#fff0e9] px-2"><span className="text-[11px] text-muted-foreground">总扣分</span><span className="text-sm font-bold tabular-nums text-brand-orange">{weeklyTotals.deduction}</span></span>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#effbf4] px-2"><span className="text-[11px] text-muted-foreground">总积分</span><span className="text-sm font-bold tabular-nums text-brand-green">{weeklyTotals.addition}</span></span>
            </div>
          </div>
          {weekDeductionRecords.length === 0 ? <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">本周暂无班级扣分记录</div> : <ul className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#e2e7f8] bg-[#fbfcff] px-2.5 pr-1.5" onScroll={deductionsScroll.onScroll}>{deductionsLoadMore.visible.map((record) => <li key={record.id} className="flex items-start gap-2 border-b border-[#e7ebfa] py-2 last:border-b-0"><MinusCircle className="mt-0.5 size-3.5 shrink-0 text-brand-orange" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-foreground">{classNameById.get(record.classId) ?? "未命名班级"}<span className="font-normal text-muted-foreground"> · {record.level1} / {record.level2}</span></p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{record.note || "暂无备注"}</p></div><div className="flex shrink-0 flex-col items-end"><span className="text-xs font-bold tabular-nums text-brand-orange">-{Math.abs(record.totalDeduction)}</span><span className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{record.date}</span></div></li>)}<li><LoadMoreFooter hasMore={deductionsLoadMore.hasMore} loaded={deductionsLoadMore.visible.length} total={deductionsLoadMore.total} onLoadMore={deductionsLoadMore.loadMore} /></li></ul>}
        </section>

        <section className="flex h-[360px] min-h-0 flex-col overflow-hidden rounded-2xl border border-[#cfd7f6] border-t-2 border-t-[#e0a33a] bg-white p-5 shadow-[0_15px_34px_-28px_rgba(48,62,139,0.68)] sm:h-[380px] sm:p-6" aria-labelledby="last-week-flags-title">
          <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff3db] text-[#c27a12]"><Trophy className="size-5" aria-hidden="true" /></span><div><h3 id="last-week-flags-title" className="text-base font-bold text-foreground">上周流动红旗</h3><p className="mt-1 text-xs text-muted-foreground">表现优秀班级 · {lastWeekFlags.length} 个班级获得</p></div></div><Link href="/class-ranking" aria-label="查看班级排行榜" className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#9a5e08] transition-colors hover:bg-[#fff3db] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看排行榜<ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>
          {lastWeekFlags.length === 0 ? <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#ead8aa] bg-[#fffcf6] text-sm text-muted-foreground">上周暂未颁发流动红旗</div> : <ul className="mt-3 min-h-0 flex-1 divide-y divide-[#f0e6c9] overflow-y-auto rounded-xl border border-[#eadfbd] bg-[#fffcf6] px-2.5 pr-1.5">{lastWeekFlags.map((flag, index) => <li key={`${flag.classId}-${flag.configId ?? index}`} className="flex items-center gap-2.5 py-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fff0b8] text-xs font-black tabular-nums text-[#9a6b16]">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-foreground">{flag.className}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{flag.flagName} · 上周周榜</span></span><img src={flag.image} alt={`${flag.flagName}图片`} width={32} height={32} loading="lazy" className="size-8 shrink-0 rounded-lg object-cover" /></li>)}</ul>}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="rounded-2xl border border-[#cfd7f6] border-t-2 border-t-brand-green bg-white p-5 shadow-[0_15px_34px_-28px_rgba(48,62,139,0.68)] sm:p-6" aria-labelledby="award-count-title">
          <div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f7ef] text-[#21845b]"><ClipboardCheck className="size-5" aria-hidden="true" /></span><div><h3 id="award-count-title" className="text-base font-bold text-foreground">奖卡发放数量</h3><p className="mt-1 text-xs text-muted-foreground">全部教师线上发放 · 按一级指标分布</p></div></div>
          <div className="mt-4 flex gap-1 rounded-xl bg-[#f3f6ff] p-1" role="tablist" aria-label="奖卡发放数量统计周期">{(["week", "month", "semester"] as TimeRange[]).map((range) => <button key={range} type="button" role="tab" aria-selected={awardRange === range} onClick={() => setAwardRange(range)} className={cn("min-h-9 flex-1 rounded-lg px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", awardRange === range ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/70 hover:text-foreground")}>{TIME_RANGE_LABEL[range]}</button>)}</div>
          <div className="mt-3"><AwardBarChart data={awardBarData} unit="张" /></div>
          <p className="mt-1 text-[11px] text-muted-foreground">统计线上奖卡，不含线下扫码与流动红旗奖励。</p>
        </section>

        <section className="flex h-[380px] min-h-0 flex-col rounded-2xl border border-[#cfd7f6] border-t-2 border-t-primary bg-white p-5 shadow-[0_15px_34px_-28px_rgba(48,62,139,0.68)] sm:h-[400px] sm:p-6" aria-labelledby="latest-awards-title">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf1ff] text-primary"><Award className="size-5" aria-hidden="true" /></span><div><h3 id="latest-awards-title" className="text-base font-bold text-foreground">最新一周奖卡发放动态</h3><p className="mt-1 text-xs text-muted-foreground">默认显示最新 5 条 · 上拉加载更多</p></div></div><button type="button" onClick={() => onNavigate("award")} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看发卡<ArrowRight className="size-3.5" aria-hidden="true" /></button></div>
          {latestAwardRecords.length === 0 ? <div className="mt-4 flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#cfd7f6] text-sm text-muted-foreground">本周暂无奖卡发放动态</div> : <ul aria-label="最新一周奖卡发放动态" tabIndex={0} className="mt-4 min-h-0 flex-1 divide-y divide-[#e7ebfa] overflow-y-auto overscroll-contain rounded-xl border border-[#e2e7f8] bg-[#fbfcff] px-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" onScroll={latestAwardsScroll.onScroll}>{latestAwardsLoadMore.visible.map((award) => <li key={award.id} className="flex items-center gap-3 py-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#edf1ff] text-primary"><Award className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{award.studentName}<span className="font-normal text-muted-foreground"> · {classNameById.get(award.classId) ?? "未命名班级"}</span></span><span className="mt-1 block truncate text-xs text-muted-foreground">{award.level1} · {award.operatorName}</span></span><span className="shrink-0 text-right"><span className="block text-xs font-semibold text-brand-green">+{award.points} 分</span><span className="mt-1 block text-xs tabular-nums text-muted-foreground">{award.date}</span></span></li>)}<li><LoadMoreFooter hasMore={latestAwardsLoadMore.hasMore} loaded={latestAwardsLoadMore.visible.length} total={latestAwardsLoadMore.total} onLoadMore={latestAwardsLoadMore.loadMore} /></li></ul>}
        </section>
      </div>
    </div>
  )
}
