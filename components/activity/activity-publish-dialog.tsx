"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"
import { formatDate } from "@/lib/scoring-utils"
import { cn } from "@/lib/utils"
import type { Activity } from "@/lib/types"

interface ActivityPublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 编辑模式时传入原活动 */
  activity?: Activity | null
}

function todayPlus(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return formatDate(d)
}

const FIELD = "glass-panel h-9 rounded-xl border-border/60 bg-transparent"

export function ActivityPublishDialog({
  open,
  onOpenChange,
  activity,
}: ActivityPublishDialogProps) {
  const { grades, classes, addActivity, updateActivity } = useEvaluation()
  const { role, awardClasses } = usePermission()
  const isEdit = !!activity

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [level1, setLevel1] = useState(AWARD_LEVEL1_LIST[0])
  const [gradeIds, setGradeIds] = useState<string[]>([])
  const [classIds, setClassIds] = useState<string[]>([])
  const [enrollStart, setEnrollStart] = useState(todayPlus(0))
  const [enrollEnd, setEnrollEnd] = useState(todayPlus(5))
  const [startDate, setStartDate] = useState(todayPlus(7))
  const [endDate, setEndDate] = useState(todayPlus(14))
  const [pointsCost, setPointsCost] = useState("0")
  const [capacity, setCapacity] = useState("0")
  const [location, setLocation] = useState("")
  const [error, setError] = useState<string | null>(null)

  // 年级组长只能发布本年级活动：可发布年级 = 发卡范围班级所在年级（本年级）
  const allowedGradeIds = useMemo(() => {
    if (role !== "grade_leader") return null // null = 不限
    return new Set(awardClasses.map((c) => c.gradeId))
  }, [role, awardClasses])

  useEffect(() => {
    if (!open) return
    if (activity) {
      setTitle(activity.title)
      setDescription(activity.description)
      setLevel1(activity.level1)
      // 年级组长编辑时，清洗掉不在本年级的年级/班级（防御越权）
      const safeGrades = allowedGradeIds
        ? activity.gradeIds.filter((gid) => allowedGradeIds.has(gid))
        : activity.gradeIds
      setGradeIds(safeGrades)
      setClassIds(
        activity.classIds.filter((cid) => {
          const cls = classes.find((c) => c.id === cid)
          return cls && (!allowedGradeIds || allowedGradeIds.has(cls.gradeId))
        }),
      )
      setEnrollStart(activity.enrollStart)
      setEnrollEnd(activity.enrollEnd)
      setStartDate(activity.startDate)
      setEndDate(activity.endDate)
      setPointsCost(String(activity.pointsCost))
      setCapacity(String(activity.capacity))
      setLocation(activity.location)
    } else {
      setTitle("")
      setDescription("")
      setLevel1(AWARD_LEVEL1_LIST[0])
      setGradeIds([])
      setClassIds([])
      setEnrollStart(todayPlus(0))
      setEnrollEnd(todayPlus(5))
      setStartDate(todayPlus(7))
      setEndDate(todayPlus(14))
      setPointsCost("0")
      setCapacity("0")
      setLocation("")
    }
    setError(null)
  }, [open, activity, allowedGradeIds, classes])

  const selectableGrades = useMemo(
    () => grades.filter((g) => !allowedGradeIds || allowedGradeIds.has(g.id)),
    [grades, allowedGradeIds],
  )

  // 选择年级时，剔除不在已选年级下的班级
  const classesByGrade = useMemo(() => {
    const map = new Map<string, typeof classes>()
    for (const c of classes) {
      if (allowedGradeIds && !allowedGradeIds.has(c.gradeId)) continue
      const list = map.get(c.gradeId)
      if (list) list.push(c)
      else map.set(c.gradeId, [c])
    }
    return map
  }, [classes, allowedGradeIds])

  const toggleGrade = (gradeId: string) => {
    setGradeIds((prev) => {
      const next = prev.includes(gradeId)
        ? prev.filter((id) => id !== gradeId)
        : [...prev, gradeId]
      // 移除不再被年级覆盖的班级
      setClassIds((classPrev) =>
        classPrev.filter((cid) => {
          const cls = classes.find((c) => c.id === cid)
          return cls && next.includes(cls.gradeId)
        }),
      )
      return next
    })
  }

  const toggleClass = (classId: string) => {
    setClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    )
  }

  const toggleGradeAll = (gradeId: string) => {
    const list = classesByGrade.get(gradeId) ?? []
    const allIn = list.every((c) => classIds.includes(c.id))
    setClassIds((prev) => {
      const ids = list.map((c) => c.id)
      return allIn ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    })
  }

  const handleSubmit = () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return setError("请填写活动名称")
    if (!description.trim()) return setError("请填写活动简介")
    if (allowedGradeIds && !gradeIds.every((gid) => allowedGradeIds.has(gid))) {
      return setError("年级组长只能发布本年级的活动")
    }
    if (gradeIds.length === 0) return setError("请至少选择一个参与年级")
    if (classIds.length === 0) return setError("请在所选年级下至少选择一个班级")
    if (enrollStart > enrollEnd) return setError("报名开始时间不能晚于结束时间")
    if (startDate > endDate) return setError("活动开始时间不能晚于结束时间")
    if (enrollEnd > startDate) return setError("活动开始时间需晚于报名结束时间")
    const cost = Number(pointsCost)
    const cap = Number(capacity)
    if (Number.isNaN(cost) || cost < 0) return setError("积分门槛需为非负整数")
    if (Number.isNaN(cap) || cap < 0) return setError("名额上限需为非负整数")

    const payload = {
      title: trimmedTitle,
      description: description.trim(),
      level1,
      gradeIds,
      classIds,
      enrollStart,
      enrollEnd,
      startDate,
      endDate,
      pointsCost: cost,
      capacity: cap,
      location: location.trim(),
    }
    if (isEdit && activity) {
      updateActivity(activity.id, payload)
    } else {
      addActivity(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-surface max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑活动" : "发布活动"}</DialogTitle>
          <DialogDescription>
            设置参与年级与班级、积分兑换条件，发布后进入报名期。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="act-title">活动名称</Label>
            <Input
              id="act-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：校园劳动实践周"
              className={FIELD}
              maxLength={40}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="act-desc">活动简介</Label>
            <Textarea
              id="act-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="活动目标、流程与要求"
              rows={3}
              maxLength={300}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>一级指标</Label>
              <select
                value={level1}
                onChange={(e) => setLevel1(e.target.value)}
                className={cn(FIELD, "px-3")}
              >
                {AWARD_LEVEL1_LIST.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="act-loc">活动地点</Label>
              <Input
                id="act-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="如：图书馆二楼"
                className={FIELD}
              />
            </div>
          </div>

          {/* 参与年级 + 班级 */}
          <div className="glass-panel rounded-xl p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">参与年级与班级</p>
              <span className="text-xs text-muted-foreground">
                已选 {classIds.length} 个班级
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {selectableGrades.map((g) => {
                const list = classesByGrade.get(g.id) ?? []
                const gradeChecked = gradeIds.includes(g.id)
                const allIn = list.length > 0 && list.every((c) => classIds.includes(c.id))
                const someIn = classIds.some((cid) => list.some((c) => c.id === cid)) && !allIn
                return (
                  <div key={g.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={gradeChecked}
                        onCheckedChange={() => toggleGrade(g.id)}
                        aria-label={`选择 ${g.name}`}
                      />
                      <span className="text-sm font-medium text-foreground">{g.name}</span>
                      {gradeChecked && list.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleGradeAll(g.id)}
                          className="ml-auto text-xs text-primary hover:underline"
                        >
                          {allIn ? "取消全选" : "全选班级"}
                        </button>
                      )}
                    </div>
                    {gradeChecked && (
                      <div className="ml-6 flex flex-wrap gap-1.5">
                        {list.map((c) => {
                          const checked = classIds.includes(c.id)
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleClass(c.id)}
                              className={cn(
                                "rounded-lg border px-2.5 py-1 text-xs transition",
                                checked
                                  ? "border-primary bg-primary/10 font-medium text-primary"
                                  : "border-border/60 bg-transparent text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {c.shortName}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {someIn && gradeChecked && (
                      <p className="ml-6 text-[11px] text-brand-yellow">本年级部分班级未选</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 时间区间 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DateField label="报名开始" value={enrollStart} onChange={setEnrollStart} />
            <DateField label="报名结束" value={enrollEnd} onChange={setEnrollEnd} />
            <DateField label="活动开始" value={startDate} onChange={setStartDate} />
            <DateField label="活动结束" value={endDate} onChange={setEndDate} />
          </div>

          {/* 积分门槛 + 名额 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel flex flex-col gap-1.5 rounded-xl p-3">
              <Label htmlFor="act-cost" className="flex items-center gap-1">
                <CalendarDays className="size-3.5 text-brand-orange" />
                积分兑换门槛
              </Label>
              <Input
                id="act-cost"
                type="number"
                min={0}
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value)}
                className={FIELD}
              />
              <p className="text-[11px] text-muted-foreground">
                报名时从学生奖卡积分余额扣除，0 表示不限制
              </p>
            </div>
            <div className="glass-panel flex flex-col gap-1.5 rounded-xl p-3">
              <Label htmlFor="act-cap">名额上限</Label>
              <Input
                id="act-cap"
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={FIELD}
              />
              <p className="text-[11px] text-muted-foreground">0 表示不限名额</p>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>{isEdit ? "保存修改" : "发布活动"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD}
      />
    </div>
  )
}
