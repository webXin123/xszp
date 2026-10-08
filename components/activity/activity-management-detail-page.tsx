"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import * as XLSX from "xlsx"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardList,
  Coins,
  Download,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  ImagePlus,
  LockKeyhole,
  MapPin,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEvaluation } from "@/lib/evaluation-context"
import {
  ACTIVITY_STATUS_META,
  ENROLLMENT_STATUS_META,
  formatActivityDateRange,
  getActivityProgress,
  requiresActivityEnrollment,
  requiresActivityPointsExchange,
} from "@/lib/activity-utils"
import { cn } from "@/lib/utils"
import { usePermission } from "@/lib/use-permission"
import { AWARD_GROUPS } from "@/lib/award-utils"
import type { Activity, ActivityParticipant, ActivityPointAwardConfig, ActivitySubmission, EnrollmentStatus, Student } from "@/lib/types"

type DetailTab = "participants" | "enrollments" | "submissions"

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))
}

function statusLabel(status: EnrollmentStatus) {
  return ENROLLMENT_STATUS_META[status]
}

export function ActivityManagementDetailPage() {
  const params = useSearchParams()
  const activityId = params.get("id") ?? ""
  const requestedTab = params.get("tab")
  const { activities, enrollments, submissions, activityParticipants, students, classes, currentTeacher, reviewEnrollment, addSubmission, saveActivityParticipants, issueActivityPoints } = useEvaluation()
  const { role, scoringClasses } = usePermission()
  const activity = activities.find((item) => item.id === activityId)
  const needsEnrollment = activity ? requiresActivityEnrollment(activity) : false
  const initialTab: DetailTab = requestedTab === "submissions" ? "submissions" : needsEnrollment && requestedTab === "enrollments" ? "enrollments" : "participants"
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab)
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<string[]>([])
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([])
  const [issueOpen, setIssueOpen] = useState(false)
  const [rosterMessage, setRosterMessage] = useState("")
  const [uploadOpen, setUploadOpen] = useState(false)
  const rosterInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setActiveTab(requestedTab === "submissions" ? "submissions" : needsEnrollment && requestedTab === "enrollments" ? "enrollments" : "participants")
  }, [activityId, needsEnrollment, requestedTab])

  const managedClassIds = useMemo(() => {
    if (!activity) return []
    if (role === "director" || role === "moral_director") return activity.classIds
    return scoringClasses.map((item) => item.id)
  }, [activity, role, scoringClasses])
  const visibleStudents = useMemo(
    () => students.filter((student) => managedClassIds.includes(student.classId)),
    [students, managedClassIds],
  )
  const relatedEnrollments = useMemo(
    () => activity
      ? enrollments
          .filter((item) => item.activityId === activity.id && (managedClassIds.length === 0 || managedClassIds.includes(item.classId)))
          .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))
      : [],
    [activity, enrollments, managedClassIds],
  )
  const pendingEnrollments = useMemo(
    () => relatedEnrollments.filter((item) => item.status === "pending"),
    [relatedEnrollments],
  )
  const relatedParticipants = useMemo(() => {
    if (!activity) return []
    const stored = activityParticipants.filter((participant) => participant.activityId === activity.id)
    const fallback = needsEnrollment
      ? relatedEnrollments.filter((enrollment) => enrollment.status === "approved").map((enrollment) => ({
          id: `${activity.id}-${enrollment.studentId}`,
          activityId: activity.id,
          studentId: enrollment.studentId,
          studentName: enrollment.studentName,
          classId: enrollment.classId,
          addedAt: enrollment.enrolledAt,
        }))
      : visibleStudents
          .filter((student) => activity.classIds.includes(student.classId))
          .map((student) => ({
            id: `${activity.id}-${student.id}`,
            activityId: activity.id,
            studentId: student.id,
            studentName: student.name,
            classId: student.classId,
            addedAt: activity.createdAt,
          }))
    const merged = new Map<string, ActivityParticipant>()
    stored.forEach((participant) => merged.set(participant.studentId, participant))
    fallback.forEach((participant) => { if (!merged.has(participant.studentId)) merged.set(participant.studentId, participant) })
    return Array.from(merged.values()).sort((a, b) => a.studentName.localeCompare(b.studentName, "zh-Hans-CN"))
  }, [activity, activityParticipants, needsEnrollment, relatedEnrollments, visibleStudents])
  const relatedSubmissions = useMemo(
    () => activity
      ? submissions
          .filter((item) => item.activityId === activity.id && (managedClassIds.length === 0 || managedClassIds.includes(item.classId)))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [],
    [activity, submissions, managedClassIds],
  )
  const addableStudents = useMemo(
    () => activity
      ? visibleStudents.filter((student) => activity.classIds.includes(student.classId) && !relatedParticipants.some((participant) => participant.studentId === student.id))
      : [],
    [activity, relatedParticipants, visibleStudents],
  )

  useEffect(() => {
    const pendingIdSet = new Set(pendingEnrollments.map((item) => item.id))
    setSelectedEnrollmentIds((current) => current.filter((id) => pendingIdSet.has(id)))
  }, [pendingEnrollments])

  useEffect(() => {
    setSelectedParticipantIds((current) => current.filter((id) => relatedParticipants.some((participant) => participant.id === id && !participant.issuedAt)))
  }, [relatedParticipants])

  if (!activity) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[#cfd8f6] bg-white px-4 py-16 text-center">
        <ClipboardList className="size-8 text-primary/55" aria-hidden="true" />
        <div><p className="text-base font-semibold text-foreground">未找到活动详情</p><p className="mt-1 text-sm text-muted-foreground">活动可能已删除，或访问地址不完整。</p></div>
        <Link href="/" className="inline-flex h-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/5 px-3 text-sm font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20">返回首页</Link>
      </div>
    )
  }

  const progress = getActivityProgress(activity, enrollments)
  const meta = ACTIVITY_STATUS_META[activity.status]
  const targetClasses = activity.classIds
    .map((classId) => classes.find((item) => item.id === classId)?.name)
    .filter((item): item is string => !!item)
  const allPendingSelected = pendingEnrollments.length > 0 && pendingEnrollments.every((item) => selectedEnrollmentIds.includes(item.id))
  const selectableParticipants = relatedParticipants.filter((participant) => !participant.issuedAt)
  const allParticipantsSelected = selectableParticipants.length > 0 && selectableParticipants.every((participant) => selectedParticipantIds.includes(participant.id))

  const toggleAllPending = (checked: boolean) => {
    setSelectedEnrollmentIds(checked ? pendingEnrollments.map((item) => item.id) : [])
  }
  const setDetailTab = (tab: DetailTab) => {
    setActiveTab(tab)
    const next = new URLSearchParams(params.toString())
    next.set("tab", tab)
    window.history.replaceState(null, "", `?${next.toString()}`)
  }
  const handleBatchApprove = () => {
    selectedEnrollmentIds.forEach((id) => reviewEnrollment(id, "approved", "批量审核通过"))
    setSelectedEnrollmentIds([])
  }
  const toggleAllParticipants = (checked: boolean) => {
    setSelectedParticipantIds(checked ? selectableParticipants.map((participant) => participant.id) : [])
  }
  const handleBatchIssue = (config: ActivityPointAwardConfig) => {
    if (!activity) return
    const selected = relatedParticipants.filter((participant) => selectedParticipantIds.includes(participant.id))
    const result = issueActivityPoints(activity.id, selected, config)
    setSelectedParticipantIds([])
    setIssueOpen(false)
    setRosterMessage(result.issuedCount > 0 ? `已向 ${result.issuedCount} 名学生发放 ${config.points} 分，发放记录已锁定。` : "所选学生已发放过积分，未重复发放。")
  }
  const handleAddStudent = (student: Student) => {
    if (relatedParticipants.some((participant) => participant.studentId === student.id)) {
      setRosterMessage(`${student.name} 已在参与学生名单中。`)
      return
    }
    saveActivityParticipants(activity.id, [{
      id: `${activity.id}-${student.id}`,
      activityId: activity.id,
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      addedAt: new Date().toISOString(),
      addedBy: currentTeacher?.name,
    }])
    setRosterMessage(`已添加 ${student.name}（学号 ${student.studentNo}）。`)
  }
  const downloadRosterTemplate = () => {
    const sheet = XLSX.utils.aoa_to_sheet([["学号", "学生姓名", "班级名称"], ["01", "示例学生", "一年级01班"]])
    sheet["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 18 }]
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "参与学生名单")
    XLSX.writeFile(book, `${activity.title}参与学生名单模板.xlsx`)
    setRosterMessage("已下载名单模板，请按模板填写后导入。")
  }
  const handleRosterImport = (file?: File) => {
    if (!file || !activity) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = sheet ? XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: "" }) : []
        const headers = (rows[0] ?? []).map((value) => String(value).trim())
        const studentNoIndex = headers.findIndex((header) => header === "学号")
        const nameIndex = headers.findIndex((header) => header === "学生姓名" || header === "姓名")
        if (studentNoIndex < 0 && nameIndex < 0) throw new Error("模板缺少“学号”或“学生姓名”列")
        const scopedStudents = students.filter((student) => activity.classIds.includes(student.classId) && managedClassIds.includes(student.classId))
        const imported = rows.slice(1).map((row) => {
          const studentNo = studentNoIndex >= 0 ? String(row[studentNoIndex] ?? "").trim().padStart(2, "0") : ""
          const name = nameIndex >= 0 ? String(row[nameIndex] ?? "").trim() : ""
          return scopedStudents.find((student) => (studentNo && student.studentNo === studentNo) || (name && student.name === name))
        }).filter((student): student is typeof students[number] => !!student)
        const unique = Array.from(new Map(imported.map((student) => [student.id, student])).values())
        if (unique.length === 0) throw new Error("未找到属于当前活动范围的学生，请检查学号或姓名")
        saveActivityParticipants(activity.id, unique.map((student) => ({ id: `${activity.id}-${student.id}`, activityId: activity.id, studentId: student.id, studentName: student.name, classId: student.classId, addedAt: new Date().toISOString(), addedBy: currentTeacher?.name })))
        setRosterMessage(`已导入 ${unique.length} 名学生，名单已更新。`)
      } catch (error) {
        setRosterMessage(error instanceof Error ? error.message : "名单导入失败，请检查文件格式。")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="activity-basic-title" className="relative overflow-hidden rounded-[26px] border border-[#d8e1f8] bg-white shadow-[0_18px_38px_-30px_rgba(53,67,150,0.82)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_12%_-15%,rgba(71,105,228,.22),transparent_48%),radial-gradient(circle_at_92%_0%,rgba(126,190,255,.18),transparent_36%),linear-gradient(112deg,#edf2ff_0%,#f9fbff_48%,#f4f9ff_100%)]" />
        <div className="relative px-4 pb-3 pt-2.5 sm:px-6 sm:pb-4 sm:pt-3">
          <div className="flex flex-wrap items-center justify-start gap-2 border-b border-primary/10 pb-2">
            <Link href="/activities" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-white/90 px-3 text-[0.8rem] font-semibold text-primary shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20"><ArrowLeft className="size-3.5" aria-hidden="true" />返回活动管理</Link>
          </div>

          <div className="flex flex-col gap-3 pt-3 sm:pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_22px_-14px_rgba(63,81,188,.95)]"><CalendarDays className="size-5" aria-hidden="true" /></span>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 id="activity-basic-title" className="text-xl font-bold tracking-[-0.02em] text-foreground sm:text-2xl">{activity.title}</h1><span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", meta.className)}><span className={cn("size-1.5 rounded-full", meta.dot)} />{meta.label}</span></div><p className="mt-1.5 text-sm text-muted-foreground">发布人：{activity.publisherName}{activity.level1 ? ` · 关联指标：${activity.level1}` : ""}</p></div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-white/90 px-2.5 py-1.5 text-primary ring-1 ring-primary/15">{needsEnrollment ? "需要活动报名" : "无需活动报名"}</span>{requiresActivityPointsExchange(activity) && activity.pointsCost > 0 && <span className="rounded-full bg-[#fff3e7] px-2.5 py-1.5 text-brand-orange ring-1 ring-brand-orange/10">报名消耗 {activity.pointsCost} 积分</span>}</div>
            </div>
            <p className="max-w-4xl rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-sm leading-5 text-muted-foreground backdrop-blur-sm">{activity.description || "暂未填写活动说明。"}</p>
          </div>
        </div>
        <div className="grid divide-y divide-[#e9eefb] border-t border-[#dfe6f7] bg-white/95 text-sm sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <InfoCell icon={CalendarDays} label="活动时间" value={formatActivityDateRange(activity.startDate, activity.endDate)} />
          <InfoCell icon={MapPin} label="活动地点" value={activity.location || "未设活动地点"} />
          <InfoCell icon={Users} label="参与范围" value={targetClasses.join("、") || "指定班级"} />
          <InfoCell icon={Coins} label="报名情况" value={needsEnrollment ? `通过 ${progress.approved} · 待审 ${progress.pending}` : "无需报名"} />
        </div>
      </section>

      <section aria-label="活动详情内容" className="overflow-hidden rounded-2xl border border-[#d8e1f8] bg-white shadow-[0_14px_30px_-26px_rgba(53,67,150,0.74)]">
        <div className="flex items-center gap-1 border-b border-[#e4e9f7] bg-[#fbfcff] px-3 pt-2 sm:px-4" role="tablist" aria-label="活动详情标签">
          <TabButton active={activeTab === "participants"} onClick={() => setDetailTab("participants")} label={`参与学生（${relatedParticipants.length}）`} />
          {needsEnrollment && <TabButton active={activeTab === "enrollments"} onClick={() => setDetailTab("enrollments")} label={`报名数据（${relatedEnrollments.length}）`} />}
          <TabButton active={activeTab === "submissions"} onClick={() => setDetailTab("submissions")} label={`活动成果（${relatedSubmissions.length}）`} />
        </div>
        <div className="p-3 sm:p-5">
          {activeTab === "participants" ? (
            <ParticipantPanel
              activity={activity}
              rows={relatedParticipants}
              selectedIds={selectedParticipantIds}
              allSelected={allParticipantsSelected}
              selectableCount={selectableParticipants.length}
              rosterMessage={rosterMessage}
              availableStudents={addableStudents}
              onImport={() => rosterInputRef.current?.click()}
              onDownloadTemplate={downloadRosterTemplate}
              onToggleAll={toggleAllParticipants}
              onToggle={(id, checked) => setSelectedParticipantIds((current) => checked ? [...current, id] : current.filter((item) => item !== id))}
              onOpenIssue={() => setIssueOpen(true)}
              onAddStudent={handleAddStudent}
              classes={classes}
            />
          ) : activeTab === "enrollments" && needsEnrollment ? (
            <EnrollmentTable
              rows={relatedEnrollments}
              selectedIds={selectedEnrollmentIds}
              allPendingSelected={allPendingSelected}
              onToggleAll={toggleAllPending}
              onToggle={(id, checked) => setSelectedEnrollmentIds((current) => checked ? [...current, id] : current.filter((item) => item !== id))}
              onSingleReview={(id, status) => reviewEnrollment(id, status, status === "approved" ? "审核通过" : "审核驳回")}
              classes={classes}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto text-sm text-muted-foreground">待审核 <span className="font-semibold text-foreground">{pendingEnrollments.length}</span> 人；勾选后可批量处理。</p>
                <Button size="sm" disabled={selectedEnrollmentIds.length === 0} onClick={handleBatchApprove}><CheckCheck className="size-3.5" aria-hidden="true" />批量通过（{selectedEnrollmentIds.length}）</Button>
              </div>
            </EnrollmentTable>
          ) : (
            <SubmissionPanel
              activity={activity}
              submissions={relatedSubmissions}
              classes={classes}
              students={visibleStudents}
              currentTeacherName={currentTeacher?.name}
              open={uploadOpen}
              onOpenChange={setUploadOpen}
              onSubmit={addSubmission}
            />
          )}
        </div>
      </section>
      <input ref={rosterInputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" aria-label="选择参与学生名单文件" onChange={(event) => { handleRosterImport(event.target.files?.[0]); event.target.value = "" }} />
      <PointAwardDialog open={issueOpen} onOpenChange={setIssueOpen} selectedCount={selectedParticipantIds.length} onSubmit={handleBatchIssue} />
    </div>
  )
}

