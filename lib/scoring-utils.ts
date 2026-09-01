import indicatorsData from "./data/evaluation-indicators.json"
import type { IndicatorGroup, ScoreRecord } from "./types"

export const INDICATOR_GROUPS = indicatorsData as IndicatorGroup[]

export const LEVEL1_LIST = Array.from(new Set(INDICATOR_GROUPS.map((g) => g.level1)))

export function getLevel2Groups(level1: string) {
  return INDICATOR_GROUPS.filter((g) => g.level1 === level1)
}

export function getGroupByLevel2(level1: string, level2: string) {
  return INDICATOR_GROUPS.find((g) => g.level1 === level1 && g.level2 === level2)
}

/** Full-mark total for one level2 group (sum of level3 maxScore) */
export function getGroupMaxScore(group: IndicatorGroup) {
  return group.items.reduce((sum, item) => sum + item.maxScore, 0)
}

/** Full-mark total across all indicators (for weekly total) */
export function getAllIndicatorsMaxScore() {
  return INDICATOR_GROUPS.reduce((sum, g) => sum + getGroupMaxScore(g), 0)
}

export function getISOWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

/** Monday..Sunday range containing the given date */
export function getWeekRange(date: Date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: monday, end: sunday }
}

export function formatDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function formatDateRangeLabel(weekKey: string) {
  const [yearStr, weekStr] = weekKey.split("-W")
  const year = Number(yearStr)
  const week = Number(weekStr)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1)
  const monday = new Date(week1Monday)
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
  return `${fmt(monday)} ~ ${fmt(sunday)}`
}

/** Sum of deductions for a class within records matching a predicate */
export function sumDeductions(records: ScoreRecord[]) {
  return records.reduce((sum, r) => sum + r.totalDeduction, 0)
}

export function getRecordsForCell(records: ScoreRecord[], classId: string, date: string, level1: string, level2: string) {
  return records.filter(
    (r) => r.classId === classId && r.date === date && r.level1 === level1 && r.level2 === level2,
  )
}

export function getRecordsForWeek(records: ScoreRecord[], classId: string, weekKey: string) {
  return records.filter((r) => r.classId === classId && getISOWeekKey(new Date(r.date)) === weekKey)
}

export interface WeeklyScoreResult {
  classId: string
  maxScore: number
  deduction: number
  total: number
}

export function computeWeeklyScore(records: ScoreRecord[], classId: string, weekKey: string): WeeklyScoreResult {
  const maxScore = getAllIndicatorsMaxScore()
  const weekRecords = getRecordsForWeek(records, classId, weekKey)
  const deduction = sumDeductions(weekRecords)
  return { classId, maxScore, deduction, total: maxScore + deduction }
}
