"use client"

import { useMemo, useState } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useEvaluation } from "@/lib/evaluation-context"
import { ENROLLMENT_STATUS_META } from "@/lib/activity-utils"
import { cn } from "@/lib/utils"
import type { Activity, Enrollment } from "@/lib/types"

interface EnrollmentReviewDialogProps {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EnrollmentReviewDialog({
  activity,
  open,
  onOpenChange,
}: EnrollmentReviewDialogProps) {
  const { enrollments, reviewEnrollment, classes } = useEvaluation()
  const [note, setNote] = useState("")
  const [pendingId, setPendingId] = useState<string | null>(null)

  const related = useMemo(
    () =>
      activity
        ? enrollments
            .filter((e) => e.activityId === activity.id)
            .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))
        : [],
    [activity, enrollments],
  )

  const handleReview = (id: string, status: "approved" | "rejected") => {
    reviewEnrollment(id, status, note.trim())
    setNote("")
    setPendingId(null)
  }

  if (!activity) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[82vh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[22px] border border-[#d8e0f7] bg-white p-0 shadow-[0_22px_48px_-28px_rgba(53,67,150,0.58)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-xl">
        <DialogHeader className="border-b border-[#e5e9f7] bg-[#f8f9ff] px-4 py-3.5">
          <DialogTitle className="text-base">报名审核 · {activity.title}</DialogTitle>
          <DialogDescription className="text-xs">
            共 {related.length} 人 · 待审核 {related.filter((e) => e.status === "pending").length} 人 · 已通过 {related.filter((e) => e.status === "approved").length} 人
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 px-4 py-3.5">
          {related.length === 0 && (
            <p className="rounded-xl bg-muted/40 px-3 py-8 text-center text-sm text-muted-foreground">
              暂无报名记录
            </p>
          )}
          {related.map((e) => {
            const meta = ENROLLMENT_STATUS_META[e.status]
            const isPending = e.status === "pending"
            const isReviewing = pendingId === e.id
            const className = classes.find((item) => item.id === e.classId)?.name ?? e.classId
            return (
              <div key={e.id} className="rounded-xl border border-[#e4e8f6] bg-white px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{e.studentName}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{className}</span>
                  <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>
                    {meta.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span>{e.enrolledAt.slice(0, 16).replace("T", " ")}</span>
                  {e.pointsCost > 0 && <span>· 消耗 {e.pointsCost} 积分</span>}
                  {e.reviewerName && <span>· 审核人 {e.reviewerName}</span>}
                </div>
                {e.remark && (
                  <p className="mt-1.5 line-clamp-2 rounded-lg bg-[#f7f8ff] px-2.5 py-1.5 text-xs text-foreground">
                    {e.remark}
                  </p>
                )}
                {e.reviewNote && (
                  <p className="mt-1 text-[11px] text-muted-foreground">备注：{e.reviewNote}</p>
                )}

                {isPending && (
                  <div className="mt-2 flex flex-col gap-2 border-t border-[#edf0fa] pt-2">
                    {isReviewing ? (
                      <>
                        <Textarea
                          value={note}
                          onChange={(e2) => setNote(e2.target.value)}
                          placeholder="审核备注（可选）"
                          rows={1}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent"
                            onClick={() => {
                              setPendingId(null)
                              setNote("")
                            }}
                          >
                            取消
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReview(e.id, "rejected")}
                          >
                            <X className="size-3.5" />
                            驳回
                          </Button>
                          <Button size="sm" onClick={() => handleReview(e.id, "approved")}>
                            <Check className="size-3.5" />
                            通过
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                          onClick={() => {
                            setPendingId(e.id)
                            setNote("")
                          }}
                        >
                          审核
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <DialogFooter className="mx-0 mb-0 sticky bottom-0 rounded-b-[22px] border-t border-[#e5e9f7] bg-white/95 px-4 py-3 backdrop-blur">
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
