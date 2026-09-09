"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ImagePlus, Loader2, Medal, Sparkles, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"
import { formatDate } from "@/lib/scoring-utils"
import type { HonorLevel, HonorRecord } from "@/lib/types"

/** 荣誉级别 -> 加分 */
const HONOR_LEVELS: { value: HonorLevel; label: string; points: number }[] = [
  { value: "school", label: "校级", points: 1 },
  { value: "district", label: "区级", points: 2 },
  { value: "city", label: "市级", points: 3 },
  { value: "national", label: "国家级及以上", points: 4 },
]

const HONOR_LEVEL_LABEL: Record<HonorLevel, string> = {
  school: "校级",
  district: "区级",
  city: "市级",
  national: "国家级及以上",
}

const HONOR_LEVEL_STYLE: Record<HonorLevel, string> = {
  school: "border border-[#d6e2ff] bg-[#edf4ff] text-[#3972c9]",
  district: "border border-[#cdebdc] bg-[#effbf4] text-[#23815a]",
  city: "border border-[#fee0c8] bg-[#fff5ed] text-[#c66a24]",
  national: "border border-[#f4dfaa] bg-[#fff9e8] text-[#aa7815]",
}

/** 模拟 OCR 预置识别结果池（原型展示用，按上传次数轮换） */
const OCR_MOCK_POOL: { honorName: string; awardDate: string; issuer: string }[] = [
  { honorName: "2025年上海市青少年科技创新大赛一等奖", awardDate: "2025-11-18", issuer: "上海市教育委员会" },
  { honorName: "第二十一届“明珠杯”小学生数学思维竞赛金奖", awardDate: "2025-12-05", issuer: "浦东新区教育局" },
  { honorName: "2025年全国青少年人工智能创新挑战赛二等奖", awardDate: "2025-08-22", issuer: "中国少年儿童发展服务中心" },
  { honorName: "明珠临港校区第十二届艺术节优秀表演奖", awardDate: "2025-10-30", issuer: "明珠临港校区德育处" },
  { honorName: "2025年浦东新区中小学田径运动会男子400米季军", awardDate: "2025-10-12", issuer: "浦东新区体育总会" },
  { honorName: "上海市中小学生书法比赛（硬笔组）三等奖", awardDate: "2025-09-25", issuer: "上海市书法家协会青少年工作委员会" },
]

interface OcrFormState {
  honorName: string
  awardDate: string
  issuer: string
}

