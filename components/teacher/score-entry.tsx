"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as XLSX from "xlsx"
import { CheckCircle2, Download, FileSpreadsheet, Upload, UsersRound } from "lucide-react"
import { useEvaluation } from "@/lib/evaluation-context"
import { getAcademicScores, getAcademicSubjectConfig, type AcademicSubject } from "@/lib/academic-scores"
import { getSemesterLabel } from "@/lib/pe-scores"
import { cn } from "@/lib/utils"

const SCORE_ENTRY_TASKS_KEY = "mzlg-score-entry-tasks-v2"

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
  scoreName: string
  gradeIds: string[]
  progress: TeacherScoreProgress[]
}

interface UploadTarget {
  taskId: string
  scoreName: string
  classId: string
  subject: string
}

export function TeacherScoreEntry() {
  const { currentTeacher, classes, students } = useEvaluation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [tasks, setTasks] = useState<TeacherScoreTask[]>([])
  const [pendingTarget, setPendingTarget] = useState<UploadTarget | null>(null)
  const [feedback, setFeedback] = useState("")

  const workClasses = useMemo(() => {
    const classIds = currentTeacher?.teachingClassIds ?? currentTeacher?.awardClassIds ?? []
    return classes.filter((schoolClass) => classIds.includes(schoolClass.id))
  }, [classes, currentTeacher?.awardClassIds, currentTeacher?.teachingClassIds])
  const teachingSubjects = currentTeacher?.teachingSubjects ?? []

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(SCORE_ENTRY_TASKS_KEY) ?? "[]")
      setTasks(Array.isArray(parsed) ? parsed as TeacherScoreTask[] : [])
    } catch {
      setTasks([])
    }
  }, [])

  const usingDemoData = tasks.length === 0
  const displayTasks = useMemo<TeacherScoreTask[]>(() => tasks.length > 0 ? tasks : [{
    id: "score-task-teacher-seed",
    semester: getSemesterLabel(),
    scoreName: "学期成绩",
    gradeIds: [...new Set(workClasses.map((schoolClass) => schoolClass.gradeId))],
    progress: workClasses.flatMap((schoolClass, classIndex) => teachingSubjects.map((subject) => ({
      id: `score-demo-${currentTeacher?.id ?? "teacher"}-${schoolClass.id}-${subject}`,
      teacher: currentTeacher?.name ?? "任课教师",
      subject,
      classNames: schoolClass.name,
      status: (classIndex === 0 ? "已提交" : "录入中") as TeacherScoreProgress["status"],
      fileName: classIndex === 0 ? `${schoolClass.name}${subject}学期成绩.xlsx` : undefined,
      uploadedAt: classIndex === 0 ? new Date().toISOString() : undefined,
      rows: classIndex === 0 ? schoolClass.studentCount : undefined,
    }))),
  }], [currentTeacher?.id, currentTeacher?.name, tasks, teachingSubjects, workClasses])

  const uploadTargets = useMemo(() => displayTasks.flatMap((task) => workClasses
    .filter((schoolClass) => task.gradeIds.includes(schoolClass.gradeId))
    .flatMap((schoolClass) => teachingSubjects.map((subject) => ({ taskId: task.id, scoreName: task.scoreName, classId: schoolClass.id, subject }))),
  ), [displayTasks, teachingSubjects, workClasses])

  const progressByTarget = useMemo(() => {
    const map = new Map<string, TeacherScoreProgress>()
    for (const task of displayTasks) {
      for (const entry of task.progress ?? []) {
        if (entry.teacher !== currentTeacher?.name) continue
        for (const schoolClass of workClasses) {
          if (entry.classNames.split("、").includes(schoolClass.name)) map.set(`${task.id}:${schoolClass.id}:${entry.subject}`, entry)
        }
      }
    }
    return map
  }, [currentTeacher?.name, displayTasks, workClasses])

  const openUpload = (target: UploadTarget) => {
    setPendingTarget(target)
    inputRef.current?.click()
  }

  const downloadTemplate = (target: UploadTarget) => {
    const schoolClass = workClasses.find((item) => item.id === target.classId)
    const config = getAcademicSubjectConfig(target.subject)
    if (!schoolClass || !config) return
    const roster = students.filter((student) => student.classId === schoolClass.id)
    const headers = ["学号", "姓名", "班级", ...config.assessmentItems, "总评", "等级"]
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...roster.map((student) => [student.studentNo, student.name, schoolClass.name, ...config.assessmentItems.map(() => "")])])
    sheet["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 16 }, ...config.assessmentItems.map(() => ({ wch: 16 })), { wch: 10 }, { wch: 10 }]
    sheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${roster.length + 1}` }
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, "成绩导入")
    XLSX.writeFile(workbook, `${schoolClass.name}${target.subject}${target.scoreName}导入模板.xlsx`)
    setFeedback(`${schoolClass.name} ${target.subject} 导入模板已下载`)
  }

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !pendingTarget || !currentTeacher) return
    const schoolClass = workClasses.find((item) => item.id === pendingTarget.classId)
    if (!schoolClass) return

    const now = new Date().toISOString()
    const sourceTasks = tasks.length > 0 ? tasks : displayTasks
    const next = sourceTasks.map((task) => ({ ...task, progress: [...(task.progress ?? [])] }))
    const task = next.find((item) => item.id === pendingTarget.taskId)
    if (!task) return
    const existingIndex = task.progress.findIndex((entry) => entry.teacher === currentTeacher.name && entry.subject === pendingTarget.subject && entry.classNames.split("、").includes(schoolClass.name))
    const entry: TeacherScoreProgress = {
      id: existingIndex >= 0 ? task.progress[existingIndex].id : `${task.id}-${currentTeacher.id}-${schoolClass.id}-${pendingTarget.subject}`,
      teacher: currentTeacher.name,
      subject: pendingTarget.subject,
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
    setPendingTarget(null)
    setFeedback(`${schoolClass.name} ${pendingTarget.subject} 成绩已上传`)
  }

  return <section className="rounded-2xl border border-[#cbd6f7] border-t-2 border-t-brand-green bg-white p-5 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-6" aria-labelledby="teacher-score-entry-title">
    <input ref={inputRef} type="file" name="score-file" accept=".xls,.xlsx,.csv" className="sr-only" onChange={handleUpload} aria-label="选择成绩文件" />
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf8f1] text-brand-green"><FileSpreadsheet className="size-5" aria-hidden="true" /></span><div><h1 id="teacher-score-entry-title" className="text-lg font-bold text-foreground">本学期成绩上传</h1><p className="mt-1 text-xs text-muted-foreground">{getSemesterLabel()} · 按任教学科与班级下载模板后上传</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#f5f8ff] px-3 text-xs font-semibold text-muted-foreground"><UsersRound className="size-3.5 text-primary" aria-hidden="true" />{workClasses.length} 个任教班级</span>{usingDemoData && <span className="inline-flex min-h-9 items-center rounded-lg bg-[#fff4e5] px-3 text-xs font-semibold text-brand-orange">已载入模拟成绩数据</span>}</div>
    </div>
    {feedback && <p className="mt-4 rounded-xl border border-[#bfe6d1] bg-[#f0fbf5] px-3 py-2 text-sm font-medium text-brand-green" role="status" aria-live="polite"><CheckCircle2 className="mr-1.5 inline size-4" aria-hidden="true" />{feedback}</p>}
    {uploadTargets.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-[#d8e0f7] bg-[#fbfcff] px-4 py-8 text-center"><p className="text-sm font-semibold text-foreground">暂无待处理的学科成绩任务</p><p className="mt-1 text-xs text-muted-foreground">请由管理员先按年级发布成绩录入任务，并在后台配置任教学科与班级。</p></div> : <div className="mt-5 grid gap-3 md:grid-cols-2">
      {uploadTargets.map((target) => {
        const schoolClass = workClasses.find((item) => item.id === target.classId)
        const config = getAcademicSubjectConfig(target.subject)
        if (!schoolClass || !config) return null
        const progress = progressByTarget.get(`${target.taskId}:${target.classId}:${target.subject}`)
        const uploaded = progress?.status === "已提交"
        const previewRows = students.filter((student) => student.classId === schoolClass.id).slice(0, 3).map((student) => ({
          student,
          score: getAcademicScores(student, [target.subject as AcademicSubject])[0],
        }))
        return <article key={`${target.taskId}:${target.classId}:${target.subject}`} className={cn("rounded-xl border p-4", uploaded ? "border-[#bfe6d1] bg-[#f6fcf8]" : "border-[#dce3f5] bg-[#fbfcff]")}>
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-foreground">{schoolClass.name} · {target.subject}</h2><p className="mt-1 text-xs text-muted-foreground">{target.scoreName} · {schoolClass.studentCount} 名学生</p></div><span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", uploaded ? "bg-[#eaf8f1] text-brand-green" : "bg-[#fff4e5] text-brand-orange")}>{uploaded ? "已上传" : "待上传"}</span></div>
          <p className="mt-3 text-xs text-muted-foreground">导入分项：{config.assessmentItems.join("、")}</p>
          {uploaded && <p className="mt-2 truncate text-xs text-muted-foreground" title={progress.fileName}>{progress.fileName} · {progress.rows ?? schoolClass.studentCount} 条</p>}
          <div className="mt-4 overflow-hidden rounded-lg border border-[#e5eaf6] bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-[#edf0f8] bg-[#f7f9ff] px-3 py-2"><span className="text-xs font-bold text-foreground">模拟成绩预览</span><span className="text-[11px] text-muted-foreground">前 {previewRows.length} 名学生</span></div>
            <div className="overflow-x-auto"><table className="min-w-[580px] w-full text-xs"><caption className="sr-only">{schoolClass.name}{target.subject}模拟学期成绩</caption><thead className="text-muted-foreground"><tr><th scope="col" className="px-3 py-2 text-left font-semibold">学号</th><th scope="col" className="px-3 py-2 text-left font-semibold">姓名</th>{config.assessmentItems.map((item) => <th key={item} scope="col" className="px-3 py-2 text-right font-semibold">{item}</th>)}<th scope="col" className="px-3 py-2 text-right font-semibold">总评</th><th scope="col" className="px-3 py-2 text-right font-semibold">等级</th></tr></thead><tbody>{previewRows.map(({ student, score }) => <tr key={student.id} className="border-t border-[#eef1f8]"><td className="px-3 py-2 text-muted-foreground">{student.studentNo}</td><th scope="row" className="px-3 py-2 text-left font-semibold text-foreground">{student.name}</th>{score.items.map((item) => <td key={item.name} className="px-3 py-2 text-right tabular-nums text-foreground">{item.score}</td>)}<td className="px-3 py-2 text-right font-bold tabular-nums text-foreground">{score.score}</td><td className="px-3 py-2 text-right font-semibold text-primary">{score.level}</td></tr>)}</tbody></table></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => downloadTemplate(target)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d5def7] bg-white px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><Download className="size-3.5" aria-hidden="true" />下载导入模板</button><button type="button" onClick={() => openUpload(target)} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/45", uploaded ? "border border-[#bfe6d1] text-brand-green hover:bg-[#eaf8f1]" : "bg-brand-green text-white hover:bg-brand-green/90")}><Upload className="size-3.5" aria-hidden="true" />{uploaded ? "重新上传" : "上传成绩文件"}</button></div>
        </article>
      })}
    </div>}
  </section>
}
