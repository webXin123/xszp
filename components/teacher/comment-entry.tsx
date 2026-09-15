"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Award, CheckCircle2, ChevronRight, FileText, NotebookPen, Save, Search, Star, UsersRound } from "lucide-react"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { ACADEMIC_SUBJECTS, getAcademicScores, type AcademicSubject } from "@/lib/academic-scores"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"
import { commentRoleForTeacher, readCommentRecords, writeCommentRecords, type StudentCommentRecord } from "@/lib/comment-utils"
import { getSemesterLabel } from "@/lib/pe-scores"
import { cn } from "@/lib/utils"

function commentStatus(completed: number, total: number) {
  if (completed >= total && total > 0) return { label: "已提交", className: "bg-[#eaf8f1] text-brand-green" }
  if (completed > 0) return { label: "录入中", className: "bg-[#eef2ff] text-primary" }
  return { label: "未开始", className: "bg-[#fff4e5] text-brand-orange" }
}

export function TeacherCommentEntry() {
  const { currentTeacher, students, classes, awardCards, honors } = useEvaluation()
  const { role, scoringClasses, awardClasses } = usePermission()
  const teacher = currentTeacher
  const commentRole = commentRoleForTeacher(role ?? "subject")
  const targetClasses = useMemo(() => role === "homeroom" ? scoringClasses : awardClasses, [awardClasses, role, scoringClasses])
  const [classId, setClassId] = useState(targetClasses[0]?.id ?? "")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [records, setRecords] = useState<StudentCommentRecord[]>([])
  const [draft, setDraft] = useState("")
  const [editing, setEditing] = useState(true)
  const [search, setSearch] = useState("")
  const [feedback, setFeedback] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    setRecords(readCommentRecords())
  }, [])

  useEffect(() => {
    if (!targetClasses.some((item) => item.id === classId)) setClassId(targetClasses[0]?.id ?? "")
  }, [classId, targetClasses])

  const currentClass = targetClasses.find((item) => item.id === classId)
  const classStudents = useMemo(() => students.filter((student) => student.classId === classId), [classId, students])
  const filteredStudents = useMemo(() => classStudents.filter((student) => `${student.name}${student.studentNo}`.includes(search.trim())), [classStudents, search])

  useEffect(() => {
    if (!filteredStudents.some((student) => student.id === selectedStudentId)) setSelectedStudentId(filteredStudents[0]?.id ?? "")
  }, [filteredStudents, selectedStudentId])

  const selectedStudent = classStudents.find((student) => student.id === selectedStudentId)
  const selectedRecord = records.find((record) => record.teacherId === teacher?.id && record.studentId === selectedStudentId && record.semester === getSemesterLabel())

  useEffect(() => {
    setDraft(selectedRecord?.comment ?? "")
    setEditing(!selectedRecord)
    setFeedback("")
    setError("")
  }, [selectedRecord])

  const progressByClass = useMemo(() => targetClasses.map((schoolClass) => {
    const roster = students.filter((student) => student.classId === schoolClass.id)
    const completed = roster.filter((student) => records.some((record) => record.teacherId === teacher?.id && record.studentId === student.id && record.semester === getSemesterLabel() && record.comment.trim())).length
    return { schoolClass, completed, total: roster.length }
  }), [records, students, targetClasses, teacher?.id])

  const academicSubjects = useMemo<readonly AcademicSubject[]>(() => {
    if (role === "homeroom") return ACADEMIC_SUBJECTS
    if (role === "pe_teacher") return ["体育与健身"]
    if (teacher?.name === "张哲") return ["数学"]
    return ["语文"]
  }, [role, teacher?.name])
  const academicScores = selectedStudent ? getAcademicScores(selectedStudent, academicSubjects) : []
  const pointsByLevel = selectedStudent ? AWARD_LEVEL1_LIST.map((level1) => ({ level1, points: awardCards.filter((card) => card.studentId === selectedStudent.id && card.level1 === level1).reduce((sum, card) => sum + card.points, 0) + honors.filter((honor) => honor.studentId === selectedStudent.id && honor.level1 === level1).reduce((sum, honor) => sum + honor.points, 0) })) : []
  const totalPoints = pointsByLevel.reduce((sum, item) => sum + item.points, 0)

  const selectStudent = (studentId: string) => {
    setSelectedStudentId(studentId)
    setFeedback("")
  }

  const saveComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!teacher || !selectedStudent || !draft.trim()) {
      setError("请先填写本学期评语")
      return
    }
    const nextRecord: StudentCommentRecord = {
      id: selectedRecord?.id ?? `comment-${teacher.id}-${selectedStudent.id}-${Date.now()}`,
      semester: getSemesterLabel(),
      studentId: selectedStudent.id,
      classId: selectedStudent.classId,
      teacherId: teacher.id,
      teacherName: teacher.name,
      role: commentRole,
      comment: draft.trim(),
      updatedAt: new Date().toISOString(),
    }
    const next = records.some((record) => record.id === nextRecord.id) ? records.map((record) => record.id === nextRecord.id ? nextRecord : record) : [...records, nextRecord]
    writeCommentRecords(next)
    setRecords(next)
    setEditing(false)
    setError("")
    setFeedback("评语已保存，状态已更新为“已评价”")
  }

  if (!teacher) return <section className="rounded-2xl border border-[#cbd6f7] bg-white p-8 text-center text-sm text-muted-foreground">当前身份无法录入评语</section>

  return <section className="flex flex-col gap-4" aria-labelledby="teacher-comment-entry-title">
    <div className="rounded-2xl border border-[#cbd6f7] border-t-2 border-t-[#7166b3] bg-white p-5 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f0ff] text-[#7166b3]"><NotebookPen className="size-5" aria-hidden="true" /></span><div><h1 id="teacher-comment-entry-title" className="text-lg font-bold text-foreground">本学期评语录入</h1><p className="mt-1 text-xs text-muted-foreground">{getSemesterLabel()} · {teacher.name} · 选择学生后查看成绩并填写成长评语</p></div></div><span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#f5f3ff] px-3 text-xs font-semibold text-[#7166b3]"><UsersRound className="size-3.5" aria-hidden="true" />{progressByClass.reduce((sum, item) => sum + item.total, 0)} 名学生</span></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{progressByClass.map(({ schoolClass, completed, total }) => { const status = commentStatus(completed, total); const percentage = total ? Math.round(completed / total * 100) : 0; return <button key={schoolClass.id} type="button" aria-pressed={classId === schoolClass.id} onClick={() => setClassId(schoolClass.id)} className={cn("rounded-xl border p-3 text-left transition-colors hover:border-[#7166b3]/45 hover:bg-[#fcfbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7166b3]/40", classId === schoolClass.id ? "border-[#7166b3]/50 bg-[#faf9ff]" : "border-[#e2e6f4] bg-[#fbfcff]")}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold text-foreground">{schoolClass.name}</span><span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", status.className)}>{status.label}</span></div><div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7ebf8]"><div className="h-full rounded-full bg-[#7166b3] transition-[width] duration-300" style={{ width: `${percentage}%` }} /></div><span className="w-16 text-right text-[11px] font-bold tabular-nums text-[#7166b3]">{completed} / {total}</span></div></button> })}</div>
    </div>

    <div className="grid min-h-[640px] gap-4 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
      <section className="flex min-h-0 flex-col rounded-2xl border border-[#cbd6f7] bg-white p-4 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-5" aria-labelledby="student-roster-title">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 id="student-roster-title" className="text-base font-bold text-foreground">班级学生</h2><p className="mt-1 text-xs text-muted-foreground">点击学生查看成绩与评语</p></div><span className="text-xs font-semibold tabular-nums text-muted-foreground">{classStudents.length} 人</span></div>
        <div className="mt-4"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><label className="sr-only" htmlFor="comment-student-search">搜索学生</label><input id="comment-student-search" name="comment-student-search" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索姓名或学号…" className="h-11 w-full rounded-xl border border-[#d8e0f7] bg-[#f8faff] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-[#7166b3]/45 focus-visible:ring-2 focus-visible:ring-[#7166b3]/40" /></div></div>
        <div className="mt-4 max-h-[420px] min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-[480px] lg:max-h-[560px]">{filteredStudents.map((student) => { const evaluated = records.some((record) => record.teacherId === teacher.id && record.studentId === student.id && record.semester === getSemesterLabel() && record.comment.trim()); return <button key={student.id} type="button" onClick={() => selectStudent(student.id)} aria-pressed={student.id === selectedStudentId} className={cn("group flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-[#7166b3]/45 hover:bg-[#fcfbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7166b3]/40", student.id === selectedStudentId ? "border-[#7166b3]/55 bg-[#f7f5ff]" : "border-[#e4e8f5] bg-[#fbfcff]")}><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-sm font-bold text-primary">{student.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{student.name}</span><span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">学号 {student.studentNo} · {student.gender}</span></span><span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold", evaluated ? "bg-[#eaf8f1] text-brand-green" : "bg-[#fff4e5] text-brand-orange")}>{evaluated ? "已评价" : "待评价"}</span><ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></button> })}</div>
      </section>

      <section className="flex min-h-0 flex-col rounded-2xl border border-[#cbd6f7] bg-white p-4 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-5" aria-labelledby="student-comment-detail-title">
        {!selectedStudent ? <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">暂无匹配学生</div> : <><div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e7ebf7] pb-4"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">{selectedStudent.name.slice(0, 1)}</span><div><h2 id="student-comment-detail-title" className="text-lg font-bold text-foreground">{selectedStudent.name}</h2><p className="mt-1 text-xs text-muted-foreground">{currentClass?.name} · 学号 {selectedStudent.studentNo} · {selectedStudent.gender}</p></div></div><span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", selectedRecord ? "bg-[#eaf8f1] text-brand-green" : "bg-[#fff4e5] text-brand-orange")}>{selectedRecord ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <FileText className="size-3.5" aria-hidden="true" />}{selectedRecord ? "已评价" : "待评价"}</span></div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]"><div className="rounded-xl border border-[#e3e8f5] bg-[#fbfcff] p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-foreground">本学期所教科目成绩</h3><span className="text-xs text-muted-foreground">{getSemesterLabel()}</span></div><div className="mt-3 overflow-hidden rounded-lg border border-[#e5e9f5] bg-white"><table className="w-full text-sm"><caption className="sr-only">{selectedStudent.name}本学期科目成绩</caption><thead className="bg-[#f5f7ff] text-xs text-muted-foreground"><tr><th scope="col" className="px-3 py-2 text-left font-semibold">科目</th><th scope="col" className="px-3 py-2 text-right font-semibold">成绩</th><th scope="col" className="px-3 py-2 text-right font-semibold">等级</th></tr></thead><tbody>{academicScores.map((score) => <tr key={score.subject} className="border-t border-[#edf0f8]"><th scope="row" className="px-3 py-2.5 text-left font-medium text-foreground">{score.subject}</th><td className="px-3 py-2.5 text-right font-bold tabular-nums text-foreground">{score.score}</td><td className="px-3 py-2.5 text-right text-xs font-semibold text-primary">{score.level}</td></tr>)}</tbody></table></div></div>{role === "homeroom" && <div className="rounded-xl border border-[#e3e8f5] bg-[#fbfcff] p-4"><div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Award className="size-4 text-brand-orange" aria-hidden="true" />本学期五育积分</h3><span className="text-base font-bold tabular-nums text-brand-orange">{totalPoints} 分</span></div><div className="mt-3 space-y-2.5">{pointsByLevel.map((item) => <div key={item.level1} className="flex items-center gap-2 text-xs"><span className="w-10 shrink-0 text-muted-foreground">{item.level1}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7ebf8]"><div className="h-full rounded-full bg-brand-orange" style={{ width: `${Math.min(item.points * 10, 100)}%` }} /></div><span className="w-8 text-right font-bold tabular-nums text-foreground">{item.points}</span></div>)}</div></div>}</div>
          <form className="mt-4 rounded-xl border border-[#d9dff2] bg-[#faf9ff] p-4" onSubmit={saveComment}><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Star className="size-4 text-[#7166b3]" aria-hidden="true" />本学期成长评语</h3><p className="mt-1 text-xs text-muted-foreground">建议结合成绩、课堂表现与五育成长填写。</p></div>{selectedRecord && !editing && <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#7166b3] transition-colors hover:bg-[#f0edff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7166b3]/40">修改评语</button>}</div><label className="sr-only" htmlFor="student-comment">{selectedStudent.name}本学期评语</label><textarea id="student-comment" name="student-comment" rows={5} value={draft} readOnly={!editing} onChange={(event) => setDraft(event.target.value)} placeholder="请输入对学生本学期表现的综合评价与成长建议…" className={cn("mt-3 min-h-32 w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#7166b3]/40", editing ? "border-[#d8d1f7] bg-white hover:border-[#7166b3]/55" : "border-[#e7e9f3] bg-[#f5f6fb] text-foreground")} />{error && <p className="mt-2 text-xs font-medium text-destructive" role="alert">{error}</p>}{feedback && <p className="mt-2 text-xs font-medium text-brand-green" role="status" aria-live="polite"><CheckCircle2 className="mr-1 inline size-3.5" aria-hidden="true" />{feedback}</p>}{editing && <div className="mt-3 flex justify-end"><button type="submit" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#7166b3] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#6258a4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7166b3]/40"><Save className="size-4" aria-hidden="true" />保存评语</button></div>}</form>
        </>}
      </section>
    </div>
  </section>
}
