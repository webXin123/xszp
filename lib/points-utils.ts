import type { AwardCardRecord, HonorRecord, Student } from "./types"
import { AWARD_LEVEL1_LIST } from "./award-utils"
import { getISOWeekKey } from "./scoring-utils"

/** 积分来源标签 */
export type PointSource = "online" | "offline_scan" | "flag_reward" | "honor"

export const POINT_SOURCE_LABEL: Record<PointSource, string> = {
  online: "线上奖卡",
  offline_scan: "线下扫码",
  flag_reward: "流动红旗奖励",
  honor: "荣誉录入",
}

export const POINT_SOURCE_STYLE: Record<PointSource, string> = {
  online: "bg-brand-blue/15 text-brand-blue",
  offline_scan: "bg-brand-green/15 text-brand-green",
  flag_reward: "bg-brand-yellow/20 text-brand-yellow",
  honor: "bg-brand-orange/15 text-brand-orange",
}

export type TimeRange = "week" | "month" | "semester"

export const TIME_RANGE_LABEL: Record<TimeRange, string> = {
  week: "本周",
  month: "本月",
  semester: "本学期",
}

/** 本学期起止：学年从 9 月开始；8 月为新学年预备期，归入新学年第一学期（8/1 ~ 次年 6/30） */
export function getSemesterRange(now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  if (month >= 8) {
    return { start: new Date(year, 7, 1), end: new Date(year + 1, 5, 30) }
  }
  return { start: new Date(year - 1, 8, 1), end: new Date(year, 5, 30) }
}

export function getMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function getWeekRange(now = new Date()) {
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

export function inRange(dateStr: string, start: Date, end: Date) {
  const t = new Date(dateStr).getTime()
  return t >= start.getTime() && t <= end.getTime()
}

export interface PointEntry {
  id: string
  studentId: string
  studentName: string
  classId: string
  level1: string
  points: number
  date: string
  createdAt: string
  source: PointSource
  /** 来源描述（荣誉名称 / 二级指标） */
  detail: string
}

/** 把奖卡与荣誉记录合并成统一的积分流水 */
export function buildPointEntries(
  awardCards: AwardCardRecord[],
  honors: HonorRecord[],
): PointEntry[] {
  const fromCards: PointEntry[] = awardCards.map((a) => ({
    id: a.id,
    studentId: a.studentId,
    studentName: a.studentName,
    classId: a.classId,
    level1: a.level1,
    points: a.points,
    date: a.date,
    createdAt: a.createdAt,
    source: a.source,
    detail: a.level2,
  }))
  const fromHonors: PointEntry[] = honors.map((h) => ({
    id: h.id,
    studentId: h.studentId,
    studentName: h.studentName,
    classId: h.classId,
    level1: h.level1,
    points: h.points,
    date: h.awardDate,
    createdAt: h.createdAt,
    source: "honor",
    detail: h.honorName,
  }))
  return [...fromCards, ...fromHonors]
}

/** 按时间范围 + 班级过滤积分流水 */
export function filterEntries(
  entries: PointEntry[],
  classId: string,
  range: TimeRange,
  now = new Date(),
) {
  const r = range === "week" ? getWeekRange(now) : range === "month" ? getMonthRange(now) : getSemesterRange(now)
  return entries
    .filter((e) => e.classId === classId)
    .filter((e) => inRange(e.date, r.start, r.end))
}

/** 按一级指标聚合（用于柱状图）：返回每个 level1 的总积分 */
export function aggregateByLevel1(entries: PointEntry[]): { level1: string; points: number }[] {
  const map = new Map<string, number>()
  for (const name of AWARD_LEVEL1_LIST) map.set(name, 0)
  for (const e of entries) {
    map.set(e.level1, (map.get(e.level1) ?? 0) + e.points)
  }
  return AWARD_LEVEL1_LIST.map((level1) => ({ level1, points: map.get(level1) ?? 0 }))
}

export interface StudentPoints {
  studentId: string
  studentNo: string
  name: string
  gender: string
  /** 每个一级指标的积分小计 */
  byLevel1: Record<string, number>
  /** 学期积分总和（所有 level1） */
  semesterTotal: number
  /** 累计积分总和（不限时间） */
  cumulativeTotal: number
}

/** 按学生聚合积分，含每个一级指标小计、学期总和、累计总和 */
export function aggregateByStudent(
  entries: PointEntry[],
  allEntries: PointEntry[],
  students: Student[],
  classId: string,
  range: TimeRange,
  now = new Date(),
): StudentPoints[] {
  const r = range === "week" ? getWeekRange(now) : range === "month" ? getMonthRange(now) : getSemesterRange(now)
  const roster = students.filter((s) => s.classId === classId)
  return roster.map((s) => {
    const byLevel1: Record<string, number> = {}
    for (const name of AWARD_LEVEL1_LIST) byLevel1[name] = 0
    let semesterTotal = 0
    for (const e of entries) {
      if (e.studentId !== s.id) continue
      if (!inRange(e.date, r.start, r.end)) continue
      byLevel1[e.level1] = (byLevel1[e.level1] ?? 0) + e.points
      semesterTotal += e.points
    }
    let cumulativeTotal = 0
    for (const e of allEntries) {
      if (e.studentId !== s.id) continue
      cumulativeTotal += e.points
    }
    return {
      studentId: s.id,
      studentNo: s.studentNo,
      name: s.name,
      gender: s.gender,
      byLevel1,
      semesterTotal,
      cumulativeTotal,
    }
  })
}
