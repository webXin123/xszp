"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { AudioLines, Check, Mic, RotateCcw, Sparkles, Square, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type VoiceActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: "evaluation" | "award"
  title: string
  transcript: string
  targetTitle: string
  targetMeta: string
  details: Array<{ label: string; value: string; emphasis?: boolean }>
  confirmLabel: string
  onConfirm: () => void
}

type VoiceStage = "listening" | "transcribing" | "analyzing" | "review"

const waveformHeights = [18, 30, 22, 42, 27, 54, 34, 23, 46, 30, 58, 25, 39, 20, 48, 33, 56, 24, 42, 30, 52, 21, 37, 26, 48, 34, 58, 24, 43, 29, 51, 20]

export function VoiceActionDialog({
  open,
  onOpenChange,
  variant,
  title,
  transcript,
  targetTitle,
  targetMeta,
  details,
  confirmLabel,
  onConfirm,
}: VoiceActionDialogProps) {
  const [stage, setStage] = useState<VoiceStage>("listening")
  const [elapsed, setElapsed] = useState(0)
  const [transcriptLength, setTranscriptLength] = useState(0)
  const isAward = variant === "award"
  const accent = isAward ? "text-amber-700" : "text-indigo-700"
  const accentBg = isAward ? "bg-amber-50" : "bg-indigo-50"

  useEffect(() => {
    if (!open || stage !== "listening") return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [open, stage])

  useEffect(() => {
    if (!open || stage !== "transcribing") return
    setTranscriptLength(0)
    const timer = window.setInterval(() => {
      setTranscriptLength((length) => Math.min(transcript.length, length + 2))
    }, 42)
    const completionTimer = window.setTimeout(() => setStage("analyzing"), Math.ceil(transcript.length / 2) * 42 + 280)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(completionTimer)
    }
  }, [open, stage, transcript])

  useEffect(() => {
    if (!open || stage !== "analyzing") return
    const timer = window.setTimeout(() => setStage("review"), 1250)
    return () => window.clearTimeout(timer)
  }, [open, stage])

  useEffect(() => {
    if (open) {
      setStage("listening")
      setElapsed(0)
      setTranscriptLength(0)
    }
  }, [open])

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStage("listening")
      setElapsed(0)
      setTranscriptLength(0)
    }
    onOpenChange(nextOpen)
  }

  const handleConfirm = () => {
    onConfirm()
    close(false)
  }

  const timeLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="voice-action-dialog max-h-[90dvh] overflow-hidden rounded-[28px] border border-white/80 bg-[#fbfcff] p-0 shadow-[0_32px_100px_-38px_rgba(24,35,92,.55)] sm:max-w-[560px]">
        <div className={cn("relative overflow-hidden px-6 pb-5 pt-6 sm:px-8", isAward ? "voice-award-wash" : "voice-evaluation-wash")}>
          <div className="pointer-events-none absolute -right-14 -top-20 size-52 rounded-full border border-white/60" />
          <div className="pointer-events-none absolute -right-4 -top-10 size-32 rounded-full border border-white/50" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3">
              <span className={cn("flex size-11 items-center justify-center rounded-2xl border border-white/80 bg-white/80 shadow-sm", accent)}>
                {stage === "review" ? <Sparkles className="size-5" /> : <AudioLines className="size-5" />}
              </span>
              <div>
                <p className={cn("text-[10px] font-bold tracking-[.18em]", accent)}>VOICE · AI ASSIST</p>
                <DialogTitle className="mt-1 text-lg font-bold tracking-tight text-slate-900">{title}</DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="relative mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/65 px-4 py-3 backdrop-blur-sm">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800">{targetTitle}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{targetMeta}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/90 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-slate-600">{timeLabel}</span>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5 sm:px-8">
          {stage === "listening" && <>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-slate-800">请说出要{isAward ? "表扬的学生和奖卡内容" : "评价的班级与具体表现"}</p>
              <p className="mt-1 text-xs text-slate-500">语音内容仅用于生成待确认草稿</p>
            </div>
            <div className={cn("voice-wave-panel flex h-28 items-center justify-center gap-[3px] overflow-hidden rounded-2xl border", isAward ? "border-amber-100 bg-[#fffaf0]" : "border-indigo-100 bg-[#f7f8ff]")} aria-label="语音输入波形动画" role="img">
              {waveformHeights.map((height, index) => <span key={index} className={cn("voice-wave-bar", isAward ? "bg-amber-500" : "bg-indigo-500")} style={{ "--bar-height": `${height}%`, "--bar-delay": `${(index % 13) * -0.095}s` } as CSSProperties} />)}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-rose-600" aria-live="polite">
              <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-rose-500" /></span>
              正在聆听 · 点击结束输入
            </div>
            <Button type="button" onClick={() => setStage("transcribing")} className="mx-auto flex min-h-12 w-full max-w-[250px] gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-[0_12px_24px_-15px_rgba(15,23,42,.8)] hover:bg-slate-800">
              <Square className="size-3.5 fill-current" />结束输入
            </Button>
          </>}

          {stage !== "listening" && <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_28px_-24px_rgba(30,41,59,.45)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-600">语音转写</p>
                {stage === "transcribing" && <span className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600"><AudioLines className="size-3.5" />正在识别</span>}
              </div>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-800" aria-live="polite">{stage === "transcribing" ? transcript.slice(0, transcriptLength) : transcript}{stage === "transcribing" && <span className="voice-caret ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-indigo-500" />}</p>
            </section>
            {stage === "transcribing" && <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-[#f7f8ff] p-4" aria-live="polite">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm"><AudioLines className="size-5" /></span>
              <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800">正在转写语音</p><p className="mt-1 text-xs text-slate-500">请稍候，正在整理识别到的内容</p></div>
              <div className="flex gap-1" aria-hidden="true"><i className="voice-thinking-dot" /><i className="voice-thinking-dot [animation-delay:120ms]" /><i className="voice-thinking-dot [animation-delay:240ms]" /></div>
            </div>}
            {stage === "analyzing" && <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-[linear-gradient(110deg,#f7f7ff,#f5fbff)] p-4" aria-live="polite">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm"><WandSparkles className="size-5" /></span>
              <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800">AI 正在分析</p><p className="mt-1 text-xs text-slate-500">提取对象、指标与分值，生成可核对的操作草稿</p></div>
              <div className="flex gap-1" aria-hidden="true"><i className="voice-thinking-dot" /><i className="voice-thinking-dot [animation-delay:120ms]" /><i className="voice-thinking-dot [animation-delay:240ms]" /></div>
            </div>}
            {stage === "review" && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div><p className="text-xs font-bold text-slate-700">识别结果待确认</p><p className="mt-0.5 text-[11px] text-slate-500">请检查后再提交</p></div>
                <span className="flex size-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="size-4" /></span>
              </div>
              <dl className="divide-y divide-slate-100 px-4">
                {details.map((detail) => <div key={detail.label} className="grid grid-cols-[94px_minmax(0,1fr)] gap-3 py-3">
                  <dt className="text-xs text-slate-500">{detail.label}</dt>
                  <dd className={cn("text-right text-sm font-semibold text-slate-800", detail.emphasis && (isAward ? "text-amber-700" : "text-rose-700"))}>{detail.value}</dd>
                </div>)}
              </dl>
            </section>}
          </div>}
        </div>

        {stage === "review" && <DialogFooter className="flex-row justify-between border-slate-200 bg-white px-6 py-4 sm:px-8">
          <Button type="button" variant="outline" onClick={() => { setStage("listening"); setElapsed(0) }} className="min-h-11 gap-2 rounded-xl border-slate-200 bg-white text-slate-600"><RotateCcw className="size-3.5" />重新录入</Button>
          <Button type="button" onClick={handleConfirm} className={cn("min-h-11 gap-2 rounded-xl px-5 font-semibold text-white", isAward ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700")}><Check className="size-4" />{confirmLabel}</Button>
        </DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
