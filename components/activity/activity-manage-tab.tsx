"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  CalendarRange,
  ChevronRight,
  ClipboardCheck,
  FolderOpen,
  Pencil,
  Plus,
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
  const { activities, enrollments, currentUser } = useEvaluation()
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
      <div className="data-card-grid gap-3">
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
        <div className="data-card-grid-relaxed gap-4">
          {filtered.map((activity) => {
            const meta = ACTIVITY_STATUS_META[activity.status]
            const progress = getActivityProgress(activity, enrollments)
            const needsEnrollment = requiresActivityEnrollment(activity)
            return (
              <article
                key={activity.id}
                className="relative rounded-2xl border border-[#dbe2f8] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(53,67,150,0.7)] transition hover:border-primary/35 hover:shadow-[0_16px_30px_-24px_rgba(53,67,150,0.78)]"
              >
                <Link href={`/activities/manage-detail?id=${encodeURIComponent(activity.id)}`} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" aria-label={`查看活动详情：${activity.title}`}>
                  <div className="flex items-start gap-3 pr-16">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <CalendarRange className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 truncate text-base font-semibold text-foreground">{activity.title}</span>
                        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>
                          <span className={cn("size-1.5 rounded-full", meta.dot)} />
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">活动时间与规则请查看详情</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarRange className="size-3.5 text-primary" aria-hidden="true" />
                      {formatActivityDateRange(activity.startDate, activity.endDate)}
                    </span>
                    {needsEnrollment ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5 text-primary" aria-hidden="true" />
                        报名 {progress.approved}{progress.capacity > 0 ? ` / ${progress.capacity}` : ""}
                        {progress.pending > 0 ? ` · 待审 ${progress.pending}` : ""}
                      </span>
                    ) : <span>无需报名</span>}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[#edf0fa] pt-3 text-xs font-medium text-primary">
                    <span>查看活动详情</span>
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
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
