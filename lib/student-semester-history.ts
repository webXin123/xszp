import {
  ACADEMIC_SUBJECTS,
  getAcademicScores,
  type AcademicScore,
} from "./academic-scores"

export interface StudentSemesterOption {
  key: string
  label: string
  start: Date
  end: Date
}

export interface StudentFitnessMetrics {
  height: number
  weight: number
  run: string
  rope: number
  level: string
  score: number
  vitalCapacity: number
  sitAndReach: string
  standingLongJump: number
  vision: string
}

function hash(input: string) {
  let value = 0
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) % 997
  }
  return value
}

function semesterLabelForStart(start: Date) {
  const year = start.getFullYear()
  return start.getMonth() === 7
    ? `${year}-${year + 1} 学年第一学期`
    : `${year - 1}-${year} 学年第二学期`
}

function previousSemesterStart(start: Date) {
  return start.getMonth() === 7
    ? new Date(start.getFullYear(), 1, 1)
    : new Date(start.getFullYear() - 1, 7, 1)
}

function currentSemesterStart(now: Date) {
  const year = now.getFullYear()
  const month = now.getMonth()
  if (month >= 7) return new Date(year, 7, 1)
  if (month >= 1) return new Date(year, 1, 1)
  return new Date(year - 1, 7, 1)
}

export function getStudentSemesterOptions(now = new Date(), count = 5): StudentSemesterOption[] {
  const options: StudentSemesterOption[] = []
  let start = currentSemesterStart(now)
  for (let index = 0; index < count; index += 1) {
    const nextStart = start.getMonth() === 7
      ? new Date(start.getFullYear() + 1, 1, 1)
      : new Date(start.getFullYear(), 7, 1)
    options.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: semesterLabelForStart(start),
      start,
      end: new Date(nextStart.getTime() - 1),
    })
    start = previousSemesterStart(start)
  }
  return options
}

export function getStudentAcademicHistory(
  student: Parameters<typeof getAcademicScores>[0],
  semesters: StudentSemesterOption[],
): Array<StudentSemesterOption & { scores: AcademicScore[] }> {
  const latest = getAcademicScores(student, ACADEMIC_SUBJECTS)
  return semesters.map((semester, semesterIndex) => {
    if (semesterIndex === 0) return { ...semester, scores: latest }
    const scores = latest.map((item) => {
      const items = item.items.map((detail, itemIndex) => {
        const delta = (hash(`${student.id}:${semester.key}:${item.subject}:${itemIndex}`) % 9) - 4
        return { ...detail, score: Math.max(60, Math.min(99, detail.score + delta)) }
      })
      const score = Math.round(items.reduce((sum, detail) => sum + detail.score, 0) / items.length)
      const level: AcademicScore["level"] = score >= 90 ? "优秀" : score >= 80 ? "良好" : "合格"
      return {
        ...item,
        score,
        level,
        items,
      }
    })
    return { ...semester, scores }
  })
}

export function getStudentFitnessHistory(
  studentId: string,
  semesters: StudentSemesterOption[],
): Array<StudentSemesterOption & { metrics: StudentFitnessMetrics }> {
  const code = studentId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return semesters.map((semester, semesterIndex) => {
    const trend = semesterIndex === 0 ? 0 : (hash(`${studentId}:${semester.key}`) % 7) - 3
    const height = 128 + (code % 25) + trend
    const weight = 28 + (code % 16) + Math.round(trend / 2)
    const run = (8.8 + (code % 12) / 10 - trend * 0.05).toFixed(1)
    const rope = 112 + (code % 36) + trend * 2
    const level = code % 4 === 0 ? "优秀" : "良好"
    const score = Math.max(76, Math.min(99, 82 + (height % 14) - trend))
    return {
      ...semester,
      metrics: {
        height,
        weight,
        run,
        rope,
        level,
        score,
        vitalCapacity: height * 25,
        sitAndReach: (weight / 2 + trend * 0.2).toFixed(1),
        standingLongJump: rope + 30 + trend * 2,
        vision: semesterIndex > 2 && code % 5 === 0 ? "4.9" : "5.0",
      },
    }
  })
}

export function getHistoricalFiveEducation(studentId: string, semesterKey: string) {
  return [0, 1, 2, 3, 4].map((index) => 8 + (hash(`${studentId}:${semesterKey}:${index}`) % 18))
}
