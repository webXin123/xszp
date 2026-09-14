export type TeacherRole = "homeroom" | "subject" | "moral_director" | "director" | "pe_teacher"

export type Segment = "小学部" | "初中部"

export type Campus = "屹力校区" | "屹力校区"

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
  /** 新版评价工作台的可选扩展字段，兼容历史扣分记录 */
  scoreType?: "deduct" | "add"
  targetType?: "class" | "student"
  indicatorId?: string
  studentIds?: string[]
  amount?: number
}

export interface WeeklyFlag {
  classId: string
  /** 周榜使用 ISO 周标识，月榜使用 yyyy-MM 标识，保留字段名以兼容既有数据。 */
  weekKey: string
  /** 对应的流动红旗配置；旧数据为空时默认归入该周期的第一个配置。 */
  configId?: string
  period?: FlagPeriod
  awarded: boolean
  awardedBy?: string
  awardedAt?: string
}

export type FlagPeriod = "week" | "month"

export interface FlagConfig {
  id: string
  period: FlagPeriod
  name: string
  /** 用户上传的流动红旗展示图片；为空时使用内置发放状态图标 */
  image?: string | null
  enabled: boolean
  syncFiveEducation: boolean
  syncLevel1?: string
  syncLevel2?: string
  syncLevel3?: string
}

export type ClassRatingDefaultImage = "smile" | "cry"
export type ClassRatingTheme = "blue" | "green" | "orange"

export interface ClassRatingConfig {
  id: string
  name: string
  description: string
  /** 用户上传的评级图片；为空时使用 defaultImage 对应的内置图片 */
  image: string | null
  defaultImage: ClassRatingDefaultImage
  autoIssueDay: "saturday" | "sunday" | "monday"
  rankStart: string
  rankEnd: string
  theme: ClassRatingTheme
}

export interface AwardIndicatorLevel2 {
  level2: string
  items: AwardIndicatorLevel3[]
}

export interface AwardIndicatorLevel3 {
  id: string
  level3: string
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
  /** 奖卡三级指标，旧记录可能为空。 */
  level3?: string
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
export type HonorReviewStatus = "pending" | "approved" | "rejected"

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
  /** 家长上传的荣誉需班主任审核后才计入积分；历史记录默认为已通过。 */
  reviewStatus?: HonorReviewStatus
  reviewNote?: string
  reviewedAt?: string
  reviewedBy?: string
  submittedByParent?: boolean
}

/* ------------------------------------------------------------------ *
 * 积分商城
 * ------------------------------------------------------------------ */

export type MallProductStatus = "listed" | "unlisted"
export type MallRequirementMode = "all" | "any"

/** 商品兑换需要达到的本学期一级指标积分。 */
export interface MallPointRequirement {
  level1: string
  minimumPoints: number
}

export interface MallProduct {
  id: string
  name: string
  category: string
  description: string
  image: string
  /** 当前可兑换库存 */
  stock: number
  /** 发布时设置的初始库存，用于后台统计 */
  initialStock: number
  pointsCost: number
  status: MallProductStatus
  /** 可兑换年级；为空时表示全部年级 */
  gradeIds: string[]
  requirementsEnabled: boolean
  requirementMode: MallRequirementMode
  requirements: MallPointRequirement[]
  createdAt: string
  updatedAt: string
}

export interface MallConfig {
  startAt: string
  endAt: string
  exchangeLocation: string
  notice: string
}

export interface MallCartItem {
  studentId: string
  productId: string
  quantity: number
}

export interface MallRedemption {
  id: string
  orderNo: string
  productId: string
  productName: string
  productImage: string
  productPoints: number
  quantity: number
  totalPoints: number
  studentId: string
  studentName: string
  classId: string
  gradeId: string
  redeemedAt: string
  offlineRedeemed: boolean
  offlineRedeemedAt?: string
}

/* ------------------------------------------------------------------ *
 * 活动管理
 * ------------------------------------------------------------------ */

/** 活动状态：由报名/结束时间与审核流程推进 */
export type ActivityStatus = "draft" | "recruiting" | "ongoing" | "ended"

/** 报名审核状态 */
export type EnrollmentStatus = "pending" | "approved" | "rejected" | "cancelled"

/** 成果提交类型 */
export type SubmissionType = "photo" | "practice" | "reflection"

/** 报名时需满足的本学期五育积分条件。 */
export interface ActivityPointRequirement {
  level1: string
  minimumPoints: number
}

export interface Activity {
  id: string
  title: string
  /** 活动描述/简介 */
  description: string
  /** 一级指标，用于兼容历史活动关联的综评数据来源。 */
  level1?: string
  /** 参与年级 id 列表 */
  gradeIds: string[]
  /** 参与班级 id 列表（在所选年级下） */
  classIds: string[]
  /** 是否需要活动报名；旧数据未配置时默认需要报名。 */
  requiresEnrollment?: boolean
  /** 是否需要积分兑换；仅在需要报名时生效。 */
  requiresPointsExchange?: boolean
  /** 报名时需满足的本学期一级指标积分条件。 */
  pointRequirements?: ActivityPointRequirement[]
  /** 报名开始时间 yyyy-MM-ddTHH:mm */
  enrollStart: string
  /** 报名结束时间 yyyy-MM-ddTHH:mm */
  enrollEnd: string
  /** 活动开始时间 yyyy-MM-ddTHH:mm */
  startDate: string
  /** 活动结束时间 yyyy-MM-ddTHH:mm */
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
