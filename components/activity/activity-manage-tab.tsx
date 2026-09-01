"use client"

import { useMemo, useState } from "react"
import {
  CalendarRange,
  ClipboardCheck,
  FolderOpen,
  Pencil,
  Plus,
  Sparkles,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { formatDate } from "@/lib/scoring-utils"
import {
  ACTIVITY_STATUS_META,
  getActivityProgress,
  formatActivityDateRange,
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
  { key: "closed", label: "已归档" },
]

export function ActivityManageTab() {
  const { activities, enrollments, updateActivity, currentUser } = useEvaluation()
  const { visibleGrades } = usePermission()
  const [filter, setFilter] = useState<Filter>("all")
  const [publishOpen, setPublishOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [reviewActivity, setReviewActivity] = useState<Activity | null>(null)
  const [submissionsActivity, setSubmissionsActivity] = useState<Activity | null>(null)

  const today = formatDate(new Date())

  // 管理员可见范围：director 看全部，grade_leader 只看本年级发布的活动
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

  const handleAdvance = (activity: Activity) => {
    const next: Record<ActivityStatus, ActivityStatus | null> = {
      draft: "recruiting",
      recruiting: "ongoing",
      ongoing: "ended",
      ended: "closed",
      closed: null,
    }
    const target = next[activity.status]
    if (target) updateActivity(activity.id, { status: target })
  }

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "glass-panel text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button
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
            const ratio = progress.capacity > 0 ? Math.min(progress.approved / progress.capacity, 1) : 0
            return (
              <div key={activity.id} className="glass-panel flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-foreground">{activity.title}</span>
                      <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", meta.className)}>
                        <span className={cn("size-1.5 rounded-full", meta.dot)} />
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {activity.level1} · {activity.location || "未设地点"}
                    </p>
                  </div>
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">{activity.description}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>报名：{formatActivityDateRange(activity.enrollStart, activity.enrollEnd)}</span>
                  <span>活动：{formatActivityDateRange(activity.startDate, activity.endDate)}</span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {activity.pointsCost > 0 && (
                    <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 font-medium text-brand-orange">
                      消耗 {activity.pointsCost} 积分
                    </span>
                  )}
                  {activity.capacity > 0 && (
                    <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 font-medium text-brand-blue">
                      名额 {activity.capacity}
                    </span>
                  )}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {activity.classIds.length} 个班级
                  </span>
                </div>

                {/* 报名进度 */}
                <div className="rounded-xl bg-muted/40 p-2.5">
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
                        className="h-full rounded-full bg-brand-green transition-all"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* 操作 */}
                <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    onClick={() => setReviewActivity(activity)}
                  >
                    <ClipboardCheck className="size-3.5" />
                    报名审核{progress.pending > 0 ? `（${progress.pending}）` : ""}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    onClick={() => setSubmissionsActivity(activity)}
                  >
                    <FolderOpen className="size-3.5" />
                    活动详情
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
                  {activity.status !== "closed" && (
                    <Button size="sm" onClick={() => handleAdvance(activity)}>
                      {nextStatusLabel(activity.status)}
                    </Button>
                  )}
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

function nextStatusLabel(status: ActivityStatus): string {
  switch (status) {
    case "draft":
      return "发布报名"
    case "recruiting":
      return "开始活动"
    case "ongoing":
      return "结束活动"
    case "ended":
      return "归档"
    default:
      return "推进"
  }
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
    <div className="glass-panel flex items-center gap-3 rounded-2xl p-3 transition hover:shadow-md">
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
