"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { CLASSES, GRADES, PARENT_USERS, STUDENTS, TEACHERS } from "./mock-data"
import type {
  Activity,
  ActivityEvaluation,
  ActivitySubmission,
  AwardCardRecord,
  AwardSource,
  CurrentUser,
  Enrollment,
  EnrollmentStatus,
  HonorLevel,
  HonorRecord,
  ParentUser,
  ScoreRecord,
  Teacher,
  WeeklyFlag,
} from "./types"
import { formatDate, getISOWeekKey, getWeekRange } from "./scoring-utils"
import { isEnrolling } from "./activity-utils"
import type { PeScoreUpload } from "./pe-scores"

const RECORDS_KEY = "mzlg-score-records-v1"
const FLAGS_KEY = "mzlg-weekly-flags-v1"
const AWARD_CARDS_KEY = "mzlg-award-cards-v1"
const HONORS_KEY = "mzlg-honors-v1"
const ACTIVITIES_KEY = "mzlg-activities-v1"
const ENROLLMENTS_KEY = "mzlg-enrollments-v1"
const SUBMISSIONS_KEY = "mzlg-submissions-v1"
const EVALUATIONS_KEY = "mzlg-evaluations-v1"
const CURRENT_USER_KEY = "mzlg-current-user-v1"
const PE_SCORES_KEY = "mzlg-pe-scores-v1"

function seedRecords(): ScoreRecord[] {
  const now = Date.now()
  const day = 86400000
  const today = formatDate(new Date())
  const yesterday = formatDate(new Date(now - day))
  const twoDaysAgo = formatDate(new Date(now - 2 * day))
  const threeDaysAgo = formatDate(new Date(now - 3 * day))

  const mk = (
    id: string,
    classId: string,
    date: string,
    level1: string,
    level2: string,
    itemId: string,
    count: number,
    totalDeduction: number,
    studentNames: string[],
    note: string,
    operatorId: string,
    operatorName: string,
    daysAgo: number,
  ): ScoreRecord => ({
    id,
    classId,
    date,
    level1,
    level2,
    entries: [{ itemId, count }],
    totalDeduction,
    studentNames,
    note,
    imageDataUrl: null,
    operatorId,
    operatorName,
    createdAt: new Date(now - daysAgo * day).toISOString(),
  })

  return [
    mk("seed-1", "class-6-1", yesterday, "礼仪形象", "仪容仪表", "ly-2", 2, -2, ["陈思远"], "晨检时红领巾未佩戴", "teacher-zhao", "赵得鑫", 1),
    mk("seed-2", "class-6-1", yesterday, "课间文明休息", "行为安全", "jj-1", 1, -3, [], "走廊追逐打闹", "teacher-zhao", "赵得鑫", 1),
    mk("seed-3", "class-6-1", today, "早操", "做操纪律", "zc-2", 1, -3, [], "做操期间交头接耳", "teacher-zhao", "赵得鑫", 0),
    mk("seed-4", "class-6-2", yesterday, "卫生", "环境卫生", "hy-1", 1, -2, [], "", "teacher-wang", "王芳", 1),
    mk("seed-5", "class-6-2", twoDaysAgo, "路队", "队伍秩序", "ld-1", 1, -3, [], "", "teacher-wang", "王芳", 2),
    mk("seed-6", "class-6-3", today, "路队", "队伍秩序", "ld-1", 1, -3, [], "", "teacher-chen", "陈明", 0),
    mk("seed-7", "class-6-3", yesterday, "卫生", "物品摆放", "hy-4", 1, -2, [], "", "teacher-shen", "沈亦菲", 1),
    mk("seed-8", "class-6-4", yesterday, "礼仪形象", "文明礼仪", "ly-5", 1, -1, [], "遇到老师未主动问好", "teacher-jiang", "蒋文博", 1),
    mk("seed-9", "class-6-4", threeDaysAgo, "卫生", "环境卫生", "hy-2", 1, -2, [], "", "teacher-jiang", "蒋文博", 3),
    mk("seed-10", "class-7-1", yesterday, "课间文明休息", "文明秩序", "jj-5", 1, -3, [], "课间大声喧哗", "teacher-xu", "徐蓉", 1),
    mk("seed-11", "class-7-2", today, "午休、午会", "午休管理", "wx-1", 1, -5, [], "午休期间教室内不安静", "teacher-xu", "徐蓉", 0),
    mk("seed-12", "class-7-3", twoDaysAgo, "早操", "精神面貌", "zc-3", 1, -2, [], "", "teacher-xu", "徐蓉", 2),
    mk("seed-13", "class-5-1", yesterday, "卫生", "物品摆放", "hy-6", 1, -2, [], "卫生工具未归位", "teacher-he", "何淑芬", 1),
    mk("seed-14", "class-5-2", yesterday, "早操", "进退场秩序", "zc-4", 1, -3, [], "进场队伍不整齐", "teacher-zhou", "周海峰", 1),
    mk("seed-15", "class-mz-4-1", today, "礼仪形象", "仪容仪表", "ly-1", 1, -3, ["李晓雨"], "未按要求穿校服", "teacher-gu", "顾伟", 0),
    mk("seed-16", "class-6-1", twoDaysAgo, "礼仪形象", "仪容仪表", "ly-1", 1, -3, ["王浩然"], "未穿校服", "teacher-zhao", "赵得鑫", 2),
  ]
}

