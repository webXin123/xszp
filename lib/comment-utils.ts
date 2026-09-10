export type CommentTeacherRole = "homeroom" | "subject" | "pe_teacher"

export interface StudentCommentRecord {
  id: string
  semester: string
  studentId: string
  classId: string
  teacherId: string
  teacherName: string
  role: CommentTeacherRole
  comment: string
  updatedAt: string
}

export const COMMENT_RECORDS_KEY = "mzlg-student-comments-v1"

export function readCommentRecords(): StudentCommentRecord[] {
  try {
    const raw = localStorage.getItem(COMMENT_RECORDS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed as StudentCommentRecord[] : []
  } catch {
    return []
  }
}

export function writeCommentRecords(records: StudentCommentRecord[]) {
  localStorage.setItem(COMMENT_RECORDS_KEY, JSON.stringify(records))
}

export function commentRoleForTeacher(role: string): CommentTeacherRole {
  if (role === "homeroom") return "homeroom"
  if (role === "pe_teacher") return "pe_teacher"
  return "subject"
}
