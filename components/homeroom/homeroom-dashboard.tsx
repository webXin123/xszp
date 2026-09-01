"use client"

import { useMemo, useState } from "react"
import {
  CalendarDays,
  ChevronDown,
  LayoutGrid,
  Medal,
  MinusCircle,
  TrendingDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { computeWeeklyScore, formatDateRangeLabel, getISOWeekKey, getRecordsForWeek } from "@/lib/scoring-utils"
import { aggregateByLevel1, buildPointEntries, filterEntries } from "@/lib/points-utils"
import { AwardBarChart } from "./award-bar-chart"
import { PointsDynamicTab } from "./points-dynamic-tab"
import { PointsRankingTab } from "./points-ranking-tab"
import type { MainTab } from "../evaluation/evaluation-dashboard"


interface HomeroomDashboardProps {
  onNavigate: (tab: MainTab) => void
}

type BottomTab = "dynamic" | "ranking"

export function HomeroomDashboard({ onNavigate }: HomeroomDashboardProps) {
  const { records, awardCards, honors, students, classes } = useEvaluation()
  const { scoringClasses } = usePermission()

  // 多班切换
  const [classId, setClassId] = useState<string>(
    scoringClasses[0]?.id ?? "",
  )
  const [bottomTab, setBottomTab] = useState<BottomTab>("dynamic")
  const [classMenuOpen, setClassMenuOpen] = useState(false)

  const currentClass = classes.find((c) => c.id === classId) ?? scoringClasses[0]
  const weekKey = getISOWeekKey(new Date())
  const weekRangeLabel = formatDateRangeLabel(weekKey)

  // 本周班级评价扣分记录（按创建时间降序）
  const weekDeductions = useMemo(() => {
    if (!currentClass) return []
    const list = getRecordsForWeek(records, currentClass.id, weekKey)
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [records, currentClass, weekKey])

  const deductionsLoadMore = useLoadMore(weekDeductions, 10)
  const deductionsScroll = useScrollLoadMore(deductionsLoadMore.hasMore, deductionsLoadMore.loadMore)

  // 本周总扣分
  const weeklyScore = useMemo(
    () => (currentClass ? computeWeeklyScore(records, currentClass.id, weekKey) : null),
    [records, currentClass, weekKey],
  )

  // 本周全部一级指标奖卡获得总数（含奖卡+荣誉）
  const weekEntries = useMemo(() => {
    if (!currentClass) return []
    const all = buildPointEntries(awardCards, honors)
    return filterEntries(all, currentClass.id, "week")
  }, [awardCards, honors, currentClass])

  const chartData = useMemo(() => aggregateByLevel1(weekEntries), [weekEntries])

  if (!currentClass) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center gap-2 rounded-2xl p-12 text-center">
        <LayoutGrid className="size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">当前班主任未关联班级，暂无首页数据。</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 顶部：班级切换 + 周次 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setClassMenuOpen((v) => !v)}
            className="glass-panel flex items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:border-primary/40 hover:shadow-md"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-brand-blue/20 text-sm font-bold text-primary">
              {currentClass.name.slice(0, 1)}
            </span>
            <span className="text-base font-bold text-foreground">{currentClass.name}</span>
            <span className="text-xs text-muted-foreground">{currentClass.homeroomTeacher}</span>
            {scoringClasses.length > 1 && (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>
          {classMenuOpen && scoringClasses.length > 1 && (
            <div className="glass-surface absolute left-0 top-full z-20 mt-1 flex w-48 flex-col rounded-xl p-1 shadow-lg">
              {scoringClasses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setClassId(c.id)
                    setClassMenuOpen(false)
                  }}
                  className={cn(
                    "rounded-lg px-3 py-2 text-left text-sm transition",
                    c.id === currentClass.id
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
        <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-gradient-to-r from-primary/10 to-brand-blue/10 px-3 py-1.5 text-xs font-medium text-foreground">
          <CalendarDays className="size-3.5 text-brand-blue" />
          {weekRangeLabel}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* 最新消息：本周扣分动态 */}
        <section className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <TrendingDown className="size-4 text-brand-orange" />
              本周班级评价扣分动态
            </h3>
            <span className="text-xs text-muted-foreground">
              共 {weekDeductions.length} 条
            </span>
          </div>

          {weeklyScore && (
            <div className="flex items-center gap-3 rounded-xl bg-brand-orange/10 px-3 py-2">
              <span className="text-xs text-muted-foreground">本周总扣分</span>
              <span className="text-lg font-bold text-brand-orange">
                {weeklyScore.deduction}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                周总分 {weeklyScore.total} / {weeklyScore.maxScore}
              </span>
            </div>
          )}

          {weekDeductions.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              本周暂无扣分记录，继续保持！
            </p>
          ) : (
            <ul
              className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1"
              onScroll={deductionsScroll.onScroll}
            >
              {deductionsLoadMore.visible.map((r) => (
                <li key={r.id} className="flex items-start gap-2.5 rounded-xl bg-muted/30 px-3 py-2">
                  <MinusCircle className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{r.level1}</span>
                      <span className="text-muted-foreground"> · {r.level2}</span>
                    </p>
                    {r.note && (
                      <p className="truncate text-xs text-muted-foreground">{r.note}</p>
                    )}
                    {r.studentNames.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        涉及：{r.studentNames.join("、")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-bold text-brand-orange">{r.totalDeduction}</span>
                    <span className="text-[11px] text-muted-foreground">{r.date}</span>
                  </div>
                </li>
              ))}
              <li>
                <LoadMoreFooter
                  hasMore={deductionsLoadMore.hasMore}
                  loaded={deductionsLoadMore.visible.length}
                  total={deductionsLoadMore.total}
                  onLoadMore={deductionsLoadMore.loadMore}
                />
              </li>
            </ul>
          )}
        </section>

        {/* 入口卡片 */}
        <section className="flex flex-col gap-3">
          <div className="glass-panel grid grid-cols-2 gap-3 rounded-2xl p-4">
            <button
              type="button"
              onClick={() => onNavigate("score")}
              className="flex flex-col items-start gap-2 rounded-xl bg-brand-blue/10 p-3 text-left transition hover:bg-brand-blue/15"
            >
              <LayoutGrid className="size-5 text-brand-blue" />
              <span className="text-sm font-medium text-foreground">班级评价</span>
              <span className="text-[11px] text-muted-foreground">查看/录入本班评价</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("honor")}
              className="flex flex-col items-start gap-2 rounded-xl bg-brand-yellow/10 p-3 text-left transition hover:bg-brand-yellow/15"
            >
              <Medal className="size-5 text-brand-yellow" />
              <span className="text-sm font-medium text-foreground">荣誉上传</span>
              <span className="text-[11px] text-muted-foreground">为学生录入获奖荣誉</span>
            </button>
          </div>

          {/* 奖卡柱状图 */}
          <div className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground">
              本周奖卡获得总数
              <span className="ml-2 text-xs font-normal text-muted-foreground">按一级指标</span>
            </h3>
            <AwardBarChart data={chartData} unit="张" />
          </div>
        </section>
      </div>

      {/* 底部双 Tab */}
      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
        <div className="flex gap-2 border-b border-border/40 pb-3">
          <button
            type="button"
            onClick={() => setBottomTab("dynamic")}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-semibold transition",
              bottomTab === "dynamic"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            五育积分动态
          </button>
          <button
            type="button"
            onClick={() => setBottomTab("ranking")}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-semibold transition",
              bottomTab === "ranking"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            学生积分排名
          </button>
        </div>

        {bottomTab === "dynamic" ? (
          <PointsDynamicTab classId={currentClass.id} />
        ) : (
          <PointsRankingTab classId={currentClass.id} />
        )}
      </div>
    </div>
  )
}
