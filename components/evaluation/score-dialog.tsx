"use client"

import { useEffect, useState } from "react"
import { ClipboardList, ImagePlus, Minus, Plus, UserRound, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { getGroupByLevel2 } from "@/lib/scoring-utils"

interface ScoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: string
  className: string
  date: string
  level1: string
  level2: string
  canEdit: boolean
  onShowWeeklyRecords?: () => void
}

export function ScoreDialog({
  open,
  onOpenChange,
  classId,
  className,
  date,
  level1,
  level2,
  canEdit,
  onShowWeeklyRecords,
}: ScoreDialogProps) {
  const { students, addRecord } = useEvaluation()
  const group = getGroupByLevel2(level1, level2)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCounts({})
      setSelectedStudents([])
      setNote("")
      setImagePreview(null)
    }
  }, [open])

  if (!group) return null

  const classStudents = students.filter((s) => s.classId === classId)

  const maxCountFor = (maxScore: number, penalty: number) =>
    Math.max(1, Math.floor(maxScore / Math.abs(penalty)))

  const updateCount = (itemId: string, delta: number, maxScore: number, penalty: number) => {
    setCounts((prev) => {
      const cap = maxCountFor(maxScore, penalty)
      const current = prev[itemId] ?? 0
      const next = Math.min(cap, Math.max(0, current + delta))
      return { ...prev, [itemId]: next }
    })
  }

  const totalDeduction = group.items.reduce((sum, item) => {
    const c = counts[item.id] ?? 0
    return sum + c * item.penalty
  }, 0)

  const hasSelection = Object.values(counts).some((c) => c > 0)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleConfirm = () => {
    if (!hasSelection) return
    const entries = group.items
      .filter((item) => (counts[item.id] ?? 0) > 0)
      .map((item) => ({ itemId: item.id, count: counts[item.id] }))
    addRecord({
      classId,
      date,
      level1,
      level2,
      entries,
      totalDeduction,
      studentNames: selectedStudents,
      note,
      imageDataUrl: imagePreview,
    })
    onOpenChange(false)
  }

  const toggleStudent = (name: string) => {
    setSelectedStudents((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-surface max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新增扣分</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="glass-panel rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">当前评价班级</p>
            <p className="mt-1 text-base font-semibold text-foreground">{className}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {level1} · {level2}
            </p>
          </div>

          {onShowWeeklyRecords && (
            <Button
              type="button"
              variant="outline"
              className="glass-panel gap-1.5 self-start rounded-xl border-border/60 bg-transparent"
              onClick={onShowWeeklyRecords}
            >
              <ClipboardList className="size-4" data-icon="inline-start" />
              扣分记录
            </Button>
          )}

          {canEdit ? (
            <>
              <div className="flex flex-col gap-4">
                {group.items.map((item, idx) => {
                  const count = counts[item.id] ?? 0
                  const deduction = count * item.penalty
                  return (
                    <div key={item.id} className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {idx + 1}、{item.name}({item.penalty})
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          扣除总分：<span className="font-medium text-brand-orange">{deduction.toFixed(1)}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg bg-transparent"
                            onClick={() => updateCount(item.id, -1, item.maxScore, item.penalty)}
                            disabled={count === 0}
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{count}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg bg-transparent"
                            onClick={() => updateCount(item.id, 1, item.maxScore, item.penalty)}
                            disabled={count >= maxCountFor(item.maxScore, item.penalty)}
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">人员</label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="glass-panel flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-xl border-border/60 px-3 py-2 text-left text-sm"
                      />
                    }
                  >
                    {selectedStudents.length === 0 ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <UserRound className="size-4" />
                        请选择
                      </span>
                    ) : (
                      selectedStudents.map((name) => (
                        <Badge key={name} variant="secondary" className="gap-1">
                          {name}
                          <X
                            className="size-3 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleStudent(name)
                            }}
                          />
                        </Badge>
                      ))
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="glass-surface w-64 p-2" align="start">
                    <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                      {classStudents.map((student) => {
                        const checked = selectedStudents.includes(student.name)
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => toggleStudent(student.name)}
                            className={cn(
                              "flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-accent/60",
                              checked && "bg-accent/70",
                            )}
                          >
                            {student.name}
                            {checked && <span className="text-primary">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">备注</label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="请输入"
                  className="glass-panel border-border/60 bg-transparent"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">上传图片</label>
                <div className="flex items-center gap-3">
                  <label className="glass-panel flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-border/60 px-3 text-sm text-foreground hover:bg-accent/60">
                    <ImagePlus className="size-4" />
                    上传图片
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  {imagePreview ? (
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="预览图片"
                      className="size-9 rounded-lg border border-border/60 object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">拖拽或点击后粘贴图片</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
              仅当天日期可新增扣分
            </p>
          )}
        </div>

        {canEdit && (
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleConfirm} disabled={!hasSelection}>
              确定
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