function seedAwardCards(): AwardCardRecord[] {
  const now = Date.now()
  const day = 86400000
  const today = formatDate(new Date())
  const yesterday = formatDate(new Date(now - day))
  const weekKey = getISOWeekKey(new Date())
  const twoDaysAgo = formatDate(new Date(now - 2 * day))
  const lastWeekKey = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return getISOWeekKey(d)
  })()
  const nameOf = (studentId: string) => STUDENTS.find((s) => s.id === studentId)?.name ?? ""
  // 上周获流动红旗的班级（6-1、7-1）全部学生各获一张“合作创享星”奖卡（+1）
  const flagRewardStudents = [
    ...STUDENTS.filter((s) => s.classId === "class-6-1"),
    ...STUDENTS.filter((s) => s.classId === "class-7-1"),
  ]
  const flagRewards: AwardCardRecord[] = flagRewardStudents.map((s, idx) =>
    mk(
      `award-flag-${idx}`,
      s.id,
      s.classId,
      "award-7-1",
      "合作创享星",
      "团队协作",
      1,
      twoDaysAgo,
      "system",
      "流动红旗奖励",
      2,
      "flag_reward",
    ),
  )
  const mk = (
    id: string,
    studentId: string,
    classId: string,
    indicatorId: string,
    level1: string,
    level2: string,
    points: number,
    date: string,
    operatorId: string,
    operatorName: string,
    daysAgo: number,
    source: AwardSource = "online",
  ): AwardCardRecord => ({
    id,
    studentId,
    studentName: nameOf(studentId),
    classId,
    indicatorId,
    level1,
    level2,
    points,
    weekKey,
    date,
    source,
    operatorId,
    operatorName,
    createdAt: new Date(now - daysAgo * day).toISOString(),
  })
  return [
    mk("award-seed-1", "class-6-1-stu-1", "class-6-1", "award-1-1", "智慧小博士", "乐于探究", 1, today, "teacher-zhao", "赵得鑫", 0),
    mk("award-seed-2", "class-6-1-stu-2", "class-6-1", "award-7-1", "合作创享星", "团队协作", 1, today, "teacher-zhao", "赵得鑫", 0),
    mk("award-seed-3", "class-6-1-stu-3", "class-6-1", "award-3-2", "友善美少年", "尊重包容", 1, yesterday, "teacher-zhao", "赵得鑫", 1),
    mk("award-seed-4", "class-6-1-stu-4", "class-6-1", "award-5-1", "才艺智多星", "感知美与欣赏美", 1, yesterday, "teacher-liu", "刘敏", 1),
    mk("award-seed-5", "class-6-2-stu-1", "class-6-2", "award-3-1", "友善美少年", "友爱互助", 1, today, "teacher-wang", "王芳", 0),
    mk("award-seed-6", "class-6-2-stu-2", "class-6-2", "award-1-2", "智慧小博士", "勤于思考", 1, yesterday, "teacher-liu", "刘敏", 1),
    mk("award-seed-7", "class-6-2-stu-3", "class-6-2", "award-9-1", "自信创造星", "自信表达", 1, yesterday, "teacher-wang", "王芳", 1),
    mk("award-seed-8", "class-6-3-stu-1", "class-6-3", "award-7-2", "合作创享星", "乐于分享", 1, today, "teacher-shen", "沈亦菲", 0),
    mk("award-seed-9", "class-6-4-stu-1", "class-6-4", "award-10-1", "责任担当星", "主动负责", 1, yesterday, "teacher-jiang", "蒋文博", 1),
    mk("award-seed-10", "class-7-1-stu-1", "class-7-1", "award-1-1", "智慧小博士", "乐于探究", 1, today, "teacher-xu", "徐蓉", 0),
    mk("award-seed-11", "class-7-2-stu-1", "class-7-2", "award-2-1", "小小工程师", "动手实践", 1, yesterday, "teacher-xu", "徐蓉", 1),
    mk("award-seed-12", "class-5-1-stu-1", "class-5-1", "award-5-2", "才艺智多星", "表达美与创造美", 1, today, "teacher-he", "何淑芬", 0),
    mk("award-seed-13", "class-5-2-stu-1", "class-5-2", "award-4-1", "健康小能手", "热爱运动", 1, yesterday, "teacher-zhou", "周海峰", 1),
    mk("award-seed-14", "class-mz-4-1-stu-1", "class-mz-4-1", "award-8-1", "生活阳光星", "热爱生活", 1, today, "teacher-gu", "顾伟", 0),
    // 线下扫码获得（以奖卡实际分值为准）
    mk("award-seed-15", "class-6-1-stu-5", "class-6-1", "award-4-1", "健康小能手", "热爱运动", 1, yesterday, "system", "线下扫码", 1, "offline_scan"),
    mk("award-seed-16", "class-6-1-stu-6", "class-6-1", "award-6-1", "家国红五星", "家国情怀", 1, today, "system", "线下扫码", 0, "offline_scan"),
    mk("award-seed-17", "class-6-2-stu-4", "class-6-2", "award-9-2", "自信创造星", "大胆创新", 1, yesterday, "system", "线下扫码", 1, "offline_scan"),
    // 流动红旗奖励
    ...flagRewards,
  ]
}

