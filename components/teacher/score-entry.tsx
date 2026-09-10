"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, FileSpreadsheet, Upload, UsersRound } from "lucide-react"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { getSemesterLabel } from "@/lib/pe-scores"
import { cn } from "@/lib/utils"

const SCORE_ENTRY_TASKS_KEY = "mzlg-score-entry-tasks-v1"

interface TeacherScoreProgress {
  id: string
  teacher: string
  subject: string
  classNames: string
  status: "未开始" | "录入中" | "已提交"
  fileName?: string
  uploadedAt?: string
  rows?: number
}

interface TeacherScoreTask {
  id: string
  semester: string
  progress: TeacherScoreProgress[]
}

export function TeacherScoreEntry() {
  const { currentTeacher, classes } = useEvaluation()
  const { awardClasses } = usePermission()
  const inputRef = useRef<HTMLInputElement>(null)
  const [tasks, setTasks] = useState<TeacherScoreTask[]>([])
  const [pendingClassId, setPendingClassId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")

  const workClasses = useMemo(
    () => awardClasses.map((schoolClass) => ({
      ...schoolClass,
      studentCount: classes.find((item) => item.id === schoolClass.id)?.studentCount ?? schoolClass.studentCount,
    })),
    [awardClasses, classes],
  )

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(SCORE_ENTRY_TASKS_KEY) ?? "[]")
      setTasks(Array.isArray(parsed) ? parsed as TeacherScoreTask[] : [])
    } catch {
      setTasks([])
    }
  }, [])

  const progressByClass = useMemo(() => {
    const map = new Map<string, TeacherScoreProgress>()
    for (const entry of tasks.flatMap((task) => task.progress ?? [])) {
      if (entry.teacher === currentTeacher?.name) {
        for (const schoolClass of workClasses) {
          if (entry.classNames.split("、").includes(schoolClass.name)) map.set(schoolClass.id, entry)
        }
      }
    }
    return map
  }, [currentTeacher?.name, tasks, workClasses])

  const openUpload = (classId: string) => {
    setPendingClassId(classId)
    inputRef.current?.click()
  }

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !pendingClassId || !currentTeacher) return
    const schoolClass = workClasses.find((item) => item.id === pendingClassId)
    if (!schoolClass) return

    const now = new Date().toISOString()
    const next = tasks.length > 0 ? tasks.map((task) => ({ ...task, progress: [...(task.progress ?? [])] })) : [{ id: "score-task-teacher", semester: getSemesterLabel(), progress: [] }]
    const task = next[0]
    const existingIndex = task.progress.findIndex((entry) => entry.teacher === currentTeacher.name && entry.classNames.split("、").includes(schoolClass.name))
    const entry: TeacherScoreProgress = {
      id: existingIndex >= 0 ? task.progress[existingIndex].id : `${task.id}-${currentTeacher.id}-${schoolClass.id}`,
      teacher: currentTeacher.name,
      subject: currentTeacher.role === "subject" ? currentTeacher.title.replace(/^.*?\s/, "").replace("任课教师", "") : "综合成绩",
      classNames: schoolClass.name,
      status: "已提交",
      fileName: file.name,
      uploadedAt: now,
      rows: schoolClass.studentCount,
    }
    if (existingIndex >= 0) task.progress[existingIndex] = entry
    else task.progress.push(entry)
    localStorage.setItem(SCORE_ENTRY_TASKS_KEY, JSON.stringify(next))
    setTasks(next)
    setPendingClassId(null)
    setFeedback(`${schoolClass.name} 成绩已上传`)
  }

  return <section className="rounded-2xl border border-[#cbd6f7] border-t-2 border-t-brand-green bg-white p-5 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-6" aria-labelledby="teacher-score-entry-title">
    <input ref={inputRef} type="file" name="score-file" accept=".xls,.xlsx,.csv" className="sr-only" onChange={handleUpload} aria-label="选择成绩文件" />
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf8f1] text-brand-green"><FileSpreadsheet className="size-5" aria-hidden="true" /></span><div><h1 id="teacher-score-entry-title" className="text-lg font-bold text-foreground">本学期成绩上传</h1><p className="mt-1 text-xs text-muted-foreground">{getSemesterLabel()} · 按任教班级上传成绩文件</p></div></div>
      <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#f5f8ff] px-3 text-xs font-semibold text-muted-foreground"><UsersRound className="size-3.5 text-primary" aria-hidden="true" />{workClasses.length} 个任教班级</span>
    </div>
    {feedback && <p className="mt-4 rounded-xl border border-[#bfe6d1] bg-[#f0fbf5] px-3 py-2 text-sm font-medium text-brand-green" role="status" aria-live="polite"><CheckCircle2 className="mr-1.5 inline size-4" aria-hidden="true" />{feedback}</p>}
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {workClasses.map((schoolClass) => {
        const progress = progressByClass.get(schoolClass.id)
        const uploaded = progress?.status === "已提交"
        return <article key={schoolClass.id} className={cn("rounded-xl border p-4", uploaded ? "border-[#bfe6d1] bg-[#f6fcf8]" : "border-[#dce3f5] bg-[#fbfcff]")}>
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-foreground">{schoolClass.name}</h2><p className="mt-1 text-xs text-muted-foreground">{schoolClass.studentCount} 名学生 · {currentTeacher?.title ?? "任课教师"}</p></div><span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", uploaded ? "bg-[#eaf8f1] text-brand-green" : "bg-[#fff4e5] text-brand-orange")}>{uploaded ? "已上传" : "待上传"}</span></div>
          {uploaded && <p className="mt-3 truncate text-xs text-muted-foreground" title={progress.fileName}>{progress.fileName} · {progress.rows ?? schoolClass.studentCount} 条</p>}
          <button type="button" onClick={() => openUpload(schoolClass.id)} className={cn("mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/45", uploaded ? "border border-[#bfe6d1] text-brand-green hover:bg-[#eaf8f1]" : "bg-brand-green text-white hover:bg-brand-green/90")}><Upload className="size-3.5" aria-hidden="true" />{uploaded ? "重新上传" : "上传成绩文件"}</button>
        </article>
      })}
    </div>
  </section>
}
