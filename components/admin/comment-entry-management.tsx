"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  NotebookPen,
  Plus,
  School,
  Send,
  StickyNote,
  UsersRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getSemesterLabel } from "@/lib/pe-scores"
import type { Grade, SchoolClass } from "@/lib/types"

/** 评语录入教师角色 */
type CommentTeacherRole = "homeroom" | "subject"

const TEACHER_ROLE_LABEL: Record<CommentTeacherRole, string> = {
  homeroom: "班主任",
  subject: "任课教师",
}

interface CommentProgress {
  id: string
  teacherName: string
  role: CommentTeacherRole
  gradeName: string
  classNames: string
  studentCount: number
  status: "未开始" | "录入中" | "已提交"
}

interface CommentTask {
  id: string
  semester: string
  teacherRoles: CommentTeacherRole[]
  gradeIds: string[]
  startAt: string
  endAt: string
  remark: string
  progress: CommentProgress[]
}

/** 模拟任课教师池（按学科） */
const SUBJECT_TEACHER_POOL = [
  { name: "刘敏", subject: "语文" },
  { name: "张哲", subject: "数学" },
]

const COMMENT_TASKS_KEY = "mzlg-comment-entry-tasks-v1"
const EVALUATION_TASKS_KEY = "mzlg-semester-evaluation-tasks-v1"

export type SemesterTaskMode = "comment" | "evaluation"

const TASK_COPY = {
  comment: {
    name: "学期评语",
    shortName: "评语",
    storageKey: COMMENT_TASKS_KEY,
    seedRemark: "请结合学生本学期五育积分表现撰写评语，突出个人成长与改进建议。",
  },
  evaluation: {
    name: "学期评价",
    shortName: "评价",
    storageKey: EVALUATION_TASKS_KEY,
    seedRemark: "请结合学生本学期在校表现完成综合评价，关注成长过程与发展建议。",
  },
} as const

