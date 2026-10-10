"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  GripVertical,
  History,
  ImagePlus,
  Mic,
  Plus,
  ScanLine,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { INDICATOR_GROUPS, LEVEL1_LIST, formatDate } from "@/lib/scoring-utils"
import { useDraggableFab } from "@/components/ui/use-draggable-fab"
import { VoiceActionDialog } from "@/components/evaluation/voice-action-dialog"

type MobileEvaluationStep = "selection" | "evaluation"
const historyTimeFormatter = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" })

function formatHistoryTime(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : historyTimeFormatter.format(parsed)
}

export function ClassEvaluationWorkspace() {
  const { grades, classes, students, records, addRecord, removeRecord } = useEvaluation()
  const { role, visibleGrades, scoringClasses } = usePermission()
  const canEvaluateAllStudents = role === "homeroom" || role === "subject"
  const availableGrades = canEvaluateAllStudents ? grades : visibleGrades.length > 0 ? visibleGrades : grades
  const availableClasses = canEvaluateAllStudents ? classes : scoringClasses.length > 0 ? scoringClasses : classes
  const canSeeAllHistory = role === "director" || role === "moral_director"
  const historyAvailableGrades = canSeeAllHistory ? grades : availableGrades
  const historyAvailableClasses = canSeeAllHistory ? classes : availableClasses
  const workspaceRef = useRef<HTMLDivElement>(null)

  const [mobileStep, setMobileStep] = useState<MobileEvaluationStep>("selection")
  const [date, setDate] = useState(formatDate(new Date()))
  const [selectedClassId, setSelectedClassId] = useState(availableClasses[0]?.id ?? "")
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [expandedGradeId, setExpandedGradeId] = useState(availableGrades[0]?.id ?? "")
  const [expandedClassIds, setExpandedClassIds] = useState<string[]>([])
  const [collapsedSearchGradeIds, setCollapsedSearchGradeIds] = useState<string[]>([])
  const [collapsedSearchClassIds, setCollapsedSearchClassIds] = useState<string[]>([])
  const [treeSearch, setTreeSearch] = useState("")
  const [level1, setLevel1] = useState(LEVEL1_LIST[0] ?? "")
  const [indicatorSearch, setIndicatorSearch] = useState("")
  const [indicatorId, setIndicatorId] = useState(INDICATOR_GROUPS[0]?.items[0]?.id ?? "")
  const [note, setNote] = useState("")
  const [imageName, setImageName] = useState("")
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyStartDate, setHistoryStartDate] = useState(formatDate(new Date()))
  const [historyEndDate, setHistoryEndDate] = useState(formatDate(new Date()))
  const [historyGradeId, setHistoryGradeId] = useState("all")
  const [historyClassId, setHistoryClassId] = useState("all")
  const [historyPage, setHistoryPage] = useState(1)
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null)
  const [splitWidth, setSplitWidth] = useState(38)
  const [isResizing, setIsResizing] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const {
    offset: toolOffset,
    dragging: isToolDragging,
    consumeClick: consumeToolDragClick,
    onPointerDown: startToolDrag,
    onPointerMove: moveTool,
    onPointerUp: endToolDrag,
  } = useDraggableFab({ size: 52, mobileBottom: 88 })
  const [toast, setToast] = useState("")

  const currentClass = availableClasses.find((item) => item.id === selectedClassId) ?? availableClasses[0]
  const currentGroup = INDICATOR_GROUPS.find((group) => group.items.some((item) => item.id === indicatorId))
  const currentIndicator = currentGroup?.items.find((item) => item.id === indicatorId)
  const voiceIndicator = INDICATOR_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, level1: group.level1, level2: group.level2 }))).find((item) => item.id === "jj-1")
  const isAddIndicator = (currentIndicator?.penalty ?? -1) > 0
  const defaultScore = Math.abs(currentIndicator?.penalty ?? 0)
  const today = formatDate(new Date())
  const selectionCount = selectedClassIds.length + selectedStudentIds.length
  const selectedClassCount = selectedClassIds.length
  const selectedStudentCount = selectedStudentIds.length
  const selectionSummary = selectedClassCount > 0 && selectedStudentCount > 0
    ? `已选 ${selectedClassCount} 个班级、${selectedStudentCount} 位学生`
    : selectedClassCount > 0
      ? `已选 ${selectedClassCount} 个班级`
      : selectedStudentCount > 0
        ? `已选 ${selectedStudentCount} 位学生`
        : "尚未选择评价对象"
  const normalizedTreeSearch = treeSearch.trim().toLocaleLowerCase("zh-CN")

  const studentsByClass = useMemo(
    () => new Map(availableClasses.map((schoolClass) => [
      schoolClass.id,
      students
        .filter((student) => student.classId === schoolClass.id)
        .sort((a, b) => Number(a.studentNo) - Number(b.studentNo)),
    ])),
    [availableClasses, students],
  )
  const treeMatchingClassIds = useMemo(() => {
    if (!normalizedTreeSearch) return new Set(availableClasses.map((schoolClass) => schoolClass.id))
    return new Set(availableClasses.filter((schoolClass) => {
      if (schoolClass.name.toLocaleLowerCase("zh-CN").includes(normalizedTreeSearch)) return true
      return (studentsByClass.get(schoolClass.id) ?? []).some((student) =>
        `${student.name} ${student.studentNo}`.toLocaleLowerCase("zh-CN").includes(normalizedTreeSearch),
      )
    }).map((schoolClass) => schoolClass.id))
  }, [availableClasses, normalizedTreeSearch, studentsByClass])

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

  const historyClasses = useMemo(
    () => historyGradeId === "all" ? historyAvailableClasses : historyAvailableClasses.filter((item) => item.gradeId === historyGradeId),
    [historyAvailableClasses, historyGradeId],
  )
  const filteredHistoryRecords = useMemo(() => records
    .filter((record) => record.date >= historyStartDate && record.date <= historyEndDate)
    .filter((record) => historyAvailableClasses.some((item) => item.id === record.classId))
    .filter((record) => historyClassId === "all" || record.classId === historyClassId)
    .filter((record) => historyGradeId === "all" || classes.find((item) => item.id === record.classId)?.gradeId === historyGradeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  [classes, historyAvailableClasses, historyClassId, historyEndDate, historyGradeId, historyStartDate, records])
  const historyPageSize = 8
  const historyPageCount = Math.max(1, Math.ceil(filteredHistoryRecords.length / historyPageSize))
  const pageHistoryRecords = filteredHistoryRecords.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)

  useEffect(() => {
    setHistoryPage(1)
    setDeleteRecordId(null)
  }, [historyStartDate, historyEndDate, historyGradeId, historyClassId])

  useEffect(() => {
    if (historyClassId !== "all" && !historyClasses.some((item) => item.id === historyClassId)) setHistoryClassId("all")
  }, [historyClassId, historyClasses])

  useEffect(() => {
    setCollapsedSearchGradeIds([])
    setCollapsedSearchClassIds([])
  }, [normalizedTreeSearch])

  useEffect(() => {
    if (!isResizing) return
    const onMove = (event: PointerEvent) => {
      const rect = workspaceRef.current?.getBoundingClientRect()
      if (!rect) return
      const next = ((event.clientX - rect.left) / rect.width) * 100
      setSplitWidth(Math.min(46, Math.max(28, next)))
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
      const next = current.filter((id) => availableClasses.some((item) => item.id === id))
      return next.length === current.length ? current : next
    })
    setSelectedStudentIds((current) => {
      const next = current.filter((id) => {
        const student = students.find((item) => item.id === id)
        return student && availableClasses.some((item) => item.id === student.classId)
      })
      return next.length === current.length ? current : next
    })
  }, [availableClasses, selectedClassId, students])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 1800)
  }

  const selectClass = (id: string) => {
    setSelectedClassId(id)
  }

  const toggleClassSelection = (id: string) => {
    setSelectedClassIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    setSelectedStudentIds((current) => current.filter((studentId) => students.find((student) => student.id === studentId)?.classId !== id))
    selectClass(id)
  }

  const toggleStudent = (id: string) => {
    const student = students.find((item) => item.id === id)
    if (!student) return
    setSelectedClassId(student.classId)
    setSelectedClassIds((current) => current.filter((classId) => classId !== student.classId))
    setSelectedStudentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const toggleClassExpansion = (id: string, searchExpanded = false) => {
    setSelectedClassId(id)
    if (searchExpanded) {
      setExpandedClassIds((current) => current.filter((item) => item !== id))
      setCollapsedSearchClassIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
      return
    }
    setExpandedClassIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const clearSelection = () => {
    setSelectedClassIds([])
    setSelectedStudentIds([])
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
    if (selectionCount === 0) return showToast("请在左侧选择班级或学生")
    const numericAmount = defaultScore
    if (!numericAmount || numericAmount <= 0) return showToast("当前指标未配置默认分值")
    const studentTargets = new Map<string, string[]>()
    selectedStudentIds.forEach((studentId) => {
      const student = students.find((item) => item.id === studentId)
      if (!student) return
      const group = studentTargets.get(student.classId) ?? []
      group.push(studentId)
      studentTargets.set(student.classId, group)
    })
    const targets = [
      ...selectedClassIds.map((classId) => ({ classId, studentIds: [] as string[], targetType: "class" as const })),
      ...Array.from(studentTargets, ([classId, studentIds]) => ({ classId, studentIds, targetType: "student" as const })),
    ]
    targets.forEach(({ classId, studentIds, targetType }) => addRecord({
      classId,
      date,
      level1: currentGroup?.level1 ?? level1,
      level2: currentGroup?.level2 ?? "",
      entries: [{ itemId: currentIndicator.id, count: 1 }],
      totalDeduction: isAddIndicator ? Math.abs(numericAmount) : -Math.abs(numericAmount),
      studentNames: studentIds.map((id) => students.find((student) => student.id === id)?.name ?? ""),
      note,
      imageDataUrl,
      scoreType: isAddIndicator ? "add" : "deduct",
      targetType,
      indicatorId: currentIndicator.id,
      studentIds,
      amount: Math.abs(numericAmount),
    }))
    setNote("")
    setImageName("")
    setImageDataUrl(null)
    showToast("已提交")
  }

  const handleVoiceEvaluation = () => {
    if (!currentClass || !voiceIndicator) return
    addRecord({
      classId: currentClass.id,
      date,
      level1: voiceIndicator.level1,
      level2: voiceIndicator.level2,
      entries: [{ itemId: voiceIndicator.id, count: 1 }],
      totalDeduction: -Math.abs(voiceIndicator.penalty),
      studentNames: [],
      note: "语音评价演示",
      imageDataUrl: null,
      scoreType: "deduct",
      targetType: "class",
      indicatorId: voiceIndicator.id,
      studentIds: [],
      amount: Math.abs(voiceIndicator.penalty),
    })
    setVoiceOpen(false)
    showToast("班级评价已提交")
  }

  const panelStyle = { "--split-width": `${splitWidth}%` } as CSSProperties

  const toggleToolMenu = () => {
    if (consumeToolDragClick()) return
    setToolsOpen((current) => !current)
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-2rem)] flex-col gap-4 pb-24 sm:min-h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-3.5rem)] lg:min-h-[calc(100dvh-3.5rem)] lg:pb-0">
      <div ref={workspaceRef} style={panelStyle} className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-[24px] border border-[#cfd7f6] bg-white shadow-[0_22px_48px_-32px_rgba(48,62,139,0.7)] lg:h-[calc(100dvh-3.5rem)] lg:flex-row">
        <aside className={cn("min-h-0 w-full shrink-0 bg-[#f7f8ff] p-3 lg:w-[var(--split-width)]", mobileStep === "selection" ? "flex" : "hidden", "lg:flex")}>
          <div className="flex w-full min-w-0 flex-1 flex-col lg:min-h-0">
            <div className="shrink-0 rounded-2xl border border-[#dbe3f3] bg-white p-3 shadow-[0_10px_24px_-22px_rgba(38,57,110,.55)]">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-4" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm font-extrabold text-foreground">评价对象</h1>
                </div>
                <button type="button" onClick={clearSelection} disabled={selectionCount === 0} className="min-h-11 shrink-0 cursor-pointer rounded-lg px-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/[0.07] disabled:cursor-not-allowed disabled:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">清空</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5" aria-live="polite">
                <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-bold text-[#4259b8]">{selectedClassCount} 个班级</span>
                <span className="rounded-full bg-[#eaf8f0] px-2.5 py-1 text-[11px] font-bold text-[#16824f]">{selectedStudentCount} 位学生</span>
              </div>
            </div>

            <label className="mt-3 flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#dbe3f3] bg-white px-3 shadow-[0_6px_16px_-14px_rgba(38,57,110,.5)] focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/10">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input name="evaluation-target-search" autoComplete="off" aria-label="搜索班级或学生" value={treeSearch} onChange={(event) => setTreeSearch(event.target.value)} placeholder="搜索班级或学生…" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
              {treeSearch && <button type="button" onClick={() => setTreeSearch("")} aria-label="清空搜索" className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><X className="size-3.5" aria-hidden="true" /></button>}
            </label>

            <div className="mt-3 min-w-0 flex-1 space-y-2 pr-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
              {availableGrades.map((grade) => {
                const gradeClasses = availableClasses.filter((item) => item.gradeId === grade.id && treeMatchingClassIds.has(item.id))
                if (gradeClasses.length === 0) return null
                const expanded = normalizedTreeSearch
                  ? !collapsedSearchGradeIds.includes(grade.id)
                  : expandedGradeId === grade.id
                const gradeContentId = `evaluation-grade-${grade.id}`
                return <section key={grade.id} className="overflow-hidden rounded-xl border border-[#dce4f3] bg-white shadow-[0_8px_20px_-20px_rgba(37,55,105,.55)]">
                  <button type="button" aria-expanded={expanded} aria-controls={gradeContentId} onClick={() => {
                    if (normalizedTreeSearch) {
                      setCollapsedSearchGradeIds((current) => current.includes(grade.id) ? current.filter((id) => id !== grade.id) : [...current, grade.id])
                    } else {
                      setExpandedGradeId(expanded ? "" : grade.id)
                    }
                  }} className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 px-3 text-left transition-colors hover:bg-[#f6f8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45">
                    {expanded ? <ChevronDown className="size-4 shrink-0 text-primary" aria-hidden="true" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                    <span className="min-w-0 flex-1 text-sm font-extrabold text-[#263553]">{grade.name}</span>
                    <span className="rounded-full bg-[#f0f3fa] px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">{gradeClasses.length} 个班</span>
                  </button>
                  {expanded && <div id={gradeContentId} className="space-y-2 border-t border-[#edf0f7] bg-[#f8faff] p-2">
                    {gradeClasses.map((schoolClass) => {
                      const classStudentsList = studentsByClass.get(schoolClass.id) ?? []
                      const isClassNameMatch = Boolean(normalizedTreeSearch) && schoolClass.name.toLocaleLowerCase("zh-CN").includes(normalizedTreeSearch)
                      const matchingStudents = normalizedTreeSearch
                        ? classStudentsList.filter((student) => `${student.name} ${student.studentNo}`.toLocaleLowerCase("zh-CN").includes(normalizedTreeSearch))
                        : classStudentsList
                      const visibleStudents = normalizedTreeSearch && !isClassNameMatch ? matchingStudents : classStudentsList
                      const searchExpanded = Boolean(normalizedTreeSearch && matchingStudents.length > 0 && !isClassNameMatch)
                      const classExpanded = expandedClassIds.includes(schoolClass.id) || Boolean(searchExpanded && !collapsedSearchClassIds.includes(schoolClass.id))
                      const classSelected = selectedClassIds.includes(schoolClass.id)
                      const selectedInClass = selectedStudentIds.filter((id) => classStudentsList.some((student) => student.id === id)).length
                      const classContentId = `evaluation-class-${schoolClass.id}`
                      return <div key={schoolClass.id} className={cn("overflow-hidden rounded-xl border bg-white transition-colors", classSelected ? "border-primary/40 shadow-[0_8px_18px_-16px_rgba(53,101,212,.75)]" : "border-[#e0e6f2]", selectedClassId === schoolClass.id && !classSelected && selectedInClass === 0 && "border-primary/25")}>
                        <div className={cn("flex min-h-12 items-center gap-2 px-2.5", classSelected && "bg-primary/[0.045]")}>
                          <button type="button" aria-expanded={classExpanded} aria-controls={classContentId} aria-label={`${classExpanded ? "收起" : "展开"}${schoolClass.name}学生名单`} onClick={() => toggleClassExpansion(schoolClass.id, searchExpanded)} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">
                            {classExpanded ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
                          </button>
                          <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg">
                            <input ref={(element) => { if (element) element.indeterminate = selectedInClass > 0 && !classSelected }} type="checkbox" aria-label={`选择整个${schoolClass.name}`} aria-checked={classSelected ? "true" : selectedInClass > 0 ? "mixed" : "false"} checked={classSelected} onChange={() => toggleClassSelection(schoolClass.id)} className="size-4 cursor-pointer accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" />
                          </label>
                          <button type="button" aria-expanded={classExpanded} aria-controls={classContentId} onClick={() => toggleClassExpansion(schoolClass.id, searchExpanded)} className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">
                            <span className="truncate text-xs font-extrabold text-[#2c3c5c]">{schoolClass.name}</span>
                            <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{schoolClass.studentCount} 人</span>
                          </button>
                          {classSelected ? <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">整班</span> : selectedInClass > 0 && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">已选 {selectedInClass}</span>}
                        </div>
                        {classExpanded && <div id={classContentId} className="border-t border-[#edf0f7] px-2.5 py-2.5">
                          <div className="mb-2 flex items-center justify-between px-0.5"><span className="text-[10px] font-bold tracking-wide text-muted-foreground">学生名单</span><span className="text-[10px] tabular-nums text-muted-foreground">{visibleStudents.length} 位</span></div>
                          {visibleStudents.length > 0 ? <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,148px),1fr))] gap-1.5">
                            {visibleStudents.map((student) => {
                              const selected = selectedStudentIds.includes(student.id)
                              const score = todayScores.get(student.id) ?? { add: 0, deduct: 0 }
                              return <label key={student.id} className={cn("flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-2 transition-colors", selected ? "border-primary/35 bg-primary/[0.075]" : "border-[#e7ebf3] bg-white hover:border-primary/30 hover:bg-[#f8faff]")}>
                                <input type="checkbox" aria-label={`选择${schoolClass.name}${student.studentNo}号${student.name}`} checked={selected} onChange={() => toggleStudent(student.id)} className="size-4 shrink-0 cursor-pointer accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" />
                                <span className="min-w-0 flex-1"><span className="mr-1.5 text-[9px] font-bold tabular-nums text-[#8090aa]">{student.studentNo}</span><span className="truncate text-[11px] font-bold text-[#33425f]">{student.name}</span></span>
                                <span className="shrink-0 text-right text-[9px] font-semibold tabular-nums"><span className="text-emerald-700">+{score.add}</span><span className="px-0.5 text-[#9aa6ba]">/</span><span className="text-rose-700">−{score.deduct}</span></span>
                              </label>
                            })}
                          </div> : <p className="rounded-lg bg-[#f8faff] px-3 py-2 text-xs text-muted-foreground">没有匹配的学生</p>}
                        </div>}
                      </div>
                    })}
                  </div>}
                </section>
              })}
              {normalizedTreeSearch && treeMatchingClassIds.size === 0 && <div className="rounded-xl border border-dashed border-[#dce4f3] bg-white px-3 py-6 text-center text-xs text-muted-foreground">没有找到匹配的班级或学生</div>}
            </div>
          </div>
        </aside>

        <div
          role="separator"
          aria-label="拖动调整左右面板宽度"
          aria-orientation="vertical"
          aria-valuemin={28}
          aria-valuemax={46}
          aria-valuenow={Math.round(splitWidth)}
          aria-valuetext={`左侧班级与学生选择面板宽度 ${Math.round(splitWidth)}%`}
          tabIndex={0}
          onPointerDown={(event) => { event.preventDefault(); setIsResizing(true) }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault()
              setSplitWidth((current) => Math.max(28, current - 2))
            }
            if (event.key === "ArrowRight") {
              event.preventDefault()
              setSplitWidth((current) => Math.min(46, current + 2))
            }
          }}
          className={cn("group relative hidden w-5 shrink-0 cursor-col-resize touch-none items-center justify-center bg-[#f4f7ff] transition-colors duration-150 hover:bg-[#edf2ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45 lg:flex", isResizing && "bg-primary/[0.08]")}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#cbd7ed] transition-colors duration-150 group-hover:bg-primary/55" aria-hidden="true" />
          <span className="relative flex h-14 w-7 items-center justify-center rounded-xl border border-[#cad6ef] bg-white text-[#7182a0] shadow-[0_5px_14px_-6px_rgba(43,72,130,.42)] transition-[background-color,border-color,box-shadow,color] duration-150 group-hover:border-primary/45 group-hover:text-primary group-focus-visible:border-primary/50 group-focus-visible:text-primary group-active:scale-[0.98]">
            <GripVertical className="size-4" aria-hidden="true" />
          </span>
        </div>

        <section className={cn("min-w-0 flex-1 border-t border-[#dde3f8] bg-white p-3 lg:min-h-0 lg:flex-col lg:overflow-hidden lg:border-t-0 lg:p-4", mobileStep === "evaluation" ? "block" : "hidden", "lg:flex")}>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-2 lg:hidden">
            <button type="button" onClick={() => setMobileStep("selection")} className="inline-flex min-h-9 items-center rounded-lg border border-primary/20 bg-white px-3 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">返回选择对象</button>
            <span className="min-w-0 truncate text-xs text-muted-foreground">{selectionSummary}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0fb] pb-3 lg:shrink-0">
            <div className="min-w-0"><h2 className="text-sm font-extrabold">评价面板</h2><p className="mt-1 text-[11px] text-muted-foreground">{selectionSummary} · 选择指标后录入评价</p></div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <label className="flex h-11 min-w-[158px] items-center gap-2 rounded-lg border border-[#e0e5f8] bg-[#f8f9ff] px-2.5 focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/10">
                <CalendarDays className="size-4 shrink-0 text-brand-blue" aria-hidden="true" />
                <input name="evaluation-date" autoComplete="off" aria-label="评价日期" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} className="min-w-0 w-full bg-transparent text-xs font-semibold outline-none" />
              </label>
              <Button type="button" variant="outline" className="h-11 gap-2 rounded-lg border-[#e0e5f8] bg-[#f8f9ff] px-3 hover:border-primary/35 hover:bg-primary/5" onClick={() => setHistoryOpen(true)} aria-label="查看评价历史记录" title="历史记录"><History className="size-4" aria-hidden="true" /><span className="text-xs font-semibold">历史记录</span></Button>
            </div>
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:shrink-0">
            {LEVEL1_LIST.map((item) => <button key={item} type="button" onClick={() => setLevel1(item)} className={cn("min-h-10 shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", item === level1 ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_14px_-10px_rgba(63,81,188,0.9)]" : "border-[#e2e6f8] bg-[#f8f9ff] text-muted-foreground hover:border-primary/35 hover:bg-primary/[0.04] hover:text-foreground")}>{item}</button>)}
            <label className="ml-auto flex h-11 w-36 shrink-0 items-center gap-1.5 rounded-lg border border-[#e2e6f8] bg-[#f8f9ff] px-2 focus-within:ring-2 focus-within:ring-primary/20"><Search aria-hidden="true" className="size-3.5 text-muted-foreground" /><input name="evaluation-indicator-search" autoComplete="off" aria-label="搜索指标" value={indicatorSearch} onChange={(event) => setIndicatorSearch(event.target.value)} placeholder="搜索指标…" className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
          </div>

          <div className="mt-4 flex min-h-[360px] flex-col gap-2 pr-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
            {visibleGroups.map((group) => (
              <div key={`${group.level1}-${group.level2}`} className="rounded-xl border border-[#e1e6f8] bg-[#fafbff] p-2.5">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  {group.level2}
                </div>
                <div className="indicator-card-grid gap-2">
                  {group.items.map((item) => {
                    const active = item.id === indicatorId
                    const isAdd = item.penalty > 0
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        title={item.name}
                        onClick={() => setIndicatorId(item.id)}
                        className={cn(
                          "group relative flex min-h-14 min-w-0 touch-manipulation items-center justify-between gap-2 overflow-hidden rounded-xl border px-3 py-2 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
                          active
                            ? "border-primary/70 bg-[#edf2ff] text-[#2549af] shadow-[0_4px_12px_-8px_rgba(45,87,196,0.55)]"
                            : "border-[#e0e6f4] bg-white text-[#20345a] shadow-[0_2px_5px_-4px_rgba(43,61,112,0.2)] hover:border-primary/45 hover:bg-[#fafbff] hover:shadow-[0_5px_12px_-8px_rgba(43,61,112,0.32)]",
                        )}
                      >
                        <span className={cn("absolute inset-y-2.5 left-0 w-[3px] rounded-full transition-colors", active ? "bg-primary" : "bg-transparent group-hover:bg-primary/45")} aria-hidden="true" />
                        <span className="min-w-0 flex-1 pl-1.5">
                          <span className="block truncate whitespace-nowrap text-[12px] font-bold leading-4">{item.name}</span>
                          <span className={cn(
                            "mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-extrabold leading-none whitespace-nowrap",
                            isAdd ? "bg-[#e8f7ef] text-[#14754d] ring-1 ring-inset ring-[#bfe8d0]" : "bg-[#fff0f2] text-[#bd1737] ring-1 ring-inset ring-[#ffd1d9]",
                          )}>
                            {isAdd ? "加分 · +" : "扣分 · −"}{Math.abs(item.penalty)} 分
                          </span>
                        </span>
                        <span className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
                          active ? "border-primary bg-primary text-white" : "border-[#d8dfec] bg-[#fbfcff] text-transparent group-hover:border-primary/35",
                        )} aria-hidden="true">
                          {active && <Check className="size-3" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-primary/25 bg-[#f1f3ff] p-3 shadow-[0_12px_24px_-24px_rgba(57,72,170,0.9)] lg:shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold">{currentIndicator?.name ?? "请选择指标"}</span><span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", isAddIndicator ? "bg-brand-green/15 text-brand-green" : "bg-brand-orange/15 text-brand-orange")}>{isAddIndicator ? "加分" : "扣分"}</span></div>
            {selectionCount > 0 && <div className="mt-2 min-w-0" role="group" aria-label="已选评价对象">
              <div className="flex max-h-24 min-w-0 flex-wrap items-center gap-1.5 overflow-x-hidden overflow-y-auto overscroll-contain pb-0.5" role="list">
                {selectedClassIds.map((id) => {
                  const schoolClass = availableClasses.find((item) => item.id === id)
                  return <div key={id} role="listitem" className="inline-flex h-10 max-w-[220px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#315fd6] bg-[#315fd6] px-2 text-white lg:h-8">
                    <span className="truncate text-[11px] font-extrabold">{schoolClass?.name ?? "已选班级"}</span>
                    <span className="shrink-0 rounded bg-white/15 px-1 py-0.5 text-[10px] font-bold">整班</span>
                    <button type="button" onClick={() => toggleClassSelection(id)} aria-label={`移除${schoolClass?.name ?? "班级"}整班`} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/75 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 lg:size-7"><X className="size-3.5 lg:size-3" aria-hidden="true" /></button>
                  </div>
                })}
                {selectedStudentIds.map((id) => {
                  const student = students.find((item) => item.id === id)
                  if (!student) return null
                  const studentClass = availableClasses.find((item) => item.id === student.classId)
                  return <div key={id} role="listitem" className="inline-flex h-10 max-w-[220px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#315fd6] bg-[#315fd6] px-2 text-white lg:h-8">
                    <span className="max-w-[11rem] truncate text-[11px] font-extrabold">{studentClass?.name ?? "学生"} · {student.name}</span>
                    <button type="button" onClick={() => toggleStudent(id)} aria-label={`移除${student.name}`} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/75 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 lg:size-7"><X className="size-3.5 lg:size-3" aria-hidden="true" /></button>
                  </div>
                })}
              </div>
            </div>}
            <div className="mt-3 grid gap-2 sm:grid-cols-[148px_1fr]"><div className="flex h-10 items-center justify-between rounded-lg border border-primary/20 bg-white px-2.5"><span className="text-[11px] font-semibold text-muted-foreground">单次默认分值</span><span className={cn("text-sm font-black", isAddIndicator ? "text-emerald-700" : "text-rose-700")}>{isAddIndicator ? "+" : "−"}{defaultScore} 分</span></div><label className="flex h-10 items-center rounded-lg border border-border/70 bg-white px-2.5 focus-within:ring-2 focus-within:ring-primary/20"><input name="evaluation-note" autoComplete="off" aria-label="评价备注" value={note} onChange={(event) => setNote(event.target.value)} placeholder="填写评价备注…" className="w-full bg-transparent text-sm outline-none" /></label></div>
            <div className="mt-3 flex flex-wrap items-center gap-2"><label className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-[#cfd8f4] bg-white p-2 transition hover:border-primary/55 hover:bg-primary/[0.025] focus-within:ring-2 focus-within:ring-primary/30"><span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">{imageDataUrl ? <img src={imageDataUrl} alt="已上传的评价图片缩略图" width={36} height={36} className="size-full object-cover" /> : <ImagePlus aria-hidden="true" className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-foreground">{imageName || "上传评价图片"}</span><span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">支持 JPG、PNG，大小不超过 5MB</span></span><span className="rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{imageDataUrl ? "已上传" : "选择图片"}</span><input type="file" accept="image/*" className="sr-only" onChange={handleImageChange} /></label>{imageDataUrl && <button type="button" onClick={() => { setImageName(""); setImageDataUrl(null) }} className="h-10 rounded-lg border border-border/70 bg-white px-2.5 text-xs font-semibold text-muted-foreground transition hover:border-destructive/30 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">移除</button>}<Button type="button" className="h-10 gap-1.5 rounded-lg px-4 text-xs" onClick={handleSubmit}><Check className="size-3.5" />确认评价</Button></div>
          </div>
        </section>
      </div>

      <div className={cn("fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-[#d7def4] bg-white/96 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-16px_34px_-24px_rgba(44,63,132,.7)] backdrop-blur-xl lg:hidden", mobileStep !== "selection" && "hidden")}>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-green">{selectionSummary}</span>
        <Button type="button" disabled={selectionCount === 0} onClick={() => setMobileStep("evaluation")} className="min-h-12 shrink-0 rounded-xl px-5 text-sm font-bold shadow-[0_10px_20px_-14px_rgba(44,99,196,.8)]">下一步：选择指标</Button>
      </div>

      <div
        role="group"
        aria-label="评价辅助工具"
        style={{ transform: `translate3d(${toolOffset.x}px, ${toolOffset.y}px, 0)` }}
        className={cn("fixed right-4 z-40 flex flex-col items-end gap-2 sm:right-5 lg:absolute lg:bottom-12 lg:right-4", mobileStep === "selection" ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))]", isToolDragging && "cursor-grabbing")}
      >
        {toolsOpen && <div className="w-52 rounded-2xl border border-[#d8dff8] bg-white p-2.5 shadow-[0_20px_40px_-24px_rgba(52,68,152,0.58)]">
          <div className="mb-2 flex items-center justify-between px-1"><span className="text-xs font-bold text-foreground">快捷评价</span><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">选择方式</span></div>
          <div className="space-y-1.5">
            <Button type="button" variant="outline" className="h-12 w-full justify-start gap-2.5 rounded-xl border-transparent bg-[#f3f5ff] px-2.5 text-xs font-semibold text-foreground hover:border-primary/20 hover:bg-primary/[0.10]" onClick={() => showToast("OCR识别完成")} title="OCR识别"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><ScanLine aria-hidden="true" className="size-4" /></span><span className="flex flex-col items-start"><span>OCR识别</span><span className="mt-0.5 text-[10px] font-normal text-muted-foreground">识别图片中的评价内容</span></span></Button>
            <Button type="button" variant="outline" className="h-12 w-full justify-start gap-2.5 rounded-xl border-transparent bg-[#f2fbf7] px-2.5 text-xs font-semibold text-foreground hover:border-emerald-200 hover:bg-emerald-50" onClick={() => showToast("Excel导入已就绪")} title="Excel录入"><span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><FileSpreadsheet aria-hidden="true" className="size-4" /></span><span className="flex flex-col items-start"><span>Excel录入</span><span className="mt-0.5 text-[10px] font-normal text-muted-foreground">批量导入评价数据</span></span></Button>
            <Button type="button" variant="outline" className="h-12 w-full justify-start gap-2.5 rounded-xl border-transparent bg-[#fff7ef] px-2.5 text-xs font-semibold text-foreground hover:border-orange-200 hover:bg-orange-50" onClick={() => { setToolsOpen(false); setVoiceOpen(true) }} title="语音评价"><span className="flex size-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600"><Mic aria-hidden="true" className="size-4" /></span><span className="flex flex-col items-start"><span>语音评价</span><span className="mt-0.5 text-[10px] font-normal text-muted-foreground">语音转为评价记录</span></span></Button>
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

      {currentClass && voiceIndicator && <VoiceActionDialog
        open={voiceOpen}
        onOpenChange={setVoiceOpen}
        variant="evaluation"
        title="语音班级评价"
        transcript={`${currentClass.name}课间休息时有同学在走廊追逐打闹，按班级评价扣 3 分。`}
        targetTitle={currentClass.name}
        targetMeta="班级评价 · 当前日期"
        details={[
          { label: "评价对象", value: currentClass.name },
          { label: "班级扣分指标", value: `${voiceIndicator.level1} · ${voiceIndicator.level2} · ${voiceIndicator.name}` },
          { label: "扣分", value: `−${Math.abs(voiceIndicator.penalty)} 分`, emphasis: true },
        ]}
        confirmLabel="确认评价"
        onConfirm={handleVoiceEvaluation}
      />}

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="glass-surface !left-auto !right-0 !top-0 !h-dvh !max-h-dvh !w-full !max-w-none !translate-x-0 !translate-y-0 !overscroll-contain !rounded-none !border-l !p-0 shadow-[-24px_0_80px_-38px_rgba(34,50,110,.42)] data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right motion-reduce:!animate-none sm:!w-[min(1040px,calc(100vw-24px))] sm:!rounded-l-[28px]" showCloseButton={false}>
          <DialogHeader className="border-b border-[#e5e9f5] bg-[linear-gradient(120deg,#f6f8ff_0%,#ffffff_54%,#f0fbf6_100%)] px-5 pb-4 pt-5 pr-16 sm:px-7 sm:pb-4 sm:pt-6 sm:pr-20">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-4" aria-hidden="true" /></span>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-extrabold tracking-tight text-[#1b2440] sm:text-xl">班级评价历史</DialogTitle>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setHistoryOpen(false)} aria-label="关闭历史记录" className="absolute right-4 top-4 size-9 rounded-xl text-muted-foreground hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50 sm:right-6 sm:top-5"><X className="size-4" aria-hidden="true" /></Button>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 bg-[#f8f9fc] px-4 py-3 sm:px-6 sm:py-4">
            <section className="grid shrink-0 grid-cols-1 gap-2 rounded-xl border border-[#e4e8f2] bg-white p-3 shadow-[0_8px_22px_-21px_rgba(35,53,102,.4)] sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr]" aria-label="历史记录筛选">
              <fieldset className="min-w-0">
                <legend className="mb-1 text-xs font-bold tracking-wide text-[#626e88]">日期区间</legend>
                <div className="flex items-center gap-1.5">
                  <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#e3e8f1] bg-[#fbfcfe] px-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                    <span className="sr-only">开始日期</span>
                    <input type="date" name="history-start-date" autoComplete="off" value={historyStartDate} max={historyEndDate || undefined} onChange={(event) => setHistoryStartDate(event.target.value)} className="min-w-0 w-full bg-transparent text-xs font-semibold text-foreground outline-none" aria-label="开始日期" />
                  </label>
                  <span className="text-xs text-muted-foreground">至</span>
                  <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#e3e8f1] bg-[#fbfcfe] px-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                    <span className="sr-only">结束日期</span>
                    <input type="date" name="history-end-date" autoComplete="off" value={historyEndDate} min={historyStartDate || undefined} onChange={(event) => setHistoryEndDate(event.target.value)} className="min-w-0 w-full bg-transparent text-xs font-semibold text-foreground outline-none" aria-label="结束日期" />
                  </label>
                </div>
              </fieldset>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-bold tracking-wide text-[#626e88]">年级</span>
                <select name="history-grade" autoComplete="off" value={historyGradeId} onChange={(event) => setHistoryGradeId(event.target.value)} className="h-9 w-full rounded-lg border border-[#e3e8f1] bg-[#fbfcfe] px-2.5 text-sm font-semibold text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10">
                  <option value="all">全部年级</option>
                  {historyAvailableGrades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                </select>
              </label>
              <label className="min-w-0 sm:col-span-2 xl:col-span-1">
                <span className="mb-1 block text-xs font-bold tracking-wide text-[#626e88]">班级</span>
                <select name="history-class" autoComplete="off" value={historyClassId} onChange={(event) => setHistoryClassId(event.target.value)} className="h-9 w-full rounded-lg border border-[#e3e8f1] bg-[#fbfcfe] px-2.5 text-sm font-semibold text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10">
                  <option value="all">全部班级</option>
                  {historyClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
                </select>
              </label>
            </section>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#e3e8f1] bg-white shadow-[0_8px_24px_-22px_rgba(35,53,102,.45)]">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#edf0f6] px-4 py-2.5 sm:px-5">
                <h3 className="text-sm font-extrabold text-[#28334f]">评价明细</h3>
                <span className="text-xs font-medium text-muted-foreground">共 {filteredHistoryRecords.length} 条记录</span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[920px] border-collapse text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 z-[1] bg-[#f6f8fc] text-[11px] font-bold tracking-wide text-[#65708a]">
                    <tr><th scope="col" className="whitespace-nowrap px-3 py-2.5">年级</th><th scope="col" className="whitespace-nowrap px-3 py-2.5">班级</th><th scope="col" className="min-w-[180px] px-3 py-2.5">评价指标</th><th scope="col" className="whitespace-nowrap px-3 py-2.5">评价时间</th><th scope="col" className="whitespace-nowrap px-3 py-2.5">评价人</th><th scope="col" className="whitespace-nowrap px-3 py-2.5">审核状态</th><th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right">扣分 / 加分</th><th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right">操作</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f6]">
                    {pageHistoryRecords.map((record) => {
                      const schoolClass = classes.find((item) => item.id === record.classId)
                      const grade = grades.find((item) => item.id === schoolClass?.gradeId)
                      const isAdd = record.scoreType === "add" || record.totalDeduction > 0
                      const amount = Math.abs(record.totalDeduction)
                      const time = formatHistoryTime(record.createdAt)
                      const indicatorNames = record.entries.map((entry) => INDICATOR_GROUPS.flatMap((group) => group.items).find((item) => item.id === entry.itemId)?.name).filter((name): name is string => Boolean(name))
                      const indicatorLabel = indicatorNames.length ? indicatorNames.join("、") : record.level2
                      return <tr key={record.id} className="transition-colors hover:bg-[#f9faff]">
                        <td className="whitespace-nowrap px-3 py-2.5 font-medium text-[#56617a]">{grade?.name ?? "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#2e3954]">{schoolClass?.name ?? "—"}</td>
                        <td className="px-3 py-2.5"><span className="block max-w-[260px] break-words font-semibold text-[#303b56]">{indicatorLabel}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{record.level1} · {record.level2}</span></td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[#56617a]">{record.date}<span className="ml-2 text-muted-foreground">{time}</span></td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[#56617a]">{record.operatorName || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2.5"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf4ff] px-2.5 py-1 text-[11px] font-bold text-[#47619b]"><span className="size-1.5 rounded-full bg-[#6886cf]" aria-hidden="true" />无需审核</span></td>
                        <td className={cn("whitespace-nowrap px-3 py-2.5 text-right font-extrabold tabular-nums", isAdd ? "text-brand-green" : "text-brand-orange")}>{isAdd ? "+" : "−"}{amount}<span className="ml-1 text-[10px] font-semibold">分</span></td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">
                          {deleteRecordId === record.id
                            ? <div className="flex items-center justify-end gap-1"><span className="mr-1 text-[11px] font-medium text-rose-600">确认删除？</span><Button variant="ghost" size="xs" className="h-8 rounded-lg px-2 text-xs font-semibold text-muted-foreground" onClick={() => setDeleteRecordId(null)}>取消</Button><Button variant="destructive" size="xs" className="h-8 rounded-lg px-2 text-xs font-bold" onClick={() => { removeRecord(record.id); setDeleteRecordId(null); setHistoryPage(1); setToast("评价记录已删除") }}>删除</Button></div>
                            : <Button variant="ghost" size="xs" className="h-8 gap-1 rounded-lg px-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setDeleteRecordId(record.id)} aria-label={`删除 ${schoolClass?.name ?? "班级"} 评价记录`}><Trash2 className="size-3.5" aria-hidden="true" />删除</Button>}
                        </td>
                      </tr>
                    })}
                    {pageHistoryRecords.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center"><div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-[#f0f3fb] text-[#7b86a0]"><History className="size-4" aria-hidden="true" /></div><p className="mt-2 text-sm font-bold text-[#3c4760]">当前筛选条件下没有记录</p><p className="mt-1 text-xs text-muted-foreground">调整日期、年级或班级</p></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-between gap-3 border-[#e4e8f1] bg-white px-4 py-2.5 sm:px-6">
            <p className="text-xs text-muted-foreground">第 {historyPage} / {historyPageCount} 页<span className="ml-2 hidden sm:inline">· 每页 {historyPageSize} 条</span></p>
            <div className="flex items-center gap-1.5"><Button variant="outline" size="xs" className="h-8 gap-1 rounded-lg px-2.5" disabled={historyPage <= 1} onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}><ChevronLeft className="size-3.5" aria-hidden="true" />上一页</Button><Button variant="outline" size="xs" className="h-8 gap-1 rounded-lg px-2.5" disabled={historyPage >= historyPageCount} onClick={() => setHistoryPage((page) => Math.min(historyPageCount, page + 1))}>下一页<ChevronRight className="size-3.5" aria-hidden="true" /></Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
