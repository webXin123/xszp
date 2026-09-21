"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpenCheck, ChevronDown, HeartPulse, Medal, Sparkles, Trophy } from "lucide-react"
import type { AcademicScore } from "@/lib/academic-scores"
import type { StudentSemesterReportData } from "@/components/report/student-semester-report"
import type { StudentFitnessMetrics, StudentSemesterOption } from "@/lib/student-semester-history"
import { cn } from "@/lib/utils"

type AcademicHistory = StudentSemesterOption & { scores: AcademicScore[] }
type FitnessHistory = StudentSemesterOption & { metrics: StudentFitnessMetrics }

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })

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
          const average = averageScore(semester.scores)
          return (
            <details key={semester.key} open={index === 0} className="group overflow-hidden rounded-2xl border border-[#dce3f8] bg-[#fbfcff] shadow-[0_12px_28px_-28px_rgba(55,71,153,.7)]">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45 [&::-webkit-details-marker]:hidden">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{index === 0 ? "新" : "往"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">{semester.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">学科平均 {average} 分 · 体测 {fitness?.level ?? "暂无"}</span>
                </span>
                {index === 0 && <span className="rounded-full bg-brand-green/12 px-2 py-1 text-[11px] font-semibold text-brand-green">最新</span>}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
              </summary>

              <div className="space-y-3 border-t border-[#edf0fb] p-3">
                <section aria-label={`${semester.label}学科成绩`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground"><BookOpenCheck className="size-3.5 text-primary" aria-hidden="true" />学科成绩</h3>
                    <span className="text-[11px] font-semibold text-primary">平均 {average} 分</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {semester.scores.map((score) => <div key={score.subject} className="min-w-0 rounded-xl border border-[#e3e8f8] bg-white px-3 py-2.5"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-foreground">{score.subject}</span><span className="shrink-0 text-base font-bold tabular-nums text-primary">{score.score}</span></div><p className="mt-1 truncate text-[11px] text-muted-foreground">{score.level} · {score.items.map((item) => item.name).join(" / ")}</p></div>)}
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

  const academicAverage = averageScore(report.academicScores)
  const comment = `${report.student.name}同学品行端正，乐观向上，能积极参与班级与学校活动。希望继续保持求知热情，在学习与生活中稳步成长。`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground">学期报告</h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{report.student.name} · {report.gradeName} {report.className}</p>
        </div>
        <label className="flex min-h-10 shrink-0 items-center rounded-xl border border-primary/20 bg-white px-2.5 text-xs font-semibold text-primary focus-within:ring-2 focus-within:ring-primary/25">
          <span className="sr-only">选择报告学期</span>
          <select name="mobile-report-semester" value={report.semesterLabel} onChange={(event) => setSelectedSemester(event.target.value)} className="max-w-[150px] bg-white text-xs font-bold text-primary outline-none">
            {reports.map((item) => <option key={item.semesterLabel} value={item.semesterLabel}>{item.semesterLabel}</option>)}
          </select>
        </label>
      </div>

      <section aria-label="学期报告概览" className="overflow-hidden rounded-2xl border border-[#b8ddfa] bg-[linear-gradient(145deg,#f7fcff_0%,#e8f6ff_100%)] p-3 shadow-[0_16px_30px_-28px_rgba(38,105,161,.55)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#cfe6f8] pb-3">
          <div className="min-w-0"><p className="truncate text-sm font-bold text-[#174d91]">{report.semesterLabel}</p><p className="mt-0.5 truncate text-xs text-[#5597c5]">班主任：{report.homeroomTeacher}</p></div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0784cc] shadow-sm"><Sparkles className="size-5" aria-hidden="true" /></span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ReportMetric label="学期五育积分" value={`${report.semesterPoints} 分`} />
          <ReportMetric label="学科平均" value={`${academicAverage} 分`} />
          <ReportMetric label="体测成绩" value={`${report.fitnessMetrics.score ?? 0} 分`} />
          <ReportMetric label="荣誉记录" value={`${report.honors.length} 项`} />
        </div>
      </section>

      <ReportSection icon={Sparkles} title="五育发展">
        <div className="grid grid-cols-5 gap-1.5">{["德", "智", "体", "美", "劳"].map((label, index) => <div key={label} className="min-w-0 rounded-xl bg-primary/[0.07] px-1 py-2 text-center"><p className="text-[11px] font-semibold text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold tabular-nums text-primary">{report.fiveEducation[index] ?? 0}</p></div>)}</div>
      </ReportSection>

      <ReportSection icon={BookOpenCheck} title="学科成绩" aside={`平均 ${academicAverage} 分`}>
        <div className="divide-y divide-[#edf0fb]">{report.academicScores.map((score) => <div key={score.subject} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"><span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{score.subject}</span><span className="font-bold tabular-nums text-primary">{score.score}</span><span className="w-10 shrink-0 text-right text-xs font-semibold text-muted-foreground">{score.level}</span></div>)}</div>
      </ReportSection>

      <ReportSection icon={HeartPulse} title="体质健康" aside={`${report.fitnessMetrics.level} · ${report.fitnessMetrics.score ?? 0} 分`}>
        <div className="grid grid-cols-2 gap-2">
          <ScoreMetric label="身高 / 体重" value={`${report.fitnessMetrics.height} cm / ${report.fitnessMetrics.weight} kg`} />
          <ScoreMetric label="50 米跑" value={`${report.fitnessMetrics.run} s`} />
          <ScoreMetric label="1 分钟跳绳" value={`${report.fitnessMetrics.rope} 次`} />
          <ScoreMetric label="视力" value={report.fitnessMetrics.vision ?? "-"} />
        </div>
      </ReportSection>

      <ReportSection icon={Trophy} title="荣誉与活动">
        <div className="space-y-2">
          {report.honors.length > 0 ? report.honors.slice(0, 3).map((honor) => <div key={honor.id} className="flex items-center gap-2 rounded-xl bg-[#fff8e8] px-3 py-2.5"><Medal className="size-4 shrink-0 text-[#d49322]" aria-hidden="true" /><span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#805313]">{honor.honorName}</span><span className="shrink-0 text-[11px] text-[#a9782e]">{honor.awardDate}</span></div>) : <p className="text-xs text-muted-foreground">本学期暂无荣誉记录</p>}
          {report.activities.length > 0 ? report.activities.slice(0, 3).map((activity) => <div key={activity.id} className="flex items-center gap-2 rounded-xl bg-primary/[0.06] px-3 py-2.5"><Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{activity.title}</span><span className="shrink-0 text-[11px] text-muted-foreground">{formatShortDate(activity.startDate)}</span></div>) : <p className="text-xs text-muted-foreground">本学期暂无活动记录</p>}
        </div>
      </ReportSection>

      <ReportSection icon={Medal} title="班主任评语">
        <p className="text-sm leading-6 text-muted-foreground">{comment}</p>
        <p className="mt-2 text-right text-xs font-semibold text-foreground">班主任　{report.homeroomTeacher}</p>
      </ReportSection>
    </div>
  )
}

function averageScore(scores: Array<{ score: number }>) {
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((total, score) => total + score.score, 0) / scores.length)
}

function formatShortDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "日期待定" : SHORT_DATE_FORMATTER.format(date)
}

function ScoreMetric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={cn("min-w-0 rounded-xl px-3 py-2.5", emphasis ? "bg-brand-green/10" : "bg-primary/[0.07]")}><p className="truncate text-[11px] text-muted-foreground">{label}</p><p className={cn("mt-1 truncate text-xs font-bold", emphasis ? "text-brand-green" : "text-foreground")}>{value}</p></div>
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-white/90 bg-white/85 px-3 py-2.5"><p className="truncate text-[11px] text-[#5597c5]">{label}</p><p className="mt-1 truncate text-base font-bold tabular-nums text-[#174d91]">{value}</p></div>
}

function ReportSection({ icon: Icon, title, aside, children }: { icon: typeof Sparkles; title: string; aside?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#dce3f8] bg-white p-3 shadow-[0_14px_30px_-30px_rgba(55,71,153,.7)]"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Icon className="size-4 text-primary" aria-hidden="true" />{title}</h3>{aside && <span className="text-[11px] font-semibold text-primary">{aside}</span>}</div>{children}</section>
}