function localDateTime(offset: number, hour: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  date.setHours(hour, 0, 0, 0)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function taskStatus(task: CommentTask) {
  const now = new Date()
  if (now > new Date(task.endAt)) return { label: "已截止", className: "bg-[#fff1e9] text-brand-orange" }
  if (now >= new Date(task.startAt)) return { label: "录入中", className: "bg-[#effbf4] text-brand-green" }
  return { label: "未开始", className: "bg-[#eef2ff] text-primary" }
}

function progressStatusStyle(status: CommentProgress["status"]) {
  if (status === "已提交") return "bg-[#effbf4] text-brand-green"
  if (status === "录入中") return "bg-[#eef2ff] text-primary"
  return "bg-[#fff5e9] text-brand-orange"
}

function commentProgressInfo(entry: CommentProgress) {
  const completedCount =
    entry.status === "已提交"
      ? entry.studentCount
      : entry.status === "录入中"
        ? Math.max(1, Math.round(entry.studentCount * 0.56))
        : 0
  const percentage = entry.studentCount
    ? Math.round((completedCount / entry.studentCount) * 100)
    : 0
  return { completedCount, percentage }
}

/** 按年级 + 角色生成评语录入进度条目；seedMode 下模拟混合状态 */
function buildProgress(
  taskId: string,
  roles: CommentTeacherRole[],
  gradeIds: string[],
  grades: Grade[],
  classes: SchoolClass[],
  seedMode: boolean,
): CommentProgress[] {
  const entries: CommentProgress[] = []
  let index = 0
  for (const gradeId of gradeIds) {
    const gradeName = grades.find((g) => g.id === gradeId)?.name ?? ""
    const gradeClasses = classes.filter((c) => c.gradeId === gradeId)
    if (roles.includes("homeroom")) {
      for (const cls of gradeClasses) {
        entries.push({
          id: `${taskId}-hr-${cls.id}`,
          teacherName: cls.homeroomTeacher,
          role: "homeroom",
          gradeName,
          classNames: cls.name,
          studentCount: cls.studentCount,
          status: "未开始",
        })
        index++
      }
    }
    if (roles.includes("subject")) {
      for (const t of SUBJECT_TEACHER_POOL) {
        entries.push({
          id: `${taskId}-sub-${gradeId}-${t.subject}`,
          teacherName: `${t.name}（${t.subject}）`,
          role: "subject",
          gradeName,
          classNames: gradeClasses.map((c) => c.shortName).join("、"),
          studentCount: gradeClasses.reduce((sum, c) => sum + c.studentCount, 0),
          status: "未开始",
        })
        index++
      }
    }
  }
  if (seedMode) {
    // 确定性模拟：部分已提交 / 录入中 / 未开始
    return entries.map((entry, i) => ({
      ...entry,
      status: i % 4 === 0 ? "已提交" : i % 4 === 2 ? "未开始" : "录入中",
    }))
  }
  return entries
}

function createSeedTask(grades: Grade[], classes: SchoolClass[], mode: SemesterTaskMode): CommentTask {
  const targetGrades = grades.slice(-2)
  const copy = TASK_COPY[mode]
  return {
    id: `${mode}-task-seed`,
    semester: getSemesterLabel(),
    teacherRoles: ["homeroom", "subject"],
    gradeIds: targetGrades.map((g) => g.id),
    startAt: localDateTime(-2, 8),
    endAt: localDateTime(5, 18),
    remark: copy.seedRemark,
    progress: buildProgress(
      `${mode}-task-seed`,
      ["homeroom", "subject"],
      targetGrades.map((g) => g.id),
      grades,
      classes,
      true,
    ),
  }
}

export function CommentEntryManagement({
  grades,
  classes,
  mode = "comment",
}: {
  grades: Grade[]
  classes: SchoolClass[]
  mode?: SemesterTaskMode
}) {
  const copy = TASK_COPY[mode]
  const isEvaluation = mode === "evaluation"
  const [tasks, setTasks] = useState<CommentTask[]>(() => [createSeedTask(grades, classes, mode)])
  const [hydrated, setHydrated] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<CommentTask | null>(null)
  // 已提醒的教师条目（key: taskId:progressId），演示态
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set())
  const [selectedProgressIds, setSelectedProgressIds] = useState<Set<string>>(new Set())
  const [reminderFeedback, setReminderFeedback] = useState("")

  // 发布表单
  const [formRoles, setFormRoles] = useState<CommentTeacherRole[]>(["homeroom", "subject"])
  const [formGradeIds, setFormGradeIds] = useState<string[]>(grades.slice(-2).map((g) => g.id))
  const [formStart, setFormStart] = useState(localDateTime(0, 8))
  const [formEnd, setFormEnd] = useState(localDateTime(7, 18))
  const [formRemark, setFormRemark] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    try {
      const cached = localStorage.getItem(copy.storageKey)
      const parsed = cached ? JSON.parse(cached) : null
      if (Array.isArray(parsed) && parsed.length > 0) setTasks(parsed as CommentTask[])
    } catch {
      setTasks([createSeedTask(grades, classes, mode)])
    } finally {
      setHydrated(true)
    }
  }, [grades, classes, copy.storageKey, mode])

  useEffect(() => {
    if (hydrated) localStorage.setItem(copy.storageKey, JSON.stringify(tasks))
  }, [tasks, hydrated, copy.storageKey])

  const toggleRole = (role: CommentTeacherRole) => {
    setFormRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }

  const toggleGrade = (gradeId: string) => {
    setFormGradeIds((prev) =>
      prev.includes(gradeId) ? prev.filter((id) => id !== gradeId) : [...prev, gradeId],
    )
  }

  const resetForm = () => {
    setFormRoles(["homeroom", "subject"])
    setFormGradeIds(grades.slice(-2).map((g) => g.id))
    setFormStart(localDateTime(0, 8))
    setFormEnd(localDateTime(7, 18))
    setFormRemark("")
    setError("")
  }

  const publishTask = () => {
    if (formRoles.length === 0) return setError(`请选择至少一类${copy.shortName}录入教师`)
    if (formGradeIds.length === 0) return setError(`请选择至少一个${copy.shortName}年级`)
    if (!formStart || !formEnd || formStart >= formEnd) return setError("请正确设置开始与截止时间")

    const id = `${mode}-task-${Date.now()}`
    const next: CommentTask = {
      id,
      semester: getSemesterLabel(),
      teacherRoles: formRoles,
      gradeIds: formGradeIds,
      startAt: formStart,
      endAt: formEnd,
      remark: formRemark.trim(),
      progress: buildProgress(id, formRoles, formGradeIds, grades, classes, false),
    }
    setTasks((current) => [next, ...current])
    setPublishOpen(false)
    resetForm()
  }

  const remindTeacher = (taskId: string, progressId: string) => {
    setRemindedIds((prev) => new Set(prev).add(`${taskId}:${progressId}`))
    setSelectedProgressIds((prev) => {
      const next = new Set(prev)
      next.delete(progressId)
      return next
    })
    setReminderFeedback("已发送提醒")
  }

  const remindBatch = (task: CommentTask, progressIds: string[]) => {
    if (progressIds.length === 0) return
    setRemindedIds((prev) => {
      const next = new Set(prev)
      for (const p of task.progress) {
        if (progressIds.includes(p.id) && p.status !== "已提交") next.add(`${task.id}:${p.id}`)
      }
      return next
    })
    setSelectedProgressIds(new Set())
    setReminderFeedback(`已提醒 ${progressIds.length} 位教师`)
  }

  const submittedCount = (task: CommentTask) =>
    task.progress.filter((p) => p.status === "已提交").length

  const gradeNameOf = (gradeId: string) =>
    grades.find((g) => g.id === gradeId)?.name ?? ""

  const detailSelectableIds = useMemo(
    () => detailTask?.progress.filter((p) => p.status !== "已提交").map((p) => p.id) ?? [],
    [detailTask],
  )
  const selectedDetailIds = detailSelectableIds.filter((id) => selectedProgressIds.has(id))
  const allDetailSelected = detailSelectableIds.length > 0 && selectedDetailIds.length === detailSelectableIds.length
  const someDetailSelected = selectedDetailIds.length > 0 && !allDetailSelected

  const openDetailTask = (task: CommentTask) => {
    setDetailTask(task)
    setSelectedProgressIds(new Set())
    setReminderFeedback("")
  }

  const toggleProgressSelection = (progressId: string, checked: boolean) => {
    setSelectedProgressIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(progressId)
      else next.delete(progressId)
      return next
    })
  }

  const toggleAllProgressSelection = () => {
    setSelectedProgressIds(allDetailSelected ? new Set() : new Set(detailSelectableIds))
  }

  return (
    <section className="rounded-[24px] border border-[#cfd8f6] bg-[#f7f8ff] p-4 shadow-[0_18px_38px_-30px_rgba(53,67,150,0.72)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_9px_18px_-11px_rgba(63,81,188,0.92)]">
            <NotebookPen className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-bold text-foreground">{copy.name}录入发布</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {getSemesterLabel()} · 发布班主任 / 任课教师{copy.shortName}录入任务，统览进度并可提醒。
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => {
            resetForm()
            setPublishOpen(true)
          }}
          className="h-10 rounded-xl px-4 shadow-[0_9px_18px_-12px_rgba(63,81,188,0.88)]"
        >
          <Plus className="size-4" />
          {isEvaluation ? "发布评价" : "发布评语任务"}
        </Button>
      </div>

      {/* 任务卡片 */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {tasks.map((task) => {
          const status = taskStatus(task)
          const done = submittedCount(task)
          const total = task.progress.length
          const gradeNames = task.gradeIds.map(gradeNameOf).filter(Boolean)
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => openDetailTask(task)}
              className="group flex flex-col gap-3 rounded-2xl border border-[#dbe2f8] bg-white p-4 text-left shadow-[0_12px_26px_-24px_rgba(53,67,150,0.68)] transition-colors hover:border-primary/40 hover:bg-[#fcfdff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-bold text-foreground">{copy.name}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", status.className)}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{task.semester}</p>
                </div>
                <ChevronRight
                  className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-lg bg-[#f0f3ff] px-2 py-1 text-primary">
                  {task.teacherRoles.map((r) => TEACHER_ROLE_LABEL[r]).join("、")}
                </span>
                <span className="rounded-lg bg-[#f6f7fb] px-2 py-1 text-muted-foreground">
                  {gradeNames.join("、")}
                </span>
              </div>
              <div className="border-t border-[#edf0fa] pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{isEvaluation ? "教师 + 班主任评价进度" : "教师评语录入进度"}</span>
                  <span className="font-bold text-foreground">
                    {done} / {total}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5e9f7]">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                录入：{task.startAt.replace("T", " ")} ~ {task.endAt.replace("T", " ")}
              </p>
              {task.remark && (
                <p className="truncate rounded-lg bg-[#f7f8ff] px-2 py-1.5 text-xs text-muted-foreground" title={task.remark}>
                  备注：{task.remark}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* 发布任务：侧边弹窗表单 */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="fixed left-auto right-0 top-0 grid h-full max-h-full w-full max-w-md translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none rounded-l-2xl border-border/60 bg-background/80 p-0 backdrop-blur-2xl sm:max-w-md">
          <DialogHeader className="relative border-b border-border/60 bg-gradient-to-r from-primary/10 via-transparent to-transparent p-5 pr-12">
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-brand-blue text-white shadow-md shadow-primary/30">
                <NotebookPen className="size-4" />
              </span>
              发布{copy.name}录入任务
            </DialogTitle>
            <DialogDescription>
              {isEvaluation ? "选择评价年级并设置评价时间，发布后班主任与任课教师可开始录入评价" : "选择评语录入教师与年级，发布后对应教师可开始录入评语"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
            {/* 评语录入教师 */}
            {!isEvaluation && <div className="glass-panel flex flex-col gap-2.5 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <UsersRound className="size-3.5 text-brand-blue" />
                  评语录入教师
                </p>
                <span className="text-xs text-muted-foreground">可多选</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TEACHER_ROLE_LABEL) as CommentTeacherRole[]).map((role) => {
                  const checked = formRoles.includes(role)
                  return (
                    <label
                      key={role}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 text-sm font-medium transition",
                        checked
                          ? "border-primary/45 bg-primary/[0.07] text-primary"
                          : "border-border/60 bg-white/70 text-muted-foreground hover:border-primary/30 dark:bg-card/60",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRole(role)}
                        aria-label={TEACHER_ROLE_LABEL[role]}
                      />
                      {TEACHER_ROLE_LABEL[role]}
                    </label>
                  )
                })}
              </div>
            </div>}

            {/* 录入年级 */}
            <div className="glass-panel flex flex-col gap-2.5 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <School className="size-3.5 text-brand-blue" />
                  录入年级
                </p>
                <span className="text-xs text-muted-foreground">可多选</span>
              </div>
              {isEvaluation ? (
                <MultiSelectDropdown
                  label="评价年级"
                  description="可选择多个需要开展学期评价的年级。"
                  items={grades.map((grade) => ({ id: grade.id, name: grade.name }))}
                  selectedIds={formGradeIds}
                  onToggle={toggleGrade}
                />
              ) : <div className="flex flex-wrap gap-2">
                {grades.map((grade) => {
                  const checked = formGradeIds.includes(grade.id)
                  return (
                    <label
                      key={grade.id}
                      className={cn(
                        "flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium transition",
                        checked
                          ? "border-primary/45 bg-primary/[0.07] text-primary"
                          : "border-border/60 bg-white/70 text-muted-foreground hover:border-primary/30 dark:bg-card/60",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleGrade(grade.id)}
                        aria-label={grade.name}
                      />
                      {grade.name}
                    </label>
                  )
                })}
              </div>}
            </div>

            {/* 录入时间 */}
            <div className="glass-panel flex flex-col gap-2.5 rounded-xl p-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <CalendarDays className="size-3.5 text-brand-blue" />
                录入时间
              </p>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{isEvaluation ? "评价开始时间" : "开始录入时间"}</span>
                  <Input
                    name={`${mode}-task-start`}
                    autoComplete="off"
                    type="datetime-local"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="h-10 rounded-lg border-border/60 bg-white/70 shadow-sm transition hover:border-primary/50 dark:bg-card/60"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{isEvaluation ? "评价结束时间" : "截止录入时间"}</span>
                  <Input
                    name={`${mode}-task-end`}
                    autoComplete="off"
                    type="datetime-local"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="h-10 rounded-lg border-border/60 bg-white/70 shadow-sm transition hover:border-primary/50 dark:bg-card/60"
                  />
                </label>
              </div>
              {formStart && formEnd && formEnd < formStart && (
                <p className="text-xs text-destructive">截止时间需晚于开始时间</p>
              )}
            </div>

            {/* 备注 */}
            <div className="glass-panel flex flex-col gap-2.5 rounded-xl p-3.5">
              <Label htmlFor="comment-task-remark" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <StickyNote className="size-3.5 text-brand-blue" />
                备注
              </Label>
              <Textarea
                id="comment-task-remark"
                name="comment-task-remark"
                autoComplete="off"
                value={formRemark}
                onChange={(e) => setFormRemark(e.target.value)}
                placeholder={isEvaluation ? "请输入评价要求说明（选填），如评价维度、完成规范等…" : "请输入评语录入要求说明（选填），如评语字数、撰写角度等…"}
                rows={4}
                className="min-h-24 rounded-lg border-border/60 bg-white/70 px-3 py-2.5 text-sm shadow-sm transition hover:border-primary/50 dark:bg-card/60"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border/60 bg-muted/30 p-4">
            <Button
              variant="outline"
              onClick={() => setPublishOpen(false)}
              className="h-11 min-w-24 rounded-xl px-6 text-sm font-medium"
            >
              取消
            </Button>
            <Button
              onClick={publishTask}
              className="h-11 min-w-32 rounded-xl bg-gradient-to-r from-primary to-primary-2 px-8 text-sm font-semibold text-white shadow-lg shadow-primary/40 ring-1 ring-white/20 transition hover:brightness-110 hover:shadow-xl hover:shadow-primary/50"
            >
              <Send className="size-4" />
              {isEvaluation ? "发布评价" : "发布任务"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 进度明细：教师/班主任评语录入进度 + 批量提醒 */}
      <Dialog open={!!detailTask} onOpenChange={(open) => !open && setDetailTask(null)}>
        <DialogContent className="fixed inset-y-0 right-0 left-auto top-0 flex h-full max-h-full w-[70vw] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none rounded-l-[24px] border-l border-[#d5ddf7] bg-white p-0 shadow-[-24px_0_60px_-32px_rgba(48,62,139,0.78)] data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right max-md:w-full sm:max-w-none">
          {detailTask && (
            <>
              <DialogHeader className="shrink-0 border-b border-[#dce4fa] bg-gradient-to-r from-[#f1f4ff] via-white to-white p-5 pr-14 sm:p-6 sm:pr-16">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_9px_18px_-11px_rgba(63,81,188,0.92)]">
                    <NotebookPen className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-bold text-foreground">{copy.name}录入进度</DialogTitle>
                    <DialogDescription className="mt-1 text-xs leading-5">
                      {detailTask.semester} · {detailTask.teacherRoles.map((r) => TEACHER_ROLE_LABEL[r]).join("、")} · 截止 {detailTask.endAt.replace("T", " ")}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="flex flex-col gap-5 p-5 sm:p-6">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#dce4fa] bg-[#fbfcff] p-3 text-center sm:grid-cols-4">
                    {(() => {
                      const homeroomCount = detailTask.progress.filter((p) => p.role === "homeroom").length
                      const subjectCount = detailTask.progress.filter((p) => p.role === "subject").length
                      const done = submittedCount(detailTask)
                      const pending = detailTask.progress.length - done
                      const metrics = [
                        { label: "班主任", value: homeroomCount, tone: "text-foreground" },
                        { label: "任课教师", value: subjectCount, tone: "text-foreground" },
                        { label: "已提交", value: done, tone: "text-brand-green" },
                        { label: "待录入", value: pending, tone: "text-brand-orange" },
                      ]
                      return metrics.map((m) => (
                        <div key={m.label}>
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                          <p className={cn("mt-1 text-lg font-bold tabular-nums", m.tone)}>{m.value}</p>
                        </div>
                      ))
                    })()}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-foreground">教师录入明细</h3>
                      <p className="mt-1 text-xs text-muted-foreground">勾选未提交教师后，可一次发送提醒。</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {reminderFeedback && (
                        <p className="text-xs font-medium text-brand-green" role="status" aria-live="polite">
                          <CheckCircle2 className="mr-1 inline size-3.5" aria-hidden="true" />
                          {reminderFeedback}
                        </p>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => remindBatch(detailTask, selectedDetailIds)}
                        disabled={selectedDetailIds.length === 0}
                        className="rounded-xl bg-gradient-to-r from-brand-orange to-brand-yellow px-4 text-white shadow-lg shadow-brand-orange/30 ring-1 ring-white/20 transition-colors hover:brightness-110"
                      >
                        <BellRing className="size-3.5" aria-hidden="true" />
                        批量提醒{selectedDetailIds.length > 0 ? `（${selectedDetailIds.length}）` : ""}
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#dce4fa] bg-white shadow-[0_12px_28px_-26px_rgba(62,74,150,0.68)]">
                    <div className="overflow-x-auto">
                      <table className="min-w-[860px] w-full text-left text-xs">
                        <caption className="sr-only">教师与班主任{copy.shortName}录入进度</caption>
                        <thead className="bg-[#f5f7ff] text-muted-foreground">
                          <tr className="border-b border-[#e6eafa]">
                            <th scope="col" className="w-12 px-4 py-3">
                              <Checkbox
                                checked={allDetailSelected}
                                indeterminate={someDetailSelected}
                                onCheckedChange={toggleAllProgressSelection}
                                disabled={detailSelectableIds.length === 0}
                                aria-label="全选未提交教师"
                              />
                            </th>
                            <th scope="col" className="px-3 py-3 font-semibold">教师 / 角色</th>
                            <th scope="col" className="px-3 py-3 font-semibold">年级</th>
                            <th scope="col" className="px-3 py-3 font-semibold">负责班级</th>
                            <th scope="col" className="px-3 py-3 font-semibold">{copy.shortName}进度</th>
                            <th scope="col" className="w-44 px-3 py-3 font-semibold">完成率</th>
                            <th scope="col" className="px-3 py-3 font-semibold">状态</th>
                            <th scope="col" className="px-4 py-3 text-right font-semibold">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailTask.progress.map((item) => {
                            const reminded = remindedIds.has(`${detailTask.id}:${item.id}`)
                            const selected = selectedProgressIds.has(item.id)
                            const selectable = item.status !== "已提交"
                            const { completedCount, percentage } = commentProgressInfo(item)
                            return (
                              <tr
                                key={item.id}
                                className={cn(
                                  "border-b border-[#edf0fa] last:border-b-0 transition-colors hover:bg-[#fafbff]",
                                  selected && "bg-[#f2f5ff] hover:bg-[#f2f5ff]",
                                )}
                              >
                                <td className="px-4 py-3 align-middle">
                                  <Checkbox
                                    checked={selected}
                                    onCheckedChange={(checked) => toggleProgressSelection(item.id, checked)}
                                    disabled={!selectable}
                                    aria-label={`选择${item.teacherName}`}
                                  />
                                </td>
                                <td className="px-3 py-3 align-middle">
                                  <div className="min-w-[150px]">
                                    <p className="font-semibold text-foreground">{item.teacherName}</p>
                                    <span className={cn(
                                      "mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                                      item.role === "homeroom" ? "bg-[#edf1ff] text-primary" : "bg-[#effbf4] text-brand-green",
                                    )}>
                                      {TEACHER_ROLE_LABEL[item.role]}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 align-middle text-muted-foreground">{item.gradeName}</td>
                                <td className="max-w-[180px] px-3 py-3 align-middle text-muted-foreground">{item.classNames}</td>
                                <td className="px-3 py-3 align-middle font-medium tabular-nums text-foreground">
                                  {completedCount} / {item.studentCount} 人
                                </td>
                                <td className="px-3 py-3 align-middle">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-full bg-[#e8ebf7]">
                                      <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percentage}%` }} />
                                    </div>
                                    <span className="w-9 text-right font-semibold tabular-nums text-foreground">{percentage}%</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 align-middle">
                                  <span className={cn("whitespace-nowrap rounded-full px-2 py-1 font-semibold", progressStatusStyle(item.status))}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right align-middle">
                                  {item.status !== "已提交" ? (
                                    <button
                                      type="button"
                                      onClick={() => remindTeacher(detailTask.id, item.id)}
                                      disabled={reminded}
                                      className={cn(
                                        "inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                        reminded
                                          ? "cursor-default bg-[#f0f3ff] text-muted-foreground"
                                          : "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20",
                                      )}
                                    >
                                      {reminded ? <><CheckCircle2 className="size-3.5" aria-hidden="true" />已提醒</> : <><BellRing className="size-3.5" aria-hidden="true" />一键提醒</>}
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-green">
                                      <CheckCircle2 className="size-3.5" aria-hidden="true" />已完成
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
