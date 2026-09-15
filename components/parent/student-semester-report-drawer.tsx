"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StudentSemesterReport, type StudentSemesterReportData } from "@/components/report/student-semester-report"
import type { Activity, HonorRecord } from "@/lib/types"

interface StudentSemesterReportDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reports?: StudentSemesterReportData[]
  semesterLabel?: string
  student?: StudentSemesterReportData["student"]
  className?: string
  gradeName?: string
  homeroomTeacher?: string
  semesterPoints?: number
  totalPoints?: number
  fiveEducation?: number[]
  academicScores?: StudentSemesterReportData["academicScores"]
  fitnessMetrics?: StudentSemesterReportData["fitnessMetrics"]
  honors?: HonorRecord[]
  activities?: Activity[]
}

export function StudentSemesterReportDrawer({
  open,
  onOpenChange,
  reports,
  semesterLabel,
  student,
  className,
  gradeName,
  homeroomTeacher,
  semesterPoints,
  totalPoints,
  fiveEducation,
  academicScores,
  fitnessMetrics,
  honors,
  activities,
}: StudentSemesterReportDrawerProps) {
  const [selectedSemester, setSelectedSemester] = useState("")
  const normalizedReports: StudentSemesterReportData[] = reports?.length
    ? reports
    : semesterLabel && student
      ? [{
          semesterLabel,
          student,
          className: className ?? "",
          gradeName: gradeName ?? "",
          homeroomTeacher: homeroomTeacher ?? "班主任老师",
          semesterPoints: semesterPoints ?? 0,
          totalPoints: totalPoints ?? 0,
          fiveEducation: fiveEducation ?? [0, 0, 0, 0, 0],
          academicScores: academicScores ?? [],
          fitnessMetrics: fitnessMetrics ?? {
            height: 0,
            weight: 0,
            run: "0.0",
            rope: 0,
            level: "暂无",
            score: 0,
            vitalCapacity: 0,
            sitAndReach: "0.0",
            standingLongJump: 0,
            vision: "-",
          },
          honors: honors ?? [],
          activities: activities ?? [],
        }]
      : []

  useEffect(() => {
    if (open && normalizedReports.length > 0) setSelectedSemester(normalizedReports[0].semesterLabel)
  }, [open, normalizedReports])

  const report = normalizedReports.find((item) => item.semesterLabel === selectedSemester) ?? normalizedReports[0]
  if (!report) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-0 !right-0 !left-auto !flex !h-[100dvh] !w-full !max-w-full !translate-x-0 !translate-y-0 !flex-col gap-0 overflow-hidden overscroll-contain rounded-none border-l border-[#b8d9f7] bg-[#eaf7ff] p-0 shadow-[-20px_0_56px_-28px_rgba(29,94,157,.65)] data-open:slide-in-from-right-4 sm:!w-[min(980px,84vw)] sm:!max-w-[min(980px,84vw)]">
        <DialogHeader className="shrink-0 border-b border-[#c9e2f8] bg-white/90 px-5 py-4 pr-14 backdrop-blur sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold text-[#174d91]">学生学期报告单</DialogTitle>
              <DialogDescription>{report.student.name} · 查看不同学期的综合表现</DialogDescription>
            </div>
            {normalizedReports.length > 1 && <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#b8d9f7] bg-white px-3 text-xs font-semibold text-[#174d91] focus-within:ring-2 focus-within:ring-[#0784cc]/25">
              <span className="sr-only">选择报告学期</span>
              <span aria-hidden="true">学期</span>
              <select name="report-semester" value={selectedSemester} onChange={(event) => setSelectedSemester(event.target.value)} className="max-w-[210px] bg-white text-[#174d91] text-xs font-bold outline-none">
                {normalizedReports.map((item) => <option key={item.semesterLabel} value={item.semesterLabel}>{item.semesterLabel}</option>)}
              </select>
            </label>}
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
          <StudentSemesterReport {...report} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