function seedFlags(): WeeklyFlag[] {
  const lastWeekKey = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return getISOWeekKey(d)
  })()
  return [
    { classId: "class-6-1", weekKey: lastWeekKey, awarded: true, awardedBy: "周海峰", awardedAt: new Date().toISOString() },
    { classId: "class-7-1", weekKey: lastWeekKey, awarded: true, awardedBy: "周海峰", awardedAt: new Date().toISOString() },
  ]
}

function seedHonors(): HonorRecord[] {
  const now = Date.now()
  const day = 86400000
  const today = formatDate(new Date())
  const yesterday = formatDate(new Date(now - day))
  const twoDaysAgo = formatDate(new Date(now - 2 * day))
  const mk = (
    id: string,
    studentId: string,
    level1: string,
    honorLevel: HonorLevel,
    points: number,
    honorName: string,
    awardDate: string,
    issuer: string,
    daysAgo: number,
  ): HonorRecord => {
    const s = STUDENTS.find((x) => x.id === studentId)
    return {
      id,
      studentId,
      studentName: s?.name ?? "",
      classId: s?.classId ?? "",
      level1,
      honorLevel,
      points,
      honorName,
      awardDate,
      issuer,
      imageDataUrl: null,
      operatorId: "system",
      operatorName: "班主任录入",
      createdAt: new Date(now - daysAgo * day).toISOString(),
    }
  }
  return [
    mk("honor-seed-1", "class-6-1-stu-1", "智慧小博士", "city", 3, "2025年浦东新区中小学Scratch编程挑战赛一等奖", today, "浦东新区教育发展研究院", 0),
    mk("honor-seed-2", "class-6-2-stu-2", "才艺智多星", "district", 2, "明珠临港校区第十二届艺术节钢琴独奏金奖", yesterday, "明珠临港校区德育处", 1),
    mk("honor-seed-3", "class-7-1-stu-2", "健康小能手", "city", 3, "2025年浦东新区中小学生田径运动会男子100米冠军", today, "浦东新区体育总会", 0),
    mk("honor-seed-4", "class-5-1-stu-1", "智慧小博士", "school", 1, "五年级数学速算竞赛一等奖", twoDaysAgo, "明珠临港校区教务处", 2),
    mk("honor-seed-5", "class-6-3-stu-2", "家国红五星", "national", 4, "2025年全国青少年人工智能创新挑战赛二等奖", yesterday, "中国少年儿童发展服务中心", 1),
    mk("honor-seed-6", "class-7-2-stu-1", "小小工程师", "district", 2, "第二十一届明珠杯小学生科技创新大赛一等奖", today, "浦东新区教育局", 0),
  ]
}

