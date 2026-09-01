"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Award,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  HeartPulse,
  Inbox,
  School,
  Send,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"
import { formatDateRangeLabel, getISOWeekKey } from "@/lib/scoring-utils"
import { getMonthRange, getSemesterRange, getWeekRange, inRange, TIME_RANGE_LABEL, type TimeRange } from "@/lib/points-utils"
import { PE_CLASSES, getSemesterLabel } from "@/lib/pe-scores"
import type { MainTab } from "../evaluation/evaluation-dashboard"

const BAR_COLORS = [
  "bg-brand-blue",
  "bg-brand-green",
  "bg-brand-orange",
  "bg-brand-yellow",
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-primary",
]

interface SubjectDashboardProps {
  onNavigate: (tab: MainTab) => void
}

export function SubjectDashboard({ onNavigate }: SubjectDashboardProps) {
  const { awardCards, currentTeacher, peScoreUploads } = useEvaluation()
  const { role, awardClasses, peClassIds } = usePermission()
  const [range, setRange] = useState<TimeRange>("week")
  const [classId, setClassId] = useState<string>("")
  const [classMenuOpen, setClassMenuOpen] = useState(false)

  const isPe = role === "pe_teacher"
  // 学生身份不会进入此组件（由外层 nav 控制），这里一定存在
  const teacher = currentTeacher!

  // 发卡范围班级（用于班级切换）
  const switchClasses = useMemo(() => awardClasses, [awardClasses])

  // 切换身份后若当前选中班级不在发卡范围内，回落第一个
  useEffect(() => {
    if (switchClasses.length === 0) {
      setClassId("")
      return
    }
    setClassId((prev) =>
      switchClasses.some((c) => c.id === prev) ? prev : switchClasses[0].id,
    )
  }, [switchClasses])

  const currentClass = switchClasses.find((c) => c.id === classId)

  // 仅统计当前老师发放的奖卡（operatorId 匹配），并按选中班级过滤
  const myAwardCards = useMemo(
    () => awardCards.filter((c) => c.operatorId === teacher.id && (!classId || c.classId === classId)),
    [awardCards, teacher.id, classId],
  )

  const weekKey = getISOWeekKey(new Date())
  const weekRangeLabel = formatDateRangeLabel(weekKey)

  // 按时间范围过滤
  const rangeFiltered = useMemo(() => {
    const r =
      range === "week"
        ? getWeekRange(new Date())
        : range === "month"
          ? getMonthRange(new Date())
          : getSemesterRange(new Date())
    return myAwardCards.filter((c) => inRange(c.date, r.start, r.end))
  }, [myAwardCards, range])

  // 按一级指标聚合
  const chartData = useMemo(() => {
    const map = new Map<string, number>()
    for (const name of AWARD_LEVEL1_LIST) map.set(name, 0)
    for (const c of rangeFiltered) {
      map.set(c.level1, (map.get(c.level1) ?? 0) + c.points)
    }
    return AWARD_LEVEL1_LIST.map((level1) => ({ level1, points: map.get(level1) ?? 0 }))
  }, [rangeFiltered])

  const rangeTotal = useMemo(
    () => chartData.reduce((s, d) => s + d.points, 0),
    [chartData],
  )

  // 最近一周我发放的奖卡，按创建时间倒序
  const recentWeekCards = useMemo(() => {
    const weekRange = getWeekRange(new Date())
    return myAwardCards
      .filter((c) => inRange(c.date, weekRange.start, weekRange.end))
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [myAwardCards])

  const recentCardsLoadMore = useLoadMore(recentWeekCards, 10)
  const recentCardsScroll = useScrollLoadMore(recentCardsLoadMore.hasMore, recentCardsLoadMore.loadMore)

  // 体育成绩录入进度（仅体育老师用）
  const peClasses = useMemo(
    () => (isPe ? PE_CLASSES.filter((c) => peClassIds.includes(c.id)) : []),
    [isPe, peClassIds],
  )
  const peUploadMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const u of peScoreUploads) map.set(`${u.classId}:${u.gender}`, true)
    return map
  }, [peScoreUploads])
  const peProgress = useMemo(() => {
    if (!isPe) return null
    const totalFiles = peClasses.length * 2
    const uploadedFiles = peClasses.reduce(
      (acc, c) =>
        acc +
        (peUploadMap.has(`${c.id}:male`) ? 1 : 0) +
        (peUploadMap.has(`${c.id}:female`) ? 1 : 0),
      0,
    )
    const perClass = peClasses.map((c) => ({
      cls: c,
      male: peUploadMap.has(`${c.id}:male`),
      female: peUploadMap.has(`${c.id}:female`),
    }))
    return {
      totalFiles,
      uploadedFiles,
      percent: totalFiles === 0 ? 0 : Math.round((uploadedFiles / totalFiles) * 100),
      perClass,
      semesterLabel: getSemesterLabel(),
    }
  }, [isPe, peClasses, peUploadMap])

  return (
    <div className="flex flex-col gap-6">
      {/* 顶部：身份 + 班级切换 + 周次 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="glass-panel flex items-center gap-2 rounded-xl px-4 py-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-brand-blue text-sm font-bold text-primary-foreground shadow-sm">
              {teacher.name.slice(0, 1)}
            </span>
            <span className="text-base font-bold text-foreground">{teacher.name}</span>
            <span className="text-xs text-muted-foreground">{teacher.title}</span>
            {isPe && (
              <span className="rounded-md bg-brand-green/15 px-2 py-0.5 text-[11px] font-medium text-brand-green">
                体育老师
              </span>
            )}
          </div>

          {/* 班级切换（发卡范围多班时显示） */}
          {switchClasses.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setClassMenuOpen((v) => !v)}
                className="glass-panel flex items-center gap-2 rounded-xl px-3 py-2.5 text-left"
              >
                <School className="size-4 text-brand-blue" />
                <span className="text-sm font-semibold text-foreground">
                  {currentClass?.name ?? "全部班级"}
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
              {classMenuOpen && (
                <div className="glass-surface absolute left-0 top-full z-20 mt-1 flex w-48 flex-col rounded-xl p-1 shadow-lg">
                  {switchClasses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setClassId(c.id)
                        setClassMenuOpen(false)
                      }}
                      className={cn(
                        "rounded-lg px-3 py-2 text-left text-sm transition",
                        c.id === classId
                          ? "bg-accent font-medium text-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-gradient-to-r from-primary/10 to-brand-blue/10 px-3 py-1.5 text-xs font-medium text-foreground">
          <CalendarDays className="size-3.5 text-brand-blue" />
          {weekRangeLabel}
        </div>
      </div>

      {/* 顶部入口卡片 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => onNavigate("award")}
          className="glass-panel group flex items-start gap-3 rounded-2xl p-4 text-left transition hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue">
            <Send className="size-5" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">线上发卡</span>
            <span className="text-[11px] text-muted-foreground">
              为 {awardClasses.length} 个班级发放五育奖卡
            </span>
          </span>
        </button>

        {isPe && (
          <Link
            href="/pe-score-import"
            className="glass-panel group flex items-start gap-3 rounded-2xl p-4 text-left transition hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green">
              <HeartPulse className="size-5" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">体育成绩录入</span>
              <span className="text-[11px] text-muted-foreground">
                体测成绩批量导入与查看
              </span>
            </span>
          </Link>
        )}

        <div className="glass-panel flex items-start gap-3 rounded-2xl p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/15 text-brand-yellow">
            <Award className="size-5" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">本周累计发放</span>
            <span className="text-lg font-bold text-brand-yellow">
              {myAwardCards.filter((c) => {
                const r = getWeekRange(new Date())
                return inRange(c.date, r.start, r.end)
              }).length}
              <span className="ml-1 text-xs font-normal text-muted-foreground">张</span>
            </span>
          </span>
        </div>
      </div>

      {/* 体育成绩录入进度（仅体育老师） */}
      {isPe && peProgress && (
        <section className="glass-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <HeartPulse className="size-4 text-brand-green" />
                体育成绩录入进度
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{peProgress.semesterLabel}</p>
            </div>
            <Link
              href="/pe-score-import"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-brand-green/25 transition hover:bg-brand-green/90"
            >
              去录入成绩
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {/* 总进度条 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">
                已上传 <span className="font-bold text-foreground">{peProgress.uploadedFiles}</span>
                <span className="text-muted-foreground"> / {peProgress.totalFiles} 份</span>
              </span>
              <span className="font-semibold text-brand-green">{peProgress.percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-brand-green transition-all"
                style={{ width: `${peProgress.percent}%` }}
              />
            </div>
          </div>

          {/* 按班级分行进度 */}
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {peProgress.perClass.map(({ cls, male, female }) => {
              const done = male && female
              const partial = !done && (male || female)
              return (
                <li
                  key={cls.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs",
                    done
                      ? "border-brand-green/40 bg-brand-green/10"
                      : partial
                        ? "border-brand-yellow/40 bg-brand-yellow/10"
                        : "border-border/60 bg-transparent",
                  )}
                >
                  <span className="font-medium text-foreground">{cls.name}</span>
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5",
                        male ? "text-brand-green" : "text-muted-foreground/60",
                      )}
                    >
                      {male ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}
                      男
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5",
                        female ? "text-brand-green" : "text-muted-foreground/60",
                      )}
                    >
                      {female ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}
                      女
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* 一级指标奖卡发放柱状图（带时间范围切换） */}
        <section className="glass-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              我发放的奖卡
              <span className="ml-2 text-xs font-normal text-muted-foreground">按一级指标</span>
            </h3>
            <div className="flex gap-1 rounded-lg bg-muted/40 p-1">
              {(Object.keys(TIME_RANGE_LABEL) as TimeRange[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setRange(k)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition",
                    range === k
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {TIME_RANGE_LABEL[k]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-baseline justify-between border-b border-border/40 pb-3">
            <p className="text-xs text-muted-foreground">
              {TIME_RANGE_LABEL[range]}合计{" "}
              <span className="text-sm font-bold text-foreground">{rangeTotal}</span> 张
            </p>
            <p className="text-[11px] text-muted-foreground">按一级指标分布</p>
          </div>

          <div className="flex h-48 items-end gap-1.5">
            {chartData.map((d, i) => {
              const max = Math.max(1, ...chartData.map((x) => x.points))
              const heightPct = (d.points / max) * 100
              return (
                <div key={d.level1} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[11px] font-semibold text-foreground">
                    {d.points > 0 ? d.points : ""}
                  </span>
                  <div className="flex h-32 w-full items-end justify-center">
                    <div
                      className={cn(
                        "w-full max-w-7 rounded-t-md transition-all",
                        BAR_COLORS[i % BAR_COLORS.length],
                        d.points === 0 && "opacity-20",
                      )}
                      style={{ height: `${Math.max(heightPct, d.points > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                  <span className="line-clamp-2 h-7 text-center text-[10px] leading-tight text-muted-foreground">
                    {d.level1}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* 最近一周发放消息 */}
        <section className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Inbox className="size-4 text-brand-blue" />
              本周发放动态
            </h3>
            <span className="text-xs text-muted-foreground">共 {recentWeekCards.length} 条</span>
          </div>

          {recentWeekCards.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              本周还未发放奖卡，去为学生发一张吧
            </p>
          ) : (
            <ul
              className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1"
              onScroll={recentCardsScroll.onScroll}
            >
              {recentCardsLoadMore.visible.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-2.5 rounded-xl bg-muted/30 px-3 py-2.5"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-yellow/15 text-brand-yellow">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      发给 <span className="font-semibold">{c.studentName}</span>{" "}
                      <span className="text-muted-foreground">一张</span>{" "}
                      <span className="font-medium text-brand-yellow">{c.level1}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.level2} · +{c.points} 分
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end text-right">
                    <span className="text-[11px] text-muted-foreground">{c.date}</span>
                  </div>
                </li>
              ))}
              <li>
                <LoadMoreFooter
                  hasMore={recentCardsLoadMore.hasMore}
                  loaded={recentCardsLoadMore.visible.length}
                  total={recentCardsLoadMore.total}
                  onLoadMore={recentCardsLoadMore.loadMore}
                />
              </li>
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
