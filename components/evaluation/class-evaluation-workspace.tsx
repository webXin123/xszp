"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  GripVertical,
  History,
  ImagePlus,
  Mic,
  Plus,
  ScanLine,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { INDICATOR_GROUPS, LEVEL1_LIST, formatDate } from "@/lib/scoring-utils"

type TargetMode = "class" | "student"
type MobileEvaluationStep = "selection" | "evaluation"

export function ClassEvaluationWorkspace() {
  const { grades, classes, students, records, addRecord } = useEvaluation()
  const { visibleGrades, scoringClasses } = usePermission()
  const availableGrades = visibleGrades.length > 0 ? visibleGrades : grades
  const availableClasses = scoringClasses.length > 0 ? scoringClasses : classes
  const workspaceRef = useRef<HTMLDivElement>(null)

  const [mode, setMode] = useState<TargetMode>("class")
  const [mobileStep, setMobileStep] = useState<MobileEvaluationStep>("selection")
  const [date, setDate] = useState(formatDate(new Date()))
  const [selectedClassId, setSelectedClassId] = useState(availableClasses[0]?.id ?? "")
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(availableClasses[0]?.id ? [availableClasses[0].id] : [])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [expandedGradeId, setExpandedGradeId] = useState(availableGrades[0]?.id ?? "")
  const [level1, setLevel1] = useState(LEVEL1_LIST[0] ?? "")
  const [indicatorSearch, setIndicatorSearch] = useState("")
  const [indicatorId, setIndicatorId] = useState(INDICATOR_GROUPS[0]?.items[0]?.id ?? "")
  const [note, setNote] = useState("")
  const [imageName, setImageName] = useState("")
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [splitWidth, setSplitWidth] = useState(44)
  const [isResizing, setIsResizing] = useState(false)
  const [toolOffset, setToolOffset] = useState({ x: 0, y: 0 })
  const [isToolDragging, setIsToolDragging] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolDragRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0 })
  const toolMovedRef = useRef(false)
  const [toast, setToast] = useState("")

  const currentClass = availableClasses.find((item) => item.id === selectedClassId) ?? availableClasses[0]
  const currentGroup = INDICATOR_GROUPS.find((group) => group.items.some((item) => item.id === indicatorId))
  const currentIndicator = currentGroup?.items.find((item) => item.id === indicatorId)
  const isAddIndicator = (currentIndicator?.penalty ?? -1) > 0
  const defaultScore = Math.abs(currentIndicator?.penalty ?? 0)
  const today = formatDate(new Date())
  const selectionCount = mode === "class" ? selectedClassIds.length : selectedStudentIds.length
  const selectionLabel = mode === "class" ? "班级" : "学生"

  const classStudents = useMemo(
    () => students.filter((student) => student.classId === currentClass?.id).sort((a, b) => Number(a.studentNo) - Number(b.studentNo)),
    [currentClass?.id, students],
  )

  const todayScores = useMemo(() => {
    const scoreMap = new Map<string, { add: number; deduct: number }>()
    students.forEach((student) => scoreMap.set(student.id, { add: 0, deduct: 0 }))
    records.filter((record) => record.date === today).forEach((record) => {
      const ids = record.studentIds?.length
        ? record.studentIds
        : students
          .filter((student) => student.classId === record.classId && record.studentNames.includes(student.name))
          .map((student) => student.id)
      ids.forEach((id) => {
        const score = scoreMap.get(id)
        if (!score) return
        if (record.totalDeduction > 0) score.add += record.totalDeduction
        if (record.totalDeduction < 0) score.deduct += Math.abs(record.totalDeduction)
      })
    })
    return scoreMap
  }, [records, students, today])

  const visibleGroups = useMemo(
    () => INDICATOR_GROUPS
      .filter((group) => group.level1 === level1)
      .filter((group) => !indicatorSearch.trim() || `${group.level2}${group.items.map((item) => item.name).join("")}`.includes(indicatorSearch.trim())),
    [indicatorSearch, level1],
  )

  const semesterRecords = useMemo(() => records
    .filter((record) => record.date.startsWith(String(new Date().getFullYear())))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12), [records])

  useEffect(() => {
    if (!isResizing) return
    const onMove = (event: PointerEvent) => {
      const rect = workspaceRef.current?.getBoundingClientRect()
      if (!rect) return
      const next = ((event.clientX - rect.left) / rect.width) * 100
      setSplitWidth(Math.min(62, Math.max(32, next)))
    }
    const onUp = () => setIsResizing(false)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    document.body.style.userSelect = "none"
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      document.body.style.userSelect = ""
    }
  }, [isResizing])

  useEffect(() => {
    const firstClassId = availableClasses[0]?.id ?? ""
    if (!availableClasses.some((item) => item.id === selectedClassId)) {
      setSelectedClassId(firstClassId)
    }
    setSelectedClassIds((current) => {
      const visibleIds = current.filter((id) => availableClasses.some((item) => item.id === id))
      return visibleIds.length > 0 ? visibleIds : firstClassId ? [firstClassId] : []
    })
  }, [availableClasses, selectedClassId])

  useEffect(() => {
    if (mode !== "class" || selectedClassIds.length === 0 || selectedClassIds.includes(selectedClassId)) return
    setSelectedClassId(selectedClassIds[0])
  }, [mode, selectedClassId, selectedClassIds])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 1800)
  }

  const selectClass = (id: string, includeInTargets = true) => {
    setSelectedClassId(id)
    setSelectedStudentIds([])
    if (includeInTargets) {
      setSelectedClassIds((current) => current.includes(id) ? current : [...current, id])
    }
  }

  const toggleClassSelection = (id: string) => {
    setSelectedClassIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    selectClass(id, false)
  }

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast("图片不能超过5MB")
      event.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageName(file.name)
      setImageDataUrl(typeof reader.result === "string" ? reader.result : null)
    }
    reader.onerror = () => showToast("图片读取失败，请重试")
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!currentClass || !currentIndicator) return
    if (mode === "class" && selectedClassIds.length === 0) return showToast("请选择班级")
    if (mode === "student" && selectedStudentIds.length === 0) return showToast("请选择学生")
    const numericAmount = defaultScore
    if (!numericAmount || numericAmount <= 0) return showToast("当前指标未配置默认分值")
    const targetClassIds = mode === "class" && selectedClassIds.length > 0 ? selectedClassIds : [currentClass.id]
    targetClassIds.forEach((classId) => addRecord({
      classId,
      date,
      level1: currentGroup?.level1 ?? level1,
      level2: currentGroup?.level2 ?? "",
      entries: [{ itemId: currentIndicator.id, count: 1 }],
      totalDeduction: isAddIndicator ? Math.abs(numericAmount) : -Math.abs(numericAmount),
      studentNames: selectedStudentIds.map((id) => students.find((student) => student.id === id)?.name ?? ""),
      note,
      imageDataUrl,
      scoreType: isAddIndicator ? "add" : "deduct",
      targetType: mode,
      indicatorId: currentIndicator.id,
      studentIds: selectedStudentIds,
      amount: Math.abs(numericAmount),
    }))
    setNote("")
    setImageName("")
    setImageDataUrl(null)
    showToast("已提交")
  }

  const panelStyle = { "--split-width": `${splitWidth}%` } as CSSProperties

  const startToolDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    toolMovedRef.current = false
    toolDragRef.current = { startX: event.clientX, startY: event.clientY, offsetX: toolOffset.x, offsetY: toolOffset.y }
    setIsToolDragging(true)
  }

  const moveTool = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isToolDragging) return
    if (Math.abs(event.clientX - toolDragRef.current.startX) > 4 || Math.abs(event.clientY - toolDragRef.current.startY) > 4) {
      toolMovedRef.current = true
    }
    setToolOffset({
      x: toolDragRef.current.offsetX + event.clientX - toolDragRef.current.startX,
      y: toolDragRef.current.offsetY + event.clientY - toolDragRef.current.startY,
    })
  }

  const endToolDrag = () => setIsToolDragging(false)

  const toggleToolMenu = () => {
    if (toolMovedRef.current) {
      toolMovedRef.current = false
      return
    }
    setToolsOpen((current) => !current)
  }

  return (
    <div className="relative flex flex-col gap-4 pb-24 lg:pb-0">
      <div className="flex min-w-0 items-center gap-3 overflow-x-auto rounded-2xl border border-[#d7def8] bg-white/95 p-2 shadow-[0_14px_30px_-25px_rgba(52,68,145,0.78)]" role="tablist" aria-label="班级评价页面">
        <div className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#eef1ff] p-1" aria-label="评价对象">
          {(["class", "student"] as TargetMode[]).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => setMode(item)} className={cn("min-h-10 touch-manipulation rounded-lg px-3.5 py-1.5 text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:px-4 md:text-[14px]", mode === item ? "bg-primary text-primary-foreground shadow-[0_6px_14px_-8px_rgba(63,81,188,0.9)]" : "text-muted-foreground hover:bg-white hover:text-foreground")}>{item === "class" ? "评价班级" : "评价学生"}</button>)}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <label className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[#e0e5f8] bg-[#f8f9ff] px-2.5">
            <CalendarDays className="size-4 text-brand-blue" aria-hidden="true" />
            <input aria-label="评价日期" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} className="w-28 bg-transparent text-xs font-semibold outline-none" />
          </label>
          <Button variant="outline" className="size-10 shrink-0 rounded-lg border-[#e0e5f8] bg-[#f8f9ff] p-0 hover:border-primary/35 hover:bg-primary/5" onClick={() => setHistoryOpen(true)} aria-label="查看历史扣分记录" title="历史记录"><History className="size-4" /></Button>
        </div>
      </div>

      <div ref={workspaceRef} style={panelStyle} className="flex min-h-[520px] flex-col overflow-hidden rounded-[24px] border border-[#cfd7f6] bg-white shadow-[0_22px_48px_-32px_rgba(48,62,139,0.7)] lg:flex-row">
        <aside className={cn("min-h-0 w-full shrink-0 bg-[#f7f8ff] p-3 lg:w-[var(--split-width)]", mobileStep === "selection" ? "flex" : "hidden", "lg:flex")}>
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-white/80 px-3 py-2 lg:hidden">
            <div><p className="text-sm font-bold">选择{selectionLabel}</p><p className="mt-0.5 text-[11px] text-muted-foreground">选好后进入评价面板</p></div>
            <span className="rounded-full bg-brand-green/12 px-2.5 py-1 text-xs font-semibold text-brand-green">已选 {selectionCount} {selectionLabel}</span>
          </div>
          {mode === "student" ? (
            <div className="flex flex-col">
              <div className="mb-3 flex items-center gap-2">
                <Select value={currentClass?.name ?? ""} onValueChange={(value) => selectClass(availableClasses.find((item) => item.name === value)?.id ?? "")}><SelectTrigger aria-label="选择班级" className="h-9 min-w-0 flex-1 rounded-lg bg-white px-2.5 text-sm font-semibold"><SelectValue placeholder="请选择班级" /></SelectTrigger><SelectContent>{availableClasses.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div
                className="grid content-start gap-1.5 pr-1"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))" }}
              >
                {classStudents.map((student) => {
                  const selected = selectedStudentIds.includes(student.id)
                  const score = todayScores.get(student.id) ?? { add: 0, deduct: 0 }
                  return <button key={student.id} type="button" aria-pressed={selected} onClick={() => toggleStudent(student.id)} className={cn("group relative flex h-[60px] items-center justify-between rounded-xl border px-2.5 text-left transition-colors", selected ? "border-primary/55 bg-primary/[0.10] shadow-[0_7px_16px_-13px_rgba(69,83,183,0.85)]" : "border-[#e0e5f7] bg-white hover:border-primary/45 hover:bg-primary/[0.035]")}>
                    <span className="flex min-w-0 flex-col"><span className="text-[10px] font-bold leading-3 text-[#6f8a82]">{student.studentNo}</span><span className="mt-0.5 truncate text-xs font-bold leading-4 tracking-tight text-foreground">{student.name}</span></span>
                    <span className="ml-1 flex shrink-0 flex-col gap-0.5 text-right text-[11px] font-bold leading-3.5"><span className="text-[#12824C]">+ {score.add || 0}</span><span className="text-[#C54B46]">− {score.deduct || 0}</span></span>
                    {selected && <span className="absolute left-2 top-2 flex size-4 items-center justify-center rounded-full bg-[#1685F8] text-primary-foreground"><Check className="size-2.5" /></span>}
                  </button>
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="mb-2 flex items-center px-1"><span className="text-sm font-bold">班级</span></div>
              <div className="pr-1">
                {availableGrades.map((grade) => {
                  const gradeClasses = availableClasses.filter((item) => item.gradeId === grade.id)
                  const expanded = expandedGradeId === grade.id
                  return <div key={grade.id}><button type="button" onClick={() => setExpandedGradeId(expanded ? "" : grade.id)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold hover:bg-accent/60">{expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}<span>{grade.name}</span></button>{expanded && <div className="ml-3 border-l border-border/70 pl-2">{gradeClasses.map((item) => <div key={item.id} className={cn("flex items-center gap-2 rounded-lg px-2 py-2", selectedClassId === item.id && "bg-primary/10")}><input type="checkbox" aria-label={`选择${item.name}`} checked={selectedClassIds.includes(item.id)} onChange={() => toggleClassSelection(item.id)} className="size-4 accent-[var(--primary)]" /><button type="button" onClick={() => selectClass(item.id)} className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-primary">{item.name}</button></div>)}</div>}</div>
                })}
              </div>
            </div>
          )}
        </aside>

        <div
          role="separator"
          aria-label="拖动调整学生面板宽度"
          aria-orientation="vertical"
          aria-valuemin={32}
          aria-valuemax={62}
          aria-valuenow={Math.round(splitWidth)}
          tabIndex={0}
          onPointerDown={(event) => { event.preventDefault(); setIsResizing(true) }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault()
              setSplitWidth((current) => Math.max(32, current - 2))
            }
            if (event.key === "ArrowRight") {
              event.preventDefault()
              setSplitWidth((current) => Math.min(62, current + 2))
            }
          }}
          className={cn("relative hidden w-4 shrink-0 cursor-col-resize touch-none items-center justify-center border-x border-[#dde3f8] bg-[#f4f6ff] lg:flex", isResizing && "bg-primary/10")}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
          <span className="relative flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm"><GripVertical className="size-4" /></span>
        </div>

        <section className={cn("min-w-0 flex-1 border-t border-[#dde3f8] bg-white p-3 lg:border-t-0 lg:p-4", mobileStep === "evaluation" ? "block" : "hidden", "lg:block")}>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-2 lg:hidden">
            <button type="button" onClick={() => setMobileStep("selection")} className="inline-flex min-h-9 items-center rounded-lg border border-primary/20 bg-white px-3 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">返回选择{selectionLabel}</button>
            <span className="text-xs text-muted-foreground">已选 {selectionCount} {selectionLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-[#edf0fb] pb-3">
            <div><span className="text-sm font-bold">评价面板</span><p className="mt-0.5 text-[11px] text-muted-foreground">选择指标后录入本次评价</p></div>
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {LEVEL1_LIST.map((item) => <button key={item} type="button" onClick={() => setLevel1(item)} className={cn("min-h-10 shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors", item === level1 ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_14px_-10px_rgba(63,81,188,0.9)]" : "border-[#e2e6f8] bg-[#f8f9ff] text-muted-foreground hover:border-primary/35 hover:bg-primary/[0.04] hover:text-foreground")}>{item}</button>)}
            <label className="ml-auto flex h-10 w-36 shrink-0 items-center gap-1.5 rounded-lg border border-[#e2e6f8] bg-[#f8f9ff] px-2"><Search className="size-3.5 text-muted-foreground" /><input aria-label="搜索指标" value={indicatorSearch} onChange={(event) => setIndicatorSearch(event.target.value)} placeholder="搜索指标" className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
          </div>

          <div className="mt-4 flex min-h-[360px] flex-col gap-2 pr-1">
            {visibleGroups.map((group) => <div key={`${group.level1}-${group.level2}`} className="rounded-xl border border-[#e1e6f8] bg-[#fafbff] p-2.5"><div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />{group.level2}</div><div className="grid gap-1.5 sm:grid-cols-2">{group.items.map((item) => { const active = item.id === indicatorId; const isAdd = item.penalty > 0; return <button key={item.id} type="button" onClick={() => setIndicatorId(item.id)} className={cn("flex min-h-12 items-center justify-between gap-2 rounded-lg border px-2.5 text-left text-xs transition-colors", active ? "border-primary bg-primary/10 text-primary" : "border-[#e4e8f8] bg-white text-foreground hover:border-primary/40 hover:bg-primary/[0.03]")}><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{item.name}</span><span className={cn("mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold", isAdd ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>{isAdd ? "加分" : "扣分"} · {isAdd ? "+" : "−"}{Math.abs(item.penalty)} 分</span></span>{active && <Check className="size-3.5 shrink-0" />}</button> })}</div></div>)}
          </div>

          <div className="mt-5 rounded-2xl border border-primary/25 bg-[#f1f3ff] p-3 shadow-[0_12px_24px_-24px_rgba(57,72,170,0.9)]">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold">{currentIndicator?.name ?? "请选择指标"}</span><span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", isAddIndicator ? "bg-brand-green/15 text-brand-green" : "bg-brand-orange/15 text-brand-orange")}>{isAddIndicator ? "加分" : "扣分"}</span></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[148px_1fr]"><div className="flex h-10 items-center justify-between rounded-lg border border-primary/20 bg-white px-2.5"><span className="text-[11px] font-semibold text-muted-foreground">单次默认分值</span><span className={cn("text-sm font-black", isAddIndicator ? "text-emerald-700" : "text-rose-700")}>{isAddIndicator ? "+" : "−"}{defaultScore} 分</span></div><label className="flex h-10 items-center rounded-lg border border-border/70 bg-white px-2.5"><input aria-label="评价备注" value={note} onChange={(event) => setNote(event.target.value)} placeholder="填写评价备注…" className="w-full bg-transparent text-sm outline-none" /></label></div>
            {mode === "student" && selectedStudentIds.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{selectedStudentIds.map((id) => { const student = students.find((item) => item.id === id); return <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{student?.name}<button type="button" onClick={() => toggleStudent(id)} aria-label={`移除${student?.name}`}><X className="size-3" /></button></span> })}</div>}
            <div className="mt-3 flex flex-wrap items-center gap-2"><label className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-[#cfd8f4] bg-white p-2 transition hover:border-primary/55 hover:bg-primary/[0.025] focus-within:ring-2 focus-within:ring-primary/30"><span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">{imageDataUrl ? <img src={imageDataUrl} alt="已上传的评价图片缩略图" width={36} height={36} className="size-full object-cover" /> : <ImagePlus aria-hidden="true" className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-foreground">{imageName || "上传评价图片"}</span><span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">支持 JPG、PNG，大小不超过 5MB</span></span><span className="rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{imageDataUrl ? "已上传" : "选择图片"}</span><input type="file" accept="image/*" className="sr-only" onChange={handleImageChange} /></label>{imageDataUrl && <button type="button" onClick={() => { setImageName(""); setImageDataUrl(null) }} className="h-10 rounded-lg border border-border/70 bg-white px-2.5 text-xs font-semibold text-muted-foreground transition hover:border-destructive/30 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">移除</button>}<Button type="button" className="h-10 gap-1.5 rounded-lg px-4 text-xs" onClick={handleSubmit}><Check className="size-3.5" />确认评价</Button></div>
          </div>
        </section>
      </div>

      <div className={cn("fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-[#d7def4] bg-white/96 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-16px_34px_-24px_rgba(44,63,132,.7)] backdrop-blur-xl lg:hidden", mobileStep !== "selection" && "hidden")}>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-green">已选 {selectionCount} {selectionLabel}</span>
        <Button type="button" disabled={selectionCount === 0} onClick={() => setMobileStep("evaluation")} className="min-h-12 shrink-0 rounded-xl px-5 text-sm font-bold shadow-[0_10px_20px_-14px_rgba(44,99,196,.8)]">下一步：评价{selectionLabel}</Button>
      </div>

      <div
        role="group"
        aria-label="评价辅助工具"
        style={{ transform: `translate3d(${toolOffset.x}px, ${toolOffset.y}px, 0)` }}
        className={cn("absolute bottom-12 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-14 sm:right-5", isToolDragging && "cursor-grabbing")}
      >
        {toolsOpen && <div className="w-52 rounded-2xl border border-[#d8dff8] bg-white p-2.5 shadow-[0_20px_40px_-24px_rgba(52,68,152,0.58)]">
          <div className="mb-2 flex items-center justify-between px-1"><span className="text-xs font-bold text-foreground">快捷评价</span><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">选择方式</span></div>
          <div className="space-y-1.5">
            <Button type="button" variant="outline" className="h-12 w-full justify-start gap-2.5 rounded-xl border-transparent bg-[#f3f5ff] px-2.5 text-xs font-semibold text-foreground hover:border-primary/20 hover:bg-primary/[0.10]" onClick={() => showToast("OCR识别完成")} title="OCR识别"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><ScanLine aria-hidden="true" className="size-4" /></span><span className="flex flex-col items-start"><span>OCR识别</span><span className="mt-0.5 text-[10px] font-normal text-muted-foreground">识别图片中的评价内容</span></span></Button>
            <Button type="button" variant="outline" className="h-12 w-full justify-start gap-2.5 rounded-xl border-transparent bg-[#f2fbf7] px-2.5 text-xs font-semibold text-foreground hover:border-emerald-200 hover:bg-emerald-50" onClick={() => showToast("Excel导入已就绪")} title="Excel录入"><span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><FileSpreadsheet aria-hidden="true" className="size-4" /></span><span className="flex flex-col items-start"><span>Excel录入</span><span className="mt-0.5 text-[10px] font-normal text-muted-foreground">批量导入评价数据</span></span></Button>
            <Button type="button" variant="outline" className="h-12 w-full justify-start gap-2.5 rounded-xl border-transparent bg-[#fff7ef] px-2.5 text-xs font-semibold text-foreground hover:border-orange-200 hover:bg-orange-50" onClick={() => showToast("正在聆听")} title="语音评价"><span className="flex size-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600"><Mic aria-hidden="true" className="size-4" /></span><span className="flex flex-col items-start"><span>语音评价</span><span className="mt-0.5 text-[10px] font-normal text-muted-foreground">语音转为评价记录</span></span></Button>
          </div>
        </div>}
        <Button
          type="button"
          aria-label={toolsOpen ? "收起评价辅助工具" : "展开评价辅助工具"}
          aria-expanded={toolsOpen}
          onClick={toggleToolMenu}
          onPointerDown={startToolDrag}
          onPointerMove={moveTool}
          onPointerUp={endToolDrag}
          onPointerCancel={endToolDrag}
          className="size-13 cursor-grab touch-none select-none rounded-2xl border border-white/70 bg-primary p-0 text-primary-foreground shadow-[0_16px_30px_-13px_rgba(54,70,169,0.68)] hover:bg-primary/90"
          title="点击展开工具，拖动调整位置"
        >
          {toolsOpen ? <X aria-hidden="true" className="size-5" /> : <Plus aria-hidden="true" className="size-6" />}
        </Button>
      </div>

      {toast && <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-xl">{toast}</div>}

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="glass-surface max-h-[80vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>历史扣分记录</DialogTitle></DialogHeader><div className="rounded-xl border border-border/60 bg-background/25">{semesterRecords.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">暂无记录</p> : semesterRecords.map((record) => <div key={record.id} className="flex flex-wrap items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0"><span className="w-24 text-xs text-muted-foreground">{record.date}</span><span className="flex-1 text-sm">{record.level1} / {record.level2}</span><span className={cn("font-bold", record.totalDeduction > 0 ? "text-brand-green" : "text-brand-orange")}>{record.totalDeduction > 0 ? "+" : ""}{record.totalDeduction}</span></div>)}</div></DialogContent>
      </Dialog>
    </div>
  )
}
