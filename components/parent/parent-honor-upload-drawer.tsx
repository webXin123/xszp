"use client"

import { useRef, useState } from "react"
import { Check, ImagePlus, Medal, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { cn } from "@/lib/utils"
import type { HonorLevel, ParentChild } from "@/lib/types"

const HONOR_LEVELS: Array<{ value: HonorLevel; label: string; points: number }> = [
  { value: "school", label: "校级", points: 1 },
  { value: "district", label: "区级", points: 2 },
  { value: "city", label: "市级", points: 3 },
  { value: "national", label: "国家级", points: 4 },
]

export function ParentHonorUploadDrawer({ child, triggerClassName }: { child: ParentChild; triggerClassName?: string }) {
  const { submitParentHonor } = useEvaluation()
  const [open, setOpen] = useState(false)
  const [level1, setLevel1] = useState("")
  const [honorLevel, setHonorLevel] = useState<HonorLevel>("school")
  const [honorName, setHonorName] = useState("")
  const [awardDate, setAwardDate] = useState("")
  const [issuer, setIssuer] = useState("")
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const points = HONOR_LEVELS.find((item) => item.value === honorLevel)?.points ?? 1
  const canSubmit = Boolean(level1 && honorName.trim() && awardDate && issuer.trim() && imageDataUrl)

  const pickImage = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) { setMessage("请上传 JPG、PNG 等图片文件"); return }
    const reader = new FileReader()
    reader.onload = () => setImageDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const reset = () => { setLevel1(""); setHonorLevel("school"); setHonorName(""); setAwardDate(""); setIssuer(""); setImageDataUrl(null); setMessage("") }
  const submit = () => {
    if (!canSubmit) return
    const result = submitParentHonor({ studentId: child.studentId, studentName: child.name, classId: child.classId, level1, honorLevel, points, honorName: honorName.trim(), awardDate, issuer: issuer.trim(), imageDataUrl })
    if (!result.ok) { setMessage(result.reason ?? "提交失败，请稍后重试"); return }
    setMessage("已提交，等待班主任审核后计入积分。")
    window.setTimeout(() => { setOpen(false); reset() }, 900)
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="上传荣誉" title="上传荣誉" className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-orange px-3 text-xs font-semibold text-white shadow-[0_8px_16px_-12px_rgba(190,112,38,.7)] transition hover:bg-brand-orange/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40", triggerClassName)}><Upload className="size-3.5" aria-hidden="true" />上传荣誉</button>
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}>
      <DialogContent className="!top-0 !right-0 !left-auto !h-[100dvh] !w-full !max-w-full !translate-x-0 !translate-y-0 rounded-none border-l border-[#d9e3f6] bg-[#fbfcff] p-0 shadow-[-18px_0_52px_rgba(42,69,130,.18)] sm:!w-[min(560px,92vw)] sm:!max-w-[min(560px,92vw)]">
        <DialogHeader className="border-b border-[#dfe7f5] bg-white px-5 py-5 pr-14"><DialogTitle className="flex items-center gap-2 text-xl font-bold"><span className="flex size-9 items-center justify-center rounded-xl bg-brand-orange/12 text-brand-orange"><Medal className="size-5" /></span>上传荣誉</DialogTitle><DialogDescription className="mt-2">为 {child.name} 提交获奖证明，班主任审核通过后计入积分。</DialogDescription></DialogHeader>
        <form className="space-y-5 p-5" onSubmit={(event) => { event.preventDefault(); submit() }}>
          <section className="rounded-2xl border border-[#dfe7f5] bg-white p-4"><p className="text-sm font-bold text-foreground">荣誉信息</p><div className="mt-4 grid gap-4"><label className="grid gap-1.5 text-sm font-medium">五育一级指标<select value={level1} onChange={(event) => setLevel1(event.target.value)} className="h-10 rounded-xl border border-input bg-white px-3 text-sm"><option value="">请选择一级指标</option>{AWARD_LEVEL1_LIST.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">荣誉名称<Input value={honorName} onChange={(event) => setHonorName(event.target.value)} placeholder="例如：区青少年科技创新大赛一等奖" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">获奖时间<Input type="date" value={awardDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setAwardDate(event.target.value)} /></label><label className="grid gap-1.5 text-sm font-medium">颁发单位<Input value={issuer} onChange={(event) => setIssuer(event.target.value)} placeholder="例如：浦东新区教育局" /></label></div></div></section>
          <section className="rounded-2xl border border-[#dfe7f5] bg-white p-4"><p className="text-sm font-bold text-foreground">荣誉级别</p><div className="mt-3 grid grid-cols-2 gap-2">{HONOR_LEVELS.map((item) => <button key={item.value} type="button" onClick={() => setHonorLevel(item.value)} aria-pressed={honorLevel === item.value} className={cn("flex min-h-14 items-center justify-between rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", honorLevel === item.value ? "border-primary/25 bg-primary/8 text-primary" : "border-[#e0e7f3] bg-[#fbfcff] text-muted-foreground hover:bg-primary/5")}><span>{item.label}</span><span className="rounded-lg bg-white px-2 py-1 text-xs text-brand-orange shadow-sm">+{item.points} 分</span></button>)}</div></section>
          <section className="rounded-2xl border border-[#dfe7f5] bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-foreground">获奖证明</p><span className="text-xs text-muted-foreground">JPG / PNG</span></div><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { pickImage(event.target.files?.[0]); event.target.value = "" }} />{imageDataUrl ? <div className="relative mt-3 overflow-hidden rounded-xl border border-[#dce5f4] bg-[#f7f9ff]"><img src={imageDataUrl} alt="荣誉证明预览" width={640} height={360} className="h-44 w-full object-contain" /><button type="button" onClick={() => setImageDataUrl(null)} aria-label="移除证明图片" className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white"><X className="size-4" /></button></div> : <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/25 bg-primary/[0.025] text-sm text-muted-foreground transition hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"><ImagePlus className="size-6 text-primary" /><span>点击上传获奖证明</span></button>}</section>
          {message && <p aria-live="polite" className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.06] px-3 py-2 text-sm text-primary"><Check className="size-4" />{message}</p>}
        </form>
        <DialogFooter className="bg-white"><Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button><Button type="button" disabled={!canSubmit} onClick={submit}><Upload className="size-4" />提交审核</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
