export type TeacherRole = "homeroom" | "subject" | "grade_leader" | "director" | "pe_teacher"

export type Segment = "小学部" | "初中部"

export type Campus = "临港校区" | "明珠校区"

/** 当前登录身份：教师或家长。家长身份用于查看自己孩子的积分/奖卡/荣誉/活动（只读）。 */
export type UserKind = "teacher" | "parent"

/** 家长名下绑定的一个孩子 */
export interface ParentChild {
  /** 对应 Student.id */
  studentId: string
  name: string
  classId: string
  className: string
  gradeId: string
}

/** 家长身份：绑定一个或多个孩子，仅只读访问 */
export interface ParentUser {
  id: string
  kind: "parent"
  /** 家长显示名（例：陈妈妈） */
  name: string
  /** 名下孩子列表；单孩家长长度为 1，多孩家长可在页内切换 */
  children: ParentChild[]
}

export type CurrentUser = Teacher | ParentUser

export interface Teacher {
  id: string
  name: string
  avatar: string
  role: TeacherRole
  title: string
  /** 判别字段：教师身份 */
  kind?: "teacher"
  /** Class ids this teacher is allowed to score (班级评价) */
  scoringClassIds: string[]
  /** Class ids this teacher can issue award cards to (奖卡发放); undefined = 全部班级 */
  awardClassIds?: string[]
  /** Grade ids this teacher can view rankings for */
  viewGradeIds: string[]
  /** Class ids this teacher manages for PE score import (体质健康成绩导入) */
  peTeacherClassIds?: string[]
}

export interface Grade {
  id: string
  name: string
  segment: Segment
  campus: Campus
  /** Display order, small first */
  order: number
}

export interface SchoolClass {
  id: string
  name: string
  /** Compact label used inside dense tables, e.g. 01班 */
  shortName: string
  gradeId: string
  homeroomTeacher: string
  studentCount: number
}

export interface Student {
  id: string
  name: string
  /** Two-digit in-class number, e.g. 07 */
  studentNo: string
  classId: string
  /** 性别：按学号奇偶确定性生成（奇=男，偶=女） */
  gender: "男" | "女"
}

export interface IndicatorLevel3 {
  id: string
  name: string
  maxScore: number
  /** negative number, e.g. -1 */
  penalty: number
}

export interface IndicatorGroup {
  level1: string
  level2: string
  items: IndicatorLevel3[]
}

export interface ScoreEntry {
  /** level3 indicator id -> number of times deducted */
  itemId: string
  count: number
}

export interface ScoreRecord {
  id: string
  classId: string
  date: string // yyyy-MM-dd
  level1: string
  level2: string
  entries: ScoreEntry[]
  totalDeduction: number
  studentNames: string[]
  note: string
  imageDataUrl: string | null
  operatorId: string
  operatorName: string
  createdAt: string
}

export interface WeeklyFlag {
  classId: string
  weekKey: string // e.g. 2026-W35
  awarded: boolean
  awardedBy?: string
  awardedAt?: string
}

export interface AwardIndicatorLevel2 {
  id: string
  level2: string
  description: string
  points: number
  /** 奖卡正面图片路径 */
  image: string | null
}

export interface AwardIndicatorGroup {
  level1: string
  items: AwardIndicatorLevel2[]
}

/** 奖卡来源 */
export type AwardSource = "online" | "offline_scan" | "flag_reward"

export interface AwardCardRecord {
  id: string
  studentId: string
  studentName: string
  classId: string
  indicatorId: string
  level1: string
  level2: string
  points: number
  weekKey: string
  date: string
  /** 来源：线上发放 / 线下扫码 / 流动红旗奖励 */
  source: AwardSource
  operatorId: string
  operatorName: string
  createdAt: string
}

/** 荣誉级别：分值即加分 */
export type HonorLevel = "school" | "district" | "city" | "national"

export interface HonorRecord {
  id: string
  studentId: string
  studentName: string
  classId: string
  /** 五育奖卡一级指标 */
  level1: string
  honorLevel: HonorLevel
  /** 加分：1/2/3/4 */
  points: number
  /** 荣誉名称（OCR 识别可编辑） */
  honorName: string
  /** 获奖时间 yyyy-MM-dd（OCR 识别可编辑） */
  awardDate: string
  /** 颁发单位（OCR 识别可编辑） */
  issuer: string
  /** 奖状图片 data URL */
  imageDataUrl: string | null
  operatorId: string
  operatorName: string
  createdAt: string
}

/* ------------------------------------------------------------------ *
 * 活动管理
 * ------------------------------------------------------------------ */

/** 活动状态：由报名/结束时间与审核流程推进 */
export type ActivityStatus = "draft" | "recruiting" | "ongoing" | "ended" | "closed"

/** 报名审核状态 */
export type EnrollmentStatus = "pending" | "approved" | "rejected" | "cancelled"

/** 成果提交类型 */
export type SubmissionType = "photo" | "practice" | "reflection"

export interface Activity {
  id: string
  title: string
  /** 活动描述/简介 */
  description: string
  /** 一级指标，用于关联综评数据来源 */
  level1: string
  /** 参与年级 id 列表 */
  gradeIds: string[]
  /** 参与班级 id 列表（在所选年级下） */
  classIds: string[]
  /** 报名开始日期 yyyy-MM-dd */
  enrollStart: string
  /** 报名结束日期 yyyy-MM-dd */
  enrollEnd: string
  /** 活动开始日期 yyyy-MM-dd */
  startDate: string
  /** 活动结束日期 yyyy-MM-dd */
  endDate: string
  /** 报名所需消耗积分门槛；0 表示不限制 */
  pointsCost: number
  /** 名额上限；0 表示不限 */
  capacity: number
  /** 活动地点 */
  location: string
  status: ActivityStatus
  /** 发布人 */
  publisherId: string
  publisherName: string
  createdAt: string
}

export interface Enrollment {
  id: string
  activityId: string
  studentId: string
  studentName: string
  classId: string
  /** 报名时消耗的积分（快照，便于回溯） */
  pointsCost: number
  status: EnrollmentStatus
  /** 报名附言 */
  remark: string
  enrolledAt: string
  /** 是否已扣减积分（审核通过即锁定，驳回/取消时退还） */
  pointsSpent: boolean
  /** 审核信息 */
  reviewerId?: string
  reviewerName?: string
  reviewedAt?: string
  reviewNote?: string
}

export interface ActivitySubmission {
  id: string
  activityId: string
  studentId: string
  studentName: string
  classId: string
  type: SubmissionType
  /** 文本类成果内容（感悟、实践说明） */
  content: string
  /** 图片 data URL 列表 */
  imageUrls: string[]
  createdAt: string
}

export interface ActivityEvaluation {
  id: string
  activityId: string
  studentId: string
  studentName: string
  /** 评分 1-5 */
  rating: number
  comment: string
  createdAt: string
}
