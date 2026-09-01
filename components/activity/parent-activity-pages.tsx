"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  MapPin,
  Star,
  Users,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { formatDate } from "@/lib/scoring-utils"
import {
  ACTIVITY_STATUS_META,
  ENROLLMENT_STATUS_META,
  canEvaluate,
  canSubmit,
  formatActivityDateRange,
  getActivityProgress,
  getEnrollmentOf,
  isEnrolling,
} from "@/lib/activity-utils"
import { ParentActivityDetailDialog } from "../parent/parent-activity-detail-dialog"
import type { Activity, ParentChild } from "@/lib/types"

function useClassMeta(classId: string) {
  const { classes, grades } = useEvaluation()
  const cls = classes.find((c) => c.id === classId) ?? null
  const grade = cls ? grades.find((g) => g.id === cls.gradeId) ?? null : null
  return { cls, grade }
}

function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/"
        className="flex size-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
        aria-label="返回家长首页"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

/** 依据学生定位家长家庭：若该生在某个家长名下，则可在其子女间切换 */
function StudentSwitcher({ studentId }: { studentId: string }) {
  const router = useRouter()
  const { parentUsers } = useEvaluation()
  const family = parentUsers.find((p) => p.children.some((c) => c.studentId === studentId))
  if (!family || family.children.length <= 1) return null
  return (
    <div className="glass-panel flex items-center gap-1 rounded-xl px-1.5 py-1.5">
      <Users className="ml-1.5 size-3.5 text-muted-foreground" />
      {family.children.map((c: ParentChild) => {
        const active = c.studentId === studentId
        return (
          <button
            key={c.studentId}
            type="button"
            onClick={() => router.replace(`/activities/enroll?student=${encodeURIComponent(c.studentId)}`)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-sm shadow-primary/30"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {c.name}
            <span className="ml-1 text-[10px] opacity-70">{c.className}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ================================================================== *
 * 活动报名页
 * ================================================================== */

export function ActivityEnrollView({
  studentId,
  focusActivityId,
}: {
  studentId: string
  focusActivityId: string | null
}) {
  const {
    students,
    activities,
    enrollments,
    enrollChild,
    getStudentBalance,
  } = useEvaluation()

  const student = students.find((s) => s.id === studentId) ?? null
  const { cls, grade } = useClassMeta(student?.classId ?? "")
  const today = formatDate(new Date())
  const balance = getStudentBalance(studentId)

  // 面向该学生班级的全部活动（按发布时间倒序）
  const visibleActivities = useMemo(() => {
    if (!student) return []
    return activities
      .filter((a) => a.status !== "draft" && a.classIds.includes(student.classId))
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [activities, student])

  const [enrollTarget, setEnrollTarget] = useState<Activity | null>(null)
  const [remark, setRemark] = useState("")
  const [result, setResult] = useState<{ ok: boolean; reason?: string } | null>(null)

  // URL 携带活动 id 时自动打开该活动报名
  useEffect(() => {
    if (!focusActivityId) return
    const act = visibleActivities.find((a) => a.id === focusActivityId)
    if (act) setEnrollTarget(act)
  }, [focusActivityId, visibleActivities])

  const openEnroll = (act: Activity) => {
    setRemark("")
    setResult(null)
    setEnrollTarget(act)
  }

  const submitEnroll = () => {
    if (!enrollTarget) return
    const r = enrollChild(enrollTarget.id, studentId, remark)
    setResult(r)
    if (r.ok) {
      window.setTimeout(() => setEnrollTarget(null), 900)
    }
  }

  if (!student) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PageHeader title="活动报名" />
        <p className="rounded-xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          未找到学生信息，请返回家长首页重新进入
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="活动报名" sub={`共 ${visibleActivities.length} 个活动面向 ${cls?.name ?? "该生班级"}`} />
        <StudentSwitcher studentId={studentId} />
      </div>

      {/* 学生信息条 */}
      <div className="glass-panel flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-yellow to-brand-orange text-sm font-bold text-white shadow-md shadow-brand-orange/30">
            {student.name.slice(0, 1)}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground">{student.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {grade?.name ?? ""}
              {cls ? ` · ${cls.name}` : ""} · 学号 {student.studentNo}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-brand-green/10 px-3 py-1 text-xs font-medium text-brand-green">
          <Wallet className="size-3.5" />
          剩余积分 {balance}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          用户 ID：{studentId}
        </span>
      </div>

      {/* 活动列表 */}
      {visibleActivities.length === 0 ? (
        <p className="rounded-xl bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground">
          暂无面向该班级的活动
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleActivities.map((act) => {
            const meta = ACTIVITY_STATUS_META[act.status]
            const enrolling = isEnrolling(act, today)
            const my = getEnrollmentOf(act.id, studentId, enrollments.filter((e) => e.status !== "cancelled"))
            const progress = getActivityProgress(act, enrollments)
            return (
              <li key={act.id} className="glass-panel flex flex-col gap-2.5 rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/activities/detail?student=${encodeURIComponent(studentId)}&id=${encodeURIComponent(act.id)}`}
                    className="text-sm font-semibold text-foreground underline-offset-4 transition hover:text-brand-blue hover:underline"
                  >
                    {act.title}
                  </Link>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      meta.className,
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </span>
                  <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-medium text-brand-blue">
                    {act.level1}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {act.description}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    报名 {formatActivityDateRange(act.enrollStart, act.enrollEnd)}
                  </span>
                  <span>活动 {formatActivityDateRange(act.startDate, act.endDate)}</span>
                  {act.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {act.location}
                    </span>
                  )}
                  {act.capacity > 0 && (
                    <span>
                      名额 {progress.approved + progress.pending}/{act.capacity}
                    </span>
                  )}
                  {act.pointsCost > 0 && (
                    <span className="font-medium text-brand-orange">需 {act.pointsCost} 积分</span>
                  )}
                </div>
                <div className="flex items-center gap-2 border-t border-border/40 pt-2.5">
                  {my ? (
                    <>
                      <span
                        className={cn(
                          "rounded-lg px-2 py-0.5 text-[11px] font-semibold",
                          ENROLLMENT_STATUS_META[my.status].className,
                        )}
                      >
                        {ENROLLMENT_STATUS_META[my.status].label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {my.enrolledAt.slice(0, 16).replace("T", " ")} 提交报名
                      </span>
                    </>
                  ) : enrolling ? (
                    <Button size="sm" onClick={() => openEnroll(act)}>
                      立即报名
                    </Button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      {today < act.enrollStart ? "报名未开始" : "报名已结束"}
                    </span>
                  )}
                  <Link
                    href={`/activities/detail?student=${encodeURIComponent(studentId)}&id=${encodeURIComponent(act.id)}`}
                    className="ml-auto flex items-center gap-0.5 text-xs font-medium text-brand-blue hover:underline"
                  >
                    活动详情
                    <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* 报名对话框 */}
      <Dialog open={!!enrollTarget} onOpenChange={(o) => !o && setEnrollTarget(null)}>
        <DialogContent className="glass-surface sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>报名「{enrollTarget?.title}」</DialogTitle>
            <DialogDescription>
              以 {student.name} 的名义提交报名，等待老师审核
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
              <span>报名截止 {enrollTarget?.enrollEnd}</span>
              {enrollTarget && enrollTarget.capacity > 0 && (
                <span>
                  名额{" "}
                  {
                    getActivityProgress(
                      enrollTarget,
                      enrollments,
                    ).approved + getActivityProgress(enrollTarget, enrollments).pending
                  }
                  /{enrollTarget.capacity}
                </span>
              )}
              {enrollTarget && enrollTarget.pointsCost > 0 && (
                <span className="font-medium text-brand-orange">
                  报名将预扣 {enrollTarget.pointsCost} 积分（当前剩余 {balance}）
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="enroll-remark">报名附言（选填）</Label>
              <Textarea
                id="enroll-remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="可说明孩子想参与的原因、可承担的任务等"
                rows={3}
                maxLength={200}
              />
            </div>
            {result && !result.ok && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {result.reason}
              </p>
            )}
            {result?.ok && (
              <p className="rounded-lg bg-brand-green/10 px-3 py-2 text-sm text-brand-green">
                报名提交成功，等待老师审核
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setEnrollTarget(null)}
            >
              取消
            </Button>
            <Button onClick={submitEnroll} disabled={result?.ok}>
              确认报名
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ================================================================== *
 * 活动详情页
 * ================================================================== */

export function ActivityDetailView({
  studentId,
  activityId,
}: {
  studentId: string
  activityId: string | null
}) {
  const { students, activities, enrollments } = useEvaluation()
  const [panelOpen, setPanelOpen] = useState(false)
  const student = students.find((s) => s.id === studentId) ?? null
  const activity = activities.find((a) => a.id === activityId) ?? null
  const today = formatDate(new Date())

  if (!student || !activity) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PageHeader title="活动详情" />
        <p className="rounded-xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          未找到活动或学生信息，请返回家长首页重新进入
        </p>
      </div>
    )
  }

  const meta = ACTIVITY_STATUS_META[activity.status]
  const my = getEnrollmentOf(activity.id, studentId, enrollments.filter((e) => e.status !== "cancelled"))
  const progress = getActivityProgress(activity, enrollments)
  const operable = canSubmit(activity, today) || canEvaluate(activity, today)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title="活动详情" sub={activity.publisherName ? `发布人：${activity.publisherName}` : undefined} />

      <section className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-foreground">{activity.title}</h2>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              meta.className,
            )}
          >
            <span className={cn("size-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
          <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-medium text-brand-blue">
            {activity.level1}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{activity.description}</p>
        <div className="grid gap-1.5 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-2">
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            报名时间：{formatActivityDateRange(activity.enrollStart, activity.enrollEnd)}
          </span>
          <span>活动时间：{formatActivityDateRange(activity.startDate, activity.endDate)}</span>
          {activity.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              地点：{activity.location}
            </span>
          )}
          {activity.capacity > 0 && (
            <span>
              名额：{progress.approved + progress.pending}/{activity.capacity}（已通过{" "}
              {progress.approved}）
            </span>
          )}
          {activity.pointsCost > 0 && (
            <span className="font-medium text-brand-orange">
              报名门槛：预扣 {activity.pointsCost} 积分
            </span>
          )}
        </div>
      </section>

      {/* 该生报名状态 */}
      <section className="glass-panel flex flex-col gap-2 rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-semibold text-muted-foreground">
          {student.name} 的报名状态
        </h3>
        {my ? (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs",
              ENROLLMENT_STATUS_META[my.status].className,
            )}
          >
            <span className="font-medium">{ENROLLMENT_STATUS_META[my.status].label}</span>
            {my.reviewNote && <span className="text-muted-foreground">· {my.reviewNote}</span>}
            {my.reviewerName && (
              <span className="ml-auto text-[11px] text-muted-foreground">
                审核人 {my.reviewerName}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">孩子暂未报名该活动</span>
            {isEnrolling(activity, today) && (
              <Link
                href={`/activities/enroll?student=${encodeURIComponent(studentId)}&id=${encodeURIComponent(activity.id)}`}
                className="ml-auto"
              >
                <Button size="sm">前往报名</Button>
              </Link>
            )}
          </div>
        )}
        <Link
          href={`/activities/enroll?student=${encodeURIComponent(studentId)}`}
          className="mt-1 flex items-center gap-0.5 self-start text-xs font-medium text-brand-blue hover:underline"
        >
          返回活动报名列表
          <ChevronRight className="size-3.5" />
        </Link>
      </section>

      {/* 家长代操作：上传成果 / 评价活动 */}
      {operable && (
        <section className="glass-panel flex flex-wrap items-center gap-3 rounded-2xl p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="size-3.5" />
            家长可代 {student.name} 进行操作
          </p>
          <Button size="sm" className="ml-auto" onClick={() => setPanelOpen(true)}>
            上传成果 / 评价活动
          </Button>
        </section>
      )}

      {activity && student && (
        <ParentActivityDetailDialog
          activity={activity}
          open={panelOpen}
          onOpenChange={setPanelOpen}
          studentId={student.id}
          childName={student.name}
          classId={student.classId}
        />
      )}
    </div>
  )
}
