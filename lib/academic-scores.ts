import type { Student } from "./types"

/** 上海市小学学科及后台维护的成绩分项。gradeOrders 对应一年级至五年级。 */
export const ACADEMIC_SUBJECT_CONFIGS = [
  { id: "chinese", name: "语文", gradeOrders: [1, 2, 3, 4, 5], assessmentItems: ["基础知识", "阅读理解", "表达与习作"] },
  { id: "math", name: "数学", gradeOrders: [1, 2, 3, 4, 5], assessmentItems: ["计算能力", "解决问题", "数学表达"] },
  { id: "english", name: "英语", gradeOrders: [3, 4, 5], assessmentItems: ["听说", "阅读", "书面表达"] },
  { id: "morality", name: "道德与法治", gradeOrders: [1, 2, 3, 4, 5], assessmentItems: ["学习表现", "主题实践"] },
  { id: "science", name: "科学", gradeOrders: [1, 2, 3, 4, 5], assessmentItems: ["科学探究", "实验与操作", "学习表现"] },
  { id: "it", name: "信息科技", gradeOrders: [3, 4, 5], assessmentItems: ["基础知识", "上机操作"] },
  { id: "music", name: "音乐", gradeOrders: [1, 2, 3, 4, 5], assessmentItems: ["演唱演奏", "欣赏表现"] },
  { id: "art", name: "美术", gradeOrders: [1, 2, 3, 4, 5], assessmentItems: ["创意表现", "技能实践"] },
  { id: "pe", name: "体育与健身", gradeOrders: [1, 2, 3, 4, 5], assessmentItems: ["运动技能", "体能", "学习态度"] },
  { id: "labor", name: "劳动", gradeOrders: [1, 2, 3, 4, 5], assessmentItems: ["劳动实践", "劳动素养"] },
] as const

export type AcademicSubject = (typeof ACADEMIC_SUBJECT_CONFIGS)[number]["name"]
export const ACADEMIC_SUBJECTS = ACADEMIC_SUBJECT_CONFIGS.map((item) => item.name) as AcademicSubject[]

export const ACADEMIC_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C"] as const
export type AcademicGrade = (typeof ACADEMIC_GRADES)[number]

export interface AcademicScoreItem {
  name: string
  grade: AcademicGrade
}

export interface AcademicScore {
  subject: AcademicSubject
  grade: AcademicGrade
  items: AcademicScoreItem[]
}

function hash(input: string) {
  let value = 0
  for (let index = 0; index < input.length; index += 1) value = (value * 31 + input.charCodeAt(index)) % 997
  return value
}

export function getAcademicSubjectConfig(subject: string) {
  return ACADEMIC_SUBJECT_CONFIGS.find((item) => item.name === subject)
}

export function getAcademicSubjectsForGradeOrder(gradeOrder: number) {
  return ACADEMIC_SUBJECT_CONFIGS.filter((item) => (item.gradeOrders as readonly number[]).includes(gradeOrder))
}

export function getAcademicGradeIndex(grade: AcademicGrade) {
  return ACADEMIC_GRADES.indexOf(grade)
}

export function shiftAcademicGrade(grade: AcademicGrade, offset: number): AcademicGrade {
  const index = Math.max(0, Math.min(ACADEMIC_GRADES.length - 1, getAcademicGradeIndex(grade) + offset))
  return ACADEMIC_GRADES[index]
}

export function getAcademicScores(student: Student, subjects: readonly AcademicSubject[] = ACADEMIC_SUBJECTS): AcademicScore[] {
  return subjects.map((subject) => {
    const config = getAcademicSubjectConfig(subject)
    const items = (config?.assessmentItems ?? ["成绩"]).map((name, itemIndex) => ({
      name,
      grade: ACADEMIC_GRADES[hash(`${student.id}:${subject}:${name}:${itemIndex}`) % 6] as AcademicGrade,
    }))
    const gradeIndex = Math.round(items.reduce((sum, item) => sum + getAcademicGradeIndex(item.grade), 0) / items.length)
    return {
      subject,
      grade: ACADEMIC_GRADES[gradeIndex],
      items,
    }
  })
}
