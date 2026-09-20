"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  CalendarRange,
  ClipboardCheck,
  FolderOpen,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import {
  ACTIVITY_STATUS_META,
  getActivityProgress,
  formatActivityDateRange,
  requiresActivityEnrollment,
  requiresActivityPointsExchange,
} from "@/lib/activity-utils"
import { cn } from "@/lib/utils"
import type { Activity, ActivityStatus, Teacher } from "@/lib/types"
import { ActivityPublishDialog } from "./activity-publish-dialog"

type Filter = "all" | ActivityStatus
type SemesterFilter = "all" | string

interface SemesterOption {
  key: string
  label: string
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "recruiting", label: "报名中" },
  { key: "ongoing", label: "进行中" },
  { key: "ended", label: "已结束" },
]

function getSemesterOption(value: Date | string): SemesterOption {
  const date = typeof value === "string" ? new Date(value) : value
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  if (month >= 8) return { key: `${year}-${year + 1}-1`, label: `${year}-${year + 1} 学年第一学期` }
  if (month <= 1) return { key: `${year - 1}-${year}-1`, label: `${year - 1}-${year} 学年第一学期` }
  return { key: `${year - 1}-${year}-2`, label: `${year - 1}-${year} 学年第二学期` }
}

export function ActivityManageTab() {
  const { activities, enrollments, updateActivity, currentUser, grades, classes } = useEvaluation()
  const { visibleGrades } = usePermission()
  const [filter, setFilter] = useState<Filter>("all")
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>(() => getSemesterOption(new Date()).key)
  const [publishOpen, setPublishOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)

  // 管理员可见范围：director 看全部，moral_director 只看本年级发布的活动
  const visibleActivities = useMemo(() => {
    if (currentUser.kind === "parent") return []
    const teacher = currentUser as Teacher
    if (teacher.role === "director") return activities
    const gradeIdSet = new Set(visibleGrades.map((g) => g.id))
    return activities.filter(
      (a) => a.gradeIds.some((gid) => gradeIdSet.has(gid)) || a.publisherId === teacher.id,
    )
  }, [activities, currentUser, visibleGrades])

  const semesterOptions = useMemo(() => {
    const options = new Map<string, SemesterOption>()
    const currentSemester = getSemesterOption(new Date())
    options.set(currentSemester.key, currentSemester)
    visibleActivities.forEach((activity) => {
      const option = getSemesterOption(activity.startDate)
      options.set(option.key, option)
    })
    return [...options.values()].sort((a, b) => b.key.localeCompare(a.key))
  }, [visibleActivities])

  const semesterActivities = useMemo(
    () => visibleActivities.filter((activity) => semesterFilter === "all" || getSemesterOption(activity.startDate).key === semesterFilter),
    [semesterFilter, visibleActivities],
  )

  const filtered = useMemo(
    () => semesterActivities
      .filter((activity) => filter === "all" || activity.status === filter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [semesterActivities, filter],
  )

  const stats = useMemo(() => {
    const total = semesterActivities.length
    const recruiting = semesterActivities.filter((a) => a.status === "recruiting").length
    const ongoing = semesterActivities.filter((a) => a.status === "ongoing").length
    const ended = semesterActivities.filter((a) => a.status === "ended").length
    const pendingReview = enrollments.filter(
      (e) => {
        const act = activities.find((a) => a.id === e.activityId)
        return (
          act &&
          semesterActivities.includes(act) &&
          e.status === "pending"
        )
      },
    ).length
    return { total, recruiting, ongoing, ended, pendingReview }
  }, [semesterActivities, enrollments, activities])

  return (
    <div className="flex flex-col gap-4">
      {/* 概览统计 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="活动总数" value={stats.total} icon={CalendarRange} tone="blue" />
        <StatCard label="报名中" value={stats.recruiting} icon={Sparkles} tone="green" />
        <StatCard label="进行中" value={stats.ongoing} icon={FolderOpen} tone="blue" />
        <StatCard label="待审核报名" value={stats.pendingReview} icon={ClipboardCheck} tone="orange" />
      </div>

      {/* 操作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dbe2f8] bg-[#f8f9ff] p-2.5">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="活动状态筛选">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-[0_6px_14px_-10px_rgba(63,81,188,0.9)]"
                  : "bg-white text-muted-foreground hover:bg-primary/5 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={semesterFilter} onValueChange={(value) => setSemesterFilter(String(value ?? "all"))}>
            <SelectTrigger aria-label="筛选活动学期" className="h-9 w-[176px] border-[#d5dcf5] bg-white text-sm font-semibold"><SelectValue placeholder="选择活动学期" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部学期</SelectItem>
              {semesterOptions.map((semester) => <SelectItem key={semester.key} value={semester.key}>{semester.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="border-[#d5dcf5] bg-white hover:bg-primary/5"
            onClick={() => {
              setEditingActivity(null)
              setPublishOpen(true)
            }}
          >
            <Plus className="size-4" />
            发布活动
          </Button>
        </div>
      </div>

      {/* 活动列表 */}
      {filtered.length === 0 ? (
        <p className="rounded-xl bg-muted/40 px-3 py-10 text-center text-sm text-muted-foreground">
          {semesterFilter === "all" ? "暂无活动" : `${semesterOptions.find((semester) => semester.key === semesterFilter)?.label ?? "当前学期"} 暂无活动`}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((activity) => {
            const meta = ACTIVITY_STATUS_META[activity.status]
            const progress = getActivityProgress(activity, enrollments)
            const needsEnrollment = requiresActivityEnrollment(activity)
            const needsPointsExchange = requiresActivityPointsExchange(activity)
            const ratio = needsEnrollment && progress.capacity > 0 ? Math.min(progress.approved / progress.capacity, 1) : 0
            const targetGrade = grades.find((grade) => grade.id === activity.gradeIds[0])?.name ?? "指定年级"
            const targetClasses = activity.classIds
              .map((classId) => classes.find((item) => item.id === classId)?.name)
              .filter((name): name is string => !!name)
            const targetLabel = targetClasses.length <= 1
              ? `${targetGrade} · ${targetClasses[0] ?? "指定班级"}`
              : `${targetGrade} · ${targetClasses[0]} 等 ${targetClasses.length} 班`
            const activityTypeLabels = activity.activityTypes?.length ? activity.activityTypes : ["综合实践"]
            const requirementLabel = (activity.pointRequirements ?? [])
              .map((item) => `${item.level1} ≥ ${item.minimumPoints}分`)
              .join(" · ")
            return (
              <article
                key={activity.id}
                className="relative flex flex-col gap-3 rounded-2xl border border-[#dbe2f8] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(53,67,150,0.7)] transition hover:border-primary/35 hover:shadow-[0_16px_30px_-24px_rgba(53,67,150,0.78)]"
              >
                <Link href={`/activities/manage-detail?id=${encodeURIComponent(activity.id)}`} className="flex flex-col gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" aria-label={`查看活动详情：${activity.title}`}>
                <div className="flex items-start gap-3 pr-16">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarRange className="size-4" aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate text-base font-semibold text-foreground">{activity.title}</span>
                      <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>
                        <span className={cn("size-1.5 rounded-full", meta.dot)} />
                        {meta.label}
                      </span>
                    </div>
                    {activity.level1 && <p className="mt-0.5 text-xs text-muted-foreground">关联指标 · {activity.level1}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activityTypeLabels.map((type) => <span key={type} className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-medium text-brand-blue">{type}</span>)}
                    </div>
                  </div>
                </div>

                <p className="line-clamp-1 text-sm leading-5 text-muted-foreground">{activity.description}</p>

                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <span className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/55 px-3 py-2 text-muted-foreground"><MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{activity.location || "未设活动地点"}</span></span>
                  <span className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/55 px-3 py-2 text-muted-foreground"><Users className="size-3.5 shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{targetLabel}</span></span>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs leading-5 text-muted-foreground">
                  {needsEnrollment && <span>报名：{formatActivityDateRange(activity.enrollStart, activity.enrollEnd)}</span>}
                  <span>活动：{formatActivityDateRange(activity.startDate, activity.endDate)}</span>
                </div>

                <div className="flex flex-wrap gap-2.5 text-xs">
                  {needsEnrollment ? <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"><ShieldCheck className="mr-1 inline size-3" aria-hidden="true" />需要报名</span> : <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">无需报名</span>}
                  {needsPointsExchange && activity.pointsCost > 0 && (
                    <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 font-medium text-brand-orange">
                      消耗 {activity.pointsCost} 积分
                    </span>
                  )}
                  {activity.participationPointsEnabled && (activity.participationPoints ?? 0) > 0 && (
                    <span className="rounded-full bg-brand-green/15 px-2 py-0.5 font-medium text-brand-green">
                      参与奖励 +{activity.participationPoints} 分
                    </span>
                  )}
                  {needsEnrollment && activity.capacity > 0 && (
                    <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 font-medium text-brand-blue">
                      名额 {activity.capacity}
                    </span>
                  )}
                  {needsPointsExchange && (activity.pointRequirements?.length ?? 0) > 0 && <span title={requirementLabel} className="max-w-full truncate rounded-full bg-[#f0edff] px-2 py-0.5 font-medium text-primary">条件：{requirementLabel}</span>}
                </div>

                {/* 报名进度 */}
                {needsEnrollment && <div className="rounded-xl border border-[#e4e8f8] bg-[#f8f9ff] p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Users className="size-3.5 text-muted-foreground" />
                      报名进度
                    </span>
                    <span className="text-muted-foreground">
                      通过 {progress.approved}
                      {progress.capacity > 0 ? ` / ${progress.capacity}` : ""} · 待审 {progress.pending} · 驳回 {progress.rejected}
                    </span>
                  </div>
                  {progress.capacity > 0 && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background/60">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  )}
                </div>}
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 z-10 shrink-0 text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  onClick={() => {
                    setEditingActivity(activity)
                    setPublishOpen(true)
                  }}
                >
                  <Pencil className="size-3.5" />
                  编辑
                </Button>
              </article>
            )
          })}
        </div>
      )}

      <ActivityPublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        activity={editingActivity}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof CalendarRange
  tone: "blue" | "green" | "orange"
}) {
  const toneClass = {
    blue: "bg-brand-blue/15 text-brand-blue",
    green: "bg-brand-green/15 text-brand-green",
    orange: "bg-brand-orange/15 text-brand-orange",
  }[tone]
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#dbe2f8] bg-white p-3 shadow-[0_10px_22px_-22px_rgba(55,67,145,0.65)] transition hover:border-primary/30 hover:bg-[#fbfcff]">
      <span className={cn("flex size-9 items-center justify-center rounded-xl", toneClass)}>
        <Icon className="size-4.5" />
      </span>
      <div className="flex flex-col">
        <span className="text-xl font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
