import { STUDENTS, TEACHERS } from "./mock-data"
import { getSemesterLabel } from "./pe-scores"

export const SEMESTER_EVALUATION_RECORDS_KEY = "mzlg-semester-evaluation-records-v1"

export type SemesterEvaluationLevel = "优秀" | "良好" | "达标" | "待进步"

export interface SemesterEvaluationRecord {
  id: string
  semester: string
  teacherId: string
  classId: string
  studentId: string
  ratings: Partial<Record<string, SemesterEvaluationLevel>>
  updatedAt: string
}

const DEMO_INDICATOR_IDS = [
  "responsibility",
  "self-management",
  "etiquette",
  "practice",
  "positivity",
  "safety",
  "aesthetics",
  "service",
  "integrity",
  "health",
] as const

const DEMO_LEVELS: SemesterEvaluationLevel[] = ["优秀", "良好", "达标", "待进步"]

/** 预置完整、部分完成及未评价学生，便于验证两种录入模式的进度差异。 */
function buildDemoSemesterEvaluationRecords(): SemesterEvaluationRecord[] {
  const semester = getSemesterLabel()
  return TEACHERS
    .filter((teacher) => teacher.scoringClassIds.length > 0)
    .flatMap((teacher, teacherIndex) => teacher.scoringClassIds.flatMap((classId, classIndex) => {
      const roster = STUDENTS.filter((student) => student.classId === classId)
      return roster.slice(0, 7).map((student, studentIndex) => {
        const ratedIndicators = studentIndex < 2
          ? DEMO_INDICATOR_IDS
          : DEMO_INDICATOR_IDS.slice(0, 2 + ((studentIndex + teacherIndex + classIndex) % 6))
        const ratings = Object.fromEntries(ratedIndicators.map((indicatorId, indicatorIndex) => [
          indicatorId,
          DEMO_LEVELS[(studentIndex + indicatorIndex + teacherIndex) % DEMO_LEVELS.length],
        ])) as Partial<Record<string, SemesterEvaluationLevel>>
        return {
          id: `semester-evaluation-demo-${teacher.id}-${student.id}`,
          semester,
          teacherId: teacher.id,
          classId,
          studentId: student.id,
          ratings,
          updatedAt: `2026-09-${String(7 + (studentIndex % 7)).padStart(2, "0")}T10:10:00.000Z`,
        }
      })
    }))
}

export function readSemesterEvaluationRecords(): SemesterEvaluationRecord[] {
  try {
    const raw = localStorage.getItem(SEMESTER_EVALUATION_RECORDS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed as SemesterEvaluationRecord[] : buildDemoSemesterEvaluationRecords()
  } catch {
    return buildDemoSemesterEvaluationRecords()
  }
}

export function writeSemesterEvaluationRecords(records: SemesterEvaluationRecord[]) {
  localStorage.setItem(SEMESTER_EVALUATION_RECORDS_KEY, JSON.stringify(records))
}
