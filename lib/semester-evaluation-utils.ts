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

export function readSemesterEvaluationRecords(): SemesterEvaluationRecord[] {
  try {
    const raw = localStorage.getItem(SEMESTER_EVALUATION_RECORDS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed as SemesterEvaluationRecord[] : []
  } catch {
    return []
  }
}

export function writeSemesterEvaluationRecords(records: SemesterEvaluationRecord[]) {
  localStorage.setItem(SEMESTER_EVALUATION_RECORDS_KEY, JSON.stringify(records))
}
