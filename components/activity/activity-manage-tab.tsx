"use client"

import { useMemo, useState } from "react"
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
import { EnrollmentReviewDialog } from "./enrollment-review-dialog"
import { ActivitySubmissionsDialog } from "./activity-submissions-dialog"

type Filter = "all" | ActivityStatus

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "recruiting", label: "报名中" },
  { key: "ongoing", label: "进行中" },
  { key: "ended", label: "已结束" },
]

export function ActivityManageTab() {
  const { activities, enrollments, updateActivity, currentUser, grades, classes } = useEvaluation()
  const { visibleGrades } = usePermission()
  const [filter, setFilter] = useState<Filter>("all")
  const [publishOpen, setPublishOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [reviewActivity, setReviewActivity] = useState<Activity | null>(null)
  const [submissionsActivity, setSubmissionsActivity] = useState<Activity | null>(null)

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

  const filtered = useMemo(
    () =>
      activities
        .filter((a) => visibleActivities.includes(a))
        .filter((a) => filter === "all" || a.status === filter)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [visibleActivities, activities, filter],
  )

  const stats = useMemo(() => {
    const total = visibleActivities.length
    const recruiting = visibleActivities.filter((a) => a.status === "recruiting").length
    const ongoing = visibleActivities.filter((a) => a.status === "ongoing").length
    const ended = visibleActivities.filter((a) => a.status === "ended").length
    const pendingReview = enrollments.filter(
      (e) => {
        const act = activities.find((a) => a.id === e.activityId)
        return (
          act &&
          visibleActivities.includes(act) &&
          e.status === "pending"
        )
      },
    ).length
    return { total, recruiting, ongoing, ended, pendingReview }
  }, [visibleActivities, enrollments, activities])

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

      {/* 活动列表 */}
      {filtered.length === 0 ? (
        <p className="rounded-xl bg-muted/40 px-3 py-10 text-center text-sm text-muted-foreground">
          暂无活动
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
            const requirementLabel = (activity.pointRequirements ?? [])
              .map((item) => `${item.level1} ≥ ${item.minimumPoints}分`)
              .join(" · ")
            return (
              <div key={activity.id} className="flex flex-col gap-3 rounded-2xl border border-[#dbe2f8] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(53,67,150,0.7)] transition hover:border-primary/35 hover:shadow-[0_16px_30px_-24px_rgba(53,67,150,0.78)]">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarRange className="size-4" aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-semibold text-foreground">{activity.title}</span>
                      <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>
                        <span className={cn("size-1.5 rounded-full", meta.dot)} />
                        {meta.label}
                      </span>
                    </div>
                    {activity.level1 && <p className="mt-0.5 text-xs text-muted-foreground">关联指标 · {activity.level1}</p>}
                  </div>
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">{activity.description}</p>

                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <span className="flex min-w-0 items-center gap-1.5 rounded-lg bg-muted/55 px-2.5 py-2 text-muted-foreground"><MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{activity.location || "未设活动地点"}</span></span>
                  <span className="flex min-w-0 items-center gap-1.5 rounded-lg bg-muted/55 px-2.5 py-2 text-muted-foreground"><Users className="size-3.5 shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{targetLabel}</span></span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {needsEnrollment && <span>报名：{formatActivityDateRange(activity.enrollStart, activity.enrollEnd)}</span>}
                  <span>活动：{formatActivityDateRange(activity.startDate, activity.endDate)}</span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {needsEnrollment ? <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"><ShieldCheck className="mr-1 inline size-3" aria-hidden="true" />需要报名</span> : <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">无需报名</span>}
                  {needsPointsExchange && activity.pointsCost > 0 && (
                    <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 font-medium text-brand-orange">
                      消耗 {activity.pointsCost} 积分
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
                {needsEnrollment && <div className="rounded-xl border border-[#e4e8f8] bg-[#f8f9ff] p-2.5">
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

                {/* 操作 */}
                <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                  {needsEnrollment && <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    onClick={() => setReviewActivity(activity)}
                  >
                    <ClipboardCheck className="size-3.5" />
                    报名审核{progress.pending > 0 ? `（${progress.pending}）` : ""}
                  </Button>}
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    onClick={() => setSubmissionsActivity(activity)}
                  >
                    <FolderOpen className="size-3.5" />
                    学生成果
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      setEditingActivity(activity)
                      setPublishOpen(true)
                    }}
                  >
                    <Pencil className="size-3.5" />
                    编辑
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ActivityPublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        activity={editingActivity}
      />
      <EnrollmentReviewDialog
        activity={reviewActivity}
        open={!!reviewActivity}
        onOpenChange={(o) => !o && setReviewActivity(null)}
      />
      <ActivitySubmissionsDialog
        activity={submissionsActivity}
        open={!!submissionsActivity}
        onOpenChange={(o) => !o && setSubmissionsActivity(null)}
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