function seedActivities(): Activity[] {
  const now = Date.now()
  const day = 86400000
  const iso = (t: number) => new Date(t).toISOString()
  const date = (offset: number) => formatDate(new Date(now + offset * day))
  return [
    {
      id: "act-1",
      title: "校园劳动实践周",
      description:
        "为期一周的校园劳动实践，参与班级卫生包干区维护、图书角整理与校园绿化养护，培养劳动意识与责任担当。",
      level1: "责任担当星",
      gradeIds: ["grade-6"],
      classIds: ["class-6-1", "class-6-2", "class-6-3", "class-6-4"],
      enrollStart: date(-3),
      enrollEnd: date(2),
      startDate: date(4),
      endDate: date(10),
      pointsCost: 2,
      capacity: 40,
      location: "校园各包干区",
      status: "recruiting",
      publisherId: "teacher-li",
      publisherName: "李静",
      createdAt: iso(now - 4 * day),
    },
    {
      id: "act-2",
      title: "明珠读书会·共读《草房子》",
      description:
        "以小组共读形式开展整本书阅读，活动结束后提交读书感悟与实践成果，优秀作品在读书节展示。",
      level1: "智慧小博士",
      gradeIds: ["grade-7"],
      classIds: ["class-7-1", "class-7-2", "class-7-3"],
      enrollStart: date(-5),
      enrollEnd: date(-1),
      startDate: date(1),
      endDate: date(7),
      pointsCost: 3,
      capacity: 30,
      location: "图书馆二楼阅览室",
      status: "recruiting",
      publisherId: "teacher-xu",
      publisherName: "徐蓉",
      createdAt: iso(now - 6 * day),
    },
    {
      id: "act-3",
      title: "阳光体育·班级拔河联赛",
      description: "以班级为单位组队参加年级拔河联赛，弘扬团队协作与拼搏精神，记录赛场精彩瞬间。",
      level1: "健康小能手",
      gradeIds: ["grade-5", "grade-6"],
      classIds: ["class-5-1", "class-5-2", "class-5-3", "class-6-1", "class-6-2"],
      enrollStart: date(-8),
      enrollEnd: date(-4),
      startDate: date(-2),
      endDate: date(3),
      pointsCost: 0,
      capacity: 0,
      location: "学校操场",
      status: "ongoing",
      publisherId: "teacher-zhou",
      publisherName: "周海峰",
      createdAt: iso(now - 10 * day),
    },
    {
      id: "act-4",
      title: "校园艺术展演·班级合唱",
      description:
        "以班级合唱形式参与校园艺术展演，活动结束后提交排练照片与活动感悟，丰富美育成长记录。",
      level1: "才艺智多星",
      gradeIds: ["grade-6"],
      classIds: ["class-6-1", "class-6-2", "class-6-3", "class-6-4"],
      enrollStart: date(-14),
      enrollEnd: date(-10),
      startDate: date(-9),
      endDate: date(-3),
      pointsCost: 1,
      capacity: 0,
      location: "报告厅",
      status: "ended",
      publisherId: "teacher-li",
      publisherName: "李静",
      createdAt: iso(now - 15 * day),
    },
  ]
}

function seedEnrollments(): Enrollment[] {
  const now = Date.now()
  const day = 86400000
  const iso = (offset: number) => new Date(now + offset * day).toISOString()
  const mk = (
    id: string,
    activityId: string,
    studentId: string,
    status: EnrollmentStatus,
    pointsCost: number,
    remark: string,
    daysAgo: number,
    reviewed?: { by: string; name: string; note: string; daysAgo: number },
  ): Enrollment => {
    const s = STUDENTS.find((x) => x.id === studentId)!
    const e: Enrollment = {
      id,
      activityId,
      studentId,
      studentName: s.name,
      classId: s.classId,
      pointsCost,
      status,
      remark,
      enrolledAt: iso(-daysAgo),
      // approved/pending 占用积分，rejected/cancelled 已退还
      pointsSpent: pointsCost > 0 && (status === "approved" || status === "pending"),
    }
    if (reviewed) {
      e.reviewerId = reviewed.by
      e.reviewerName = reviewed.name
      e.reviewNote = reviewed.note
      e.reviewedAt = iso(-reviewed.daysAgo)
    }
    return e
  }
  return [
    mk("enr-1", "act-1", "class-6-1-stu-2", "approved", 2, "负责包干区卫生", 2, { by: "teacher-li", name: "李静", note: "同意", daysAgo: 1 }),
    mk("enr-2", "act-1", "class-6-1-stu-4", "pending", 2, "", 1),
    mk("enr-3", "act-1", "class-6-2-stu-2", "approved", 2, "", 2, { by: "teacher-li", name: "李静", note: "同意", daysAgo: 1 }),
    mk("enr-4", "act-1", "class-6-2-stu-3", "rejected", 2, "", 1, { by: "teacher-li", name: "李静", note: "名额已满", daysAgo: 1 }),
    mk("enr-5", "act-2", "class-7-1-stu-2", "approved", 3, "", 3, { by: "teacher-xu", name: "徐蓉", note: "同意", daysAgo: 2 }),
    mk("enr-6", "act-2", "class-7-2-stu-2", "pending", 3, "想担任小组长", 1),
    mk("enr-7", "act-3", "class-6-1-stu-1", "approved", 0, "", 5, { by: "teacher-zhou", name: "周海峰", note: "同意", daysAgo: 4 }),
    mk("enr-8", "act-3", "class-5-1-stu-1", "approved", 0, "", 6, { by: "teacher-zhou", name: "周海峰", note: "同意", daysAgo: 5 }),
    mk("enr-9", "act-4", "class-6-1-stu-1", "approved", 1, "", 12, { by: "teacher-li", name: "李静", note: "同意", daysAgo: 11 }),
    mk("enr-10", "act-4", "class-6-2-stu-1", "approved", 1, "", 12, { by: "teacher-li", name: "李静", note: "同意", daysAgo: 11 }),
  ]
}

