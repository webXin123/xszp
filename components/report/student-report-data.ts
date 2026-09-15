import { getAcademicScores, ACADEMIC_SUBJECTS } from "@/lib/academic-scores"
import { inRange } from "@/lib/points-utils"
import type { Activity, HonorRecord, Student } from "@/lib/types"
import type { StudentSemesterReportProps } from "./student-semester-report"

export function getReportFitnessMetrics(studentId: string): StudentSemesterReportProps["fitnessMetrics"] {
  const code = studentId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const height = 128 + (code % 25)
  const weight = 28 + (code % 16)
  return {
    height,
    weight,
    run: (8.8 + (code % 12) / 10).toFixed(1),
    rope: 112 + (code % 36),
    level: code % 4 === 0 ? "优秀" : "良好",
    score: Math.max(80, Math.min(98, 82 + (height % 14))),
    vitalCapacity: height * 25,
    sitAndReach: (weight / 2).toFixed(1),
    standingLongJump: 142 + (code % 36),
    vision: "5.0",
  }
}

export function getReportAcademicScores(student: Student) {
  return getAcademicScores(student, ACADEMIC_SUBJECTS)
}

export function getReportHonors(honors: HonorRecord[], studentId: string, start: Date, end: Date) {
  return honors
    .filter((honor) => honor.studentId === studentId && inRange(honor.awardDate, start, end))
    .sort((a, b) => b.awardDate.localeCompare(a.awardDate))
}

export function getReportActivities(activities: Activity[], classId: string, start: Date, end: Date) {
  return activities
    .filter((activity) => activity.status !== "draft" && activity.classIds.includes(classId) && inRange(activity.startDate, start, end))
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
}