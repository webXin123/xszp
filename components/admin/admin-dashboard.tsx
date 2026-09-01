"use client"

import { useMemo, useState } from "react"
import {
  Award,
  BellRing,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  CheckCircle2,
  ChevronDown,
  Download,
  Flag,
  Globe,
  HeartPulse,
  House,
  LayoutGrid,
  Landmark,
  Medal,
  QrCode,
  School,
  Send,
  Trophy,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { TEACHERS } from "@/lib/mock-data"
import { PE_CLASSES, PE_GRADE_NAMES, PE_CLASS_IDS, getSemesterLabel } from "@/lib/pe-scores"
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

/** 荣誉级别图标：不同级别不同图标 + 渐变徽章底色 */
const HONOR_LEVEL_ICON: Record<string, { icon: typeof Trophy; badge: string }> = {
  school: { icon: House, badge: "from-brand-blue to-primary shadow-brand-blue/30" },
  district: { icon: Landmark, badge: "from-brand-green to-brand-blue shadow-brand-green/30" },
  city: { icon: Landmark, badge: "from-brand-orange to-brand-yellow shadow-brand-orange/30" },
  national: { icon: Globe, badge: "from-brand-yellow to-brand-orange shadow-brand-yellow/30" },
}

/** 奖卡来源图标徽章：与班主任首页五育积分动态保持一致 */
const AWARD_SOURCE_BADGE: Record<string, { icon: typeof Award; badge: string }> = {
  online: { icon: Award, badge: "from-brand-blue to-primary shadow-brand-blue/30" },
  offline_scan: { icon: QrCode, badge: "from-brand-green to-brand-blue shadow-brand-green/30" },
  flag_reward: { icon: Flag, badge: "from-brand-yellow to-brand-orange shadow-brand-yellow/30" },
  honor: { icon: Trophy, badge: "from-brand-orange to-brand-pink shadow-brand-orange/30" },
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { grades, classes, flags, awardCards, honors, peScoreUploads } = useEvaluation()
  const { role } = usePermission()
  const [recordCollapsed, setRecordCollapsed] = useState(false)
  // 已提醒的未录入班级（演示态：标记后按钮置为"已提醒"）
  const [remindedClassIds, setRemindedClassIds] = useState<Set<string>>(new Set())
  // 本学期已发布的体育成绩录入任务（null 表示未发布）
  const [peTask, setPeTask] = useState<{
    classIds: string[]
    startDate: string
    endDate: string
    semesterLabel: string
  } | null>(null)
  // 侧边发布弹窗 / 进度弹窗
  const [pePublishOpen, setPePublishOpen] = useState(false)
  const [peProgressOpen, setPeProgressOpen] = useState(false)
  // 发布表单
  const [peFormClassIds, setPeFormClassIds] = useState<string[]>(PE_CLASS_IDS)
  const [peFormStart, setPeFormStart] = useState("")
  const [peFormEnd, setPeFormEnd] = useState("")

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

  // 体育成绩录入进度：按已上传文件统计（已发布任务时仅统计任务范围内班级），
  // 未录入班级关联负责体育教师
  const peProgress = useMemo(() => {
    const scopedClasses = peTask
      ? PE_CLASSES.filter((c) => peTask.classIds.includes(c.id))
      : PE_CLASSES
    const uploadMap = new Map<string, boolean>()
    for (const u of peScoreUploads) uploadMap.set(`${u.classId}:${u.gender}`, true)
    // 班级 -> 负责的体育教师（配置了 peTeacherClassIds 的教师）
    const peTeachersOf = (classId: string) =>
      TEACHERS.filter((t) => t.peTeacherClassIds?.includes(classId))

    const totalFiles = scopedClasses.length * 2
    let uploadedFiles = 0
    const pending: { classId: string; className: string; gradeName: string; missing: string[]; teachers: string[] }[] = []
    for (const c of scopedClasses) {
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
  }, [peScoreUploads, peTask])

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

  const togglePeFormClass = (classId: string) => {
    setPeFormClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    )
  }
  const togglePeFormGrade = (gradeName: string) => {
    const gradeIds = PE_CLASSES.filter((c) => c.gradeName === gradeName).map((c) => c.id)
    const allSelected = gradeIds.every((id) => peFormClassIds.includes(id))
    setPeFormClassIds((prev) =>
      allSelected
        ? prev.filter((id) => !gradeIds.includes(id))
        : [...new Set([...prev, ...gradeIds])],
    )
  }
  const publishPeTask = () => {
    if (peFormClassIds.length === 0 || !peFormStart || !peFormEnd) return
    setPeTask({
      classIds: peFormClassIds,
      startDate: peFormStart,
      endDate: peFormEnd,
      semesterLabel: getSemesterLabel(),
    })
    setPePublishOpen(false)
  }

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
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {shortcuts.map((s) => {
          const inner = (
            <>
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform group-hover:scale-105", s.tone)}>
                <s.icon className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.desc}</span>
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

        {/* 体育成绩录入发布（仅管理员）：未发布时点击打开发布侧边弹窗，已发布变更为查看录入进度 */}
        {role === "director" && (
          <div className="glass-panel group flex items-center gap-3 rounded-2xl p-4 text-left transition hover:shadow-xl hover:-translate-y-0.5 hover:border-brand-green/40">
            <button
              type="button"
              onClick={() => (peTask ? setPeProgressOpen(true) : setPePublishOpen(true))}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-green to-chart-2 text-white shadow-lg shadow-brand-green/30 transition-transform group-hover:scale-105">
                <HeartPulse className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {peTask ? "查看录入进度" : "体育成绩录入发布"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {peTask
                    ? `已发布 · ${peTask.startDate} ~ ${peTask.endDate}`
                    : "发布体测成绩录入任务"}
                </span>
              </span>
            </button>
            {/* 录入进度查看图标 */}
            <button
              type="button"
              title="查看录入进度"
              aria-label="查看录入进度"
              onClick={() => setPeProgressOpen(true)}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green transition hover:bg-brand-green/20"
            >
              <ChartColumn className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* 体育成绩录入发布：侧边弹窗表单（仅管理员） */}
      <Dialog open={pePublishOpen} onOpenChange={setPePublishOpen}>
        <DialogContent className="fixed left-auto right-0 top-0 grid h-full max-h-full w-full max-w-md translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none rounded-l-2xl border-border/60 bg-background/80 p-0 backdrop-blur-2xl sm:max-w-md">
          <DialogHeader className="relative border-b border-border/60 bg-gradient-to-r from-brand-green/10 via-transparent to-transparent p-5 pr-12">
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-green to-brand-blue text-white shadow-md shadow-brand-green/30">
                <HeartPulse className="size-4" />
              </span>
              发布体育成绩录入任务
            </DialogTitle>
            <DialogDescription>
              选择需要录入的年级班级与录入时间段，发布后体育教师可开始录入
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
            {/* 录入班级：下拉复选 */}
            <div className="glass-panel flex flex-col gap-2.5 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <School className="size-3.5 text-brand-blue" />
                  录入班级
                </p>
                <button
                  type="button"
                  onClick={() => setPeFormClassIds(peFormClassIds.length === PE_CLASSES.length ? [] : PE_CLASS_IDS)}
                  className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-brand-green/50 hover:text-brand-green"
                >
                  {peFormClassIds.length === PE_CLASSES.length ? "清空全部" : "全选"}
                </button>
              </div>
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-white/70 px-3.5 py-2.5 text-left text-sm shadow-sm transition hover:border-brand-green/50 hover:shadow-md dark:bg-card/60"
                    />
                  }
                >
                  <span className="truncate text-foreground">
                    {peFormClassIds.length === 0 && (
                      <span className="text-muted-foreground">请选择需要录入的年级班级</span>
                    )}
                    {peFormClassIds.length > 0 && peFormClassIds.length < PE_CLASSES.length && (
                      <>
                        已选 <span className="font-bold text-brand-green">{peFormClassIds.length}</span> 个班
                      </>
                    )}
                    {peFormClassIds.length === PE_CLASSES.length && (
                      <span className="font-medium text-brand-green">全部年级（15 个班）</span>
                    )}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 p-1.5">
                  <Command>
                    <CommandInput placeholder="搜索年级或班级…" />
                    <CommandList className="max-h-64">
                      <CommandEmpty>未找到匹配班级</CommandEmpty>
                      {PE_GRADE_NAMES.map((gradeName) => {
                        const gradeClasses = PE_CLASSES.filter((c) => c.gradeName === gradeName)
                        const allSelected = gradeClasses.every((c) => peFormClassIds.includes(c.id))
                        return (
                          <CommandGroup key={gradeName} heading={gradeName}>
                            <CommandItem
                              value={`${gradeName} 全部`}
                              onSelect={() => togglePeFormGrade(gradeName)}
                              data-checked={allSelected}
                            >
                              <span
                                className={cn(
                                  "flex size-4 items-center justify-center rounded border transition",
                                  allSelected
                                    ? "border-brand-green bg-brand-green text-white"
                                    : "border-muted-foreground/40",
                                )}
                              >
                                {allSelected && <CheckCircle2 className="size-3" />}
                              </span>
                              全部班级（{gradeClasses.length} 个）
                            </CommandItem>
                            {gradeClasses.map((c) => {
                              const selected = peFormClassIds.includes(c.id)
                              return (
                                <CommandItem
                                  key={c.id}
                                  value={`${gradeName} ${c.index.toString().padStart(2, "0")}班`}
                                  onSelect={() => togglePeFormClass(c.id)}
                                  data-checked={selected}
                                >
                                  <span
                                    className={cn(
                                      "flex size-4 items-center justify-center rounded border transition",
                                      selected
                                        ? "border-brand-green bg-brand-green text-white"
                                        : "border-muted-foreground/40",
                                    )}
                                  >
                                    {selected && <CheckCircle2 className="size-3" />}
                                  </span>
                                  {c.index.toString().padStart(2, "0")}班
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        )
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* 录入时间 */}
            <div className="glass-panel flex flex-col gap-2.5 rounded-xl p-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <CalendarDays className="size-3.5 text-brand-blue" />
                录入时间
              </p>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">开始时间</span>
                  <Input
                    type="date"
                    value={peFormStart}
                    onChange={(e) => setPeFormStart(e.target.value)}
                    className="h-10 rounded-lg border-border/60 bg-white/70 shadow-sm transition hover:border-brand-green/50 dark:bg-card/60"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">截止时间</span>
                  <Input
                    type="date"
                    value={peFormEnd}
                    onChange={(e) => setPeFormEnd(e.target.value)}
                    className="h-10 rounded-lg border-border/60 bg-white/70 shadow-sm transition hover:border-brand-green/50 dark:bg-card/60"
                  />
                </label>
              </div>
              {peFormStart && peFormEnd && peFormEnd < peFormStart && (
                <p className="text-xs text-destructive">截止时间需晚于开始时间</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border/60 bg-muted/30 p-4">
            <Button
              variant="outline"
              onClick={() => setPePublishOpen(false)}
              className="h-11 min-w-24 rounded-xl px-6 text-sm font-medium"
            >
              取消
            </Button>
            <Button
              disabled={
                peFormClassIds.length === 0 ||
                !peFormStart ||
                !peFormEnd ||
                peFormEnd < peFormStart
              }
              onClick={publishPeTask}
              className="h-11 min-w-32 rounded-xl bg-gradient-to-r from-[oklch(0.56_0.17_150)] to-[oklch(0.46_0.16_165)] px-8 text-sm font-semibold text-white shadow-lg shadow-brand-green/40 ring-1 ring-white/20 transition hover:brightness-110 hover:shadow-xl hover:shadow-brand-green/50"
            >
              <Send className="size-4" />
              发布
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 体育成绩录入进度弹窗（仅管理员） */}
      <Dialog open={peProgressOpen} onOpenChange={setPeProgressOpen}>
        <DialogContent className="flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto bg-popover/100 backdrop-blur-none sm:max-w-3xl">
          <DialogHeader className="pr-10">
            <DialogTitle className="flex items-center gap-1.5">
              <HeartPulse className="size-4 text-brand-green" />
              体育成绩录入进度
            </DialogTitle>
            <DialogDescription>
              {peProgress.semesterLabel} · 1-5 年级体质健康成绩
              {peTask && ` · 录入时间 ${peTask.startDate} ~ ${peTask.endDate}`}
            </DialogDescription>
          </DialogHeader>

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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">未录入班级</p>
            <div className="flex items-center gap-2">
              <Link
                href="/pe-score-import"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-accent/60"
              >
                查看录入页
              </Link>
              {peProgress.pending.length > 0 && (
                <button
                  type="button"
                  onClick={remindAll}
                  disabled={pendingUnreminded.length === 0}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition",
                    pendingUnreminded.length === 0
                      ? "cursor-default bg-muted/50 text-muted-foreground"
                      : "bg-gradient-to-r from-[oklch(0.56_0.17_150)] to-[oklch(0.46_0.16_165)] text-white shadow-md shadow-brand-green/40 hover:brightness-110",
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
                      批量提醒（{pendingUnreminded.length}）
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {peProgress.pending.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              全部班级已完成体育成绩录入
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
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
                      <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 text-xs font-medium text-brand-orange">
                        未录入 {p.missing.join("、")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
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
                          "shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition",
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
        </DialogContent>
      </Dialog>

      {/* 荣誉班级名单 + 奖卡折线图 */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="glass-panel flex min-h-0 flex-col gap-3 rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Flag className="size-4 fill-brand-yellow text-brand-yellow" />
            本周优雅班集体获得名单
          </h3>
          {honoredByGrade.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              本周暂未颁发优雅班集体
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    班主任：{g.classes.map((c) => c.teacher).join("、")}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-auto text-xs text-muted-foreground">
            数据来源：周优雅班集体颁发记录（{today}）
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

      {/* 本周荣誉记录 + 本周奖卡发放记录 */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
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
              className="scrollbar-none flex max-h-[360px] min-h-0 flex-col gap-2 overflow-y-auto pr-1"
              onScroll={honorsScroll.onScroll}
            >
              {honorsLoadMore.visible.map((h) => {
                const cls = classes.find((c) => c.id === h.classId)
                const levelMeta = HONOR_LEVEL_ICON[h.honorLevel] ?? HONOR_LEVEL_ICON.school
                const LevelIcon = levelMeta.icon
                return (
                  <li key={h.id} className="flex items-start gap-2.5 rounded-xl bg-muted/30 px-3.5 py-3 transition hover:bg-brand-orange/10">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md",
                        levelMeta.badge,
                      )}
                      title={HONOR_LEVEL_LABEL[h.honorLevel]}
                    >
                      <LevelIcon className="size-4" />
                    </span>
                    <span className={cn("mt-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", HONOR_LEVEL_STYLE[h.honorLevel])}>
                      {HONOR_LEVEL_LABEL[h.honorLevel]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{h.honorName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {h.studentName} · {cls?.name ?? h.classId} · {h.level1}
                      </p>
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
              className="scrollbar-none flex max-h-[360px] min-h-0 flex-col gap-2 overflow-y-auto pr-1"
              onScroll={awardCardsScroll.onScroll}
            >
              {awardCardsLoadMore.visible.map((a) => {
                const cls = classes.find((c) => c.id === a.classId)
                const sourceMeta = AWARD_SOURCE_BADGE[a.source] ?? AWARD_SOURCE_BADGE.online
                const SourceIcon = sourceMeta.icon
                return (
                  <div key={a.id} className="flex items-center gap-2.5 rounded-xl bg-muted/30 px-3.5 py-2.5 transition hover:bg-brand-blue/10">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md",
                        sourceMeta.badge,
                      )}
                      title={POINT_SOURCE_LABEL[a.source]}
                    >
                      <SourceIcon className="size-4" />
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", POINT_SOURCE_STYLE[a.source])}>
                      {POINT_SOURCE_LABEL[a.source]}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{cls?.name ?? a.classId}</span>
                    <span className="shrink-0 text-xs font-medium text-foreground">{a.studentName}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{a.level1}</span>
                    <span className="shrink-0 text-xs font-bold text-brand-green">+{a.points}</span>
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
      </div>
    </div>
  )
}