function InfoCell({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <div className="flex min-w-0 items-center gap-3 px-4 py-2.5 sm:px-5"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" aria-hidden="true" /></span><div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-sm font-semibold text-foreground" title={value}>{value}</p></div></div>
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn("relative min-h-10 rounded-t-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", active ? "text-primary" : "text-muted-foreground hover:bg-primary/5 hover:text-foreground")}>{label}{active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />}</button>
}

function EnrollmentTable({ rows, selectedIds, allPendingSelected, onToggleAll, onToggle, onSingleReview, classes, children }: { rows: ReturnType<typeof useEvaluation>["enrollments"]; selectedIds: string[]; allPendingSelected: boolean; onToggleAll: (checked: boolean) => void; onToggle: (id: string, checked: boolean) => void; onSingleReview: (id: string, status: "approved" | "rejected") => void; classes: ReturnType<typeof useEvaluation>["classes"]; children: React.ReactNode }) {
  return <div className="flex flex-col gap-4"><div className="flex flex-wrap items-center gap-2">{children}</div>{rows.length === 0 ? <EmptyState icon={Users} title="暂未收到学生报名" description="学生提交报名后，会在此处显示报名时间、审核状态和积分消耗。" /> : <div className="overflow-x-auto rounded-xl border border-[#e0e6f7]"><table className="w-full min-w-[760px] border-collapse text-left"><caption className="sr-only">活动学生报名数据与审核状态</caption><thead><tr className="border-b border-[#e4e9f7] bg-[#f7f9ff] text-xs font-bold text-muted-foreground"><th scope="col" className="w-12 px-3 py-3"><Checkbox checked={allPendingSelected} disabled={!rows.some((item) => item.status === "pending")} onCheckedChange={(checked) => onToggleAll(checked === true)} aria-label="全选待审核报名" /></th><th scope="col" className="w-40 px-3 py-3">报名时间</th><th scope="col" className="px-3 py-3">学生信息</th><th scope="col" className="w-28 px-3 py-3">审核状态</th><th scope="col" className="w-28 px-3 py-3 text-right">消耗积分</th><th scope="col" className="w-40 px-3 py-3 text-right">操作</th></tr></thead><tbody>{rows.map((row) => { const meta = statusLabel(row.status); const className = classes.find((item) => item.id === row.classId)?.name ?? row.classId; const pending = row.status === "pending"; return <tr key={row.id} className="border-b border-[#edf0fa] text-sm last:border-0 hover:bg-[#fbfcff]"><td className="px-3 py-3"><Checkbox checked={selectedIds.includes(row.id)} disabled={!pending} onCheckedChange={(checked) => onToggle(row.id, checked === true)} aria-label={`选择${row.studentName}的报名`} /></td><td className="px-3 py-3 text-xs tabular-nums text-muted-foreground"><time dateTime={row.enrolledAt}>{formatDateTime(row.enrolledAt)}</time></td><td className="px-3 py-3"><p className="font-semibold text-foreground">{row.studentName}</p><p className="mt-0.5 text-xs text-muted-foreground">{className} · 学号 {row.studentId.split("-").pop()}</p></td><td className="px-3 py-3"><span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", meta.className)}>{meta.label}</span>{row.reviewNote && <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{row.reviewNote}</p>}</td><td className="px-3 py-3 text-right font-semibold tabular-nums text-brand-orange">{row.pointsCost > 0 ? `${row.pointsCost} 积分` : "—"}</td><td className="px-3 py-3 text-right">{pending ? <span className="inline-flex gap-1"><Button size="xs" variant="outline" className="bg-white" onClick={() => onSingleReview(row.id, "rejected")}>驳回</Button><Button size="xs" onClick={() => onSingleReview(row.id, "approved")}><Check className="size-3" aria-hidden="true" />通过</Button></span> : <span className="text-xs text-muted-foreground">{row.reviewerName ? `审核：${row.reviewerName}` : "已处理"}</span>}</td></tr>})}</tbody></table></div>}</div>
}

function ParticipantPanel({
  activity,
  rows,
  selectedIds,
  allSelected,
  selectableCount,
  rosterMessage,
  availableStudents,
  onImport,
  onDownloadTemplate,
  onToggleAll,
  onToggle,
  onOpenIssue,
  onAddStudent,
  classes,
}: {
  activity: Activity
  rows: ActivityParticipant[]
  selectedIds: string[]
  allSelected: boolean
  selectableCount: number
  rosterMessage: string
  availableStudents: Student[]
  onImport: () => void
  onDownloadTemplate: () => void
  onToggleAll: (checked: boolean) => void
  onToggle: (id: string, checked: boolean) => void
  onOpenIssue: () => void
  onAddStudent: (student: Student) => void
  classes: ReturnType<typeof useEvaluation>["classes"]
}) {
  const [studentQuery, setStudentQuery] = useState("")
  const normalizedQuery = studentQuery.trim().toLocaleLowerCase("zh-CN")
  const searchResults = useMemo(
    () => normalizedQuery
      ? availableStudents.filter((student) => student.name.toLocaleLowerCase("zh-CN").includes(normalizedQuery) || student.studentNo.includes(normalizedQuery)).slice(0, 8)
      : [],
    [availableStudents, normalizedQuery],
  )
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">参与学生名单</h2>
          <p className="mt-1 text-sm text-muted-foreground">共 {rows.length} 人，已发放 {rows.filter((row) => row.issuedAt).length} 人；发放后记录不可修改。</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="bg-white" onClick={onDownloadTemplate}><Download className="size-3.5" aria-hidden="true" />下载名单模板</Button>
          <Button type="button" size="sm" variant="outline" className="bg-white" onClick={onImport}><FileSpreadsheet className="size-3.5" aria-hidden="true" />导入名单</Button>
          <Button type="button" size="sm" onClick={onOpenIssue} disabled={selectedIds.length === 0}><Coins className="size-3.5" aria-hidden="true" />发放积分（{selectedIds.length}）</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.045] px-3 py-2.5 text-xs text-muted-foreground">
        <span>当前活动：<span className="font-semibold text-foreground">{activity.title}</span></span>
        <span className="hidden text-primary/35 sm:inline" aria-hidden="true">·</span>
        <span>可选发放 {selectableCount} 人</span>
        {rosterMessage && <span role="status" className="font-semibold text-primary">{rosterMessage}</span>}
      </div>
      <div className="rounded-xl border border-[#dce4fa] bg-[#fbfcff] p-3" aria-label="搜索并添加参与学生">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><label htmlFor="activity-participant-search" className="text-sm font-semibold text-foreground">搜索并添加学生</label><p className="mt-1 text-xs text-muted-foreground">支持按姓名或学号搜索，仅展示当前活动范围内尚未加入名单的学生。</p></div>
          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-[#e1e7f7]">可添加 {availableStudents.length} 人</span>
        </div>
        <div className="relative mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1"><UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input id="activity-participant-search" name="activity-participant-search" autoComplete="off" value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="输入学生姓名或学号…" className="h-10 w-full rounded-xl border border-[#d8e0f7] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></div>
          {studentQuery && <Button type="button" variant="ghost" className="min-h-10 shrink-0 px-3 text-muted-foreground" onClick={() => setStudentQuery("")}>清空</Button>}
        </div>
        {normalizedQuery && <div className="mt-2 overflow-hidden rounded-xl border border-[#e1e7f7] bg-white" aria-live="polite" aria-label="学生搜索结果">{searchResults.length > 0 ? searchResults.map((student) => <div key={student.id} className="flex flex-wrap items-center gap-2 border-b border-[#edf0fa] px-3 py-2.5 last:border-0"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{student.name}</p><p className="mt-0.5 text-xs text-muted-foreground">学号 {student.studentNo} · {classes.find((schoolClass) => schoolClass.id === student.classId)?.name ?? student.classId}</p></div><Button type="button" size="sm" className="min-h-9" onClick={() => { onAddStudent(student); setStudentQuery("") }}><UserRound className="size-3.5" aria-hidden="true" />添加</Button></div>) : <p className="px-3 py-3 text-sm text-muted-foreground" role="status">未找到可添加的学生，请检查姓名或学号。</p>}{searchResults.length === 8 && <p className="border-t border-[#edf0fa] px-3 py-2 text-[11px] text-muted-foreground">已展示前 8 条结果，请继续输入缩小范围。</p>}</div>}
      </div>
      {rows.length === 0 ? <EmptyState icon={Users} title="暂未形成参与学生名单" description="可下载模板填写学生学号后导入名单。" /> : <div className="overflow-x-auto rounded-xl border border-[#e0e6f7]"><table className="w-full min-w-[820px] border-collapse text-left"><caption className="sr-only">参与学生名单与积分发放状态</caption><thead><tr className="border-b border-[#e4e9f7] bg-[#f7f9ff] text-xs font-bold text-muted-foreground"><th scope="col" className="w-12 px-3 py-3"><Checkbox checked={allSelected} disabled={selectableCount === 0} onCheckedChange={(checked) => onToggleAll(checked === true)} aria-label="全选未发放积分的参与学生" /></th><th scope="col" className="px-3 py-3">学生信息</th><th scope="col" className="w-36 px-3 py-3">班级</th><th scope="col" className="w-28 px-3 py-3">参与状态</th><th scope="col" className="w-[280px] px-3 py-3">积分发放</th></tr></thead><tbody>{rows.map((row) => { const issued = !!row.issuedAt; const className = classes.find((item) => item.id === row.classId)?.name ?? row.classId; const indicatorPath = [row.issuedLevel1, row.issuedLevel2, row.issuedLevel3].filter(Boolean).join(" / "); return <tr key={row.id} className="border-b border-[#edf0fa] text-sm last:border-0 hover:bg-[#fbfcff]"><td className="px-3 py-3"><Checkbox checked={selectedIds.includes(row.id)} disabled={issued} onCheckedChange={(checked) => onToggle(row.id, checked === true)} aria-label={`选择${row.studentName}发放积分`} /></td><td className="px-3 py-3"><p className="font-semibold text-foreground">{row.studentName}</p><p className="mt-0.5 text-xs text-muted-foreground">学号 {row.studentId.split("-").pop()}</p></td><td className="px-3 py-3 text-sm text-muted-foreground">{className}</td><td className="px-3 py-3"><span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", issued ? "bg-brand-green/15 text-brand-green" : "bg-[#fff4e4] text-brand-orange")}>{issued ? "已参与" : "待发放"}</span></td><td className="px-3 py-3">{issued ? <div className="flex items-start gap-2 text-xs"><LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-brand-green" aria-hidden="true" /><div><p className="font-semibold text-brand-green">{row.issuedPoints} 分 · 已锁定</p><p className="mt-0.5 max-w-[250px] truncate text-muted-foreground" title={indicatorPath}>{indicatorPath}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{row.issuedBy} · {row.issuedAt ? formatDateTime(row.issuedAt) : ""}</p></div></div> : <span className="text-xs text-muted-foreground">勾选后统一选择指标和分数</span>}</td></tr>})}</tbody></table></div>}
    </div>
  )
}

function PointAwardDialog({ open, onOpenChange, selectedCount, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; selectedCount: number; onSubmit: (config: ActivityPointAwardConfig) => void }) {
  const [level1, setLevel1] = useState("")
  const [level2, setLevel2] = useState("")
  const [level3, setLevel3] = useState("")
  const [points, setPoints] = useState("1")
  const [error, setError] = useState("")
  const level1Group = AWARD_GROUPS.find((group) => group.level1 === level1)
  const level2Group = level1Group?.items.find((group) => group.level2 === level2)

  useEffect(() => {
    if (!open) {
      setLevel1("")
      setLevel2("")
      setLevel3("")
      setPoints("1")
      setError("")
    }
  }, [open])

  const submit = () => {
    const selectedIndicator = level2Group?.items.find((item) => item.level3 === level3)
    const safePoints = Number(points)
    if (!level1 || !level1Group) return setError("请选择一级指标")
    if (!level2 || !level2Group) return setError("请选择二级指标")
    if (!level3 || !selectedIndicator) return setError("请选择三级指标")
    if (!Number.isInteger(safePoints) || safePoints <= 0) return setError("发放积分需为大于 0 的整数")
    onSubmit({ indicatorId: selectedIndicator.id, level1, level2, level3, points: safePoints })
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl rounded-2xl border border-[#c8d4f7] p-0"><DialogHeader className="border-b border-[#e2e7f8] bg-[#fbfcff] px-5 py-4"><DialogTitle>批量发放参与积分</DialogTitle><DialogDescription>已选择 {selectedCount} 名学生。确认发放后不可修改，请核对指标和分数。</DialogDescription></DialogHeader><div className="flex flex-col gap-4 px-5 py-5"><div className="grid gap-3 sm:grid-cols-3"><div className="flex flex-col gap-1.5"><Label htmlFor="activity-award-level1">一级指标 <span className="text-destructive">*</span></Label><Select value={level1} onValueChange={(value) => { setLevel1(String(value ?? "")); setLevel2(""); setLevel3(""); setError("") }}><SelectTrigger id="activity-award-level1" aria-label="选择积分一级指标"><SelectValue placeholder="请选择" /></SelectTrigger><SelectContent>{AWARD_GROUPS.map((group) => <SelectItem key={group.level1} value={group.level1}>{group.level1}</SelectItem>)}</SelectContent></Select></div><div className="flex flex-col gap-1.5"><Label htmlFor="activity-award-level2">二级指标 <span className="text-destructive">*</span></Label><Select value={level2} disabled={!level1} onValueChange={(value) => { setLevel2(String(value ?? "")); setLevel3(""); setError("") }}><SelectTrigger id="activity-award-level2" aria-label="选择积分二级指标"><SelectValue placeholder="请选择" /></SelectTrigger><SelectContent>{level1Group?.items.map((group) => <SelectItem key={group.level2} value={group.level2}>{group.level2}</SelectItem>)}</SelectContent></Select></div><div className="flex flex-col gap-1.5"><Label htmlFor="activity-award-level3">三级指标 <span className="text-destructive">*</span></Label><Select value={level3} disabled={!level2} onValueChange={(value) => { setLevel3(String(value ?? "")); setError("") }}><SelectTrigger id="activity-award-level3" aria-label="选择积分三级指标"><SelectValue placeholder="请选择" /></SelectTrigger><SelectContent>{level2Group?.items.map((item) => <SelectItem key={item.id} value={item.level3}>{item.level3}</SelectItem>)}</SelectContent></Select></div></div><div className="flex flex-col gap-1.5 sm:w-48"><Label htmlFor="activity-award-points">发放积分 <span className="text-destructive">*</span></Label><div className="relative"><input id="activity-award-points" name="activity-award-points" autoComplete="off" type="number" min={1} step={1} inputMode="numeric" value={points} onChange={(event) => setPoints(event.target.value)} className="h-10 w-full rounded-xl border border-[#d8e0f7] bg-white px-3 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">分/人</span></div></div>{error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}</div><DialogFooter className="border-t border-[#e2e7f8] bg-white px-5 py-4"><Button type="button" variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>取消</Button><Button type="button" onClick={submit}>确认发放 {selectedCount} 人</Button></DialogFooter></DialogContent></Dialog>
}

function SubmissionPanel({ activity, submissions, classes, students, currentTeacherName, open, onOpenChange, onSubmit }: { activity: Activity; submissions: ActivitySubmission[]; classes: ReturnType<typeof useEvaluation>["classes"]; students: ReturnType<typeof useEvaluation>["students"]; currentTeacherName?: string; open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (submission: Omit<ActivitySubmission, "id" | "createdAt">) => void }) {
  const studentCount = new Set(submissions.map((item) => item.studentId)).size
  return <div className="flex flex-col gap-4"><div className="flex flex-wrap items-center gap-3"><div><h2 className="text-base font-bold text-foreground">活动成果</h2><p className="mt-1 text-sm text-muted-foreground">已收集 {studentCount} 名学生、{submissions.length} 条成果记录。</p></div><Button className="ml-auto" onClick={() => onOpenChange(true)}><Upload className="size-4" aria-hidden="true" />上传活动成果</Button></div>{submissions.length === 0 ? <EmptyState icon={FileText} title="暂未上传活动成果" description="学生上传后会自动展示；班主任也可代学生补充上传。" /> : <div className="data-card-grid gap-3">{submissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} className={classes.find((item) => item.id === submission.classId)?.name ?? submission.classId} />)}</div>}<ActivitySubmissionDrawer activity={activity} students={students} teacherName={currentTeacherName} open={open} onOpenChange={onOpenChange} onSubmit={onSubmit} /></div>
}

function SubmissionCard({ submission, className }: { submission: ActivitySubmission; className: string }) {
  const homeroomUpload = submission.submittedBy === "homeroom"
  return <article className="overflow-hidden rounded-xl border border-[#dde5f8] bg-white shadow-[0_10px_22px_-24px_rgba(53,67,150,.8)]"><div className="flex items-start gap-2.5 border-b border-[#edf0fa] bg-[#fbfcff] px-3 py-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UserRound className="size-4" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{submission.studentName}</p><p className="mt-0.5 text-xs text-muted-foreground">{className} · {formatDateTime(submission.createdAt)}</p></div><span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", homeroomUpload ? "bg-[#fff2e6] text-brand-orange" : "bg-primary/10 text-primary")}>{homeroomUpload ? `班主任代传${submission.submittedByName ? ` · ${submission.submittedByName}` : ""}` : "学生上传"}</span></div><div className="p-3">{submission.content ? <p className="min-h-10 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{submission.content}</p> : <p className="min-h-10 text-sm text-muted-foreground">未填写文字成果</p>}{submission.imageUrls.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{submission.imageUrls.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${submission.studentName} 上传的活动图片 ${index + 1}`} width={160} height={120} loading="lazy" className="aspect-square w-full rounded-lg border border-[#e0e6f7] object-cover" />)}</div>}</div></article>
}

function ActivitySubmissionDrawer({ activity, students, teacherName, open, onOpenChange, onSubmit }: { activity: Activity; students: ReturnType<typeof useEvaluation>["students"]; teacherName?: string; open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (submission: Omit<ActivitySubmission, "id" | "createdAt">) => void }) {
  const [studentId, setStudentId] = useState("")
  const [content, setContent] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => { if (open) { setStudentId(""); setContent(""); setImages([]); setError("") } }, [open, activity.id])
  const handlePickImages = async (files: FileList | null) => { if (!files?.length) return; const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/")); if (imageFiles.length === 0) { setError("请选择图片文件"); return }; setBusy(true); setError(""); try { const dataUrls = await Promise.all(imageFiles.slice(0, 9 - images.length).map(fileToDataUrl)); setImages((current) => [...current, ...dataUrls].slice(0, 9)) } catch { setError("图片读取失败，请重新选择") } finally { setBusy(false) } }
  const handleSubmit = () => { const student = students.find((item) => item.id === studentId); if (!student) { setError("请选择本班学生"); return }; onSubmit({ activityId: activity.id, studentId: student.id, studentName: student.name, classId: student.classId, type: images.length > 0 ? "photo" : "practice", content: content.trim(), imageUrls: images, submittedBy: "homeroom", submittedByName: teacherName }); onOpenChange(false) }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="!top-0 !right-0 !left-auto !flex !h-[100dvh] !w-full !max-w-full !translate-x-0 !translate-y-0 !flex-col gap-0 overflow-hidden overscroll-contain rounded-none border-l border-[#d7def8] bg-[#fbfcff] p-0 shadow-[-16px_0_42px_rgba(64,80,166,.18)] sm:!w-[560px] sm:!max-w-[70vw]"><DialogHeader className="shrink-0 border-b border-[#e2e7f8] bg-white px-5 py-5 pr-12 sm:px-6"><DialogTitle className="flex items-center gap-2 text-lg text-foreground"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Upload className="size-4" aria-hidden="true" /></span>代学生上传活动成果</DialogTitle><DialogDescription className="mt-3 rounded-xl border border-primary/15 bg-primary/[0.06] px-3 py-2.5 text-sm font-semibold text-foreground">{activity.title}</DialogDescription></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"><div className="flex flex-col gap-5"><div className="flex flex-col gap-2"><Label htmlFor="activity-submission-student">选择本班学生 <span className="text-destructive">*</span></Label><select id="activity-submission-student" name="activity-submission-student" value={studentId} onChange={(event) => { setStudentId(event.target.value); setError("") }} className="h-10 rounded-xl border border-[#d8e0f7] bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"><option value="">请选择学生</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.studentNo}号</option>)}</select>{students.length === 0 && <p className="text-xs text-destructive">当前没有可代传成果的本班学生。</p>}</div><div className="flex flex-col gap-2"><div className="flex items-center justify-between gap-3"><Label>活动图片 <span className="font-normal text-muted-foreground">（非必填）</span></Label><span className="text-xs text-muted-foreground">最多 9 张</span></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{images.map((url, index) => <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-[#dce3f8] bg-white"><img src={url} alt={`待上传活动图片 ${index + 1}`} width={160} height={160} className="size-full object-cover" /><button type="button" onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-slate-950/65 text-white transition hover:bg-slate-950/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`删除活动图片 ${index + 1}`}><X className="size-3.5" aria-hidden="true" /></button></div>)}{images.length < 9 && <label className={cn("flex aspect-square min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 bg-primary/[0.035] px-2 text-center text-xs font-medium text-primary transition hover:border-primary hover:bg-primary/[0.08]", busy && "cursor-wait opacity-70")}><input type="file" name="activity-submission-images" accept="image/*" multiple className="sr-only" onChange={(event) => handlePickImages(event.target.files)} disabled={busy} /><span className="flex size-9 items-center justify-center rounded-full bg-white text-primary shadow-sm"><ImagePlus className="size-4" aria-hidden="true" /></span>{busy ? "正在读取…" : "上传图片"}</label>}</div></div><div className="flex flex-col gap-2"><Label htmlFor="activity-submission-content">活动成果 <span className="font-normal text-muted-foreground">（非必填）</span></Label><Textarea id="activity-submission-content" name="activity-submission-content" value={content} onChange={(event) => setContent(event.target.value)} placeholder="可补充活动收获、完成情况或教师观察…" rows={7} maxLength={500} className="min-h-36 resize-y border-[#d9e0f7] bg-white leading-6 focus-visible:border-primary" /><p className="text-right text-xs text-muted-foreground">{content.length}/500</p></div>{error && <p aria-live="polite" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</p>}</div></div><DialogFooter className="shrink-0 border-t border-[#e2e7f8] bg-white px-5 py-4 sm:px-6"><Button type="button" variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>取消</Button><Button type="button" onClick={handleSubmit} disabled={busy || students.length === 0}><ImageIcon className="size-4" aria-hidden="true" />提交成果</Button></DialogFooter></DialogContent></Dialog>
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof FileText; title: string; description: string }) { return <div className="rounded-xl border border-dashed border-[#ced8f4] bg-[#fbfcff] px-4 py-12 text-center"><Icon className="mx-auto size-7 text-primary/45" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div> }
