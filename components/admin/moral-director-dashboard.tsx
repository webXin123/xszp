"use client"

import { useMemo, useState } from "react"
import type { EChartsOption } from "echarts"
import {
  Award,
  ArrowRight,
  ChartNoAxesCombined,
  Flag,
  LayoutGrid,
  PieChart,
  Settings2,
  Trophy,
  UsersRound,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { formatDate, getAllIndicatorsMaxScore, getISOWeekKey, getWeekRange } from "@/lib/scoring-utils"
import { getMonthRange, getSemesterRange, inRange, TIME_RANGE_LABEL, type TimeRange } from "@/lib/points-utils"
import { AWARD_LEVEL1_LIST, getFiveEducationLevel1 } from "@/lib/award-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EChart } from "../command-center/echart"
import type { MainTab } from "../evaluation/evaluation-dashboard"
import styles from "./moral-director-dashboard.module.css"
import roleStyles from "../role-home.module.css"

interface MoralDirectorDashboardProps {
  onNavigate: (tab: MainTab) => void
}

function getTimeRange(range: TimeRange, now: Date) {
  return range === "week" ? getWeekRange(now) : range === "month" ? getMonthRange(now) : getSemesterRange(now)
}

function TimeRangeControl({
  value,
  onChange,
  label,
  className,
}: {
  value: TimeRange
  onChange: (range: TimeRange) => void
  label: string
  className?: string
}) {
  return <div className={cn(styles.segmentedControl, className)} role="group" aria-label={label}>{(["week", "month", "semester"] as TimeRange[]).map((range) => <button key={range} type="button" aria-pressed={value === range} onClick={() => onChange(range)} className={cn(styles.segment, value === range && styles.segmentActive)}>{TIME_RANGE_LABEL[range]}</button>)}</div>
}

export function MoralDirectorDashboard({ onNavigate }: MoralDirectorDashboardProps) {
  const { records, classes, grades, flags, flagConfigs, awardCards, teachers } = useEvaluation()
  const now = new Date()
  const currentWeek = getWeekRange(now)
  const previousWeekDate = new Date(currentWeek.start)
  previousWeekDate.setDate(previousWeekDate.getDate() - 7)
  const previousWeekKey = getISOWeekKey(previousWeekDate)
  const classNameById = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes])
  const teacherNameById = useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher.name])), [teachers])
  const flagConfigById = useMemo(() => new Map(flagConfigs.map((item) => [item.id, item])), [flagConfigs])
  const defaultWeekFlagConfig = useMemo(() => flagConfigs.find((item) => item.enabled && item.period === "week"), [flagConfigs])
  const teacherIds = useMemo(() => new Set(teachers.map((teacher) => teacher.id)), [teachers])

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
  const issuedAwardCards = useMemo(
    () => awardCards.filter((award) => award.source === "online" || award.source === "offline_scan"),
    [awardCards],
  )
  const [awardRange, setAwardRange] = useState<TimeRange>("week")
  const [teacherAwardRange, setTeacherAwardRange] = useState<TimeRange>("week")
  const [classScoreRange, setClassScoreRange] = useState<TimeRange>("week")
  const [gradeFilter, setGradeFilter] = useState("all")
  const gradeFilterLabel = gradeFilter === "all" ? "全部年级" : grades.find((grade) => grade.id === gradeFilter)?.name ?? "全部年级"

  const awardPieData = useMemo(() => {
    const range = getTimeRange(awardRange, now)
    const counts = new Map<string, number>()
    for (const level1 of AWARD_LEVEL1_LIST) counts.set(level1, 0)
    for (const award of issuedAwardCards) {
      if (!inRange(award.date, range.start, range.end)) continue
      const level1 = getFiveEducationLevel1(award.level1)
      counts.set(level1, (counts.get(level1) ?? 0) + 1)
    }
    return AWARD_LEVEL1_LIST.map((level1) => ({ level1, points: counts.get(level1) ?? 0 }))
  }, [awardRange, issuedAwardCards, now])
  const awardTotal = useMemo(() => awardPieData.reduce((total, item) => total + item.points, 0), [awardPieData])

  const teacherAwardFrequency = useMemo(() => {
    const range = getTimeRange(teacherAwardRange, now)
    const counts = new Map(teachers.map((teacher) => [teacher.id, 0]))
    for (const award of onlineTeacherAwards) {
      if (inRange(award.date, range.start, range.end)) counts.set(award.operatorId, (counts.get(award.operatorId) ?? 0) + 1)
    }
    return teachers
      .map((teacher) => ({ name: teacherNameById.get(teacher.id) ?? teacher.name, count: counts.get(teacher.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"))
  }, [now, onlineTeacherAwards, teacherAwardRange, teacherNameById, teachers])

  const classScoreData = useMemo(() => {
    const range = getTimeRange(classScoreRange, now)
    const baseline = getAllIndicatorsMaxScore()
    const gradeOrder = new Map(grades.map((grade, index) => [grade.id, index]))
    return classes
      .filter((schoolClass) => gradeFilter === "all" || schoolClass.gradeId === gradeFilter)
      .sort((a, b) => (gradeOrder.get(a.gradeId) ?? 0) - (gradeOrder.get(b.gradeId) ?? 0) || a.name.localeCompare(b.name, "zh-CN"))
      .map((schoolClass) => {
        const delta = records
          .filter((record) => record.classId === schoolClass.id && inRange(record.date, range.start, range.end))
          .reduce((total, record) => total + record.totalDeduction, 0)
        return { name: schoolClass.shortName || schoolClass.name, score: Number((baseline + delta).toFixed(1)) }
      })
  }, [classScoreRange, classes, gradeFilter, grades, now, records])

  const classScoreOption = useMemo<EChartsOption>(() => ({
    animationDuration: 360,
    animationEasing: "cubicOut",
    grid: { top: 20, right: 18, bottom: 56, left: 42 },
    tooltip: { trigger: "axis", backgroundColor: "#ffffff", borderColor: "#d7e2ef", borderWidth: 1, textStyle: { color: "#304554", fontSize: 12 }, formatter: (params: unknown) => { const item = (params as { axisValue: string; data: number }[])[0]; return `${item?.axisValue ?? ""}<br/>班级总分：<strong>${item?.data ?? 0}</strong> 分` } },
    xAxis: { type: "category", boundaryGap: false, data: classScoreData.map((item) => item.name), axisLine: { lineStyle: { color: "#d9e5eb" } }, axisTick: { show: false }, axisLabel: { color: "#71808a", fontSize: 10, rotate: classScoreData.length > 7 ? 34 : 0, interval: 0 } },
    yAxis: { type: "value", name: "分", nameTextStyle: { color: "#8a9aa4", fontSize: 10, padding: [0, 0, 0, -2] }, axisLabel: { color: "#71808a", fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: "#e7eef1", type: "dashed" } } },
    series: [{ type: "line", smooth: 0.28, data: classScoreData.map((item) => item.score), symbol: "circle", symbolSize: 7, lineStyle: { color: "#e28d58", width: 3 }, itemStyle: { color: "#ffffff", borderColor: "#e28d58", borderWidth: 2 }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(226,141,88,.3)" }, { offset: 1, color: "rgba(226,141,88,0)" }] } } }],
  }), [classScoreData])

  const awardPieOption = useMemo<EChartsOption>(() => ({
    animationDuration: 360,
    animationEasing: "cubicOut",
    color: ["#5296dc", "#55b691", "#e4a354", "#d8bd54", "#9d86d9"],
    tooltip: { trigger: "item", backgroundColor: "#ffffff", borderColor: "#d7e2ef", borderWidth: 1, textStyle: { color: "#304554", fontSize: 12 }, formatter: "{b}：<strong>{c}</strong> 张（{d}%）" },
    legend: { bottom: 0, itemWidth: 9, itemHeight: 9, itemGap: 11, textStyle: { color: "#71808a", fontSize: 10 } },
    series: [{ type: "pie", radius: ["46%", "72%"], center: ["50%", "43%"], padAngle: 2, itemStyle: { borderColor: "#ffffff", borderWidth: 2, borderRadius: 5 }, label: { show: true, color: "#536671", fontSize: 10, formatter: "{b}\n{c} 张" }, labelLine: { length: 7, length2: 5, lineStyle: { color: "#b9c9d0" } }, data: awardPieData.map((item) => ({ name: item.level1, value: item.points })) }],
  }), [awardPieData])

  const teacherAwardOption = useMemo<EChartsOption>(() => ({
    animationDuration: 360,
    animationEasing: "cubicOut",
    grid: { top: 16, right: 34, bottom: 12, left: 58, containLabel: false },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "#ffffff", borderColor: "#d7e2ef", borderWidth: 1, textStyle: { color: "#304554", fontSize: 12 }, formatter: (params: unknown) => { const item = (params as { axisValue: string; data: number }[])[0]; return `${item?.axisValue ?? ""}<br/>发卡 <strong>${item?.data ?? 0}</strong> 张` } },
    xAxis: { type: "value", minInterval: 1, axisLabel: { color: "#71808a", fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: "#e7eef1", type: "dashed" } } },
    yAxis: { type: "category", inverse: true, data: teacherAwardFrequency.map((item) => item.name), axisLine: { lineStyle: { color: "#d9e5eb" } }, axisTick: { show: false }, axisLabel: { color: "#536671", fontSize: 11, width: 52, overflow: "truncate" } },
    series: [{ type: "bar", data: teacherAwardFrequency.map((item) => item.count), barMaxWidth: 18, itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#738be9" }, { offset: 1, color: "#9cb6ff" }] }, borderRadius: [0, 8, 8, 0] }, label: { show: true, position: "right", color: "#536671", fontSize: 10, formatter: "{c}" } }],
  }), [teacherAwardFrequency])

  const shortcuts = [
    { label: "班级评价", description: "查看与录入班级表现", icon: LayoutGrid, onClick: () => onNavigate("score"), tone: "bg-[#edf1ff] text-primary" },
    { label: "流动红旗颁发", description: "按班级排行颁发荣誉", icon: Flag, onClick: () => onNavigate("ranking"), tone: "bg-[#fff3db] text-[#c27a12]" },
    { label: "班级评价配置", description: "维护指标与红旗规则", icon: Settings2, onClick: () => onNavigate("class_config"), tone: "bg-[#f2f0ff] text-[#7166b3]" },
    { label: "奖卡发放", description: "为学生发放五育奖卡", icon: Award, onClick: () => onNavigate("award"), tone: "bg-[#e7f7ef] text-[#21845b]" },
  ]

  return (
    <div className={cn(styles.dashboard, roleStyles.workspaceHome)}>
      <section className={styles.hero}>
        <div className={styles.heroHeading}>
          <div>
            <p className={styles.eyebrow}>德育工作台</p>
            <h1 className={styles.pageTitle}>德育主任首页</h1>
            <p className={styles.heroDescription}>轻松掌握本周班级表现，及时完成重点工作。</p>
          </div>
          <span className={styles.datePill}>本周 {formatDate(currentWeek.start)} 至 {formatDate(currentWeek.end)}</span>
        </div>
        <div className={roleStyles.homeMetaGrid} aria-label="德育工作摘要"><div className={roleStyles.homeMetaItem}><p className={roleStyles.homeMetaLabel}>覆盖班级</p><strong className={roleStyles.homeMetaValue}>{classes.length}<span className={roleStyles.homeMetaHint}>个</span></strong></div><div className={roleStyles.homeMetaItem}><p className={roleStyles.homeMetaLabel}>上周流动红旗</p><strong className={roleStyles.homeMetaValue}>{lastWeekFlags.length}<span className={roleStyles.homeMetaHint}>面</span></strong></div><div className={roleStyles.homeMetaItem}><p className={roleStyles.homeMetaLabel}>本周奖卡发放</p><strong className={roleStyles.homeMetaValue}>{awardTotal}<span className={roleStyles.homeMetaHint}>张</span></strong></div></div>
      </section>

      <div className={styles.primaryGrid}>
        <section className={cn(styles.panel, styles.scorePanel)} aria-labelledby="class-score-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0e9] text-brand-orange"><ChartNoAxesCombined className="size-5" aria-hidden="true" /></span>
              <div className="min-w-0"><h3 id="class-score-title" className="text-base font-bold text-foreground">班级总分走势</h3><p className="mt-1 text-xs text-muted-foreground">以 100 分为基准，累计当前统计期加扣分</p></div>
            </div>
            <div className={styles.panelActions}><TimeRangeControl value={classScoreRange} onChange={setClassScoreRange} label="班级总分统计周期" className={cn(styles.titleRangeControl, styles.rangeToneScore)} /><Select value={gradeFilterLabel} onValueChange={(value) => setGradeFilter(value === "全部年级" ? "all" : grades.find((grade) => grade.name === value)?.id ?? "all")}>
              <SelectTrigger aria-label="筛选班级总分年级" className="w-28 bg-white text-xs font-semibold"><SelectValue placeholder="全部年级" /></SelectTrigger>
              <SelectContent><SelectItem value="全部年级">全部年级</SelectItem>{grades.map((grade) => <SelectItem key={grade.id} value={grade.name}>{grade.name}</SelectItem>)}</SelectContent>
            </Select></div>
          </div>
          <div className="mt-3 min-h-0 flex-1"><EChart className={styles.chart} option={classScoreOption} ariaLabel={`${TIME_RANGE_LABEL[classScoreRange]}班级总分走势：${classScoreData.map((item) => `${item.name}${item.score}分`).join("、")}`} /></div>
        </section>

        <section className={cn(styles.panel, styles.flagPanel)} aria-labelledby="last-week-flags-title">
          <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff3db] text-[#c27a12]"><Trophy className="size-5" aria-hidden="true" /></span><div><h3 id="last-week-flags-title" className="text-base font-bold text-foreground">上周流动红旗</h3><p className="mt-1 text-xs text-muted-foreground">表现优秀班级 · {lastWeekFlags.length} 个班级获得</p></div></div><button type="button" onClick={() => onNavigate("ranking")} aria-label="查看班级排行榜" className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#9a5e08] transition-colors hover:bg-[#fff3db] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看排行榜<ArrowRight className="size-3.5" aria-hidden="true" /></button></div>
          {lastWeekFlags.length === 0 ? <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#ead8aa] bg-[#fffcf6] text-sm text-muted-foreground">上周暂未颁发流动红旗</div> : <ul className="mt-3 min-h-0 flex-1 divide-y divide-[#f0e6c9] overflow-y-auto rounded-xl border border-[#eadfbd] bg-[#fffcf6] px-2.5 pr-1.5">{lastWeekFlags.map((flag, index) => <li key={`${flag.classId}-${flag.configId ?? index}`} className="flex items-center gap-2.5 py-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fff0b8] text-xs font-black tabular-nums text-[#9a6b16]">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-foreground">{flag.className}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{flag.flagName} · 上周周榜</span></span><img src={flag.image} alt={`${flag.flagName}图片`} width={32} height={32} loading="lazy" className="size-8 shrink-0 rounded-lg object-cover" /></li>)}</ul>}
        </section>
      </div>

      <div className={styles.secondaryGrid}>
        <section className={cn(styles.panel, styles.awardPanel)} aria-labelledby="award-count-title">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f7ef] text-[#21845b]"><PieChart className="size-5" aria-hidden="true" /></span><div className="min-w-0"><h3 id="award-count-title" className="text-base font-bold text-foreground">奖卡发放数量</h3><p className="mt-1 text-xs text-muted-foreground">线上、线下发放 · 按五育指标分布</p></div></div><TimeRangeControl value={awardRange} onChange={setAwardRange} label="奖卡发放数量统计周期" className={cn(styles.titleRangeControl, styles.rangeToneAward)} /></div>
          <div className="mt-3 min-h-0 flex-1"><EChart className={styles.chart} option={awardPieOption} ariaLabel={`${TIME_RANGE_LABEL[awardRange]}奖卡发放数量分布：${awardPieData.map((item) => `${item.level1}${item.points}张`).join("、")}`} /></div>
          <p className="mt-1 text-[11px] text-muted-foreground">共 {awardTotal} 张奖卡，不含流动红旗奖励。</p>
        </section>

        <section className={cn(styles.panel, styles.feedPanel)} aria-labelledby="teacher-award-frequency-title">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf1ff] text-primary"><UsersRound className="size-5" aria-hidden="true" /></span><div className="min-w-0"><h3 id="teacher-award-frequency-title" className="text-base font-bold text-foreground">全校教师发卡频次</h3><p className="mt-1 text-xs text-muted-foreground">{TIME_RANGE_LABEL[teacherAwardRange]} · {teachers.length} 位教师线上发卡统计</p></div></div><div className={styles.panelActions}><TimeRangeControl value={teacherAwardRange} onChange={setTeacherAwardRange} label="教师发卡频次统计周期" className={cn(styles.titleRangeControl, styles.rangeToneTeacher)} /><button type="button" onClick={() => onNavigate("award")} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看发卡<ArrowRight className="size-3.5" aria-hidden="true" /></button></div></div>
          <div className="mt-3 min-h-0 flex-1"><EChart className={styles.chart} option={teacherAwardOption} ariaLabel={`${TIME_RANGE_LABEL[teacherAwardRange]}全校教师发卡频次：${teacherAwardFrequency.map((item) => `${item.name}${item.count}张`).join("、")}`} /></div>
        </section>
      </div>
    </div>
  )
}
