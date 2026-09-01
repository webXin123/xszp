import type {
  Activity,
  ActivityStatus,
  Enrollment,
} from "./types"

export const ACTIVITY_STATUS_META: Record<
  ActivityStatus,
  { label: string; className: string; dot: string }
> = {
  draft: { label: "草稿", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  recruiting: { label: "报名中", className: "bg-brand-green/15 text-brand-green", dot: "bg-brand-green" },
  ongoing: { label: "进行中", className: "bg-brand-blue/15 text-brand-blue", dot: "bg-brand-blue" },
  ended: { label: "已结束", className: "bg-brand-orange/15 text-brand-orange", dot: "bg-brand-orange" },
  closed: { label: "已归档", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
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

export function isEnrolling(activity: Activity, today: string): boolean {
  return activity.status === "recruiting" && today >= activity.enrollStart && today <= activity.enrollEnd
}

export function isActive(activity: Activity, today: string): boolean {
  return (
    activity.status === "recruiting" ||
    activity.status === "ongoing" ||
    (activity.status === "ended" && today <= activity.endDate)
  )
}

export function canSubmit(activity: Activity, today: string): boolean {
  // 活动开始后即可提交成果，结束后仍允许补交（在 closed 之前）
  return (
    (activity.status === "ongoing" || activity.status === "ended") &&
    today >= activity.startDate &&
    today <= activity.endDate
  )
}

export function canEvaluate(activity: Activity, today: string): boolean {
  // 活动结束后开放评价
  return (activity.status === "ended" || activity.status === "closed") && today >= activity.endDate
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
  if (start === end) return start
  return `${start} ~ ${end}`
}
