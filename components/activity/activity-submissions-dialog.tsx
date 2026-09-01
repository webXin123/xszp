"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ClipboardList, MapPin, Star, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import {
  ACTIVITY_STATUS_META,
  formatActivityDateRange,
} from "@/lib/activity-utils"
import type { Activity, ActivitySubmission } from "@/lib/types"

const TYPE_LABEL: Record<ActivitySubmission["type"], string> = {
  photo: "活动照片",
  practice: "实践成果",
  reflection: "活动感悟",
}

const TYPE_STYLE: Record<ActivitySubmission["type"], string> = {
  photo: "bg-brand-blue/15 text-brand-blue",
  practice: "bg-brand-green/15 text-brand-green",
  reflection: "bg-brand-orange/15 text-brand-orange",
}

type DetailTab = "submissions" | "evaluations"

interface ActivitySubmissionsDialogProps {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActivitySubmissionsDialog({
  activity,
  open,
  onOpenChange,
}: ActivitySubmissionsDialogProps) {
  const { submissions, evaluations } = useEvaluation()
  const [tab, setTab] = useState<DetailTab>("submissions")

  const related = useMemo(
    () =>
      activity
        ? submissions
            .filter((s) => s.activityId === activity.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [activity, submissions],
  )

  const relatedEvaluations = useMemo(
    () =>
      activity
        ? evaluations
            .filter((e) => e.activityId === activity.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [activity, evaluations],
  )

  const evalStats = useMemo(() => {
    if (relatedEvaluations.length === 0) return { avg: 0, count: 0 }
    const avg =
      relatedEvaluations.reduce((s, e) => s + e.rating, 0) / relatedEvaluations.length
    return { avg, count: relatedEvaluations.length }
  }, [relatedEvaluations])

  if (!activity) return null

  const meta = ACTIVITY_STATUS_META[activity.status]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-surface max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-base">{activity.title}</DialogTitle>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                meta.className,
              )}
            >
              <span className={cn("size-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
          </div>
          <DialogDescription>
            {activity.level1} · 发布人 {activity.publisherName}
          </DialogDescription>
        </DialogHeader>

        {/* 活动基础信息 */}
        <div className="flex flex-col gap-2 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="text-sm leading-relaxed text-foreground">{activity.description}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              报名：{formatActivityDateRange(activity.enrollStart, activity.enrollEnd)}
            </span>
            <span>活动：{formatActivityDateRange(activity.startDate, activity.endDate)}</span>
            {activity.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {activity.location}
              </span>
            )}
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
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2 border-b border-border/40 pb-3">
          <button
            type="button"
            onClick={() => setTab("submissions")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition",
              tab === "submissions"
                ? "bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-md shadow-primary/30"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ClipboardList className="size-4" />
            学生成果（{related.length}）
          </button>
          <button
            type="button"
            onClick={() => setTab("evaluations")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition",
              tab === "evaluations"
                ? "bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-md shadow-primary/30"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className="size-4" />
            学生评价（{relatedEvaluations.length}）
          </button>
        </div>

        {/* 成果列表 */}
        {tab === "submissions" && (
          <div className="flex flex-col gap-3">
            {related.length === 0 ? (
              <p className="rounded-xl bg-muted/40 px-3 py-10 text-center text-sm text-muted-foreground">
                暂无成果提交
              </p>
            ) : (
              related.map((s) => (
                <div key={s.id} className="glass-panel flex flex-col gap-2 rounded-xl p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{s.studentName}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{s.classId}</span>
                    <span
                      className={cn(
                        "ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium",
                        TYPE_STYLE[s.type],
                      )}
                    >
                      {TYPE_LABEL[s.type]}
                    </span>
                  </div>
                  {s.content && (
                    <p className="text-sm leading-relaxed text-foreground">{s.content}</p>
                  )}
                  {s.imageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {s.imageUrls.map((url, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={url}
                          alt={`${s.studentName} 图片 ${idx + 1}`}
                          className="size-20 rounded-lg border border-border/60 object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    提交于 {s.createdAt.slice(0, 16).replace("T", " ")}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 评价列表 */}
        {tab === "evaluations" && (
          <div className="flex flex-col gap-3">
            {relatedEvaluations.length > 0 && (
              <div className="flex items-center gap-3 rounded-xl bg-brand-yellow/10 px-3 py-2">
                <Star className="size-4 fill-brand-yellow text-brand-yellow" />
                <span className="text-sm">
                  平均 <span className="font-bold text-foreground">{evalStats.avg.toFixed(1)}</span> 分
                </span>
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  {evalStats.count} 条评价
                </span>
              </div>
            )}
            {relatedEvaluations.length === 0 ? (
              <p className="rounded-xl bg-muted/40 px-3 py-10 text-center text-sm text-muted-foreground">
                暂无学生评价
              </p>
            ) : (
              relatedEvaluations.map((e) => (
                <div key={e.id} className="glass-panel flex flex-col gap-2 rounded-xl p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{e.studentName}</span>
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cn(
                            "size-3.5",
                            n <= e.rating
                              ? "fill-brand-yellow text-brand-yellow"
                              : "fill-transparent text-muted-foreground/40",
                          )}
                        />
                      ))}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{e.comment}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.createdAt.slice(0, 16).replace("T", " ")}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
