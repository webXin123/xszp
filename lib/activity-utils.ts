import type {
  Activity,
  ActivityStatus,
  Enrollment,
} from "./types"

/** 发布活动时可选择的中文活动类型，支持多选。 */
export const ACTIVITY_TYPE_OPTIONS = [
  "学科活动",
  "体育活动",
  "艺术活动",
  "劳动实践",
  "社会实践",
  "校园文化",
  "综合实践",
] as const

/** 兼容旧活动：未配置时仍按“需要报名”处理。 */
export function requiresActivityEnrollment(activity: Activity): boolean {
  return activity.requiresEnrollment !== false
}

/** 兼容旧活动：已有积分门槛时视为开启积分兑换。 */
export function requiresActivityPointsExchange(activity: Activity): boolean {
  return requiresActivityEnrollment(activity) && (activity.requiresPointsExchange ?? activity.pointsCost > 0)
}

function toActivityDate(value: string, endOfDay = false): Date | null {
  if (!value) return null
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`
    : value
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function isWithinRange(now: Date, start: string, end: string) {
  const startDate = toActivityDate(start)
  const endDate = toActivityDate(end, true)
  return !!startDate && !!endDate && now >= startDate && now <= endDate
}

export const ACTIVITY_STATUS_META: Record<
  ActivityStatus,
  { label: string; className: string; dot: string }
> = {
  draft: { label: "未开始", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  recruiting: { label: "报名中", className: "bg-brand-green/15 text-brand-green", dot: "bg-brand-green" },
  ongoing: { label: "进行中", className: "bg-brand-blue/15 text-brand-blue", dot: "bg-brand-blue" },
  ended: { label: "已结束", className: "bg-brand-orange/15 text-brand-orange", dot: "bg-brand-orange" },
}

/** 发布活动后，状态由报名窗口与活动起止时间自动推导。 */
export function getActivityStatus(activity: Activity, now = new Date()): ActivityStatus {
  const endDate = toActivityDate(activity.endDate, true)
  const startDate = toActivityDate(activity.startDate)
  if (endDate && now > endDate) return "ended"
  if (startDate && now >= startDate) return "ongoing"
  if (requiresActivityEnrollment(activity) && isWithinRange(now, activity.enrollStart, activity.enrollEnd)) {
    return "recruiting"
  }
  return "draft"
}

export const ENROLLMENT_STATUS_META: Record<
  Enrollment["status"],
  { label: string; className: string }
> = {
  pending: { label: "待审核", className: "bg-brand-yellow/20 text-brand-yellow" },
  approved: { label: "已通过", className: "bg-brand-green/15 text-brand-green" },
  rejected: { label: "已驳回", className: "bg-destructive/15 text-destructive" },
  cancelled: { label: "已取消", className: "bg-muted text-muted-foreground" },
}

export function isEnrolling(activity: Activity, now = new Date()): boolean {
  return getActivityStatus(activity, now) === "recruiting"
}

export function isActive(activity: Activity, now = new Date()): boolean {
  const status = getActivityStatus(activity, now)
  return status === "recruiting" || status === "ongoing"
}

export function canSubmit(activity: Activity, now = new Date()): boolean {
  // 活动开始后即可提交成果，结束后仍允许补交。
  return (
    getActivityStatus(activity, now) === "ongoing" &&
    isWithinRange(now, activity.startDate, activity.endDate)
  )
}

export function canEvaluate(activity: Activity, now = new Date()): boolean {
  // 活动结束后开放评价
  const endDate = toActivityDate(activity.endDate, true)
  return getActivityStatus(activity, now) === "ended" && !!endDate && now >= endDate
}

export interface ActivityProgress {
  total: number
  pending: number
  approved: number
  rejected: number
  capacity: number
}

export function getActivityProgress(activity: Activity, enrollments: Enrollment[]): ActivityProgress {
  const related = enrollments.filter((e) => e.activityId === activity.id)
  return {
    total: related.length,
    pending: related.filter((e) => e.status === "pending").length,
    approved: related.filter((e) => e.status === "approved").length,
    rejected: related.filter((e) => e.status === "rejected").length,
    capacity: activity.capacity,
  }
}

export function getEnrollmentOf(
  activityId: string,
  studentId: string,
  enrollments: Enrollment[],
): Enrollment | undefined {
  return enrollments.find((e) => e.activityId === activityId && e.studentId === studentId)
}

export function formatActivityDateRange(start: string, end: string): string {
  const format = (value: string) => value.replace("T", " ")
  if (!start || !end) return "无需报名"
  if (start === end) return format(start)
  return `${format(start)} ~ ${format(end)}`
}
