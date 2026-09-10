"use client"

import { useEffect, useState } from "react"
import { ImageIcon, ImagePlus, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import type { Activity } from "@/lib/types"

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
  studentId: string
  childName: string
  classId: string
}

export function ParentActivityDetailDialog({
  activity,
  open,
  onOpenChange,
  studentId,
  childName,
  classId,
}: ParentActivityDetailDialogProps) {
  const { addSubmission } = useEvaluation()
  const [content, setContent] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setContent("")
    setImages([])
    setError(null)
  }, [open, activity?.id])

  if (!activity) return null

  const handlePickImages = async (files: FileList | null) => {
    if (!files?.length) return
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))
    if (imageFiles.length === 0) {
      setError("请选择图片文件")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const urls = await Promise.all(imageFiles.slice(0, 9 - images.length).map(fileToDataUrl))
      setImages((current) => [...current, ...urls].slice(0, 9))
    } catch {
      setError("图片读取失败，请重新选择")
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = () => {
    if (!content.trim()) {
      setError("请填写活动收获")
      return
    }
    addSubmission({
      activityId: activity.id,
      studentId,
      studentName: childName,
      classId,
      type: "reflection",
      content: content.trim(),
      imageUrls: images,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-0 !right-0 !left-auto !flex !h-[100dvh] !w-full !max-w-full !translate-x-0 !translate-y-0 !flex-col overflow-hidden overscroll-contain rounded-none border-l border-[#d7def8] bg-[#fbfcff] p-0 shadow-[-16px_0_42px_rgba(64,80,166,.18)] sm:!w-[560px] sm:!max-w-[70vw]">
        <DialogHeader className="border-b border-[#e2e7f8] bg-white px-5 py-5 pr-12 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-lg text-foreground"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Upload className="size-4" aria-hidden="true" /></span>提交活动成果</DialogTitle>
          <DialogDescription className="mt-3 rounded-xl border border-primary/15 bg-primary/[0.06] px-3 py-2.5 text-sm font-semibold text-foreground">{activity.title}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="parent-activity-gain" className="text-sm font-semibold text-foreground">活动收获 <span className="text-destructive">*</span></Label>
            <Textarea
              id="parent-activity-gain"
              name="activity-gain"
              autoComplete="off"
              value={content}
              onChange={(event) => { setContent(event.target.value); if (error) setError(null) }}
              placeholder="记录孩子在本次活动中的收获与感受…"
              rows={7}
              maxLength={500}
              className="min-h-36 resize-y border-[#d9e0f7] bg-white leading-6 focus-visible:border-primary"
            />
            <p className="text-right text-xs text-muted-foreground">{content.length}/500</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3"><Label className="text-sm font-semibold text-foreground">活动图片</Label><span className="text-xs text-muted-foreground">最多 9 张</span></div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((url, index) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-[#dce3f8] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`活动图片 ${index + 1}`} width={160} height={160} loading="lazy" className="size-full object-cover" />
                  <button type="button" onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-slate-950/60 text-white opacity-100 transition hover:bg-slate-950/80 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`删除活动图片 ${index + 1}`}><Trash2 className="size-3.5" aria-hidden="true" /></button>
                </div>
              ))}
              {images.length < 9 && <label className={cn("flex aspect-square min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 bg-primary/[0.035] px-2 text-center text-xs font-medium text-primary transition hover:border-primary hover:bg-primary/[0.08]", busy && "cursor-wait opacity-70")}><input type="file" name="activity-images" accept="image/*" multiple className="sr-only" onChange={(event) => handlePickImages(event.target.files)} disabled={busy} /><span className="flex size-9 items-center justify-center rounded-full bg-white text-primary shadow-sm"><ImagePlus className="size-4" aria-hidden="true" /></span>{busy ? "正在读取…" : "上传图片"}</label>}
            </div>
          </div>

          {error && <p aria-live="polite" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="border-t border-[#e2e7f8] bg-white px-5 py-4 sm:px-6"><Button type="button" variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>取消</Button><Button type="button" onClick={handleSubmit} disabled={busy}><ImageIcon className="size-4" aria-hidden="true" />提交成果</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