function seedSubmissions(): ActivitySubmission[] {
  const now = Date.now()
  const day = 86400000
  const mk = (
    id: string,
    activityId: string,
    studentId: string,
    type: ActivitySubmission["type"],
    content: string,
    daysAgo: number,
  ): ActivitySubmission => {
    const s = STUDENTS.find((x) => x.id === studentId)!
    return {
      id,
      activityId,
      studentId,
      studentName: s.name,
      classId: s.classId,
      type,
      content,
      imageUrls: [],
      createdAt: new Date(now - daysAgo * day).toISOString(),
    }
  }
  return [
    mk("sub-1", "act-4", "class-6-1-stu-1", "reflection", "这次合唱排练让我体会到团队配合的重要，每个人声部的协调需要反复磨合。", 4),
    mk("sub-2", "act-4", "class-6-1-stu-1", "practice", "担任低声部领唱，负责带新同学熟悉旋律。", 4),
    mk("sub-3", "act-4", "class-6-2-stu-1", "reflection", "展演当天很紧张，但听到掌声的那一刻一切都值得。", 3),
  ]
}

function seedEvaluations(): ActivityEvaluation[] {
  const now = Date.now()
  const day = 86400000
  const mk = (
    id: string,
    activityId: string,
    studentId: string,
    rating: number,
    comment: string,
    daysAgo: number,
  ): ActivityEvaluation => {
    const s = STUDENTS.find((x) => x.id === studentId)!
    return {
      id,
      activityId,
      studentId,
      studentName: s.name,
      rating,
      comment,
      createdAt: new Date(now - daysAgo * day).toISOString(),
    }
  }
  return [
    mk("eva-1", "act-4", "class-6-1-stu-1", 5, "组织得很用心，期待下次活动！", 3),
    mk("eva-2", "act-4", "class-6-2-stu-1", 4, "整体不错，排练时间可以再充足一些。", 3),
  ]
}

interface EvaluationContextValue {
  teachers: Teacher[]
  parentUsers: ParentUser[]
  currentUser: CurrentUser
  setCurrentUser: (user: CurrentUser) => void
  /** 便捷访问：当前教师身份（学生身份时为 null） */
  currentTeacher: Teacher | null
  grades: typeof GRADES
  classes: typeof CLASSES
  students: typeof STUDENTS
  records: ScoreRecord[]
  addRecord: (record: Omit<ScoreRecord, "id" | "createdAt" | "operatorId" | "operatorName">) => void
  flags: WeeklyFlag[]
  setFlag: (classId: string, weekKey: string, awarded: boolean) => void
  /** 为获流动红旗的班级全部学生发放“合作创享星”奖卡（+1），同一周同一班只发一次 */
  issueFlagReward: (classId: string, weekKey: string) => void
  awardCards: AwardCardRecord[]
  addAwardCards: (
    cards: Omit<AwardCardRecord, "id" | "createdAt" | "operatorId" | "operatorName" | "source">[],
  ) => void
  honors: HonorRecord[]
  addHonor: (
    honor: Omit<HonorRecord, "id" | "createdAt" | "operatorId" | "operatorName">,
  ) => void
  selectedDate: Date
  setSelectedDate: (d: Date) => void
  /* 活动管理 */
  activities: Activity[]
  addActivity: (activity: Omit<Activity, "id" | "createdAt" | "publisherId" | "publisherName" | "status">) => string
  updateActivity: (id: string, patch: Partial<Activity>) => void
  enrollments: Enrollment[]
  enroll: (activityId: string, remark: string) => { ok: boolean; reason?: string }
  /** 家长代孩子报名：校验报名窗口 / 重复报名 / 名额 / 积分门槛，报名预扣积分 */
  enrollChild: (activityId: string, childId: string, remark: string) => { ok: boolean; reason?: string }
  reviewEnrollment: (id: string, status: EnrollmentStatus, note: string) => void
  submissions: ActivitySubmission[]
  /** 家长代孩子提交成果：需要传入孩子的 studentId/classId/studentName */
  addSubmission: (
    submission: Omit<ActivitySubmission, "id" | "createdAt">,
  ) => void
  evaluations: ActivityEvaluation[]
  /** 家长代孩子提交活动评价：需要传入孩子的 studentId/studentName */
  addEvaluation: (
    evaluation: Omit<ActivityEvaluation, "id" | "createdAt">,
  ) => void
  /** 计算学生累计积分（来自奖卡记录） */
  getStudentPoints: (studentId: string) => number
  /** 学生累计获得积分 = 奖卡积分 + 荣誉加分 */
  getStudentEarned: (studentId: string) => number
  /** 学生可用积分（剩余积分） = 累计获得积分 - 已被报名占用的积分 */
  getStudentBalance: (studentId: string) => number
  /* 体质健康成绩导入 */
  peScoreUploads: PeScoreUpload[]
  addPeScoreUpload: (
    upload: Omit<PeScoreUpload, "id" | "uploadedAt" | "uploaderId" | "uploaderName">,
  ) => void
}

