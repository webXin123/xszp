"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  HeartPulse,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UsersRound,
  WandSparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { buildPePreviewRows, PE_CLASSES, PE_CLASS_IDS, getSemesterLabel, type PeScoreUpload } from "@/lib/pe-scores"
import { useEvaluation } from "@/lib/evaluation-context"
import type { Grade } from "@/lib/types"

type EntryMethod = "teacher" | "automatic"
type ScoreValueType = "number" | "grade"
type ConversionMode = "score" | "rank"
type ScoreName = "daily" | "midterm" | "final" | "semester" | "other"
type ScoreEntryTab = "subject" | "pe"

interface PeScoreTask {
  classIds: string[]
  startDate: string
  endDate: string
  semesterLabel: string
}

interface ConversionRule {
  label: string
  threshold?: string
  rangeStart?: string
  rangeEnd?: string
}

interface CalculationItem {
  sourceId: string
  weight: string
}

interface TeacherEntryProgress {
  id: string
  teacher: string
  subject: string
  gradeName: string
  classNames: string
  status: "未开始" | "录入中" | "已提交"
  fileName?: string
  uploadedAt?: string
  rows?: number
}

interface ScoreEntryTask {
  id: string
  semester: string
  scoreName: string
  gradeIds: string[]
  subjects: string[]
  startAt: string
  endAt: string
  method: EntryMethod
  valueType?: ScoreValueType
  gradeRules: ConversionRule[]
  calculationItems: CalculationItem[]
  convertResult: boolean
  conversionMode?: ConversionMode
  conversionRules: ConversionRule[]
  progress: TeacherEntryProgress[]
}

const SUBJECTS = ["语文", "数学", "英语", "科学", "道德与法治", "体育"]

const SCORE_NAME_OPTIONS: { code: ScoreName; value: string }[] = [
  { code: "daily", value: "平时成绩" },
  { code: "midterm", value: "期中成绩" },
  { code: "final", value: "期末成绩" },
  { code: "semester", value: "学期总评" },
  { code: "other", value: "其他（自定义）" },
]

const DEFAULT_GRADE_RULES: ConversionRule[] = [
  { label: "A", threshold: "90" },
  { label: "B", threshold: "80" },
]

const DEFAULT_SCORE_CONVERSION: ConversionRule[] = [
  { label: "优秀", rangeStart: "90", rangeEnd: "100" },
  { label: "良好", rangeStart: "75", rangeEnd: "89" },
]

const DEFAULT_RANK_CONVERSION: ConversionRule[] = [
  { label: "优秀", rangeStart: "0", rangeEnd: "20" },
  { label: "良好", rangeStart: "21", rangeEnd: "50" },
]

const SCORE_ENTRY_TASKS_KEY = "mzlg-score-entry-tasks-v1"
const PE_SCORE_TASK_KEY = "mzlg-pe-score-task-v1"

