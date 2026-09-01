"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  ImageIcon,
  ImagePlus,
  MapPin,
  Star,
  Trash2,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  getEnrollmentOf,
} from "@/lib/activity-utils"
import type { Activity, SubmissionType } from "@/lib/types"

const SUBMISSION_TYPE_META: { key: SubmissionType; label: string; hint: string }[] = [
  { key: "photo", label: "活动照片", hint: "上传活动现场照片" },
  { key: "practice", label: "实践成果", hint: "记录实践过程与做法" },
  { key: "reflection", label: "活动感悟", hint: "写下所思所得" },
]

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface ParentActivityDetailDialogProps {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 家长代孩子提交：孩子的 studentId */
  studentId: string
  childName: string
  classId: string
}

type ActivePanel = "none" | "submission" | "evaluation"

export function ParentActivityDetailDialog({
  activity,
  open,
  onOpenChange,
  studentId,
  childName,
  classId,
}: ParentActivityDetailDialogProps) {
  const { enrollments, submissions, evaluations, addSubmission, addEvaluation } = useEvaluation()
  const [panel, setPanel] = useState<ActivePanel>("none")
  const [toast, setToast] = useState<string | null>(null)

  // 成果提交表单
  const [subType, setSubType] = useState<SubmissionType>("photo")
  const [subContent, setSubContent] = useState("")
  const [subImages, setSubImages] = useState<string[]>([])
  const [subBusy, setSubBusy] = useState(false)
  const [subError, setSubError] = useState<string | null>(null)

  // 评价表单
  const [rating, setRating] = useState(5)
  const [ratingHover, setRatingHover] = useState(0)
  const [comment, setComment] = useState("")

  const today = formatDate(new Date())
  const myEnrollment = useMemo(
    () => (activity ? getEnrollmentOf(activity.id, studentId, enrollments) : undefined),
    [activity, studentId, enrollments],
  )
  const approved = myEnrollment?.status === "approved"
  const submittable = activity ? canSubmit(activity, today) : false
  const evaluable = activity ? canEvaluate(activity, today) : false

  // 当前孩子已提交的成果
  const mySubmissions = useMemo(
    () =>
      activity
        ? submissions
            .filter((s) => s.activityId === activity.id && s.studentId === studentId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [activity, submissions, studentId],
  )

  // 当前孩子已评价
  const existingEvaluation = useMemo(
    () =>
      activity
        ? (evaluations.find(
            (e) => e.activityId === activity.id && e.studentId === studentId,
          ) ?? null)
        : null,
    [activity, evaluations, studentId],
  )

  // 打开时重置表单
  useEffect(() => {
    if (!open) return
    setPanel("none")
    setToast(null)
    setSubType("photo")
    setSubContent("")
    setSubImages([])
    setSubError(null)
    setRating(existingEvaluation?.rating ?? 5)
    setComment(existingEvaluation?.comment ?? "")
  }, [open, existingEvaluation])

  if (!activity) return null

  const meta = ACTIVITY_STATUS_META[activity.status]
  const enrollMeta = myEnrollment ? ENROLLMENT_STATUS_META[myEnrollment.status] : null

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  const handlePickImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setSubBusy(true)
    try {
      const reads = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, 6)
        .map((f) => fileToDataUrl(f))
      const urls = await Promise.all(reads)
      setSubImages((prev) => [...prev, ...urls].slice(0, 9))
    } catch {
      setSubError("图片读取失败")
    } finally {
      setSubBusy(false)
    }
  }

  const handleSubmitSubmission = () => {
    if (!subContent.trim() && subImages.length === 0) {
      setSubError("请填写文字内容或上传图片")
      return
    }
    addSubmission({
      activityId: activity.id,
      studentId,
      studentName: childName,
      classId: classId || myEnrollment?.classId || "",
      type: subType,
      content: subContent.trim(),
      imageUrls: subImages,
    })
    showToast("成果提交成功")
    setPanel("none")
    setSubContent("")
    setSubImages([])
  }

  const handleSubmitEvaluation = () => {
    if (!comment.trim()) return
    addEvaluation({
      activityId: activity.id,
      studentId,
      studentName: childName,
      rating,
      comment: comment.trim(),
    })
    showToast("评价提交成功")
    setPanel("none")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-surface max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                {activity.title}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    meta.className,
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", meta.dot)} />
                  {meta.label}
                </span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {activity.level1} · 家长代 {childName} 查看与提交
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 基础信息 */}
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
          </div>
        </div>

        {/* 报名状态 */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-muted-foreground">报名状态</h4>
          {myEnrollment ? (
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs",
                enrollMeta?.className,
              )}
            >
              <span className="font-medium">{enrollMeta?.label}</span>
              {myEnrollment.reviewNote && (
                <span className="text-muted-foreground">· {myEnrollment.reviewNote}</span>
              )}
              {myEnrollment.reviewerName && (
                <span className="ml-auto text-[11px] text-muted-foreground">
                  审核人 {myEnrollment.reviewerName}
                </span>
              )}
            </div>
          ) : (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              孩子暂未报名该活动
            </p>
          )}
        </div>

        {/* 已提交成果 */}
        {mySubmissions.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-muted-foreground">
              已提交成果（{mySubmissions.length}）
            </h4>
            <ul className="flex flex-col gap-2">
              {mySubmissions.map((s) => (
                <li key={s.id} className="rounded-xl bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 font-medium text-brand-blue">
                      {SUBMISSION_TYPE_META.find((t) => t.key === s.type)?.label}
                    </span>
                    <span>{s.createdAt.slice(0, 16).replace("T", " ")}</span>
                  </div>
                  {s.content && (
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground">{s.content}</p>
                  )}
                  {s.imageUrls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {s.imageUrls.map((url, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={url}
                          alt={`成果图片 ${idx + 1}`}
                          className="size-16 rounded-lg border border-border/60 object-cover"
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 已评价信息 */}
        {existingEvaluation && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-brand-yellow/10 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star className="size-3.5 fill-brand-yellow text-brand-yellow" />
              已评价 {existingEvaluation.rating} 分
              <span className="text-[11px]">
                · {existingEvaluation.createdAt.slice(0, 16).replace("T", " ")}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">{existingEvaluation.comment}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
          {submittable && approved && (
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={() => setPanel(panel === "submission" ? "none" : "submission")}
            >
              <Upload className="size-3.5" />
              上传成果
            </Button>
          )}
          {submittable && !approved && myEnrollment && (
            <span className="text-xs text-muted-foreground">报名通过后可上传成果</span>
          )}
          {evaluable && (
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={() => setPanel(panel === "evaluation" ? "none" : "evaluation")}
            >
              <Star className="size-3.5" />
              {existingEvaluation ? "修改评价" : "评价活动"}
            </Button>
          )}
          {!submittable && !evaluable && (
            <span className="text-xs text-muted-foreground">
              {activity.status === "recruiting"
                ? "活动开始后可上传成果"
                : "当前阶段暂无可操作"}
            </span>
          )}
          {toast && <span className="ml-auto text-xs text-brand-green">{toast}</span>}
        </div>

        {/* 成果提交面板 */}
        {panel === "submission" && (
          <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-muted/20 p-4">
            <div className="flex flex-col gap-1.5">
              <Label>成果类型</Label>
              <div className="flex flex-wrap gap-2">
                {SUBMISSION_TYPE_META.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSubType(t.key)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5",
                      subType === t.key
                        ? "bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-md shadow-primary/30"
                        : "glass-panel text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {SUBMISSION_TYPE_META.find((t) => t.key === subType)?.hint}
              </p>
            </div>

            {(subType === "photo" || subType === "practice") && (
              <div className="flex flex-col gap-1.5">
                <Label>图片（最多 9 张）</Label>
                <div className="flex flex-wrap gap-2">
                  {subImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative size-20 overflow-hidden rounded-lg border border-border/60"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`图片 ${idx + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSubImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                        aria-label="删除图片"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                  {subImages.length < 9 && (
                    <label className="flex size-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border/60 text-muted-foreground transition hover:border-primary hover:text-primary">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePickImages(e.target.files)}
                        disabled={subBusy}
                      />
                      <ImagePlus className="size-5" />
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parent-sub-content">文字内容</Label>
              <Textarea
                id="parent-sub-content"
                value={subContent}
                onChange={(e) => setSubContent(e.target.value)}
                placeholder={
                  subType === "reflection"
                    ? "写下孩子在活动中的感悟、收获与反思"
                    : "描述照片或实践过程"
                }
                rows={4}
                maxLength={500}
              />
            </div>

            {subError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {subError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() => setPanel("none")}
              >
                取消
              </Button>
              <Button size="sm" onClick={handleSubmitSubmission} disabled={subBusy}>
                <ImageIcon className="size-3.5" />
                提交成果
              </Button>
            </div>
          </div>
        )}

        {/* 评价面板 */}
        {panel === "evaluation" && (
          <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-muted/20 p-4">
            <div className="flex flex-col items-center gap-2">
              <Label className="text-sm">总体评分</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setRatingHover(n)}
                    onMouseLeave={() => setRatingHover(0)}
                    className="p-0.5"
                    aria-label={`${n} 星`}
                  >
                    <Star
                      className={cn(
                        "size-7 transition",
                        n <= (ratingHover || rating)
                          ? "fill-brand-yellow text-brand-yellow"
                          : "fill-transparent text-muted-foreground",
                      )}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{rating} / 5 分</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parent-eval-comment">活动评价</Label>
              <Textarea
                id="parent-eval-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="说说孩子的参与体验、收获与建议"
                rows={4}
                maxLength={300}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() => setPanel("none")}
              >
                取消
              </Button>
              <Button size="sm" onClick={handleSubmitEvaluation} disabled={!comment.trim()}>
                提交评价
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