const EvaluationContext = createContext<EvaluationContextValue | null>(null)

export function EvaluationProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => TEACHERS.find((t) => t.id === "teacher-chen") ?? TEACHERS[0])
  const [records, setRecords] = useState<ScoreRecord[]>([])
  const [flags, setFlags] = useState<WeeklyFlag[]>([])
  const [awardCards, setAwardCards] = useState<AwardCardRecord[]>([])
  const [honors, setHonors] = useState<HonorRecord[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([])
  const [evaluations, setEvaluations] = useState<ActivityEvaluation[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [peScoreUploads, setPeScoreUploads] = useState<PeScoreUpload[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const rawRecords = localStorage.getItem(RECORDS_KEY)
      const rawFlags = localStorage.getItem(FLAGS_KEY)
      const rawAwardCards = localStorage.getItem(AWARD_CARDS_KEY)
      const rawHonors = localStorage.getItem(HONORS_KEY)
      const rawActivities = localStorage.getItem(ACTIVITIES_KEY)
      const rawEnrollments = localStorage.getItem(ENROLLMENTS_KEY)
      const rawSubmissions = localStorage.getItem(SUBMISSIONS_KEY)
      const rawEvaluations = localStorage.getItem(EVALUATIONS_KEY)
      const rawCurrentUser = localStorage.getItem(CURRENT_USER_KEY)
      const rawPeScores = localStorage.getItem(PE_SCORES_KEY)
      setRecords(rawRecords ? JSON.parse(rawRecords) : seedRecords())
      setFlags(rawFlags ? JSON.parse(rawFlags) : seedFlags())
      setAwardCards(rawAwardCards ? JSON.parse(rawAwardCards) : seedAwardCards())
      setHonors(rawHonors ? JSON.parse(rawHonors) : seedHonors())
      setActivities(rawActivities ? JSON.parse(rawActivities) : seedActivities())
      setEnrollments(rawEnrollments ? JSON.parse(rawEnrollments) : seedEnrollments())
      setSubmissions(rawSubmissions ? JSON.parse(rawSubmissions) : seedSubmissions())
      setEvaluations(rawEvaluations ? JSON.parse(rawEvaluations) : seedEvaluations())
      if (rawCurrentUser) {
        const parsed = JSON.parse(rawCurrentUser) as CurrentUser
        // 校验持久化的身份：必须存在于种子数据中
        // （旧版本可能残留 kind: "student" 等已移除的身份，直接丢弃回退默认）
        // 注意：教师对象上的 kind 为可选字段且可能缺失，不能依赖它判断，统一按 id 匹配，
        // 并回填为种子中的权威对象，保证 role/权限字段完整
        const matchedParent = parsed.kind === "parent"
          ? PARENT_USERS.find((p) => p.id === parsed.id)
          : undefined
        const matchedTeacher = TEACHERS.find((t) => t.id === parsed.id)
        setCurrentUser(matchedParent ?? matchedTeacher ?? TEACHERS.find((t) => t.id === "teacher-chen") ?? TEACHERS[0])
      }
      setPeScoreUploads(rawPeScores ? JSON.parse(rawPeScores) : [])
    } catch {
      setRecords(seedRecords())
      setFlags(seedFlags())
      setAwardCards(seedAwardCards())
      setHonors(seedHonors())
      setActivities(seedActivities())
      setEnrollments(seedEnrollments())
      setSubmissions(seedSubmissions())
      setEvaluations(seedEvaluations())
      setPeScoreUploads([])
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  }, [records, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(FLAGS_KEY, JSON.stringify(flags))
  }, [flags, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(AWARD_CARDS_KEY, JSON.stringify(awardCards))
  }, [awardCards, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(HONORS_KEY, JSON.stringify(honors))
  }, [honors, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities))
  }, [activities, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(enrollments))
  }, [enrollments, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions))
  }, [submissions, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(EVALUATIONS_KEY, JSON.stringify(evaluations))
  }, [evaluations, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser))
  }, [currentUser, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(PE_SCORES_KEY, JSON.stringify(peScoreUploads))
  }, [peScoreUploads, hydrated])

  const currentTeacher = useMemo(
    () => (currentUser.kind === "teacher" || currentUser.kind === undefined ? (currentUser as Teacher) : null),
    [currentUser],
  )

  const getStudentPoints = (studentId: string) =>
    awardCards.filter((a) => a.studentId === studentId).reduce((sum, a) => sum + a.points, 0)

  /** 累计获得积分 = 奖卡积分 + 荣誉加分 */
  const getStudentEarned = (studentId: string) =>
    getStudentPoints(studentId) +
    honors.filter((h) => h.studentId === studentId).reduce((sum, h) => sum + h.points, 0)

  /** 已被占用（报名预扣且未退还）的积分 */
  const getStudentSpent = (studentId: string) =>
    enrollments
      .filter((e) => e.studentId === studentId && e.pointsSpent)
      .reduce((sum, e) => sum + e.pointsCost, 0)

  const getStudentBalance = (studentId: string) => getStudentEarned(studentId) - getStudentSpent(studentId)

  const addRecord: EvaluationContextValue["addRecord"] = (record) => {
    if (!currentTeacher) return
    const newRecord: ScoreRecord = {
      ...record,
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      operatorId: currentTeacher.id,
      operatorName: currentTeacher.name,
      createdAt: new Date().toISOString(),
    }
    setRecords((prev) => [...prev, newRecord])
  }

  const addAwardCards: EvaluationContextValue["addAwardCards"] = (cards) => {
    if (!currentTeacher) return
    const stamped = cards.map((card) => ({
      ...card,
      source: "online" as const,
      id: `award-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      operatorId: currentTeacher.id,
      operatorName: currentTeacher.name,
      createdAt: new Date().toISOString(),
    }))
    setAwardCards((prev) => [...prev, ...stamped])
  }

  const addHonor: EvaluationContextValue["addHonor"] = (honor) => {
    if (!currentTeacher) return
    const stamped: HonorRecord = {
      ...honor,
      id: `honor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      operatorId: currentTeacher.id,
      operatorName: currentTeacher.name,
      createdAt: new Date().toISOString(),
    }
    setHonors((prev) => [...prev, stamped])
  }

  const setFlag = (classId: string, weekKey: string, awarded: boolean) => {
    if (!currentTeacher) return
    setFlags((prev) => {
      const existingIdx = prev.findIndex((f) => f.classId === classId && f.weekKey === weekKey)
      const updated: WeeklyFlag = {
        classId,
        weekKey,
        awarded,
        awardedBy: awarded ? currentTeacher.name : undefined,
        awardedAt: awarded ? new Date().toISOString() : undefined,
      }
      if (existingIdx === -1) return [...prev, updated]
      const next = [...prev]
      next[existingIdx] = updated
      return next
    })
  }

  const issueFlagReward: EvaluationContextValue["issueFlagReward"] = (classId, weekKey) => {
    if (!currentTeacher) return
    // 去重：同一周同一班已发过 flag_reward 则跳过
    const already = awardCards.some(
      (a) =>
        a.classId === classId &&
        a.weekKey === weekKey &&
        a.source === "flag_reward",
    )
    if (already) return
    const roster = STUDENTS.filter((s) => s.classId === classId)
    if (roster.length === 0) return
    const [yearStr, weekStr] = weekKey.split("-W")
    const monday = getWeekRange(new Date(Number(yearStr), 0, 4 + (Number(weekStr) - 1) * 7)).start
    const date = formatDate(monday)
    const stamped: AwardCardRecord[] = roster.map((s) => ({
      id: `award-flag-${weekKey}-${classId}-${s.id}`,
      studentId: s.id,
      studentName: s.name,
      classId,
      indicatorId: "award-7-1",
      level1: "合作创享星",
      level2: "团队协作",
      points: 1,
      weekKey,
      date,
      source: "flag_reward",
      operatorId: currentTeacher.id,
      operatorName: currentTeacher.name,
      createdAt: new Date().toISOString(),
    }))
    setAwardCards((prev) => [...prev, ...stamped])
  }

  const addActivity: EvaluationContextValue["addActivity"] = (activity) => {
    if (!currentTeacher) return ""
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()
    const newActivity: Activity = {
      ...activity,
      id,
      status: "recruiting",
      publisherId: currentTeacher.id,
      publisherName: currentTeacher.name,
      createdAt: now,
    }
    setActivities((prev) => [newActivity, ...prev])
    return id
  }

  const updateActivity: EvaluationContextValue["updateActivity"] = (id, patch) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  const enroll: EvaluationContextValue["enroll"] = () => {
    // 学生身份已下线，报名入口随之关闭
    return { ok: false, reason: "报名入口已关闭" }
  }

  const enrollChild: EvaluationContextValue["enrollChild"] = (activityId, childId, remark) => {
    const s = STUDENTS.find((x) => x.id === childId)
    if (!s) return { ok: false, reason: "未找到学生信息" }
    const child = { name: s.name, classId: s.classId }
    const activity = activities.find((a) => a.id === activityId)
    if (!activity) return { ok: false, reason: "活动不存在" }
    const today = formatDate(new Date())
    if (!isEnrolling(activity, today)) return { ok: false, reason: "当前不在报名时间" }
    if (activity.classIds.length > 0 && !activity.classIds.includes(child.classId)) {
      return { ok: false, reason: "该活动不面向孩子所在班级" }
    }
    const dup = enrollments.find(
      (e) => e.activityId === activityId && e.studentId === childId && e.status !== "cancelled",
    )
    if (dup) return { ok: false, reason: "孩子已报名该活动" }
    if (activity.capacity > 0) {
      const approvedCount = enrollments.filter(
        (e) => e.activityId === activityId && (e.status === "approved" || e.status === "pending"),
      ).length
      if (approvedCount >= activity.capacity) return { ok: false, reason: "名额已满" }
    }
    if (activity.pointsCost > 0) {
      const balance = getStudentEarned(childId) - getStudentSpent(childId)
      if (balance < activity.pointsCost) {
        return { ok: false, reason: `积分不足（需 ${activity.pointsCost} 分，当前 ${balance} 分）` }
      }
    }
    const newEnrollment: Enrollment = {
      id: `enr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      activityId,
      studentId: childId,
      studentName: child.name,
      classId: child.classId,
      pointsCost: activity.pointsCost,
      status: "pending",
      remark: remark.trim(),
      enrolledAt: new Date().toISOString(),
      pointsSpent: activity.pointsCost > 0,
    }
    setEnrollments((prev) => [...prev, newEnrollment])
    return { ok: true }
  }

  const reviewEnrollment: EvaluationContextValue["reviewEnrollment"] = (id, status, note) => {
    if (!currentTeacher) return
    setEnrollments((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e
        // 驳回/取消时退还积分；通过时保持占用
        const refunded = status === "rejected" || status === "cancelled" ? false : e.pointsSpent
        return {
          ...e,
          status,
          pointsSpent: e.pointsCost > 0 ? refunded : e.pointsSpent,
          reviewerId: currentTeacher.id,
          reviewerName: currentTeacher.name,
          reviewedAt: new Date().toISOString(),
          reviewNote: note,
        }
      }),
    )
  }

  const addPeScoreUpload: EvaluationContextValue["addPeScoreUpload"] = (upload) => {
    if (!currentTeacher) return
    const stamped: PeScoreUpload = {
      ...upload,
      id: `pe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      uploadedAt: new Date().toISOString(),
      uploaderId: currentTeacher.id,
      uploaderName: currentTeacher.name,
    }
    setPeScoreUploads((prev) => {
      const filtered = prev.filter(
        (u) => !(u.classId === upload.classId && u.gender === upload.gender),
      )
      return [...filtered, stamped]
    })
  }

  const addSubmission: EvaluationContextValue["addSubmission"] = (submission) => {
    const stamped: ActivitySubmission = {
      ...submission,
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    }
    setSubmissions((prev) => [...prev, stamped])
  }

  const addEvaluation: EvaluationContextValue["addEvaluation"] = (evaluation) => {
    const stamped: ActivityEvaluation = {
      ...evaluation,
      id: `eva-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    }
    setEvaluations((prev) => {
      const filtered = prev.filter(
        (e) => !(e.activityId === evaluation.activityId && e.studentId === evaluation.studentId),
      )
      return [...filtered, stamped]
    })
  }

  const value: EvaluationContextValue = {
    teachers: TEACHERS,
    parentUsers: PARENT_USERS,
    currentUser,
    setCurrentUser,
    currentTeacher,
    grades: GRADES,
    classes: CLASSES,
    students: STUDENTS,
    records,
    addRecord,
    flags,
    setFlag,
    issueFlagReward,
    awardCards,
    addAwardCards,
    honors,
    addHonor,
    selectedDate,
    setSelectedDate,
    activities,
    addActivity,
    updateActivity,
    enrollments,
    enroll,
    enrollChild,
    reviewEnrollment,
    submissions,
    addSubmission,
    evaluations,
    addEvaluation,
    getStudentPoints,
    getStudentEarned,
    getStudentBalance,
    peScoreUploads,
    addPeScoreUpload,
  }

  return <EvaluationContext.Provider value={value}>{children}</EvaluationContext.Provider>
}

export function useEvaluation() {
  const ctx = useContext(EvaluationContext)
  if (!ctx) throw new Error("useEvaluation must be used within EvaluationProvider")
  return ctx
}

export function useTodayWeekKey() {
  return getISOWeekKey(new Date())
}
