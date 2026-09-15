"use client"

import { BookOpenCheck, ChevronDown, HeartPulse } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AcademicScore } from "@/lib/academic-scores"
import type { StudentFitnessMetrics, StudentSemesterOption } from "@/lib/student-semester-history"
import { cn } from "@/lib/utils"

type AcademicHistory = StudentSemesterOption & { scores: AcademicScore[] }
type FitnessHistory = StudentSemesterOption & { metrics: StudentFitnessMetrics }

type StudentHistoryDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: "academic" | "fitness"
  studentName: string
  academicHistory: AcademicHistory[]
  fitnessHistory: FitnessHistory[]
}

export function StudentHistoryDrawer({
  open,
  onOpenChange,
  kind,
  studentName,
  academicHistory,
  fitnessHistory,
}: StudentHistoryDrawerProps) {
  const isAcademic = kind === "academic"
  const title = isAcademic ? "学科成绩" : "体质健康成绩"
  const Icon = isAcademic ? BookOpenCheck : HeartPulse
  const latestLabel = isAcademic ? academicHistory[0]?.label : fitnessHistory[0]?.label

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-0 !right-0 !left-auto !flex !h-[100dvh] !w-full !max-w-full !translate-x-0 !translate-y-0 !flex-col gap-0 overflow-hidden overscroll-contain rounded-none border-l border-[#d2dcfa] bg-[#f7f9ff] p-0 shadow-[-20px_0_56px_-28px_rgba(56,72,164,.42)] data-open:slide-in-from-right-4 sm:!w-[min(760px,82vw)] sm:!max-w-[min(760px,82vw)]">
        <DialogHeader className="shrink-0 border-b border-[#e0e6f7] bg-white/95 px-5 py-4 pr-14 backdrop-blur sm:px-7">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span className={cn("flex size-9 items-center justify-center rounded-xl", isAcademic ? "bg-primary/10 text-primary" : "bg-[#8fa2ff]/14 text-[#6178e9]")}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            {title}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span>{studentName} · 历史全部学期</span>
            {latestLabel && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">最新：{latestLabel}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <p className="mb-3 text-xs text-muted-foreground">最新学期默认展开，其余学期可点击标题查看。</p>
          {isAcademic ? (
            <div className="space-y-2">
              {academicHistory.map((semester, index) => (
                <details key={semester.key} open={index === 0} className="group overflow-hidden rounded-2xl border border-[#dce3f8] bg-white shadow-[0_12px_28px_-28px_rgba(55,71,153,.7)]">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45 [&::-webkit-details-marker]:hidden">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{index === 0 ? "新" : "往"}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-foreground">{semester.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{semester.scores.length} 门学科 · 平均 {averageScore(semester.scores)} 分</span></span>
                    {index === 0 && <span className="rounded-full bg-brand-green/12 px-2 py-1 text-[11px] font-semibold text-brand-green">最新</span>}
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="border-t border-[#edf0fb] px-3 pb-3 pt-2 sm:px-4">
                    <div className="overflow-hidden rounded-xl border border-[#e3e8f8]">
                      <table className="w-full text-sm">
                        <caption className="sr-only">{studentName}{semester.label}各科成绩</caption>
                        <thead className="bg-primary/[0.06] text-xs text-muted-foreground"><tr><th className="px-3 py-2 text-left font-semibold">科目</th><th className="px-3 py-2 text-right font-semibold">成绩</th><th className="px-3 py-2 text-right font-semibold">等级</th></tr></thead>
                        <tbody>{semester.scores.map((score) => <tr key={score.subject} className="border-t border-[#edf0fb]"><th className="px-3 py-3 text-left font-medium text-foreground">{score.subject}<span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{score.items.map((item) => `${item.name} ${item.score}`).join(" · ")}</span></th><td className="px-3 py-3 text-right font-bold tabular-nums text-foreground">{score.score}</td><td className="px-3 py-3 text-right text-xs font-semibold text-primary">{score.level}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {fitnessHistory.map((semester, index) => (
                <details key={semester.key} open={index === 0} className="group overflow-hidden rounded-2xl border border-[#dce3f8] bg-white shadow-[0_12px_28px_-28px_rgba(55,71,153,.7)]">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45 [&::-webkit-details-marker]:hidden">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#8fa2ff]/14 text-xs font-bold text-[#6178e9]">{index === 0 ? "新" : "往"}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-foreground">{semester.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">综合评定 {semester.metrics.level} · {semester.metrics.score} 分</span></span>
                    {index === 0 && <span className="rounded-full bg-brand-green/12 px-2 py-1 text-[11px] font-semibold text-brand-green">最新</span>}
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="grid grid-cols-2 gap-2 border-t border-[#edf0fb] p-3 sm:grid-cols-3 sm:p-4">
                    <FitnessMetric label="综合评分" value={`${semester.metrics.score} 分`} tone="green" />
                    <FitnessMetric label="综合等级" value={semester.metrics.level} tone="green" />
                    <FitnessMetric label="身高" value={`${semester.metrics.height} cm`} />
                    <FitnessMetric label="体重" value={`${semester.metrics.weight} kg`} />
                    <FitnessMetric label="肺活量" value={`${semester.metrics.vitalCapacity} ml`} />
                    <FitnessMetric label="50米跑" value={`${semester.metrics.run} s`} />
                    <FitnessMetric label="坐位体前屈" value={`${semester.metrics.sitAndReach} cm`} />
                    <FitnessMetric label="立定跳远" value={`${semester.metrics.standingLongJump} cm`} />
                    <FitnessMetric label="1分钟跳绳" value={`${semester.metrics.rope} 次`} />
                    <FitnessMetric label="视力" value={semester.metrics.vision} />
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function averageScore(scores: AcademicScore[]) {
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((total, score) => total + score.score, 0) / scores.length)
}

function FitnessMetric({ label, value, tone = "blue" }: { label: string; value: string; tone?: "blue" | "green" }) {
  return <div className={cn("rounded-xl p-3", tone === "green" ? "bg-brand-green/10" : "bg-primary/[0.07]")}><p className="text-xs text-muted-foreground">{label}</p><p className={cn("mt-1 text-sm font-bold", tone === "green" ? "text-brand-green" : "text-foreground")}>{value}</p></div>
}