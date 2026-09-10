import type { Student } from "./types"

export const ACADEMIC_SUBJECTS = ["语文", "数学", "英语", "科学", "道德与法治", "体育"] as const
export type AcademicSubject = (typeof ACADEMIC_SUBJECTS)[number]

export interface AcademicScore {
  subject: AcademicSubject
  score: number
  level: "优秀" | "良好" | "合格"
}

function hash(input: string) {
  let value = 0
  for (let index = 0; index < input.length; index += 1) value = (value * 31 + input.charCodeAt(index)) % 997
  return value
}

export function getAcademicScores(student: Student, subjects: readonly AcademicSubject[] = ACADEMIC_SUBJECTS): AcademicScore[] {
  return subjects.map((subject, index) => {
    const score = 76 + ((hash(`${student.id}:${subject}`) + index * 7) % 22)
    return {
      subject,
      score,
      level: score >= 90 ? "优秀" : score >= 80 ? "良好" : "合格",
    }
  })
}
