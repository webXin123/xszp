import { STUDENTS, TEACHERS } from "./mock-data"
import { getSemesterLabel } from "./pe-scores"

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

const COMMENT_SNIPPETS = [
  "本学期学习态度认真，能主动完成课堂任务，建议继续保持阅读与表达的好习惯。",
  "能积极参与小组合作，课堂发言有进步，期待在自主检查作业方面更加细致。",
  "待人友善，责任感较强，建议在遇到困难时多尝试独立思考并及时求助。",
  "学习习惯稳步提升，能认真倾听并完成任务，继续加强书写规范和时间管理。",
] as const

/**
 * 初始原型即展示已评价、录入中和待评价三类进度；用户首次保存后会写入同一份本地数据。
 */
function buildDemoCommentRecords(): StudentCommentRecord[] {
  const semester = getSemesterLabel()
  return TEACHERS.flatMap((teacher, teacherIndex) => {
    const classIds = (teacher.role === "homeroom" ? teacher.scoringClassIds : teacher.awardClassIds) ?? []
    return classIds.flatMap((classId, classIndex) => {
      const roster = STUDENTS.filter((student) => student.classId === classId)
      const completedCount = Math.min(roster.length, 3 + ((teacherIndex + classIndex) % 5))
      return roster.slice(0, completedCount).map((student, studentIndex) => ({
        id: `comment-demo-${teacher.id}-${student.id}`,
        semester,
        studentId: student.id,
        classId,
        teacherId: teacher.id,
        teacherName: teacher.name,
        role: commentRoleForTeacher(teacher.role),
        comment: COMMENT_SNIPPETS[(teacherIndex + studentIndex) % COMMENT_SNIPPETS.length],
        updatedAt: `2026-09-${String(8 + (studentIndex % 6)).padStart(2, "0")}T${String(9 + (studentIndex % 6)).padStart(2, "0")}:20:00.000Z`,
      }))
    })
  })
}

export function readCommentRecords(): StudentCommentRecord[] {
  try {
    const raw = localStorage.getItem(COMMENT_RECORDS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed as StudentCommentRecord[] : buildDemoCommentRecords()
  } catch {
    return buildDemoCommentRecords()
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
