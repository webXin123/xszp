"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Activity, HonorRecord } from "@/lib/types"
import { StudentSemesterReport } from "@/components/report/student-semester-report"

type AcademicScoreRow = { subject: string; score: number; level: string }
type FitnessMetrics = { height: number; weight: number; run: string; rope: number; level: string }

interface StudentSemesterReportDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  semesterLabel: string
  student: { name: string; gender: string; studentNo: string }
  className: string
  gradeName: string
  homeroomTeacher: string
  semesterPoints: number
  totalPoints: number
  fiveEducation: number[]
  academicScores: AcademicScoreRow[]
  fitnessMetrics: FitnessMetrics
  honors: HonorRecord[]
  activities: Activity[]
}

export function StudentSemesterReportDrawer({ open, onOpenChange, ...report }: StudentSemesterReportDrawerProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="!top-0 !right-0 !left-auto !flex !h-[100dvh] !w-full !max-w-full !translate-x-0 !translate-y-0 !flex-col gap-0 overflow-hidden overscroll-contain rounded-none border-l border-[#b8d9f7] bg-[#eaf7ff] p-0 shadow-[-20px_0_56px_-28px_rgba(29,94,157,.65)] data-open:slide-in-from-right-4 sm:!w-[min(980px,84vw)] sm:!max-w-[min(980px,84vw)]">
      <DialogHeader className="shrink-0 border-b border-[#c9e2f8] bg-white/90 px-5 py-4 pr-14 backdrop-blur sm:px-7">
        <DialogTitle className="text-lg font-bold text-[#174d91]">学生学期报告单</DialogTitle>
        <DialogDescription>{report.student.name} · {report.semesterLabel}</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
        <StudentSemesterReport {...report} />
      </div>
    </DialogContent>
  </Dialog>
}
