"use client"

import { useMemo } from "react"
import { CalendarDays, ClipboardList, FileText, ImageIcon, MapPin, MessageSquareText } from "lucide-react"
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
import { ACTIVITY_STATUS_META, formatActivityDateRange } from "@/lib/activity-utils"
import type { Activity, ActivitySubmission } from "@/lib/types"

const TYPE_META: Record<
  ActivitySubmission["type"],
  { label: string; className: string; icon: typeof FileText }
> = {
  photo: { label: "活动照片", className: "bg-brand-blue/15 text-brand-blue", icon: ImageIcon },
  practice: { label: "活动记录", className: "bg-brand-green/15 text-brand-green", icon: ClipboardList },
  reflection: { label: "反思成果", className: "bg-brand-orange/15 text-brand-orange", icon: MessageSquareText },
}

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
  const { submissions, classes } = useEvaluation()

  const related = useMemo(
    () => activity
      ? submissions
          .filter((submission) => submission.activityId === activity.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [],
    [activity, submissions],
  )

  const studentWorks = useMemo(() => {
    const groups = new Map<string, { studentName: string; classId: string; items: ActivitySubmission[] }>()
    related.forEach((submission) => {
      const current = groups.get(submission.studentId) ?? {
        studentName: submission.studentName,
        classId: submission.classId,
        items: [],
      }
      current.items.push(submission)
      groups.set(submission.studentId, current)
    })
    return Array.from(groups.values()).sort((a, b) =>
      b.items[0].createdAt.localeCompare(a.items[0].createdAt),
    )
  }, [related])

  if (!activity) return null

  const meta = ACTIVITY_STATUS_META[activity.status]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[26px] border border-[#cfd8f6] bg-[#fbfcff] p-0 shadow-[0_28px_64px_-34px_rgba(53,67,150,0.65)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-3xl">
        <DialogHeader className="border-b border-[#dce4fa] bg-gradient-to-r from-[#eef2ff] via-white to-[#f8f4ff] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-lg">学生上传成果</DialogTitle>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>
              <span className={cn("size-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
          </div>
          <DialogDescription>{activity.title} · 已收集 {studentWorks.length} 位学生的成果</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl border border-[#dce4fa] bg-white px-3.5 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarDays className="size-3.5 text-primary" aria-hidden="true" />活动：{formatActivityDateRange(activity.startDate, activity.endDate)}</span>
            {activity.location && <span className="flex items-center gap-1"><MapPin className="size-3.5 text-primary" aria-hidden="true" />{activity.location}</span>}
            <span className="ml-auto font-medium text-primary">共 {related.length} 条上传记录</span>
          </div>

          {studentWorks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfd8f6] bg-white px-4 py-12 text-center">
              <ClipboardList className="mx-auto size-7 text-primary/45" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-foreground">暂未收到学生上传成果</p>
              <p className="mt-1 text-xs text-muted-foreground">学生提交活动记录、照片或反思后会在此展示。</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {studentWorks.map((work) => (
                <section key={`${work.classId}-${work.studentName}`} className="overflow-hidden rounded-2xl border border-[#dbe2f8] bg-white shadow-[0_12px_26px_-26px_rgba(53,67,150,0.7)]">
                    <div className="flex items-center gap-3 border-b border-[#edf0fb] bg-[#f7f9ff] px-3.5 py-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">{work.studentName.slice(0, 1)}</span>
                    <div className="min-w-0"><p className="font-semibold text-foreground">{work.studentName}</p><p className="mt-0.5 text-xs text-muted-foreground">{classes.find((item) => item.id === work.classId)?.name ?? work.classId} · {work.items.length} 条上传</p></div>
                  </div>
                  <div className="flex flex-col divide-y divide-[#edf0fb]">
                    {work.items.map((submission) => {
                      const typeMeta = TYPE_META[submission.type]
                      const Icon = typeMeta.icon
                      return (
                        <article key={submission.id} className="flex gap-3 px-3.5 py-3.5">
                          <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", typeMeta.className)}><Icon className="size-4" aria-hidden="true" /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-foreground">{typeMeta.label}</span><span className="text-xs text-muted-foreground">{submission.createdAt.slice(0, 16).replace("T", " ")}</span></div>
                            {submission.content && <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{submission.content}</p>}
                            {submission.imageUrls.length > 0 && <div className="mt-2.5 flex flex-wrap gap-2">{submission.imageUrls.map((url, index) => <img key={url} src={url} alt={`${submission.studentName} 上传的活动照片 ${index + 1}`} width={88} height={88} className="size-[88px] rounded-xl border border-border/60 object-cover" />)}</div>}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 border-t border-[#dce4fa] bg-white/95 px-5 py-3.5 backdrop-blur sm:px-6">
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
