"use client"

import { useMemo, useState } from "react"
import {
  Award,
  BellRing,
  CalendarRange,
  CheckCircle2,
  Download,
  Flag,
  HeartPulse,
  House,
  LayoutGrid,
  Medal,
  Send,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { TEACHERS } from "@/lib/mock-data"
import { PE_CLASSES, getSemesterLabel } from "@/lib/pe-scores"
import { formatDate, getISOWeekKey } from "@/lib/scoring-utils"
import {
  POINT_SOURCE_LABEL,
  POINT_SOURCE_STYLE,
  getWeekRange,
  inRange,
} from "@/lib/points-utils"
import { AwardLineChart } from "./award-line-chart"
import type { MainTab } from "../evaluation/evaluation-dashboard"

interface AdminDashboardProps {
  onNavigate: (tab: MainTab) => void
}

const HONOR_LEVEL_LABEL: Record<string, string> = {
  school: "校级",
  district: "区级",
  city: "市级",
  national: "国家级及以上",
}
const HONOR_LEVEL_STYLE: Record<string, string> = {
  school: "bg-brand-blue/15 text-brand-blue",
  district: "bg-brand-green/15 text-brand-green",
  city: "bg-brand-orange/15 text-brand-orange",
  national: "bg-brand-yellow/20 text-brand-yellow",
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { grades, classes, flags, awardCards, honors, peScoreUploads } = useEvaluation()
  const { role } = usePermission()
  const [recordCollapsed, setRecordCollapsed] = useState(false)
  // 已提醒的未录入班级（演示态：标记后按钮置为"已提醒"）
  const [remindedClassIds, setRemindedClassIds] = useState<Set<string>>(new Set())

  const weekKey = getISOWeekKey(new Date())
  const { start: weekStart, end: weekEnd } = getWeekRange(new Date())
  const today = formatDate(new Date())

  // 本周获流动红旗班级（荣誉班级），按年级分组
  const honoredByGrade = useMemo(() => {
    const awarded = flags.filter((f) => f.weekKey === weekKey && f.awarded)
    const map = new Map<string, { gradeName: string; classes: { name: string; teacher: string }[] }>()
    for (const f of awarded) {
      const cls = classes.find((c) => c.id === f.classId)
      if (!cls) continue
      const grade = grades.find((g) => g.id === cls.gradeId)
      const gradeName = grade?.name ?? ""
      const entry = map.get(gradeName) ?? { gradeName, classes: [] }
      entry.classes.push({ name: cls.name, teacher: cls.homeroomTeacher })
      map.set(gradeName, entry)
    }
    return Array.from(map.values())
  }, [flags, weekKey, classes, grades])

  // 本周奖卡发放记录（全量，按创建时间倒序）
  const weekAwardCards = useMemo(
    () =>
      awardCards
        .filter((a) => inRange(a.date, weekStart, weekEnd))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [awardCards, weekStart, weekEnd],
  )

  // 本周荣誉记录（全量，按创建时间倒序）
  const weekHonors = useMemo(
    () =>
      honors
        .filter((h) => inRange(h.awardDate, weekStart, weekEnd))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [honors, weekStart, weekEnd],
  )

  const awardCardsLoadMore = useLoadMore(weekAwardCards, 12)
  const awardCardsScroll = useScrollLoadMore(
    awardCardsLoadMore.hasMore,
    awardCardsLoadMore.loadMore,
  )

  const honorsLoadMore = useLoadMore(weekHonors, 10)
  const honorsScroll = useScrollLoadMore(honorsLoadMore.hasMore, honorsLoadMore.loadMore)

  // 最近 7 天每天奖卡发放总数
  const dailyData = useMemo(() => {
    const days: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = formatDate(d)
      const count = awardCards.filter((a) => a.date === dateStr).length
      days.push({ date: dateStr, count })
    }
    return days
  }, [awardCards])

  // 体育成绩录入进度：按已上传文件统计，未录入班级关联负责体育教师
  const peProgress = useMemo(() => {
    const uploadMap = new Map<string, boolean>()
    for (const u of peScoreUploads) uploadMap.set(`${u.classId}:${u.gender}`, true)
    // 班级 -> 负责的体育教师（配置了 peTeacherClassIds 的教师）
    const peTeachersOf = (classId: string) =>
      TEACHERS.filter((t) => t.peTeacherClassIds?.includes(classId))

    const totalFiles = PE_CLASSES.length * 2
    let uploadedFiles = 0
    const pending: { classId: string; className: string; gradeName: string; missing: string[]; teachers: string[] }[] = []
    for (const c of PE_CLASSES) {
      const male = uploadMap.has(`${c.id}:male`)
      const female = uploadMap.has(`${c.id}:female`)
      uploadedFiles += (male ? 1 : 0) + (female ? 1 : 0)
      const missing = [...(!male ? ["男生"] : []), ...(!female ? ["女生"] : [])]
      if (missing.length > 0) {
        pending.push({
          classId: c.id,
          className: c.name,
          gradeName: c.gradeName,
          missing,
          teachers: peTeachersOf(c.id).map((t) => t.name),
        })
      }
    }
    return {
      totalFiles,
      uploadedFiles,
      percent: totalFiles === 0 ? 0 : Math.round((uploadedFiles / totalFiles) * 100),
      pending,
      semesterLabel: getSemesterLabel(),
    }
  }, [peScoreUploads])

  const remindClass = (classId: string) => {
    setRemindedClassIds((prev) => new Set(prev).add(classId))
  }
  const remindAll = () => {
    setRemindedClassIds((prev) => {
      const next = new Set(prev)
      for (const p of peProgress.pending) next.add(p.classId)
      return next
    })
  }
  const pendingUnreminded = peProgress.pending.filter((p) => !remindedClassIds.has(p.classId))

  const shortcuts = [
    { key: "activity" as MainTab, label: "活动管理", desc: "发布与审核活动", icon: CalendarRange, tone: "bg-gradient-to-br from-brand-blue to-primary-2 shadow-brand-blue/30", ring: "hover:border-brand-blue/40" },
    { key: "score" as MainTab, label: "班级评价", desc: "查看各班评价", icon: LayoutGrid, tone: "bg-gradient-to-br from-brand-green to-chart-2 shadow-brand-green/30", ring: "hover:border-brand-green/40" },
    { key: "award" as MainTab, label: "奖卡发放", desc: "为学生发奖卡", icon: Award, tone: "bg-gradient-to-br from-brand-yellow to-brand-orange shadow-brand-orange/30", ring: "hover:border-brand-orange/40" },
    // 线下奖卡下载仅管理员可见
    ...(role === "director"
      ? [{ href: "/offline-award-cards", label: "线下奖卡下载", desc: "导出奖卡 Excel", icon: Download, tone: "bg-gradient-to-br from-brand-orange to-destructive shadow-brand-orange/30", ring: "hover:border-brand-orange/40" }]
      : []),
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* 顶部渐变 Hero 横幅 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary-2 to-brand-blue px-5 py-4 text-white shadow-lg shadow-primary/30">
        {/* 装饰光斑 */}
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full bg-white/15 blur-2xl" />
        <span aria-hidden className="pointer-events-none absolute right-24 top-2 size-6 rounded-full bg-white/20 blur-sm" />
        <span aria-hidden className="pointer-events-none absolute -bottom-10 right-1/3 size-24 rounded-full bg-brand-yellow/30 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/20 shadow-inner ring-1 ring-white/30 backdrop-blur-sm">
              <House className="size-5.5" />
            </span>
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                管理员首页
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium">
                  {today}
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-white/80">
                统览本周全校评价、奖卡与荣誉动态
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-xs font-medium backdrop-blur-sm">
            <CalendarRange className="size-3.5" />
            本周（{formatDate(weekStart)} ~ {formatDate(weekEnd)}）
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((s) => {
          const inner = (
            <>
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform group-hover:scale-105", s.tone)}>
                <s.icon className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{s.label}</span>
                <span className="text-[11px] text-muted-foreground">{s.desc}</span>
              </div>
            </>
          )
          const cls = cn(
            "glass-panel group flex items-center gap-3 rounded-2xl p-4 text-left transition hover:shadow-xl hover:-translate-y-0.5",
            s.ring,
          )
          if ("href" in s && s.href) {
            return (
              <Link key={s.label} href={s.href} className={cls}>
                {inner}
              </Link>
            )
          }
          return (
            <button key={s.label} type="button" onClick={() => onNavigate((s as { key: MainTab }).key)} className={cls}>
              {inner}
            </button>
          )
        })}
      </div>

      {/* 体育成绩录入进度（仅管理员） */}
      {role === "director" && (
        <section className="glass-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <HeartPulse className="size-4 text-brand-green" />
                体育成绩录入进度
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {peProgress.semesterLabel} · 1-5 年级体质健康成绩
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/pe-score-import"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3.5 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-accent/60"
              >
                查看录入页
              </Link>
              {peProgress.pending.length > 0 && (
                <button
                  type="button"
                  onClick={remindAll}
                  disabled={pendingUnreminded.length === 0}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition",
                    pendingUnreminded.length === 0
                      ? "cursor-default bg-muted/50 text-muted-foreground"
                      : "bg-brand-green text-white shadow-brand-green/25 hover:bg-brand-green/90",
                  )}
                >
                  {pendingUnreminded.length === 0 ? (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      已全部提醒
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      批量提醒（{pendingUnreminded.length} 个班级）
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 总进度条 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">
                已上传 <span className="font-bold text-foreground">{peProgress.uploadedFiles}</span>
                <span className="text-muted-foreground"> / {peProgress.totalFiles} 份</span>
                {peProgress.pending.length > 0 && (
                  <span className="ml-2 text-brand-orange">未录入班级 {peProgress.pending.length} 个</span>
                )}
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

          {/* 未录入班级列表 */}
          {peProgress.pending.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-3 py-5 text-center text-sm text-muted-foreground">
              全部班级已完成体育成绩录入
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {peProgress.pending.map((p) => {
                const reminded = remindedClassIds.has(p.classId)
                return (
                  <li
                    key={p.classId}
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border px-3 py-2.5 transition",
                      reminded
                        ? "border-brand-green/30 bg-brand-green/5"
                        : "border-border/60 bg-transparent",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{p.className}</span>
                      <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 text-[11px] font-medium text-brand-orange">
                        未录入 {p.missing.join("、")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                        <BellRing className="size-3 shrink-0 text-brand-blue" />
                        <span className="truncate">
                          体育教师：{p.teachers.length > 0 ? p.teachers.join("、") : "未分配"}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => remindClass(p.classId)}
                        disabled={reminded}
                        className={cn(
                          "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
                          reminded
                            ? "cursor-default bg-brand-green/10 text-brand-green"
                            : "bg-brand-blue/15 text-brand-blue hover:bg-brand-blue/25",
                        )}
                      >
                        {reminded ? "已提醒" : "一键提醒"}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* 荣誉班级名单 + 奖卡折线图 */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="glass-panel flex min-h-0 flex-col gap-3 rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Flag className="size-4 fill-brand-yellow text-brand-yellow" />
            本周荣誉班级获得名单
          </h3>
          {honoredByGrade.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              本周暂未颁发流动红旗
            </p>
          ) : (
            <ul className="scrollbar-none flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {honoredByGrade.map((g) => (
                <li key={g.gradeName} className="rounded-xl border border-brand-yellow/15 bg-gradient-to-r from-brand-yellow/10 to-transparent px-3 py-2 transition hover:border-brand-yellow/30">
                  <p className="text-xs font-semibold text-foreground">{g.gradeName}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {g.classes.map((c) => (
                      <span
                        key={c.name}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-yellow/15 px-2.5 py-1 text-xs font-medium text-brand-yellow"
                      >
                        <Flag className="size-3 fill-current" />
                        {c.name}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    班主任：{g.classes.map((c) => c.teacher).join("、")}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-auto text-[11px] text-muted-foreground">
            数据来源：周流动红旗颁发记录（{today}）
          </p>
        </section>

        <section className="glass-panel flex min-h-0 flex-col gap-3 rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <TrendingUp className="size-4 text-brand-green" />
            最近一周奖卡发放趋势
          </h3>
          <AwardLineChart data={dailyData} />
        </section>
      </div>

      {/* 本周奖卡发放记录 + 本周荣誉记录 */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <section className="glass-panel flex min-h-0 flex-col gap-3 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Award className="size-4 text-brand-yellow" />
              本周奖卡发放记录
            </h3>
            <span className="text-xs text-muted-foreground">共 {weekAwardCards.length} 条</span>
          </div>
          {weekAwardCards.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              本周暂无奖卡发放
            </p>
          ) : (
            <div
              className="scrollbar-none flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1"
              onScroll={awardCardsScroll.onScroll}
            >
              {awardCardsLoadMore.visible.map((a) => {
                const cls = classes.find((c) => c.id === a.classId)
                return (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5 transition hover:bg-brand-blue/10">
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", POINT_SOURCE_STYLE[a.source])}>
                      {POINT_SOURCE_LABEL[a.source]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {a.studentName}
                        <span className="ml-1.5 text-muted-foreground">· {a.level1}</span>
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {cls?.name ?? a.classId} · {a.level2}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-brand-green">+{a.points}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{a.date.slice(5)}</span>
                  </div>
                )
              })}
              <LoadMoreFooter
                hasMore={awardCardsLoadMore.hasMore}
                loaded={awardCardsLoadMore.visible.length}
                total={awardCardsLoadMore.total}
                onLoadMore={awardCardsLoadMore.loadMore}
              />
            </div>
          )}
        </section>

        <section className="glass-panel flex min-h-0 flex-col gap-3 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Medal className="size-4 text-brand-orange" />
              本周荣誉记录
            </h3>
            <span className="text-xs text-muted-foreground">共 {weekHonors.length} 条</span>
          </div>
          {weekHonors.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              本周暂无荣誉录入
            </p>
          ) : (
            <ul
              className="scrollbar-none flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
              onScroll={honorsScroll.onScroll}
            >
              {honorsLoadMore.visible.map((h) => {
                const cls = classes.find((c) => c.id === h.classId)
                return (
                  <li key={h.id} className="flex items-start gap-2 rounded-lg bg-muted/30 px-2.5 py-2 transition hover:bg-brand-orange/10">
                    <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", HONOR_LEVEL_STYLE[h.honorLevel])}>
                      {HONOR_LEVEL_LABEL[h.honorLevel]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{h.honorName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {h.studentName} · {cls?.name ?? h.classId} · {h.level1}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{h.issuer}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-brand-orange">+{h.points}</span>
                  </li>
                )
              })}
              <li>
                <LoadMoreFooter
                  hasMore={honorsLoadMore.hasMore}
                  loaded={honorsLoadMore.visible.length}
                  total={honorsLoadMore.total}
                  onLoadMore={honorsLoadMore.loadMore}
                />
              </li>
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