export function HonorUploadTab() {
  const { students, honors, addHonor } = useEvaluation()
  const { scoringClasses, role } = usePermission()

  // 仅班主任可见（已由 nav 入口控制），兜底判断
  const isHomeroom = role === "homeroom"
  const myClass = scoringClasses[0]

  const classStudents = useMemo(
    () => (myClass ? students.filter((s) => s.classId === myClass.id) : []),
    [students, myClass],
  )

  const [studentId, setStudentId] = useState<string>("")
  const [level1, setLevel1] = useState<string>("")
  const [honorLevel, setHonorLevel] = useState<HonorLevel>("school")
  const [form, setForm] = useState<OcrFormState>({ honorName: "", awardDate: "", issuer: "" })
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [ocrState, setOcrState] = useState<"idle" | "recognizing" | "done">("idle")
  const [hint, setHint] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ocrCountRef = useRef(0)
  const ocrTimerRef = useRef<number | null>(null)

  // 默认选中第一个学生
  useEffect(() => {
    if (classStudents.length > 0 && !studentId) {
      setStudentId(classStudents[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classStudents])

  useEffect(() => {
    return () => {
      if (ocrTimerRef.current) window.clearTimeout(ocrTimerRef.current)
    }
  }, [])

  const currentPoints = HONOR_LEVELS.find((h) => h.value === honorLevel)?.points ?? 1

  const myHonors = useMemo(
    () => (myClass ? honors.filter((h) => h.classId === myClass.id).slice().reverse() : []),
    [honors, myClass],
  )

  const honorsLoadMore = useLoadMore(myHonors, 6)
  const honorsScroll = useScrollLoadMore(honorsLoadMore.hasMore, honorsLoadMore.loadMore)

  const handlePickImage = () => fileInputRef.current?.click()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageDataUrl(reader.result as string)
      setOcrState("recognizing")
      setHint("")
      if (ocrTimerRef.current) window.clearTimeout(ocrTimerRef.current)
      // 模拟 OCR：延迟后从池中取一条结果自动填充
      ocrTimerRef.current = window.setTimeout(() => {
        const mock = OCR_MOCK_POOL[ocrCountRef.current % OCR_MOCK_POOL.length]
        ocrCountRef.current += 1
        setForm({ honorName: mock.honorName, awardDate: mock.awardDate, issuer: mock.issuer })
        setOcrState("done")
      }, 1200)
    }
    reader.readAsDataURL(file)
    // 允许连续选同一文件再次触发
    e.target.value = ""
  }

  const handleClearImage = () => {
    setImageDataUrl(null)
    setOcrState("idle")
    setForm({ honorName: "", awardDate: "", issuer: "" })
  }

  const canSubmit =
    isHomeroom &&
    myClass &&
    studentId &&
    level1 &&
    honorLevel &&
    form.honorName.trim() &&
    form.awardDate.trim() &&
    form.issuer.trim() &&
    ocrState !== "recognizing"

  const handleSubmit = () => {
    if (!canSubmit || !myClass) return
    const student = classStudents.find((s) => s.id === studentId)
    addHonor({
      studentId,
      studentName: student?.name ?? "",
      classId: myClass.id,
      level1,
      honorLevel,
      points: currentPoints,
      honorName: form.honorName.trim(),
      awardDate: form.awardDate.trim(),
      issuer: form.issuer.trim(),
      imageDataUrl,
    })
    // 重置表单
    setLevel1("")
    setHonorLevel("school")
    setForm({ honorName: "", awardDate: "", issuer: "" })
    setImageDataUrl(null)
    setOcrState("idle")
    setHint(`已为 ${student?.name ?? "该学生"} 上传荣誉，加 ${currentPoints} 分`)
  }

  if (!isHomeroom || !myClass) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[24px] border border-[#cfd7f6] bg-white p-12 text-center shadow-[0_22px_48px_-32px_rgba(48,62,139,0.7)]">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[#eef1ff] text-primary">
          <Medal className="size-7" />
        </span>
        <p className="text-sm font-medium text-muted-foreground">当前角色无荣誉上传权限，仅班主任可为本班学生上传获奖证书。</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
      {/* 左侧：上传表单 */}
      <section className="flex flex-col gap-5 rounded-[24px] border border-[#cfd7f6] bg-white p-4 shadow-[0_22px_48px_-32px_rgba(48,62,139,0.7)] sm:p-5">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#dde3f8] bg-[#f7f8ff] px-3.5 py-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_16px_-10px_rgba(63,81,188,0.9)]">
              <Medal className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">代学生上传荣誉</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {myClass.name} · 上传奖状后系统自动识别荣誉信息，可手动修改
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg border border-[#d9e2ff] bg-white px-2.5 py-1 text-xs font-semibold text-primary">
            班主任
          </span>
        </div>

        {/* 学生选择 */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold text-[#53617f]">
            选择学生 <span className="text-destructive">*</span>
          </Label>
          <Select
            items={classStudents.map((s) => ({
              value: `${s.studentNo} ${s.name}`,
              label: `${s.studentNo} ${s.name}`,
            }))}
            value={classStudents.find((student) => student.id === studentId) ? `${classStudents.find((student) => student.id === studentId)?.studentNo} ${classStudents.find((student) => student.id === studentId)?.name}` : ""}
            onValueChange={(v) => setStudentId(classStudents.find((student) => `${student.studentNo} ${student.name}` === v)?.id ?? "")}
          >
            <SelectTrigger aria-label="选择学生" className="h-10 w-full rounded-xl border-[#d8e0f7] bg-[#fbfcff] shadow-none transition focus-visible:border-primary/60 focus-visible:ring-primary/15">
              <SelectValue placeholder="请选择学生" />
            </SelectTrigger>
            <SelectContent className="border-[#d8e0f7] bg-white">
              <SelectGroup>
                {classStudents.map((s) => (
                  <SelectItem key={s.id} value={`${s.studentNo} ${s.name}`}>
                    {s.studentNo} {s.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* 一级指标（单选） */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold text-[#53617f]">
            五育奖卡一级指标 <span className="text-destructive">*</span>
          </Label>
          <Select
            items={AWARD_LEVEL1_LIST.map((name) => ({ value: name, label: name }))}
            value={level1}
            onValueChange={(v) => v !== null && setLevel1(v)}
          >
            <SelectTrigger aria-label="选择五育奖卡一级指标" className="h-10 w-full rounded-xl border-[#d8e0f7] bg-[#fbfcff] shadow-none transition focus-visible:border-primary/60 focus-visible:ring-primary/15">
              <SelectValue placeholder="请选择一级指标" />
            </SelectTrigger>
            <SelectContent className="border-[#d8e0f7] bg-white">
              <SelectGroup>
                {AWARD_LEVEL1_LIST.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* 荣誉级别 */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold text-[#53617f]">
            荣誉级别 <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {HONOR_LEVELS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setHonorLevel(opt.value)}
                aria-pressed={honorLevel === opt.value}
                className={cn(
                  "group flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  honorLevel === opt.value
                    ? "border-primary/55 bg-primary/10 shadow-[0_8px_16px_-14px_rgba(63,81,188,0.9)]"
                    : "border-[#e0e5f7] bg-[#fbfcff] hover:border-primary/40 hover:bg-primary/[0.045]",
                )}
              >
                <span
                  className={cn(
                    "text-sm font-semibold transition",
                    honorLevel === opt.value ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {opt.label}
                </span>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-px text-xs font-semibold transition",
                    honorLevel === opt.value
                      ? "bg-[#fff4d6] text-[#ad7411]"
                      : "bg-[#f1f3fa] text-muted-foreground group-hover:text-muted-foreground",
                  )}
                >
                  +{opt.points} 分
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 奖状上传 + OCR */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold text-[#53617f]">
            奖状图片 <span className="text-destructive">*</span>
            <span className="ml-2 font-normal text-muted-foreground/70">上传后自动识别荣誉信息</span>
          </Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          {imageDataUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-[#d4ddf6] bg-[#f8f9ff]">
              <div className="relative h-44 w-full bg-[#f4f6ff]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageDataUrl} alt="奖状预览" width={640} height={440} className="h-full w-full object-contain" />
              </div>
              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
                    ocrState === "recognizing" && "bg-brand-blue/20 text-brand-blue",
                    ocrState === "done" && "bg-brand-green/20 text-brand-green",
                  )}
                >
                  {ocrState === "recognizing" ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      OCR 识别中…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3" />
                      已识别，可在下方修改
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="rounded-lg bg-black/40 p-1.5 text-white/80 transition hover:bg-black/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  aria-label="移除图片"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePickImage}
              className="group flex h-36 w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-[#bfcdf5] bg-gradient-to-br from-[#f0f3ff] to-[#fbfcff] text-muted-foreground transition-colors hover:border-primary/60 hover:from-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-white text-primary shadow-[0_8px_20px_-14px_rgba(63,81,188,0.8)] ring-1 ring-[#d9e1fa] transition group-hover:bg-primary/10 group-hover:ring-primary/40">
                <ImagePlus className="size-5" />
              </span>
              <span className="text-xs">点击上传奖状图片</span>
              <span className="text-xs text-muted-foreground/60">支持 JPG / PNG，上传后自动识别荣誉信息</span>
            </button>
          )}
        </div>

        {/* OCR 结果（可编辑） */}
        <div className="grid gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="honor-name" className="text-xs font-semibold text-[#53617f]">
              荣誉名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="honor-name"
              value={form.honorName}
              name="honor-name"
              autoComplete="off"
              onChange={(e) => setForm((f) => ({ ...f, honorName: e.target.value }))}
              placeholder="例：2025年上海市青少年科技创新大赛一等奖"
              disabled={ocrState === "recognizing"}
              className="h-10 rounded-xl border-[#d8e0f7] bg-[#fbfcff] shadow-none focus-visible:border-primary/60 focus-visible:ring-primary/15"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="honor-date" className="text-xs font-semibold text-[#53617f]">
                获奖时间 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="honor-date"
                type="date"
                value={form.awardDate}
                name="honor-date"
                autoComplete="off"
                onChange={(e) => setForm((f) => ({ ...f, awardDate: e.target.value }))}
                disabled={ocrState === "recognizing"}
                max={formatDate(new Date())}
                className="h-10 rounded-xl border-[#d8e0f7] bg-[#fbfcff] shadow-none focus-visible:border-primary/60 focus-visible:ring-primary/15"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="honor-issuer" className="text-xs font-semibold text-[#53617f]">
                颁发单位 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="honor-issuer"
                value={form.issuer}
                name="honor-issuer"
                autoComplete="off"
                onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
                placeholder="例：上海市教育委员会"
                disabled={ocrState === "recognizing"}
                className="h-10 rounded-xl border-[#d8e0f7] bg-[#fbfcff] shadow-none focus-visible:border-primary/60 focus-visible:ring-primary/15"
              />
            </div>
          </div>
        </div>

        {hint && (
          <p className="flex items-center gap-1.5 rounded-xl border border-[#ccebdc] bg-[#effbf4] px-3 py-2 text-xs font-medium text-[#23815a]">
            <Check className="size-3.5" />
            {hint}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-[#e3e7f7] pt-4">
          <p className="rounded-lg bg-[#fff7e5] px-2.5 py-1.5 text-xs text-muted-foreground">
            本次加分 <span className="font-bold text-[#ad7411]">+{currentPoints}</span>
          </p>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="h-10 gap-2 rounded-xl px-4 shadow-[0_8px_18px_-12px_rgba(63,81,188,0.9)]">
            <Upload className="size-4" data-icon="inline-start" />
            确认上传
          </Button>
        </div>
      </section>

      {/* 右侧：本班荣誉记录 */}
      <section className="flex flex-col gap-4 rounded-[24px] border border-[#cfd7f6] bg-white p-4 shadow-[0_22px_48px_-32px_rgba(48,62,139,0.7)] sm:p-5">
        <div className="flex items-baseline justify-between gap-3 rounded-2xl border border-[#dde3f8] bg-[#f7f8ff] px-3.5 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-4" /></span>
            <h2 className="text-base font-bold text-foreground">本班荣誉记录</h2>
          </div>
          <span className="rounded-lg border border-[#dce3f8] bg-white px-2 py-1 text-xs font-semibold text-muted-foreground">
            共 {myHonors.length} 条
          </span>
        </div>

        {myHonors.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d8e0f7] bg-[#fafbff] py-12 text-center">
            <Medal className="size-10 text-primary/35" />
            <p className="text-sm font-medium text-muted-foreground">暂无荣誉记录</p>
            <p className="text-xs text-muted-foreground/70">使用左侧表单为学生上传获奖证书</p>
          </div>
        ) : (
          <ul
            onScroll={honorsScroll.onScroll}
            className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1.5"
          >
            {honorsLoadMore.visible.map((h) => (
              <HonorRow key={h.id} honor={h} />
            ))}
            <li>
              <LoadMoreFooter
                hasMore={honorsLoadMore.hasMore}
                loaded={honorsLoadMore.visible.length}
                total={honorsLoadMore.total}
                onLoadMore={honorsLoadMore.loadMore}
              />
            </li>
          </ul>
        )}
      </section>
    </div>
  )
}

function HonorRow({ honor }: { honor: HonorRecord }) {
  const [expanded, setExpanded] = useState(false)
  const levelColor = honor.honorLevel === "school" ? "bg-brand-blue" : honor.honorLevel === "district" ? "bg-brand-green" : honor.honorLevel === "city" ? "bg-brand-orange" : "bg-brand-yellow"
  return (
    <li className="relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-[#e0e5f7] bg-[#fafbff] p-4 transition-colors hover:border-primary/35 hover:bg-white">
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", levelColor)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{honor.honorName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {honor.studentName} · {honor.level1} · {honor.awardDate}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-lg px-2 py-1 text-xs font-semibold",
            HONOR_LEVEL_STYLE[honor.honorLevel],
          )}
        >
          {HONOR_LEVEL_LABEL[honor.honorLevel]} +{honor.points}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{honor.issuer}</span>
        <span className="shrink-0">by {honor.operatorName}</span>
      </div>
      {honor.imageDataUrl && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-xs text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {expanded ? "收起奖状" : "查看奖状"}
        </button>
      )}
      {expanded && honor.imageDataUrl && (
        <div className="overflow-hidden rounded-xl border border-[#d7e0f7] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={honor.imageDataUrl} alt={honor.honorName} width={720} height={360} loading="lazy" className="max-h-64 w-full object-contain" />
        </div>
      )}
    </li>
  )
}
