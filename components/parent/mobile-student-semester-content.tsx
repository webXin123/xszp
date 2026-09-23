"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpenCheck, ChevronDown, HeartPulse } from "lucide-react"
import type { AcademicScore } from "@/lib/academic-scores"
import { StudentSemesterReport, type StudentSemesterReportData } from "@/components/report/student-semester-report"
import type { StudentFitnessMetrics, StudentSemesterOption } from "@/lib/student-semester-history"
import { cn } from "@/lib/utils"

type AcademicHistory = StudentSemesterOption & { scores: AcademicScore[] }
type FitnessHistory = StudentSemesterOption & { metrics: StudentFitnessMetrics }

export function MobileSemesterScores({
  studentName,
  academicHistory,
  fitnessHistory,
}: {
  studentName: string
  academicHistory: AcademicHistory[]
  fitnessHistory: FitnessHistory[]
}) {
  const fitnessBySemester = useMemo(
    () => new Map(fitnessHistory.map((semester) => [semester.key, semester.metrics])),
    [fitnessHistory],
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">学期成绩</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">按学期查看{studentName}的学科与体质健康成绩</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{academicHistory.length} 个学期</span>
      </div>

      <div className="space-y-2 pt-1">
        {academicHistory.map((semester, index) => {
          const fitness = fitnessBySemester.get(semester.key)
          return (
            <details key={semester.key} open={index === 0} className="group overflow-hidden rounded-2xl border border-[#dce3f8] bg-[#fbfcff] shadow-[0_12px_28px_-28px_rgba(55,71,153,.7)]">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45 [&::-webkit-details-marker]:hidden">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{index === 0 ? "新" : "往"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">{semester.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">学科等第 · 体测 {fitness?.level ?? "暂无"}</span>
                </span>
                {index === 0 && <span className="rounded-full bg-brand-green/12 px-2 py-1 text-[11px] font-semibold text-brand-green">最新</span>}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
              </summary>

              <div className="space-y-3 border-t border-[#edf0fb] p-3">
                <section aria-label={`${semester.label}学科成绩`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground"><BookOpenCheck className="size-3.5 text-primary" aria-hidden="true" />学科成绩</h3>
                    <span className="text-[11px] font-semibold text-primary">等第制</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {semester.scores.map((score) => <div key={score.subject} className="min-w-0 rounded-xl border border-[#e3e8f8] bg-white px-3 py-2.5"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-foreground">{score.subject}</span><span className="shrink-0 text-base font-bold text-primary">{score.grade}</span></div><p className="mt-1 truncate text-[11px] text-muted-foreground">{score.items.map((item) => `${item.name} ${item.grade}`).join(" · ")}</p></div>)}
                  </div>
                </section>

                <section aria-label={`${semester.label}体质健康成绩`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground"><HeartPulse className="size-3.5 text-[#6178e9]" aria-hidden="true" />体质健康成绩</h3>
                    <span className="text-[11px] font-semibold text-[#6178e9]">{fitness ? `${fitness.level} · ${fitness.score} 分` : "暂无成绩"}</span>
                  </div>
                  {fitness ? <div className="grid grid-cols-2 gap-2">
                    <ScoreMetric label="综合评分" value={`${fitness.score} 分`} emphasis />
                    <ScoreMetric label="综合等级" value={fitness.level} emphasis />
                    <ScoreMetric label="身高 / 体重" value={`${fitness.height} cm / ${fitness.weight} kg`} />
                    <ScoreMetric label="肺活量" value={`${fitness.vitalCapacity} ml`} />
                    <ScoreMetric label="50 米跑" value={`${fitness.run} s`} />
                    <ScoreMetric label="1 分钟跳绳" value={`${fitness.rope} 次`} />
                    <ScoreMetric label="坐位体前屈" value={`${fitness.sitAndReach} cm`} />
                    <ScoreMetric label="立定跳远" value={`${fitness.standingLongJump} cm`} />
                    <ScoreMetric label="视力" value={fitness.vision} />
                  </div> : <p className="rounded-xl border border-dashed border-border/70 bg-white px-3 py-6 text-center text-xs text-muted-foreground">本学期暂无体质健康成绩</p>}
                </section>
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}

export function MobileSemesterReport({ reports }: { reports: StudentSemesterReportData[] }) {
  const [selectedSemester, setSelectedSemester] = useState("")

  useEffect(() => {
    setSelectedSemester(reports[0]?.semesterLabel ?? "")
  }, [reports])

  const report = reports.find((item) => item.semesterLabel === selectedSemester) ?? reports[0]
  if (!report) return <p className="rounded-xl border border-dashed border-border/65 px-3 py-8 text-center text-sm text-muted-foreground">暂无学期报告</p>
  return <div className="space-y-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="text-sm font-bold text-foreground">学期报告</h2><p className="mt-0.5 truncate text-xs text-muted-foreground">{report.student.name} · {report.gradeName} {report.className}</p></div>{reports.length > 1 && <label className="flex min-h-10 shrink-0 items-center rounded-xl border border-primary/20 bg-white px-2.5 text-xs font-semibold text-primary focus-within:ring-2 focus-within:ring-primary/25"><span className="sr-only">选择报告学期</span><select name="mobile-report-semester" value={report.semesterLabel} onChange={(event) => setSelectedSemester(event.target.value)} className="max-w-[150px] bg-white text-xs font-bold text-primary outline-none">{reports.map((item) => <option key={item.semesterLabel} value={item.semesterLabel}>{item.semesterLabel}</option>)}</select></label>}</div><StudentSemesterReport {...report} /></div>
}

function ScoreMetric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={cn("min-w-0 rounded-xl px-3 py-2.5", emphasis ? "bg-brand-green/10" : "bg-primary/[0.07]")}><p className="truncate text-[11px] text-muted-foreground">{label}</p><p className={cn("mt-1 truncate text-xs font-bold", emphasis ? "text-brand-green" : "text-foreground")}>{value}</p></div>
}
