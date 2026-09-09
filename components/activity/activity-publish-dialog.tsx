"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, ChevronLeft, ChevronRight, CircleDollarSign, MapPin, Plus, ShieldCheck, UsersRound, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"
import { cn } from "@/lib/utils"
import type { Activity, ActivityPointRequirement } from "@/lib/types"

interface ActivityPublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity?: Activity | null
}

const FIELD = "h-10 rounded-xl border-[#d8e0f7] bg-[#fbfcff] shadow-[0_6px_14px_-16px_rgba(53,67,150,0.75)]"

function localDateTime(offset: number, hour: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  date.setHours(hour, 0, 0, 0)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDateTimeInput(value: string, fallback: string) {
  if (!value) return fallback
  return value.includes("T") ? value.slice(0, 16) : `${value}T09:00`
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#dce4fa] bg-white px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
          checked ? "bg-primary" : "bg-[#cdd6ee]",
        )}
      >
        <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", checked && "translate-x-5")} />
      </button>
    </div>
  )
}

export function ActivityPublishDialog({ open, onOpenChange, activity }: ActivityPublishDialogProps) {
  const { grades, classes, addActivity, updateActivity } = useEvaluation()
  const { role, awardClasses } = usePermission()
  const isEdit = !!activity

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([])
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [requiresEnrollment, setRequiresEnrollment] = useState(false)
  const [requiresPointsExchange, setRequiresPointsExchange] = useState(false)
  const [enrollStart, setEnrollStart] = useState(localDateTime(0, 9))
  const [enrollEnd, setEnrollEnd] = useState(localDateTime(5, 18))
  const [startDate, setStartDate] = useState(localDateTime(7, 9))
  const [endDate, setEndDate] = useState(localDateTime(7, 11))
  const [pointsCost, setPointsCost] = useState("1")
  const [capacity, setCapacity] = useState("0")
  const [pointRequirements, setPointRequirements] = useState<ActivityPointRequirement[]>([])
  const [location, setLocation] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  const allowedGradeIds = useMemo(() => {
    if (role !== "moral_director") return null
    return new Set(awardClasses.map((item) => item.gradeId))
  }, [role, awardClasses])

  const selectableGrades = useMemo(
    () => grades.filter((grade) => !allowedGradeIds || allowedGradeIds.has(grade.id)),
    [grades, allowedGradeIds],
  )

  const selectableClasses = useMemo(
    () => classes.filter((item) => selectedGradeIds.includes(item.gradeId) && (!allowedGradeIds || allowedGradeIds.has(item.gradeId))),
    [classes, selectedGradeIds, allowedGradeIds],
  )

  useEffect(() => {
    if (!open) return
    if (activity) {
      const safeClassIds = activity.classIds.filter((classId) => {
        const item = classes.find((classItem) => classItem.id === classId)
        return !!item && (!allowedGradeIds || allowedGradeIds.has(item.gradeId))
      })
      const safeGradeIds = activity.gradeIds.filter((gradeId) => !allowedGradeIds || allowedGradeIds.has(gradeId))
      const classGradeIds = safeClassIds
        .map((classId) => classes.find((item) => item.id === classId)?.gradeId)
        .filter((gradeId): gradeId is string => !!gradeId)
      setTitle(activity.title)
      setDescription(activity.description)
      setSelectedGradeIds(Array.from(new Set([...safeGradeIds, ...classGradeIds])))
      setSelectedClassIds(safeClassIds)
      setRequiresEnrollment(activity.requiresEnrollment !== false)
      setRequiresPointsExchange(activity.requiresPointsExchange ?? activity.pointsCost > 0)
      setEnrollStart(toDateTimeInput(activity.enrollStart, localDateTime(0, 9)))
      setEnrollEnd(toDateTimeInput(activity.enrollEnd, localDateTime(5, 18)))
      setStartDate(toDateTimeInput(activity.startDate, localDateTime(7, 9)))
      setEndDate(toDateTimeInput(activity.endDate, localDateTime(7, 11)))
      setPointsCost(String(activity.pointsCost || 1))
      setCapacity(String(activity.capacity))
      setPointRequirements(activity.pointRequirements ?? [])
      setLocation(activity.location)
    } else {
      setTitle("")
      setDescription("")
      setSelectedGradeIds([])
      setSelectedClassIds([])
      setRequiresEnrollment(false)
      setRequiresPointsExchange(false)
      setEnrollStart(localDateTime(0, 9))
      setEnrollEnd(localDateTime(5, 18))
      setStartDate(localDateTime(7, 9))
      setEndDate(localDateTime(7, 11))
      setPointsCost("1")
      setCapacity("0")
      setPointRequirements([])
      setLocation("")
    }
    setError(null)
    setStep(1)
  }, [open, activity, allowedGradeIds, classes])

  useEffect(() => {
    setSelectedClassIds((current) => current.filter((classId) => selectableClasses.some((item) => item.id === classId)))
  }, [selectableClasses])

  const toggleGrade = (gradeId: string) => {
    setSelectedGradeIds((current) => current.includes(gradeId) ? current.filter((id) => id !== gradeId) : [...current, gradeId])
  }

  const toggleClass = (classId: string) => {
    setSelectedClassIds((current) => current.includes(classId) ? current.filter((id) => id !== classId) : [...current, classId])
  }

  const addRequirement = () => {
    const firstAvailable = AWARD_LEVEL1_LIST.find((item) => !pointRequirements.some((requirement) => requirement.level1 === item))
    if (!firstAvailable) return
    setPointRequirements((current) => [...current, { level1: firstAvailable, minimumPoints: 1 }])
  }

  const updateRequirement = (index: number, patch: Partial<ActivityPointRequirement>) => {
    setPointRequirements((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  const validateBasic = () => {
    const trimmedTitle = title.trim()
    const trimmedLocation = location.trim()
    if (!trimmedTitle) return setError("请填写活动名称")
    if (!description.trim()) return setError("请填写活动内容")
    if (!trimmedLocation) return setError("请填写活动地点")
    if (selectedGradeIds.length === 0) return setError("请选择至少一个面向年级")
    if (selectedClassIds.length === 0) return setError("请选择至少一个面向班级")
    if (allowedGradeIds && selectedGradeIds.some((gradeId) => !allowedGradeIds.has(gradeId))) return setError("德育主任只能发布本年级活动")
    if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) return setError("请正确设置活动开始与结束时间")
    return true
  }

  const handleNext = () => {
    if (validateBasic()) {
      setError(null)
      setStep(2)
    }
  }

  const handleSubmit = () => {
    if (!validateBasic()) return
    const trimmedTitle = title.trim()
    const trimmedLocation = location.trim()

    const cap = Number(capacity)
    if (!Number.isInteger(cap) || cap < 0) return setError("名额上限需为非负整数")

    let cost = 0
    if (requiresEnrollment) {
      if (!enrollStart || !enrollEnd || new Date(enrollStart) > new Date(enrollEnd)) {
        return setError("请正确设置报名开始与结束时间")
      }
      if (new Date(enrollEnd) > new Date(startDate)) return setError("活动开始时间需晚于报名结束时间")
      if (requiresPointsExchange) {
        cost = Number(pointsCost)
        if (!Number.isInteger(cost) || cost <= 0) return setError("积分兑换需设置大于 0 的报名消耗积分")
        const duplicate = new Set(pointRequirements.map((item) => item.level1)).size !== pointRequirements.length
        if (duplicate) return setError("附加条件不能重复选择同一个一级指标")
        if (pointRequirements.some((item) => !Number.isInteger(item.minimumPoints) || item.minimumPoints <= 0)) {
          return setError("附加条件的学期积分需为大于 0 的整数")
        }
      }
    }

    const payload = {
      title: trimmedTitle,
      description: description.trim(),
      gradeIds: selectedGradeIds,
      classIds: selectedClassIds,
      requiresEnrollment,
      requiresPointsExchange: requiresEnrollment && requiresPointsExchange,
      pointRequirements: requiresEnrollment && requiresPointsExchange ? pointRequirements : [],
      enrollStart: requiresEnrollment ? enrollStart : "",
      enrollEnd: requiresEnrollment ? enrollEnd : "",
      startDate,
      endDate,
      pointsCost: requiresEnrollment && requiresPointsExchange ? cost : 0,
      capacity: requiresEnrollment ? cap : 0,
      location: trimmedLocation,
    }
    if (isEdit && activity) updateActivity(activity.id, payload)
    else addActivity(payload)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[26px] border border-[#c8d4f7] bg-white p-0 shadow-[0_32px_80px_-34px_rgba(41,61,148,0.68)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-3xl">
        <DialogHeader className="relative overflow-hidden border-b border-[#dce4fa] bg-[radial-gradient(circle_at_top_right,rgba(170,187,255,0.36),transparent_40%),linear-gradient(105deg,#edf2ff_0%,#ffffff_57%,#f8f4ff_100%)] px-5 py-5 sm:px-7">
          <span className="absolute -right-8 -top-10 size-32 rounded-full border border-primary/10 bg-primary/[0.035]" aria-hidden="true" />
          <div className="relative">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">{isEdit ? "编辑活动" : "发布活动"}</DialogTitle>
            <DialogDescription className="mt-1">填写活动信息，并按需设置报名规则。</DialogDescription>
          </div>
        </DialogHeader>

        <div className="bg-[#fbfcff] px-5 py-5 sm:px-7">
          {step === 1 ? (
            <section className="rounded-2xl border border-[#dce4fa] bg-[#fbfcff] p-4" aria-labelledby="activity-basic-title">
              <SectionTitle icon={CalendarClock} title="活动信息" id="activity-basic-title" description="填写活动内容、时间和面向班级。" />
              <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="act-title">活动名称 <span className="text-destructive">*</span></Label><Input id="act-title" name="activity-title" autoComplete="off" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="如：校园劳动实践周" className={FIELD} maxLength={40} /></div>
                <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="act-location">活动地点 <span className="text-destructive">*</span></Label><Input id="act-location" name="activity-location" autoComplete="off" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="如：图书馆二楼阅览室" className={FIELD} maxLength={60} /></div>
                <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="act-content">活动内容 <span className="text-destructive">*</span></Label><Textarea id="act-content" name="activity-content" autoComplete="off" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="说明活动目标、流程、参与要求及成果提交方式…" rows={3} maxLength={500} className="resize-none rounded-xl border-[#d8e0f7] bg-white" /></div>
                <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2"><DateTimeField label="活动开始时间" id="act-start" value={startDate} onChange={setStartDate} /><DateTimeField label="活动结束时间" id="act-end" value={endDate} onChange={setEndDate} /></div>
              </div>
              <div className="mt-4 border-t border-[#dce4fa] pt-4">
                <SectionTitle icon={UsersRound} title="面向对象" id="activity-target-title" description="年级、班级均可多选；班级会随已选年级联动显示。" />
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <MultiSelectDropdown label="面向年级" description="请选择活动覆盖的年级" items={selectableGrades} selectedIds={selectedGradeIds} onToggle={toggleGrade} />
                  <MultiSelectDropdown label="面向班级" description={selectedGradeIds.length > 0 ? "可从已选年级中选择多个班级" : "请先选择至少一个年级"} items={selectableClasses} selectedIds={selectedClassIds} onToggle={toggleClass} disabled={selectedGradeIds.length === 0} emptyMessage="所选年级暂无可用班级" />
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-[#cfdaf8] bg-[#f7f9ff] p-4" aria-labelledby="activity-enrollment-title">
              <SectionTitle icon={ShieldCheck} title="报名规则" id="activity-enrollment-title" description="默认无需报名；仅在开启时填写报名窗口和积分规则。" />
              <div className="mt-4 flex flex-col gap-3">
                <ToggleRow label="需要活动报名" description="关闭后活动直接面向所选班级开放，不设置报名时间。" checked={requiresEnrollment} onChange={(checked) => { setRequiresEnrollment(checked); if (!checked) setRequiresPointsExchange(false) }} />
                {!requiresEnrollment ? <div className="rounded-xl border border-dashed border-brand-green/30 bg-brand-green/5 px-3.5 py-3 text-sm text-brand-green">本活动发布后，学生无需报名即可按活动时间直接参加。</div> : <div className="flex flex-col gap-3 rounded-xl border border-[#dce4fa] bg-white p-3.5"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><DateTimeField label="报名开始时间" id="act-enroll-start" value={enrollStart} onChange={setEnrollStart} /><DateTimeField label="报名结束时间" id="act-enroll-end" value={enrollEnd} onChange={setEnrollEnd} /></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]"><div className="flex flex-col gap-1.5"><Label htmlFor="act-capacity">名额上限</Label><Input id="act-capacity" name="activity-capacity" autoComplete="off" type="number" inputMode="numeric" min={0} value={capacity} onChange={(event) => setCapacity(event.target.value)} className={FIELD} /><p className="text-xs text-muted-foreground">0 表示不限名额。</p></div><ToggleRow label="报名需要积分兑换" description="开启后可设置消耗积分和本学期积分门槛。" checked={requiresPointsExchange} onChange={setRequiresPointsExchange} /></div>{requiresPointsExchange && <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3"><div className="flex flex-wrap items-end justify-between gap-3"><div className="flex flex-col gap-1.5"><Label htmlFor="act-cost" className="flex items-center gap-1.5"><CircleDollarSign className="size-4 text-primary" aria-hidden="true" />报名消耗总积分</Label><Input id="act-cost" name="activity-points-cost" autoComplete="off" type="number" inputMode="numeric" min={1} value={pointsCost} onChange={(event) => setPointsCost(event.target.value)} className={cn(FIELD, "w-40")} /></div><Button type="button" size="sm" variant="outline" className="bg-white" onClick={addRequirement} disabled={pointRequirements.length >= AWARD_LEVEL1_LIST.length}><Plus className="size-3.5" />添加一级指标条件</Button></div><p className="mt-3 text-xs text-muted-foreground">可添加多个一级指标，报名学生本学期获得积分须达到设定分值。</p><div className="mt-3 flex flex-col gap-2">{pointRequirements.length > 0 ? pointRequirements.map((requirement, index) => <div key={`${requirement.level1}-${index}`} className="grid grid-cols-[minmax(0,1fr)_100px_36px] items-end gap-2 rounded-xl border border-[#dce4fa] bg-white p-2.5"><div className="flex flex-col gap-1.5"><Label className="text-[11px] text-muted-foreground">一级指标</Label><Select value={requirement.level1} onValueChange={(value) => updateRequirement(index, { level1: String(value ?? "") })}><SelectTrigger aria-label="选择附加条件一级指标" className="h-9 w-full px-2.5 text-xs"><SelectValue /></SelectTrigger><SelectContent>{AWARD_LEVEL1_LIST.map((item) => <SelectItem key={item} value={item} disabled={item !== requirement.level1 && pointRequirements.some((current, currentIndex) => currentIndex !== index && current.level1 === item)}>{item}</SelectItem>)}</SelectContent></Select></div><div className="flex flex-col gap-1.5"><Label htmlFor={`act-requirement-points-${index}`} className="text-[11px] text-muted-foreground">最低积分</Label><Input id={`act-requirement-points-${index}`} name={`activity-requirement-points-${index}`} autoComplete="off" type="number" inputMode="numeric" min={1} value={String(requirement.minimumPoints)} onChange={(event) => updateRequirement(index, { minimumPoints: Number(event.target.value) })} className="h-9 rounded-lg border-[#d8e0f7] bg-white px-2 text-xs" /></div><Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`删除${requirement.level1}积分条件`} onClick={() => setPointRequirements((current) => current.filter((_, currentIndex) => currentIndex !== index))}><X className="size-4" /></Button></div>) : <p className="rounded-xl border border-dashed border-[#cfdaf8] bg-white/70 px-3 py-2.5 text-xs text-muted-foreground">尚未添加附加条件，仅校验报名消耗总积分。</p>}</div></div>}</div>}
              </div>
            </section>
          )}
          {error && <p role="alert" className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter className="sticky bottom-0 border-[#dce4fa] bg-white/95 px-5 py-4 shadow-[0_-10px_24px_-24px_rgba(53,67,150,0.5)] backdrop-blur sm:px-7">
          {step === 1 ? <Button type="button" variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>取消</Button> : <Button type="button" variant="outline" className="bg-transparent" onClick={() => { setError(null); setStep(1) }}><ChevronLeft className="size-4" />上一步</Button>}
          {step === 1 ? <Button type="button" onClick={handleNext}>下一步<ChevronRight className="size-4" /></Button> : <Button type="button" onClick={handleSubmit}>{isEdit ? "保存修改" : "发布活动"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SectionTitle({ icon: Icon, title, description, id }: { icon: typeof CalendarClock; title: string; description: string; id: string }) {
  return <div className="flex items-start gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" aria-hidden="true" /></span><div><p id={id} className="text-sm font-bold text-foreground">{title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p></div></div>
}

function DateTimeField({ label, id, value, onChange }: { label: string; id: string; value: string; onChange: (value: string) => void }) {
  return <div className="flex flex-col gap-1.5"><Label htmlFor={id}>{label} <span className="text-destructive">*</span></Label><Input id={id} name={id} autoComplete="off" type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className={FIELD} /></div>
}