function localDate(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function createPeSeedTask(): PeScoreTask {
  return { classIds: PE_CLASS_IDS, startDate: localDate(-5), endDate: localDate(9), semesterLabel: getSemesterLabel() }
}

const PE_UPLOAD_SEED: PeScoreUpload[] = [
  { classId: PE_CLASSES[0].id, gender: "male" as const, rowCount: PE_CLASSES[0].maleCount, uploaderName: "王老师" },
  { classId: PE_CLASSES[0].id, gender: "female" as const, rowCount: PE_CLASSES[0].femaleCount, uploaderName: "王老师" },
  { classId: PE_CLASSES[1].id, gender: "male" as const, rowCount: PE_CLASSES[1].maleCount, uploaderName: "李老师" },
  { classId: PE_CLASSES[2].id, gender: "female" as const, rowCount: PE_CLASSES[2].femaleCount, uploaderName: "李老师" },
  { classId: PE_CLASSES[3].id, gender: "male" as const, rowCount: PE_CLASSES[3].maleCount, uploaderName: "张老师" },
].map((item, index) => ({
  ...item,
  id: `pe-upload-seed-${item.classId}-${item.gender}`,
  fileName: `${PE_CLASSES.find((schoolClass) => schoolClass.id === item.classId)?.name ?? "班级"}${item.gender === "male" ? "男生" : "女生"}体测成绩.xlsx`,
  uploadedAt: `${localDate(-index - 1)} 14:${String(20 + index * 5).padStart(2, "0")}`,
  uploaderId: `pe-teacher-${index + 1}`,
  preview: buildPePreviewRows(item.classId, item.gender, item.rowCount),
}))

function localDateTime(offset: number, hour: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  date.setHours(hour, 0, 0, 0)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function taskStatus(task: ScoreEntryTask) {
  const now = new Date()
  if (now > new Date(task.endAt)) return { label: "已截止", className: "bg-[#fff1e9] text-brand-orange" }
  if (now >= new Date(task.startAt)) return { label: "录入中", className: "bg-[#effbf4] text-brand-green" }
  return { label: "未开始", className: "bg-[#eef2ff] text-primary" }
}

function buildProgress(taskId: string, scoreName: string, gradeNames: string[], subjects: string[]) {
  const teachers = ["刘敏", "张哲", "王晨", "孙悦", "钱进", "周岚"]
  return subjects.flatMap((subject, subjectIndex) => gradeNames.map((gradeName, gradeIndex) => {
    const index = subjectIndex * gradeNames.length + gradeIndex
    const submitted = index === 0 || index === 3
    const editing = !submitted && index % 3 === 1
    return {
      id: `${taskId}-${subjectIndex}-${gradeIndex}`,
      teacher: teachers[subjectIndex % teachers.length],
      subject,
      gradeName,
      classNames: `${gradeName}01班、${gradeName}02班`,
      status: submitted ? "已提交" : editing ? "录入中" : "未开始",
      fileName: submitted ? `${gradeName}${subject}${scoreName}.xlsx` : undefined,
      uploadedAt: submitted ? "2026-09-08 15:30" : undefined,
      rows: submitted ? 86 + index : undefined,
    } satisfies TeacherEntryProgress
  }))
}

function createSeedTask(grades: Grade[]): ScoreEntryTask {
  const targetGrades = grades.slice(-2)
  return {
    id: "score-task-seed",
    semester: getSemesterLabel(),
    scoreName: "期中成绩",
    gradeIds: targetGrades.map((item) => item.id),
    subjects: ["语文", "数学", "英语"],
    startAt: localDateTime(-2, 8),
    endAt: localDateTime(5, 18),
    method: "teacher",
    valueType: "number",
    gradeRules: [],
    calculationItems: [],
    convertResult: false,
    conversionRules: [],
    progress: buildProgress("score-task-seed", "期中成绩", targetGrades.map((item) => item.name), ["语文", "数学", "英语"]),
  }
}

export function ScoreEntryManagement({ grades }: { grades: Grade[] }) {
  const [activeTab, setActiveTab] = useState<ScoreEntryTab>("subject")
  const [tasks, setTasks] = useState<ScoreEntryTask[]>(() => [createSeedTask(grades)])
  const [hydrated, setHydrated] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<ScoreEntryTask | null>(null)
  const [preview, setPreview] = useState<TeacherEntryProgress | null>(null)
  const [scoreName, setScoreName] = useState<ScoreName>("daily")
  const [otherScoreName, setOtherScoreName] = useState("")
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>(grades.slice(-2).map((item) => item.id))
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["语文", "数学"])
  const [startAt, setStartAt] = useState(localDateTime(0, 8))
  const [endAt, setEndAt] = useState(localDateTime(7, 18))
  const [method, setMethod] = useState<EntryMethod>("teacher")
  const [valueType, setValueType] = useState<ScoreValueType>("number")
  const [gradeRules, setGradeRules] = useState<ConversionRule[]>(DEFAULT_GRADE_RULES)
  const [calculationItems, setCalculationItems] = useState<CalculationItem[]>([{ sourceId: "score-task-seed", weight: "100" }])
  const [convertResult, setConvertResult] = useState(false)
  const [conversionMode, setConversionMode] = useState<ConversionMode>("score")
  const [conversionRules, setConversionRules] = useState<ConversionRule[]>(DEFAULT_SCORE_CONVERSION)
  const [error, setError] = useState("")

  useEffect(() => {
    if (window.location.hash === "#pe") setActiveTab("pe")
  }, [])

  const sourceTasks = useMemo(() => tasks.filter((task) => task.method === "teacher"), [tasks])
  const submittedCount = (task: ScoreEntryTask) => task.progress.filter((item) => item.status === "已提交").length

  useEffect(() => {
    try {
      const cached = localStorage.getItem(SCORE_ENTRY_TASKS_KEY)
      const parsed = cached ? JSON.parse(cached) : null
      if (Array.isArray(parsed) && parsed.length > 0) setTasks(parsed as ScoreEntryTask[])
    } catch {
      setTasks([createSeedTask(grades)])
    } finally {
      setHydrated(true)
    }
  }, [grades])

  useEffect(() => {
    if (hydrated) localStorage.setItem(SCORE_ENTRY_TASKS_KEY, JSON.stringify(tasks))
  }, [tasks, hydrated])

  const resetForm = () => {
    setScoreName("daily")
    setOtherScoreName("")
    setSelectedGradeIds(grades.slice(-2).map((item) => item.id))
    setSelectedSubjects(["语文", "数学"])
    setStartAt(localDateTime(0, 8))
    setEndAt(localDateTime(7, 18))
    setMethod("teacher")
    setValueType("number")
    setGradeRules(DEFAULT_GRADE_RULES)
    setCalculationItems(sourceTasks.length > 0 ? [{ sourceId: sourceTasks[0].id, weight: "100" }] : [])
    setConvertResult(false)
    setConversionMode("score")
    setConversionRules(DEFAULT_SCORE_CONVERSION)
    setError("")
  }

  const toggleSelection = (value: string, selected: string[], setSelected: (values: string[]) => void) => {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  }

  const publishTask = () => {
    const finalScoreName = scoreName === "other" ? otherScoreName.trim() : SCORE_NAME_OPTIONS.find((item) => item.code === scoreName)?.value ?? "成绩"
    if (!finalScoreName) return setError("请填写成绩名称")
    if (selectedGradeIds.length === 0) return setError("请选择至少一个录入年级")
    if (selectedSubjects.length === 0) return setError("请选择至少一个录入科目")
    if (!startAt || !endAt || startAt >= endAt) return setError("请正确设置开始与截止时间")
    if (method === "automatic") {
      if (calculationItems.length === 0 || calculationItems.some((item) => !item.sourceId || Number(item.weight) <= 0)) return setError("请添加需要计算的成绩及权重")
      if (calculationItems.reduce((total, item) => total + Number(item.weight || 0), 0) !== 100) return setError("自动计算的权重合计需为 100%")
    }
    if (method === "teacher" && valueType === "grade" && gradeRules.some((rule) => !rule.label.trim() || !rule.threshold?.trim() || Number(rule.threshold) < 0)) return setError("请补全等第换算规则")
    if (method === "automatic" && convertResult && conversionRules.some((rule) => { const start = Number(rule.rangeStart); const end = Number(rule.rangeEnd); return !rule.label.trim() || !rule.rangeStart?.trim() || !rule.rangeEnd?.trim() || start < 0 || end < 0 || start > end || (conversionMode === "rank" && (start > 100 || end > 100)) })) return setError(conversionMode === "rank" ? "请补全 0–100% 内的等第换算区间" : "请补全结果等第换算区间")

    const selectedGrades = grades.filter((grade) => selectedGradeIds.includes(grade.id))
    const id = `score-task-${Date.now()}`
    const next: ScoreEntryTask = {
      id,
      semester: getSemesterLabel(),
      scoreName: finalScoreName,
      gradeIds: selectedGradeIds,
      subjects: selectedSubjects,
      startAt,
      endAt,
      method,
      valueType: method === "teacher" ? valueType : undefined,
      gradeRules: method === "teacher" && valueType === "grade" ? gradeRules : [],
      calculationItems: method === "automatic" ? calculationItems : [],
      convertResult: method === "automatic" && convertResult,
      conversionMode: method === "automatic" && convertResult ? conversionMode : undefined,
      conversionRules: method === "automatic" && convertResult ? conversionRules : [],
      progress: buildProgress(id, finalScoreName, selectedGrades.map((grade) => grade.name), selectedSubjects).map((item) => ({ ...item, status: "未开始", fileName: undefined, uploadedAt: undefined, rows: undefined })),
    }
    setTasks((current) => [next, ...current])
    setPublishOpen(false)
    resetForm()
  }

  return (
    <section className="rounded-[24px] border border-[#cfd8f6] bg-[#f7f8ff] p-4 shadow-[0_18px_38px_-30px_rgba(53,67,150,0.72)] sm:p-5">
      <div className="mb-5 flex w-full items-center gap-1 rounded-xl border border-[#dbe2f7] bg-white p-1 shadow-[0_7px_16px_-18px_rgba(53,67,150,0.68)] sm:w-fit" role="tablist" aria-label="成绩录入类型">
        <button type="button" role="tab" aria-selected={activeTab === "subject"} onClick={() => setActiveTab("subject")} className={cn("flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", activeTab === "subject" ? "bg-primary text-primary-foreground shadow-[0_5px_12px_-9px_rgba(63,81,188,0.9)]" : "text-muted-foreground hover:bg-[#f3f5ff] hover:text-foreground")}><FileSpreadsheet className="size-4" aria-hidden="true" />学科成绩</button>
        <button type="button" role="tab" aria-selected={activeTab === "pe"} onClick={() => setActiveTab("pe")} className={cn("flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", activeTab === "pe" ? "bg-primary text-primary-foreground shadow-[0_5px_12px_-9px_rgba(63,81,188,0.9)]" : "text-muted-foreground hover:bg-[#f3f5ff] hover:text-foreground")}><HeartPulse className="size-4" aria-hidden="true" />体育成绩</button>
      </div>
      {activeTab === "subject" ? <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_9px_18px_-11px_rgba(63,81,188,0.92)]"><FileSpreadsheet className="size-5" aria-hidden="true" /></span>
          <div>
            <h3 className="text-base font-bold text-foreground">成绩录入发布</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{getSemesterLabel()} · 发布任课教师录入任务，统览进度与已上传成绩。</p>
          </div>
        </div>
        <Button type="button" onClick={() => { resetForm(); setPublishOpen(true) }} className="h-10 rounded-xl px-4 shadow-[0_9px_18px_-12px_rgba(63,81,188,0.88)]"><Plus className="size-4" />发布录入任务</Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {tasks.map((task) => {
          const status = taskStatus(task)
          const done = submittedCount(task)
          const total = task.progress.length
          const gradeNames = task.gradeIds.map((id) => grades.find((grade) => grade.id === id)?.name).filter(Boolean)
          return <button key={task.id} type="button" onClick={() => setDetailTask(task)} className="group flex flex-col gap-3 rounded-2xl border border-[#dbe2f8] bg-white p-4 text-left shadow-[0_12px_26px_-24px_rgba(53,67,150,0.68)] transition-colors hover:border-primary/40 hover:bg-[#fcfdff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-base font-bold text-foreground">{task.scoreName}</span><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", status.className)}>{status.label}</span></div><p className="mt-1 text-xs text-muted-foreground">{task.semester} · {task.method === "teacher" ? "教师录入" : "自动计算"}</p></div>
              <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs"><span className="rounded-lg bg-[#f0f3ff] px-2 py-1 text-primary">{gradeNames.join("、")}</span><span className="rounded-lg bg-[#f6f7fb] px-2 py-1 text-muted-foreground">{task.subjects.join("、")}</span>{task.method === "teacher" && <span className="rounded-lg bg-[#fff5e9] px-2 py-1 text-brand-orange">{task.valueType === "grade" ? "等第录入" : "数值录入"}</span>}</div>
            <div className="border-t border-[#edf0fa] pt-3"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">任课教师录入进度</span><span className="font-bold text-foreground">{done} / {total}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5e9f7]"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: total ? `${(done / total) * 100}%` : "0%" }} /></div></div>
            <p className="text-xs text-muted-foreground">录入：{task.startAt.replace("T", " ")} ~ {task.endAt.replace("T", " ")}</p>
          </button>
        })}
      </div>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-h-[88vh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[26px] border border-[#c8d4f7] bg-white p-0 shadow-[0_32px_80px_-34px_rgba(41,61,148,0.68)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-4xl">
          <DialogHeader className="border-b border-[#dce4fa] bg-[linear-gradient(110deg,#edf2ff,#ffffff_60%,#f7f4ff)] px-5 py-5 sm:px-7"><DialogTitle className="flex items-center gap-2 text-xl"><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-4" aria-hidden="true" /></span>发布成绩录入任务</DialogTitle><DialogDescription>按学期发布成绩录入任务，任务发布后将通知对应任课教师。</DialogDescription></DialogHeader>
          <div className="bg-[#fbfcff] px-5 py-5 sm:px-7"><div className="grid gap-4 lg:grid-cols-2">
            <FormSection icon={FileSpreadsheet} title="任务范围" description="先确定本次需要录入的成绩、年级和科目。"><div className="grid gap-3 sm:grid-cols-2"><div className="flex flex-col gap-1.5"><Label>成绩名称 <span className="text-destructive">*</span></Label><Select value={SCORE_NAME_OPTIONS.find((item) => item.code === scoreName)?.value ?? ""} onValueChange={(value) => setScoreName(SCORE_NAME_OPTIONS.find((item) => item.value === value)?.code ?? "daily")}><SelectTrigger aria-label="选择成绩名称" className="w-full"><SelectValue placeholder="请选择成绩名称" /></SelectTrigger><SelectContent>{SCORE_NAME_OPTIONS.map((item) => <SelectItem key={item.code} value={item.value}>{item.value}</SelectItem>)}</SelectContent></Select>{scoreName === "other" && <Input name="other-score-name" autoComplete="off" value={otherScoreName} onChange={(event) => setOtherScoreName(event.target.value)} placeholder="请输入成绩名称" className={fieldClass} />}</div><MultiSelectDropdown label="录入科目" description="可选择多个本次需要录入的科目。" items={SUBJECTS.map((subject) => ({ id: subject, name: subject }))} selectedIds={selectedSubjects} onToggle={(subject) => toggleSelection(subject, selectedSubjects, setSelectedSubjects)} /></div><div className="mt-3"><MultiSelectDropdown label="录入年级" description="可选择多个需要开展成绩录入的年级。" items={grades.map((grade) => ({ id: grade.id, name: grade.name }))} selectedIds={selectedGradeIds} onToggle={(gradeId) => toggleSelection(gradeId, selectedGradeIds, setSelectedGradeIds)} /></div></FormSection>
            <FormSection icon={CalendarClock} title="录入时间" description="在时间窗口内，任课教师可以提交或更新成绩。"><div className="grid gap-3 sm:grid-cols-2"><div className="flex flex-col gap-1.5"><Label htmlFor="score-start">开始录入时间 <span className="text-destructive">*</span></Label><Input id="score-start" name="score-start" autoComplete="off" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} className={fieldClass} /></div><div className="flex flex-col gap-1.5"><Label htmlFor="score-end">截止录入时间 <span className="text-destructive">*</span></Label><Input id="score-end" name="score-end" autoComplete="off" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} className={fieldClass} /></div></div></FormSection>
          </div>
          <div className="mt-4"><FormSection icon={WandSparkles} title="成绩录入方式" description="教师直接填写成绩，或基于本学期已发布成绩自动计算。"><div className="grid gap-2 sm:grid-cols-2"><ChoiceButton active={method === "teacher"} onClick={() => setMethod("teacher")} description="任课教师在任务内填写并上传成绩 Excel。">教师录入</ChoiceButton><ChoiceButton active={method === "automatic"} onClick={() => setMethod("automatic")} description="按已发布成绩及权重自动生成本次成绩。">自动计算</ChoiceButton></div>{method === "teacher" ? <div className="mt-3 rounded-xl border border-[#dce4fa] bg-white p-3"><p className="text-xs font-semibold text-foreground">成绩类型 <span className="text-destructive">*</span></p><div className="mt-2 grid grid-cols-2 gap-2"><ChoiceButton active={valueType === "number"} onClick={() => setValueType("number")}>数值</ChoiceButton><ChoiceButton active={valueType === "grade"} onClick={() => setValueType("grade")}>等第</ChoiceButton></div>{valueType === "grade" && <RuleEditor className="mt-3" rules={gradeRules} setRules={setGradeRules} thresholdLabel="对应分数" placeholder="如 A" />}</div> : <AutomaticSettings tasks={sourceTasks} items={calculationItems} setItems={setCalculationItems} convertResult={convertResult} setConvertResult={setConvertResult} conversionMode={conversionMode} setConversionMode={(mode) => { setConversionMode(mode); setConversionRules(mode === "score" ? DEFAULT_SCORE_CONVERSION : DEFAULT_RANK_CONVERSION) }} rules={conversionRules} setRules={setConversionRules} />}</FormSection></div>
          {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive">{error}</p>}</div>
          <DialogFooter className="mx-0 mb-0 border-t border-[#dce4fa] bg-white px-5 py-4 sm:px-7"><Button type="button" variant="outline" className="border-[#d8e0f7] bg-[#fbfcff]" onClick={() => setPublishOpen(false)}>取消</Button><Button type="button" onClick={publishTask} className="shadow-[0_9px_18px_-12px_rgba(63,81,188,0.88)]"><CheckCircle2 className="size-4" />发布任务</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailTask} onOpenChange={(open) => !open && setDetailTask(null)}>
        <DialogContent className="max-h-[84vh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[24px] border border-[#cbd5f5] bg-white p-0 shadow-[0_28px_70px_-36px_rgba(48,62,139,0.72)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-3xl">
          {detailTask && <><DialogHeader className="border-b border-[#dce3f8] bg-[#f6f8ff] px-5 py-4"><DialogTitle className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><UsersRound className="size-4" aria-hidden="true" /></span>{detailTask.scoreName} · 录入进度</DialogTitle><DialogDescription>{detailTask.semester} · {detailTask.subjects.join("、")} · 截止 {detailTask.endAt.replace("T", " ")}</DialogDescription></DialogHeader><div className="px-5 py-4"><div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-[#dce4fa] bg-[#fbfcff] p-3 text-center"><Metric label="任课教师" value={detailTask.progress.length} /><Metric label="已提交" value={submittedCount(detailTask)} tone="text-brand-green" /><Metric label="待处理" value={detailTask.progress.length - submittedCount(detailTask)} tone="text-brand-orange" /></div><div className="flex flex-col gap-2">{detailTask.progress.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e0e5f7] bg-[#fbfcff] px-3 py-2.5"><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", item.status === "已提交" ? "bg-[#effbf4] text-brand-green" : item.status === "录入中" ? "bg-[#eef2ff] text-primary" : "bg-[#fff5e9] text-brand-orange")}>{item.status}</span><div className="min-w-[110px] flex-1"><p className="text-sm font-semibold text-foreground">{item.teacher} · {item.subject}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.gradeName} · {item.classNames}</p></div>{item.fileName ? <button type="button" onClick={() => setPreview(item)} className="inline-flex items-center gap-1 rounded-lg border border-[#d3defa] bg-white px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><FileSpreadsheet className="size-3.5" aria-hidden="true" />{item.fileName}</button> : <span className="text-xs text-muted-foreground">暂未上传 Excel</span>}</div>)}</div></div></>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="rounded-[22px] border border-[#cbd5f5] bg-white sm:max-w-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-primary" aria-hidden="true" />{preview?.fileName ?? "成绩 Excel"}</DialogTitle><DialogDescription>{preview?.teacher} · {preview?.subject} · {preview?.rows ?? 0} 条成绩</DialogDescription></DialogHeader><div className="overflow-x-auto rounded-xl border border-[#d8e0f7]"><table className="w-full min-w-[500px] text-left text-xs"><thead><tr className="bg-[#eff3ff] text-foreground"><th className="px-3 py-2">学号</th><th className="px-3 py-2">姓名</th><th className="px-3 py-2">班级</th><th className="px-3 py-2">成绩</th></tr></thead><tbody>{[1, 2, 3, 4].map((item) => <tr key={item} className="border-t border-[#e7ebf7]"><td className="px-3 py-2">{String(item).padStart(2, "0")}</td><td className="px-3 py-2">学生{item}</td><td className="px-3 py-2">{preview?.gradeName}01班</td><td className="px-3 py-2">{92 - item * 3}</td></tr>)}</tbody></table></div></DialogContent>
      </Dialog>
      </> : <PeScoreEntryManagement />}
    </section>
  )
}

function PeScoreEntryManagement() {
  const { peScoreUploads } = useEvaluation()
  const [task, setTask] = useState<PeScoreTask | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [classIds, setClassIds] = useState<string[]>(PE_CLASS_IDS)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    try {
      const cached = localStorage.getItem(PE_SCORE_TASK_KEY)
      const parsed = cached ? JSON.parse(cached) as PeScoreTask | null : null
      setTask(parsed ?? createPeSeedTask())
    } catch {
      setTask(createPeSeedTask())
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(PE_SCORE_TASK_KEY, JSON.stringify(task))
  }, [hydrated, task])

  const scopedClasses = useMemo(() => PE_CLASSES.filter((item) => !task || task.classIds.includes(item.id)), [task])
  const displayedUploads = peScoreUploads.length > 0 ? peScoreUploads : PE_UPLOAD_SEED
  const uploadMap = useMemo(() => new Map(displayedUploads.map((item) => [`${item.classId}:${item.gender}`, item])), [displayedUploads])
  const uploadedFiles = scopedClasses.reduce((count, item) => count + Number(uploadMap.has(`${item.id}:male`)) + Number(uploadMap.has(`${item.id}:female`)), 0)
  const uploadedRows = scopedClasses.reduce((count, item) => count + (uploadMap.get(`${item.id}:male`)?.rowCount ?? 0) + (uploadMap.get(`${item.id}:female`)?.rowCount ?? 0), 0)
  const totalFiles = scopedClasses.length * 2
  const progress = totalFiles ? Math.round((uploadedFiles / totalFiles) * 100) : 0

  const openDrawer = () => {
    setClassIds(task?.classIds ?? PE_CLASS_IDS)
    setStartDate(task?.startDate ?? "")
    setEndDate(task?.endDate ?? "")
    setError("")
    setDrawerOpen(true)
  }

  const publish = () => {
    if (classIds.length === 0) return setError("请选择至少一个录入班级")
    if (!startDate || !endDate || endDate < startDate) return setError("请正确设置录入时间")
    setTask({ classIds, startDate, endDate, semesterLabel: getSemesterLabel() })
    setDrawerOpen(false)
  }

  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_9px_18px_-11px_rgba(63,81,188,0.82)]"><HeartPulse className="size-5" aria-hidden="true" /></span><div><h3 className="text-base font-bold text-foreground">体育成绩录入</h3><p className="mt-0.5 text-xs text-muted-foreground">{getSemesterLabel()} · 按班级、性别统览体质健康成绩录入进度。</p></div></div>
      <Button type="button" onClick={openDrawer} className="h-10 rounded-xl px-4 shadow-[0_9px_18px_-12px_rgba(63,81,188,0.82)]"><Plus className="size-4" />{task ? "调整录入任务" : "发布成绩录入"}</Button>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ProgressMetric label="任务状态" value={task ? "已发布" : "待发布"} description={task ? `${task.classIds.length} 个班级纳入本次录入` : "发布后通知对应体育教师"} />
      <ProgressMetric label="录入进度" value={`${progress}%`} description={`已上传 ${uploadedFiles} / ${totalFiles} 份成绩文件`} />
      <ProgressMetric label="已录入成绩" value={`${uploadedRows}`} description="按已上传文件的成绩条数统计" />
      <ProgressMetric label="待上传文件" value={`${Math.max(totalFiles - uploadedFiles, 0)}`} description={`${scopedClasses.filter((item) => !uploadMap.has(`${item.id}:male`) || !uploadMap.has(`${item.id}:female`)).length} 个班级尚未完成`} />
    </div>

    <section className="rounded-2xl border border-[#dce4fa] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(53,67,150,0.62)]">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-sm font-bold text-foreground">本学期体育成绩录入进度</h4><p className="mt-1 text-xs text-muted-foreground">{task ? `${task.semesterLabel} · 录入时间 ${task.startDate} 至 ${task.endDate}` : "尚未发布任务，以下展示本学期全部班级的录入情况。"}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{progress === 100 && totalFiles > 0 ? "全部完成" : `待完成 ${Math.max(totalFiles - uploadedFiles, 0)} 份`}</span></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e5e9f7]"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{scopedClasses.map((item) => { const male = uploadMap.has(`${item.id}:male`); const female = uploadMap.has(`${item.id}:female`); const done = Number(male) + Number(female); return <div key={item.id} className={cn("rounded-xl border px-3 py-2.5", done === 2 ? "border-[#d2ddfb] bg-[#f5f8ff]" : "border-[#e4e8f0] bg-[#fbfcfe]")}><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-foreground">{item.name}</span><span className="rounded-md bg-white px-1.5 py-0.5 text-xs font-bold text-primary">{done} / 2 份</span></div><p className="mt-1 text-xs text-muted-foreground">男生 {male ? "已录入" : "待上传"} · 女生 {female ? "已录入" : "待上传"}</p></div> })}</div>
    </section>

    <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
      <DialogContent className="fixed left-auto right-0 top-0 grid h-full max-h-full w-full max-w-md translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none rounded-l-2xl border-[#cbd7f7] bg-white p-0 shadow-[-18px_0_44px_-28px_rgba(53,67,150,0.5)] sm:max-w-md">
        <DialogHeader className="border-b border-[#dce4fa] border-t-4 border-t-primary bg-[#f7f9ff] p-5 pr-12"><DialogTitle className="flex items-center gap-2 text-lg"><span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground"><HeartPulse className="size-4" aria-hidden="true" /></span>{task ? "调整体育成绩录入任务" : "发布体育成绩录入任务"}</DialogTitle><DialogDescription>设置录入班级和时间范围，发布后可持续查看进度。</DialogDescription></DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain bg-[#fbfcff] p-5"><section className="rounded-2xl border border-[#dce4fa] bg-white p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-foreground">录入范围</p><p className="mt-1 text-xs text-muted-foreground">已选择 {classIds.length} 个班级，按男女生分别上传成绩文件。</p></div><Button type="button" variant="outline" size="sm" className="h-8 border-[#d5def7] bg-[#f8faff] text-primary" onClick={() => setClassIds(classIds.length === PE_CLASSES.length ? [] : PE_CLASS_IDS)}>{classIds.length === PE_CLASSES.length ? "清空全部" : "全选"}</Button></div><div className="mt-4"><MultiSelectDropdown label="录入班级" description="选择需要开展体质健康成绩录入的班级。" items={PE_CLASSES.map((item) => ({ id: item.id, name: item.name }))} selectedIds={classIds} onToggle={(id) => setClassIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} /></div></section><section className="rounded-2xl border border-[#dce4fa] bg-white p-4"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarClock className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-bold text-foreground">录入时间</p><p className="mt-0.5 text-xs text-muted-foreground">体育教师可在此时间段内导入或更新数据。</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="flex flex-col gap-1.5"><Label htmlFor="pe-start">开始日期 <span className="text-destructive">*</span></Label><Input id="pe-start" name="pe-start" autoComplete="off" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-10 rounded-xl border-[#d5def7] bg-[#fbfcff]" /></div><div className="flex flex-col gap-1.5"><Label htmlFor="pe-end">截止日期 <span className="text-destructive">*</span></Label><Input id="pe-end" name="pe-end" autoComplete="off" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-10 rounded-xl border-[#d5def7] bg-[#fbfcff]" /></div></div></section>{error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}</div>
        <DialogFooter className="mx-0 mb-0 border-t border-[#dce4fa] bg-white px-5 py-4"><Button type="button" variant="outline" className="border-[#d5def7] bg-white" onClick={() => setDrawerOpen(false)}>取消</Button><Button type="button" onClick={publish} className="shadow-[0_9px_18px_-12px_rgba(63,81,188,0.82)]"><Send className="size-4" />发布任务</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}

function ProgressMetric({ label, value, description }: { label: string; value: string; description: string }) {
  return <div className="rounded-2xl border border-[#dce4fa] bg-[#f7f9ff] p-3.5 text-primary shadow-[0_10px_22px_-24px_rgba(53,67,150,0.56)]"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
}

const fieldClass = "h-10 rounded-xl border-[#d8e0f7] bg-white shadow-none focus-visible:border-primary/60 focus-visible:ring-primary/15"

function FormSection({ icon: Icon, title, description, children }: { icon: typeof FileSpreadsheet; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#dce4fa] bg-[#f7f9ff] p-3.5"><div className="flex items-start gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-bold text-foreground">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div></div><div className="mt-3">{children}</div></section>
}

function ChoiceButton({ active, onClick, children, description }: { active: boolean; onClick: () => void; children: React.ReactNode; description?: string }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn("flex min-h-10 flex-col justify-center rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", active ? "border-primary/55 bg-primary/10 text-primary" : "border-[#dce3f8] bg-white text-muted-foreground hover:border-primary/35 hover:bg-primary/[0.03]")}><span>{children}</span>{description && <span className="mt-0.5 text-[11px] font-normal text-muted-foreground">{description}</span>}</button>
}

function RuleEditor({ className, rules, setRules, thresholdLabel, placeholder, mode = "point" }: { className?: string; rules: ConversionRule[]; setRules: (rules: ConversionRule[]) => void; thresholdLabel: string; placeholder: string; mode?: "point" | "range" }) {
  const update = (index: number, key: keyof ConversionRule, value: string) => setRules(rules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, [key]: value } : rule))
  const addRule = () => setRules([...rules, mode === "range" ? { label: "", rangeStart: "", rangeEnd: "" } : { label: "", threshold: "" }])
  return <div className={cn("rounded-xl border border-[#d8e0f7] bg-[#fbfcff] p-2.5", className)}><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-foreground">等第换算规则</p>{mode === "range" && <p className="mt-0.5 text-xs text-muted-foreground">每个等第对应一个连续区间，起始值不得大于结束值。</p>}</div><Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-primary" onClick={addRule}><Plus className="size-3" aria-hidden="true" />添加</Button></div><div className="mt-2 flex flex-col gap-1.5">{rules.map((rule, index) => mode === "range" ? <div key={index} className="grid grid-cols-[minmax(0,1fr)_78px_78px_32px] gap-1.5"><Input aria-label="等第名称" name={`conversion-label-${index}`} autoComplete="off" value={rule.label} onChange={(event) => update(index, "label", event.target.value)} placeholder={placeholder} className="h-8 rounded-lg border-[#d8e0f7] bg-white text-xs" /><Input aria-label={`${thresholdLabel}起始值`} name={`conversion-range-start-${index}`} autoComplete="off" type="number" inputMode="decimal" min={0} max={thresholdLabel === "百分比" ? 100 : undefined} value={rule.rangeStart ?? ""} onChange={(event) => update(index, "rangeStart", event.target.value)} placeholder="起始" className="h-8 rounded-lg border-[#d8e0f7] bg-white px-2 text-xs" /><Input aria-label={`${thresholdLabel}结束值`} name={`conversion-range-end-${index}`} autoComplete="off" type="number" inputMode="decimal" min={0} max={thresholdLabel === "百分比" ? 100 : undefined} value={rule.rangeEnd ?? ""} onChange={(event) => update(index, "rangeEnd", event.target.value)} placeholder="结束" className="h-8 rounded-lg border-[#d8e0f7] bg-white px-2 text-xs" /><Button type="button" variant="ghost" size="icon-sm" aria-label="删除换算规则" disabled={rules.length === 1} onClick={() => setRules(rules.filter((_, ruleIndex) => ruleIndex !== index))}><Trash2 className="size-3.5" /></Button></div> : <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px] gap-1.5"><Input aria-label="等第名称" name={`conversion-label-${index}`} autoComplete="off" value={rule.label} onChange={(event) => update(index, "label", event.target.value)} placeholder={placeholder} className="h-8 rounded-lg border-[#d8e0f7] bg-white text-xs" /><Input aria-label={thresholdLabel} name={`conversion-threshold-${index}`} autoComplete="off" type="number" inputMode="decimal" value={rule.threshold ?? ""} onChange={(event) => update(index, "threshold", event.target.value)} placeholder={thresholdLabel} className="h-8 rounded-lg border-[#d8e0f7] bg-white text-xs" /><Button type="button" variant="ghost" size="icon-sm" aria-label="删除换算规则" disabled={rules.length === 1} onClick={() => setRules(rules.filter((_, ruleIndex) => ruleIndex !== index))}><Trash2 className="size-3.5" /></Button></div>)}</div></div>
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={cn("relative flex h-8 w-13 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", checked ? "bg-primary" : "bg-[#cbd3e9]")}><span className={cn("size-6 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0")} /></button>
}

function AutomaticSettings({ tasks, items, setItems, convertResult, setConvertResult, conversionMode, setConversionMode, rules, setRules }: { tasks: ScoreEntryTask[]; items: CalculationItem[]; setItems: (items: CalculationItem[]) => void; convertResult: boolean; setConvertResult: (value: boolean) => void; conversionMode: ConversionMode; setConversionMode: (mode: ConversionMode) => void; rules: ConversionRule[]; setRules: (rules: ConversionRule[]) => void }) {
  const addItem = () => { const first = tasks.find((task) => !items.some((item) => item.sourceId === task.id)); if (first) setItems([...items, { sourceId: first.id, weight: "" }]) }
  const taskLabel = (task: ScoreEntryTask, index: number) => `${task.scoreName}（任务 ${index + 1}）`
  return <div className="mt-3 rounded-xl border border-[#dce4fa] bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-foreground">计算来源与权重</p><p className="mt-0.5 text-xs text-muted-foreground">从本学期已发布的教师录入成绩中选择。</p></div><Button type="button" variant="outline" size="sm" className="border-[#d8e0f7] bg-[#fbfcff]" onClick={addItem} disabled={items.length >= tasks.length}><Plus className="size-3.5" aria-hidden="true" />添加成绩</Button></div><div className="mt-3 flex flex-col gap-2">{items.map((item, index) => <div key={`${item.sourceId}-${index}`} className="grid grid-cols-[minmax(0,1fr)_92px_32px] items-center gap-2 rounded-xl border border-[#e1e6f7] bg-[#fbfcff] p-2"><Select value={tasks.findIndex((task) => task.id === item.sourceId) >= 0 ? taskLabel(tasks[tasks.findIndex((task) => task.id === item.sourceId)], tasks.findIndex((task) => task.id === item.sourceId)) : ""} onValueChange={(value) => setItems(items.map((current, currentIndex) => currentIndex === index ? { ...current, sourceId: tasks.find((task, taskIndex) => taskLabel(task, taskIndex) === value)?.id ?? "" } : current))}><SelectTrigger aria-label="选择计算来源成绩" size="sm" className="min-w-0 rounded-lg px-2 text-xs"><SelectValue placeholder="请选择成绩" /></SelectTrigger><SelectContent>{tasks.map((task, taskIndex) => <SelectItem key={task.id} value={taskLabel(task, taskIndex)} disabled={task.id !== item.sourceId && items.some((current, currentIndex) => currentIndex !== index && current.sourceId === task.id)}>{taskLabel(task, taskIndex)}</SelectItem>)}</SelectContent></Select><Input aria-label="所占权重" name={`calculation-weight-${index}`} autoComplete="off" type="number" inputMode="numeric" min={1} max={100} value={item.weight} onChange={(event) => setItems(items.map((current, currentIndex) => currentIndex === index ? { ...current, weight: event.target.value } : current))} placeholder="权重%" className="h-8 rounded-lg border-[#d8e0f7] bg-white px-2 text-xs" /><Button type="button" variant="ghost" size="icon-sm" aria-label="删除计算成绩" disabled={items.length === 1} onClick={() => setItems(items.filter((_, currentIndex) => currentIndex !== index))}><Trash2 className="size-3.5" /></Button></div>)}</div><p className="mt-2 text-right text-xs text-muted-foreground">权重合计：<span className={cn("font-bold", items.reduce((total, item) => total + Number(item.weight || 0), 0) === 100 ? "text-brand-green" : "text-brand-orange")}>{items.reduce((total, item) => total + Number(item.weight || 0), 0)}%</span></p><div className="mt-3 rounded-xl border border-[#dce4fa] bg-[#f7f9ff] p-2.5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-foreground">计算结果转换等第</p><p className="mt-0.5 text-xs text-muted-foreground">按分数区间或年级排名百分比区间生成等第。</p></div><ToggleSwitch checked={convertResult} onChange={() => setConvertResult(!convertResult)} label="计算结果转换等第" /></div>{convertResult && <div className="mt-3"><div className="grid grid-cols-2 gap-2"><ChoiceButton active={conversionMode === "score"} onClick={() => setConversionMode("score")}>按分数段转换</ChoiceButton><ChoiceButton active={conversionMode === "rank"} onClick={() => setConversionMode("rank")}>按年级排名百分比</ChoiceButton></div><RuleEditor className="mt-2" rules={rules} setRules={setRules} thresholdLabel={conversionMode === "score" ? "分数" : "百分比"} placeholder="如 优秀" mode="range" /></div>}</div></div>
}

function Metric({ label, value, tone = "text-foreground" }: { label: string; value: number; tone?: string }) {
  return <div><p className="text-[11px] text-muted-foreground">{label}</p><p className={cn("mt-1 text-lg font-bold", tone)}>{value}</p></div>
}
