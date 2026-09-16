"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { CLASSES, GRADES, PARENT_USERS, STUDENTS, TEACHERS } from "./mock-data"
import { getFiveEducationLevel1 } from "./award-utils"
import { buildPointEntries, getSemesterRange, inRange } from "./points-utils"
import type {
  Activity,
  ActivityEvaluation,
  ActivitySubmission,
  AwardCardRecord,
  AwardSource,
  ClassRatingConfig,
  CurrentUser,
  Enrollment,
  EnrollmentStatus,
  FlagConfig,
  FlagPeriod,
  HonorLevel,
  HonorRecord,
  MallCartItem,
  MallConfig,
  MallProduct,
  MallRedemption,
  ParentUser,
  ScoreRecord,
  Teacher,
  WeeklyFlag,
} from "./types"
import { formatDate, getISOWeekKey, getWeekRange } from "./scoring-utils"
import { getActivityStatus, isEnrolling, requiresActivityEnrollment, requiresActivityPointsExchange } from "./activity-utils"
import { buildPePreviewRows, PE_CLASSES, type PeScoreUpload } from "./pe-scores"

const RECORDS_KEY = "mzlg-score-records-v1"
const FLAGS_KEY = "mzlg-weekly-flags-v1"
const FLAG_CONFIGS_KEY = "mzlg-flag-configs-v1"
const CLASS_RATING_CONFIGS_KEY = "mzlg-class-rating-configs-v1"
const AWARD_CARDS_KEY = "mzlg-award-cards-v1"
const HONORS_KEY = "mzlg-honors-v1"
const ACTIVITIES_KEY = "mzlg-activities-v1"
const ENROLLMENTS_KEY = "mzlg-enrollments-v1"
const SUBMISSIONS_KEY = "mzlg-submissions-v1"
const EVALUATIONS_KEY = "mzlg-evaluations-v1"
const CURRENT_USER_KEY = "mzlg-current-user-v1"
const PE_SCORES_KEY = "mzlg-pe-scores-v1"
const MALL_PRODUCTS_KEY = "mzlg-mall-products-v1"
const MALL_CONFIG_KEY = "mzlg-mall-config-v1"
const MALL_CART_KEY = "mzlg-mall-cart-v1"
const MALL_REDEMPTIONS_KEY = "mzlg-mall-redemptions-v1"

const DEFAULT_FLAG_CONFIGS: FlagConfig[] = [
  { id: "week-civility", period: "week", name: "文明礼仪示范班", points: 1, enabled: true, syncFiveEducation: true, syncLevel1: "德育", syncLevel2: "文明礼仪", syncLevel3: "主动问好" },
  { id: "week-clean", period: "week", name: "卫生流动红旗", points: 1, enabled: true, syncFiveEducation: false },
  { id: "month-excellent", period: "month", name: "月度优雅班集体", points: 1, enabled: true, syncFiveEducation: true, syncLevel1: "智育", syncLevel2: "学习习惯", syncLevel3: "专注听讲" },
  { id: "month-growth", period: "month", name: "成长示范班", points: 1, enabled: false, syncFiveEducation: false },
]

const DEFAULT_CLASS_RATING_CONFIGS: ClassRatingConfig[] = [
  { id: "rating-demonstration", name: "优雅示范", description: "表现突出、礼仪规范，持续发挥班级示范作用。", image: null, defaultImage: "smile", autoIssueDay: "saturday", ruleType: "rank", rankStart: "1", rankEnd: "2", scoreStart: "90", scoreEnd: "100", theme: "blue" },
  { id: "rating-growth", name: "稳步成长", description: "保持稳定进步，在合作与成长中形成班级特色。", image: null, defaultImage: "smile", autoIssueDay: "sunday", ruleType: "rank", rankStart: "3", rankEnd: "6", scoreStart: "80", scoreEnd: "89.9", theme: "green" },
  { id: "rating-encouragement", name: "成长加油", description: "积极参与、持续改善，在每一次努力中积累成长。", image: null, defaultImage: "cry", autoIssueDay: "monday", ruleType: "rank", rankStart: "7", rankEnd: "99", scoreStart: "0", scoreEnd: "79.9", theme: "orange" },
]

const MALL_IMAGES = [
  "/xszp/images/activity-gallery/activity-storybook.png",
  "/xszp/images/activity-gallery/activity-sports.png",
  "/xszp/images/activity-gallery/activity-recycling.png",
  "/xszp/images/activity-gallery/activity-makerspace.png",
  "/xszp/images/activity-gallery/activity-garden.png",
] as const

function seedMallConfig(): MallConfig {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 14)
  start.setHours(8, 0, 0, 0)
  const end = new Date(now)
  end.setDate(end.getDate() + 90)
  end.setHours(18, 0, 0, 0)
  return {
    startAt: start.toISOString().slice(0, 16),
    endAt: end.toISOString().slice(0, 16),
    exchangeLocation: "综合楼一层学生服务中心",
    notice: "兑换成功后请凭兑换凭证在开放时间内到学生服务中心领取商品。",
  }
}

function seedMallProducts(): MallProduct[] {
  const now = new Date().toISOString()
  return [
    { id: "mall-bookmark", name: "校园阅读书签", category: "学习用品", description: "校园主题阅读书签，一套 6 枚，陪伴每日阅读时光。", image: MALL_IMAGES[0], stock: 48, initialStock: 60, pointsCost: 12, status: "listed", gradeIds: [], requirementsEnabled: false, requirementMode: "all", requirements: [], createdAt: now, updatedAt: now },
    { id: "mall-wristband", name: "活力运动护腕", category: "健康生活", description: "轻盈透气的运动护腕，适合课间运动与体育活动使用。", image: MALL_IMAGES[1], stock: 24, initialStock: 36, pointsCost: 28, status: "listed", gradeIds: ["grade-5", "grade-6"], requirementsEnabled: true, requirementMode: "all", requirements: [{ level1: "体育", minimumPoints: 5 }], createdAt: now, updatedAt: now },
    { id: "mall-plant-kit", name: "小小园丁种植套装", category: "生活好物", description: "含种子、花盆与种植记录卡，记录一次耐心的成长实验。", image: MALL_IMAGES[4], stock: 18, initialStock: 24, pointsCost: 35, status: "listed", gradeIds: [], requirementsEnabled: true, requirementMode: "any", requirements: [{ level1: "劳育", minimumPoints: 8 }, { level1: "智育", minimumPoints: 10 }], createdAt: now, updatedAt: now },
    { id: "mall-maker-badge", name: "创客主题徽章", category: "文创周边", description: "校园创客主题金属徽章，可别在书包或校服外套上。", image: MALL_IMAGES[3], stock: 30, initialStock: 40, pointsCost: 20, status: "listed", gradeIds: ["grade-6", "grade-7"], requirementsEnabled: false, requirementMode: "all", requirements: [], createdAt: now, updatedAt: now },
    { id: "mall-eco-sticker", name: "环保行动贴纸包", category: "文创周边", description: "用一套贴纸为自己的环保行动留下纪念。", image: MALL_IMAGES[2], stock: 56, initialStock: 80, pointsCost: 8, status: "listed", gradeIds: [], requirementsEnabled: false, requirementMode: "all", requirements: [], createdAt: now, updatedAt: now },
    { id: "mall-notebook", name: "成长记录笔记本", category: "学习用品", description: "横线与方格混排内页，适合记录灵感、阅读与成长计划。", image: MALL_IMAGES[0], stock: 0, initialStock: 30, pointsCost: 45, status: "unlisted", gradeIds: [], requirementsEnabled: false, requirementMode: "all", requirements: [], createdAt: now, updatedAt: now },
  ]
}

function seedMallRedemptions(): MallRedemption[] {
  const now = Date.now()
  const make = (id: string, product: MallProduct, studentId: string, daysAgo: number, offlineRedeemed: boolean): MallRedemption => {
    const student = STUDENTS.find((item) => item.id === studentId)!
    const gradeId = CLASSES.find((item) => item.id === student.classId)?.gradeId ?? ""
    const redeemedAt = new Date(now - daysAgo * 86400000).toISOString()
    return {
      id,
      orderNo: `SC${new Date(now - daysAgo * 86400000).toISOString().slice(0, 10).replaceAll("-", "")}${id.slice(-3).toUpperCase()}`,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      productPoints: product.pointsCost,
      quantity: 1,
      totalPoints: product.pointsCost,
      studentId,
      studentName: student.name,
      classId: student.classId,
      gradeId,
      redeemedAt,
      offlineRedeemed,
      offlineRedeemedAt: offlineRedeemed ? new Date(now - Math.max(daysAgo - 1, 0) * 86400000).toISOString() : undefined,
    }
  }
  const products = seedMallProducts()
  return [
    make("mall-order-001", products[0], "class-6-1-stu-1", 8, true),
    make("mall-order-002", products[4], "class-6-1-stu-1", 2, false),
    make("mall-order-003", products[1], "class-6-2-stu-1", 5, true),
    make("mall-order-004", products[3], "class-7-1-stu-2", 1, false),
  ]
}

function seedRecords(): ScoreRecord[] {
  const now = Date.now()
  const day = 86400000
  const today = formatDate(new Date())
  const yesterday = formatDate(new Date(now - day))
  const twoDaysAgo = formatDate(new Date(now - 2 * day))
  const threeDaysAgo = formatDate(new Date(now - 3 * day))
  const previousWeekDate = new Date(now - 7 * day)
  const previousWeekRankingDate = formatDate(getWeekRange(previousWeekDate).start)

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

  const moralDemoRecords = [
    mk("moral-demo-record-1", "class-6-1", today, "卫生", "环境卫生", "hy-2", 1, -2, [], "教室后排地面有纸屑", "teacher-chen", "陈明", 0),
    mk("moral-demo-record-2", "class-6-2", today, "礼仪形象", "文明礼仪", "ly-5", 1, -1, ["王浩然"], "楼道内未主动礼让", "teacher-chen", "陈明", 0),
    mk("moral-demo-record-3", "class-6-3", today, "早操", "做操纪律", "zc-2", 1, -3, [], "做操时队列不整齐", "teacher-chen", "陈明", 0),
    mk("moral-demo-record-4", "class-6-4", yesterday, "课间文明休息", "行为安全", "jj-1", 1, -3, [], "课间追逐打闹", "teacher-chen", "陈明", 1),
    mk("moral-demo-record-5", "class-6-1", yesterday, "路队", "队伍秩序", "ld-1", 1, -3, [], "放学路队行进较慢", "teacher-chen", "陈明", 1),
    mk("moral-demo-record-6", "class-6-2", twoDaysAgo, "卫生", "物品摆放", "hy-4", 1, -2, [], "清洁工具未按要求归位", "teacher-chen", "陈明", 2),
    mk("moral-demo-record-7", "class-6-3", twoDaysAgo, "午休、午会", "午休管理", "wx-1", 1, -5, [], "午休铃后教室仍有喧哗", "teacher-chen", "陈明", 2),
    mk("moral-demo-record-8", "class-6-4", threeDaysAgo, "礼仪形象", "仪容仪表", "ly-2", 1, -2, [], "少数学生未佩戴红领巾", "teacher-chen", "陈明", 3),
  ]
  const homeroomDashboardRecords = Array.from({ length: 18 }, (_, index) => {
    const templates = [
      ["卫生", "环境卫生", "hy-2", "值日区域发现纸屑，已提醒及时整理"],
      ["课间文明休息", "行为安全", "jj-1", "课间活动音量偏大，已完成班级提醒"],
      ["礼仪形象", "文明礼仪", "ly-5", "上下楼梯未做到主动礼让"],
      ["早操", "做操纪律", "zc-2", "队列衔接稍慢，已安排小组长跟进"],
      ["路队", "队伍秩序", "ld-1", "放学队伍转弯处间距不够整齐"],
    ] as const
    const [level1, level2, itemId, note] = templates[index % templates.length]
    return mk(
      `homeroom-dashboard-record-${index + 1}`,
      "class-6-1",
      today,
      level1,
      level2,
      itemId,
      1,
      -(index % 3 + 1),
      index % 2 === 0 ? ["陈思远", "王浩然"].slice(0, index % 3 === 0 ? 2 : 1) : [],
      note,
      "teacher-zhao",
      "锦言",
      index / 48,
    )
  })

  return [
    mk("seed-1", "class-6-1", yesterday, "礼仪形象", "仪容仪表", "ly-2", 2, -2, ["陈思远"], "晨检时红领巾未佩戴", "teacher-zhao", "锦言", 1),
    mk("seed-2", "class-6-1", yesterday, "课间文明休息", "行为安全", "jj-1", 1, -3, [], "走廊追逐打闹", "teacher-zhao", "锦言", 1),
    mk("seed-3", "class-6-1", today, "早操", "做操纪律", "zc-2", 1, -3, [], "做操期间交头接耳", "teacher-zhao", "锦言", 0),
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
    mk("seed-16", "class-6-1", twoDaysAgo, "礼仪形象", "仪容仪表", "ly-1", 1, -3, ["王浩然"], "未穿校服", "teacher-zhao", "锦言", 2),
    ...moralDemoRecords,
    ...homeroomDashboardRecords,
    // 排名演示数据：6-1 为第 1 名，6-2 与 7-1 并列第 2 名，下一名自然显示为第 4 名。
    mk("seed-ranking-1", "class-6-1", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -1, [], "上周班级排名演示：轻微扣分", "teacher-zhao", "锦言", 8),
    mk("seed-ranking-2", "class-6-2", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -3, [], "上周班级排名演示：并列第 2 名", "teacher-wang", "王芳", 8),
    mk("seed-ranking-3", "class-7-1", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -3, [], "上周班级排名演示：并列第 2 名", "teacher-xu", "徐蓉", 8),
    mk("seed-ranking-4", "class-6-3", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -5, [], "上周班级排名演示：第 4 名", "teacher-shen", "沈亦菲", 8),
    mk("seed-ranking-5", "class-6-4", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -6, [], "上周班级排名演示", "teacher-jiang", "蒋文博", 8),
    mk("seed-ranking-6", "class-5-1", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -7, [], "上周班级排名演示", "teacher-he", "何淑芬", 8),
    mk("seed-ranking-7", "class-5-2", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -8, [], "上周班级排名演示", "teacher-zhou", "周海峰", 8),
    mk("seed-ranking-8", "class-5-3", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -9, [], "上周班级排名演示", "teacher-qiu", "邱志远", 8),
    mk("seed-ranking-9", "class-7-2", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -10, [], "上周班级排名演示", "teacher-cui", "崔嘉禾", 8),
    mk("seed-ranking-10", "class-7-3", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -11, [], "上周班级排名演示", "teacher-tang", "汤朗", 8),
    mk("seed-ranking-11", "class-8-1", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -12, [], "上周班级排名演示", "teacher-fu", "傅逸华", 8),
    mk("seed-ranking-12", "class-8-2", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -13, [], "上周班级排名演示", "teacher-tan", "谭雪莹", 8),
    mk("seed-ranking-13", "class-mz-4-1", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -14, [], "上周班级排名演示", "teacher-gu", "顾伟", 8),
    mk("seed-ranking-14", "class-mz-4-2", previousWeekRankingDate, "卫生", "环境卫生", "hy-1", 1, -15, [], "上周班级排名演示", "teacher-zhang", "章丽", 8),
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
    level1: getFiveEducationLevel1(level1),
    level2: level1,
    level3: level2,
    points,
    weekKey,
    date,
    source,
    operatorId,
    operatorName,
    createdAt: new Date(now - daysAgo * day).toISOString(),
  })
  const dateForDaysAgo = (daysAgo: number) => formatDate(new Date(now - daysAgo * day))
  // 上周获流动红旗的班级（6-1、7-1）全部学生各获一张“合作创享星”奖卡（+1）
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
      "优雅班集体奖励",
      2,
      "flag_reward",
    ),
  )
  // 学生榜演示数据：制造 1 名第 1 名、2 名并列第 2 名，下一名显示为第 4 名。
  const leaderboardBoosts: AwardCardRecord[] = ([
    ["class-6-1-stu-1", 5],
    ["class-6-1-stu-2", 6],
    ["class-7-1-stu-2", 4],
    ["class-7-1-stu-1", 1],
  ] as Array<[string, number]>).flatMap(([studentId, count], groupIndex) => {
    const student = STUDENTS.find((s) => s.id === studentId)
    if (!student) return []
    return Array.from({ length: count }, (_, index) =>
      mk(
        `award-leaderboard-${groupIndex + 1}-${index + 1}`,
        student.id,
        student.classId,
        "award-1-1",
        "智慧小博士",
        "乐于探究",
        1,
        today,
        "system",
        "排行榜演示数据",
        0,
      ),
    )
  })
  const moralAwardFixtures = [
    ["class-6-1-stu-5", "class-6-1", "award-3-1", "友善美少年", "尊重包容", 0, "teacher-chen", "陈明"],
    ["class-6-2-stu-5", "class-6-2", "award-6-1", "家国红五星", "家国情怀", 1, "teacher-chen", "陈明"],
    ["class-6-3-stu-5", "class-6-3", "award-1-1", "智慧小博士", "乐于探究", 0, "teacher-chen", "陈明"],
    ["class-6-4-stu-5", "class-6-4", "award-2-1", "小小工程师", "动手实践", 1, "teacher-chen", "陈明"],
    ["class-6-1-stu-6", "class-6-1", "award-4-1", "健康小能手", "热爱运动", 0, "teacher-chen", "陈明"],
    ["class-6-2-stu-6", "class-6-2", "award-5-1", "才艺智多星", "感知美与欣赏美", 1, "teacher-chen", "陈明"],
    ["class-6-3-stu-6", "class-6-3", "award-7-1", "合作创享星", "团队协作", 0, "teacher-chen", "陈明"],
    ["class-6-4-stu-6", "class-6-4", "award-8-1", "生活阳光星", "热爱生活", 2, "teacher-chen", "陈明"],
    ["class-6-1-stu-7", "class-6-1", "award-10-1", "责任担当星", "主动负责", 3, "teacher-zhao", "锦言"],
    ["class-6-2-stu-7", "class-6-2", "award-9-1", "自信创造星", "自信表达", 5, "teacher-wang", "王芳"],
    ["class-6-3-stu-7", "class-6-3", "award-3-2", "友善美少年", "友爱互助", 35, "teacher-chen", "陈明"],
    ["class-6-4-stu-7", "class-6-4", "award-4-1", "健康小能手", "热爱运动", 20, "teacher-chen", "陈明"],
    ["class-6-1-stu-8", "class-6-1", "award-5-2", "才艺智多星", "表达美与创造美", 30, "teacher-chen", "陈明"],
  ] as const
  const moralDemoAwards = moralAwardFixtures.map(([studentId, classId, indicatorId, level1, level2, daysAgo, operatorId, operatorName], index) =>
    mk(`award-moral-demo-${index + 1}`, studentId, classId, indicatorId, level1, level2, 1, dateForDaysAgo(daysAgo), operatorId, operatorName, daysAgo),
  )
  const roleDashboardAwards = Array.from({ length: 42 }, (_, index) => {
    const templates = [
      ["award-1-1", "智慧小博士", "乐于探究"],
      ["award-3-2", "友善美少年", "友爱互助"],
      ["award-4-1", "健康小能手", "热爱运动"],
      ["award-7-1", "合作创享星", "团队协作"],
      ["award-10-1", "责任担当星", "主动负责"],
    ] as const
    const [indicatorId, level1, level2] = templates[index % templates.length]
    const operator = index % 3 === 1 ? ["teacher-liu", "刘敏"] as const : ["teacher-zhao", "锦言"] as const
    const student = STUDENTS.filter((item) => item.classId === "class-6-1")[index % 36]
    return mk(
      `award-role-dashboard-${index + 1}`,
      student.id,
      "class-6-1",
      indicatorId,
      level1,
      level2,
      index % 5 === 0 ? 2 : 1,
      today,
      operator[0],
      operator[1],
      index / 72,
    )
  })
  const parentDashboardAwards = Array.from({ length: 18 }, (_, index) => {
    const studentId = ["class-6-1-stu-1", "class-6-1-stu-2", "class-6-2-stu-1"][index % 3]
    const student = STUDENTS.find((item) => item.id === studentId)!
    return mk(
      `award-parent-dashboard-${index + 1}`,
      student.id,
      student.classId,
      index % 2 === 0 ? "award-5-1" : "award-6-1",
      index % 2 === 0 ? "才艺智多星" : "家国红五星",
      index % 2 === 0 ? "感知美与欣赏美" : "家国情怀",
      1,
      dateForDaysAgo(index % 6),
      index % 2 === 0 ? "teacher-zhao" : "teacher-liu",
      index % 2 === 0 ? "锦言" : "刘敏",
      index % 6 + index / 80,
    )
  })
  return [
    mk("award-seed-1", "class-6-1-stu-1", "class-6-1", "award-1-1", "智慧小博士", "乐于探究", 1, today, "teacher-zhao", "锦言", 0),
    mk("award-seed-2", "class-6-1-stu-2", "class-6-1", "award-7-1", "合作创享星", "团队协作", 1, today, "teacher-zhao", "锦言", 0),
    mk("award-seed-3", "class-6-1-stu-3", "class-6-1", "award-3-2", "友善美少年", "尊重包容", 1, yesterday, "teacher-zhao", "锦言", 1),
    mk("award-seed-4", "class-6-1-stu-4", "class-6-1", "award-5-1", "才艺智多星", "感知美与欣赏美", 1, yesterday, "teacher-liu", "刘敏", 1),
    mk("award-seed-5", "class-6-2-stu-1", "class-6-2", "award-3-1", "友善美少年", "友爱互助", 1, today, "teacher-wang", "王芳", 0),
    mk("award-seed-6", "class-6-2-stu-2", "class-6-2", "award-1-2", "智慧小博士", "勤于思考", 1, yesterday, "teacher-liu", "刘敏", 1),
    mk("award-seed-7", "class-6-2-stu-3", "class-6-2", "award-9-1", "自信创造星", "自信表达", 1, yesterday, "teacher-wang", "王芳", 1),
    mk("award-pe-demo-1", "class-6-2-stu-4", "class-6-2", "award-4-1", "健康小能手", "热爱运动", 3, today, "teacher-qian", "钱进", 0),
    mk("award-pe-demo-2", "class-6-3-stu-2", "class-6-3", "award-4-2", "健康小能手", "坚持锻炼", 2, yesterday, "teacher-qian", "钱进", 1),
    mk("award-pe-demo-3", "class-6-3-stu-4", "class-6-3", "award-7-1", "合作创享星", "团队协作", 2, twoDaysAgo, "teacher-qian", "钱进", 2),
    mk("award-seed-8", "class-6-3-stu-1", "class-6-3", "award-7-2", "合作创享星", "乐于分享", 1, today, "teacher-shen", "沈亦菲", 0),
    mk("award-seed-9", "class-6-4-stu-1", "class-6-4", "award-10-1", "责任担当星", "主动负责", 1, yesterday, "teacher-jiang", "蒋文博", 1),
    mk("award-seed-10", "class-7-1-stu-1", "class-7-1", "award-1-1", "智慧小博士", "乐于探究", 1, today, "teacher-xu", "徐蓉", 0),
    mk("award-seed-11", "class-7-2-stu-1", "class-7-2", "award-2-1", "小小工程师", "动手实践", 1, yesterday, "teacher-xu", "徐蓉", 1),
    mk("award-seed-12", "class-5-1-stu-1", "class-5-1", "award-5-2", "才艺智多星", "表达美与创造美", 1, today, "teacher-he", "何淑芬", 0),
    mk("award-seed-13", "class-5-2-stu-1", "class-5-2", "award-4-1", "健康小能手", "热爱运动", 1, yesterday, "teacher-zhou", "周海峰", 1),
    mk("award-seed-14", "class-mz-4-1-stu-1", "class-mz-4-1", "award-8-1", "生活阳光星", "热爱生活", 1, today, "teacher-gu", "顾伟", 0),
    ...moralDemoAwards,
    ...roleDashboardAwards,
    ...parentDashboardAwards,
    // 线下扫码获得（以奖卡实际分值为准）
    mk("award-seed-15", "class-6-1-stu-5", "class-6-1", "award-4-1", "健康小能手", "热爱运动", 1, yesterday, "system", "线下扫码", 1, "offline_scan"),
    mk("award-seed-16", "class-6-1-stu-6", "class-6-1", "award-6-1", "家国红五星", "家国情怀", 1, today, "system", "线下扫码", 0, "offline_scan"),
    mk("award-seed-17", "class-6-2-stu-4", "class-6-2", "award-9-2", "自信创造星", "大胆创新", 1, yesterday, "system", "线下扫码", 1, "offline_scan"),
    ...leaderboardBoosts,
    // 流动红旗奖励
    ...flagRewards,
  ]
}

/** 体质健康成绩导入页的演示数据：覆盖多个年级、班级和性别，保证不同身份进入页面都有可查看内容。 */
function seedPeScoreUploads(): PeScoreUpload[] {
  const now = Date.now()
  return PE_CLASSES.slice(0, 6).flatMap((peClass, index) => (
    (['male', 'female'] as const).map((gender, genderIndex) => ({
      id: `pe-upload-demo-${peClass.id}-${gender}`,
      classId: peClass.id,
      gender,
      fileName: `${peClass.name}-${gender === 'male' ? '男生' : '女生'}体质健康成绩.xlsx`,
      rowCount: gender === 'male' ? peClass.maleCount : peClass.femaleCount,
      uploadedAt: new Date(now - (index + genderIndex) * 86400000).toISOString(),
      uploaderId: 'teacher-qian',
      uploaderName: '钱进',
      preview: buildPePreviewRows(peClass.id, gender, 4),
    }))
  ))
}

function seedFlags(): WeeklyFlag[] {
  const lastWeekKey = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return getISOWeekKey(d)
  })()
  return [
    { classId: "class-6-1", weekKey: lastWeekKey, configId: "week-civility", period: "week", awarded: true, awardedBy: "周海峰", awardedAt: new Date().toISOString() },
    { classId: "class-6-2", weekKey: lastWeekKey, configId: "week-clean", period: "week", awarded: true, awardedBy: "周海峰", awardedAt: new Date().toISOString() },
    { classId: "class-6-3", weekKey: lastWeekKey, configId: "week-civility", period: "week", awarded: true, awardedBy: "周海峰", awardedAt: new Date().toISOString() },
    { classId: "class-7-1", weekKey: lastWeekKey, configId: "week-clean", period: "week", awarded: true, awardedBy: "周海峰", awardedAt: new Date().toISOString() },
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
      level1: getFiveEducationLevel1(level1),
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
  const parentDashboardHonors = Array.from({ length: 12 }, (_, index) => {
    const studentId = ["class-6-1-stu-1", "class-6-1-stu-2", "class-6-2-stu-1"][index % 3]
    const levels: HonorLevel[] = ["school", "district", "city"]
    const subjects = ["阅读", "劳动", "科技", "体育"]
    const subject = subjects[index % subjects.length]
    return mk(
      `honor-parent-dashboard-${index + 1}`,
      studentId,
      index % 2 === 0 ? "智慧小博士" : "责任担当星",
      levels[index % levels.length],
      index % 3 + 1,
      `${subject}主题成长活动优秀作品${index + 1}号`,
      formatDate(new Date(now - (index % 8) * day)),
      index % 2 === 0 ? "屹力学校校区教务处" : "屹力学校校区德育处",
      index % 8 + index / 80,
    )
  })
  return [
    mk("honor-seed-1", "class-6-1-stu-1", "智慧小博士", "city", 3, "2025年浦东新区中小学Scratch编程挑战赛一等奖", today, "浦东新区教育发展研究院", 0),
    mk("honor-seed-2", "class-6-2-stu-2", "才艺智多星", "district", 2, "屹力学校校区第十二届艺术节钢琴独奏金奖", yesterday, "屹力学校校区德育处", 1),
    mk("honor-seed-3", "class-7-1-stu-2", "健康小能手", "city", 3, "2025年浦东新区中小学生田径运动会男子100米冠军", today, "浦东新区体育总会", 0),
    mk("honor-seed-4", "class-5-1-stu-1", "智慧小博士", "school", 1, "五年级数学速算竞赛一等奖", twoDaysAgo, "屹力学校校区教务处", 2),
    mk("honor-seed-5", "class-6-3-stu-2", "家国红五星", "national", 4, "2025年全国青少年人工智能创新挑战赛二等奖", yesterday, "中国少年儿童发展服务中心", 1),
    mk("honor-seed-6", "class-7-2-stu-1", "小小工程师", "district", 2, "第二十一届屹力杯小学生科技创新大赛一等奖", today, "浦东新区教育局", 0),
    mk("honor-seed-7", "class-6-1-stu-3", "友善美少年", "school", 1, "校级“友善之星”评选一等奖", twoDaysAgo, "屹力学校校区德育处", 2),
    mk("honor-seed-8", "class-5-2-stu-1", "健康小能手", "district", 2, "区级中小学生游泳锦标赛自由泳第二名", twoDaysAgo, "浦东新区体育局", 2),
    mk("honor-seed-9", "class-6-2-stu-1", "自信创造星", "school", 1, "校园演讲比赛低年级组一等奖", yesterday, "屹力学校校区大队部", 1),
    mk("honor-seed-10", "class-7-1-stu-1", "智慧小博士", "city", 3, "区青少年科技创新大赛科幻画一等奖", yesterday, "浦东新区青少年活动中心", 1),
    mk("honor-seed-11", "class-5-1-stu-2", "才艺智多星", "national", 4, "全国中小学生绘画书法作品比赛绘画类三等奖", twoDaysAgo, "中国教育学会美术教育专业委员会", 2),
    mk("honor-seed-12", "class-6-3-stu-1", "合作创享星", "school", 1, "校园合唱节团体一等奖", twoDaysAgo, "屹力学校校区教务处", 2),
    mk("honor-parent-demo-1", "class-6-1-stu-2", "健康小能手", "school", 1, "六年级春季运动会接力赛优秀个人", today, "屹力学校校区体育组", 0),
    mk("honor-parent-demo-2", "class-6-2-stu-1", "才艺智多星", "district", 2, "浦东新区少儿艺术展演优秀作品", yesterday, "浦东新区教育局", 1),
    ...parentDashboardHonors,
  ]
}

/** 补齐后续版本新增的演示记录，不覆盖用户已有的本地数据。 */
function mergeMissingDemoRecords<T extends { id: string }>(stored: T[], fixtures: T[]) {
  const existingIds = new Set(stored.map((item) => item.id))
  return [...stored, ...fixtures.filter((item) => !existingIds.has(item.id))]
}

/** 补齐新增的演示流动红旗，不覆盖用户已有的评选结果。 */
function mergeMissingDemoFlags(stored: WeeklyFlag[], fixtures: WeeklyFlag[]) {
  const fixtureByKey = new Map(fixtures.map((item) => [`${item.classId}-${item.weekKey}`, item]))
  const enriched = stored.map((item) => {
    const fixture = fixtureByKey.get(`${item.classId}-${item.weekKey}`)
    if (!fixture) return item
    return {
      ...item,
      configId: item.configId ?? fixture.configId,
      period: item.period ?? fixture.period,
    }
  })
  const existingKeys = new Set(enriched.map((item) => `${item.classId}-${item.weekKey}`))
  return [...enriched, ...fixtures.filter((item) => !existingKeys.has(`${item.classId}-${item.weekKey}`))]
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
      level1: "劳育",
      gradeIds: ["grade-6"],
      classIds: ["class-6-1", "class-6-2", "class-6-3", "class-6-4"],
      requiresEnrollment: true,
      requiresPointsExchange: true,
      pointRequirements: [
        { level1: "劳育", minimumPoints: 6 },
        { level1: "德育", minimumPoints: 4 },
      ],
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
      title: "屹力读书会·共读《草房子》",
      description:
        "以小组共读形式开展整本书阅读，活动结束后提交读书感悟与实践成果，优秀作品在读书节展示。",
      level1: "智育",
      gradeIds: ["grade-7"],
      classIds: ["class-7-1", "class-7-2", "class-7-3"],
      requiresEnrollment: true,
      requiresPointsExchange: true,
      pointRequirements: [{ level1: "智育", minimumPoints: 8 }],
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
      level1: "体育",
      gradeIds: ["grade-5", "grade-6"],
      classIds: ["class-5-1", "class-5-2", "class-5-3", "class-6-1", "class-6-2"],
      requiresEnrollment: false,
      requiresPointsExchange: false,
      pointRequirements: [],
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
      level1: "美育",
      gradeIds: ["grade-6"],
      classIds: ["class-6-1", "class-6-2", "class-6-3", "class-6-4"],
      requiresEnrollment: true,
      requiresPointsExchange: true,
      pointRequirements: [{ level1: "美育", minimumPoints: 5 }],
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
    {
      id: "act-5",
      title: "小小志愿者·图书整理日",
      description: "在图书馆老师指导下完成归类、上架与阅读角整理，记录服务过程并提交一张活动照片。",
      level1: "德育",
      gradeIds: ["grade-5"],
      classIds: ["class-5-1"],
      requiresEnrollment: false,
      requiresPointsExchange: false,
      pointRequirements: [],
      enrollStart: "",
      enrollEnd: "",
      startDate: date(2),
      endDate: date(2),
      pointsCost: 0,
      capacity: 0,
      location: "图书馆一楼服务台",
      status: "ongoing",
      publisherId: "teacher-li",
      publisherName: "李静",
      createdAt: iso(now - 2 * day),
    },
    {
      id: "act-6",
      title: "科技创想工作坊·校园节水装置",
      description: "以小组为单位完成节水装置设计、制作与展示，入选方案将在校园科技节进行集中展评。",
      level1: "智育",
      gradeIds: ["grade-7"],
      classIds: ["class-7-1"],
      requiresEnrollment: true,
      requiresPointsExchange: true,
      pointRequirements: [
        { level1: "智育", minimumPoints: 10 },
        { level1: "劳育", minimumPoints: 5 },
      ],
      enrollStart: date(-1),
      enrollEnd: date(3),
      startDate: date(5),
      endDate: date(6),
      pointsCost: 6,
      capacity: 18,
      location: "创客空间 A201",
      status: "recruiting",
      publisherId: "teacher-xu",
      publisherName: "徐蓉",
      createdAt: iso(now - 1 * day),
    },
    {
      id: "act-7",
      title: "书香午间·班级共读时光",
      description: "利用午间阅读时间开展班级共读与好书分享，学生可直接参加并记录本周阅读收获。",
      gradeIds: ["grade-5", "grade-6"],
      classIds: ["class-5-1", "class-5-2", "class-6-1", "class-6-2"],
      requiresEnrollment: false,
      requiresPointsExchange: false,
      pointRequirements: [],
      enrollStart: "",
      enrollEnd: "",
      startDate: date(1),
      endDate: date(5),
      pointsCost: 0,
      capacity: 0,
      location: "各班教室阅读角",
      status: "draft",
      publisherId: "teacher-li",
      publisherName: "李静",
      createdAt: iso(now - 1 * day),
    },
  ]
}

/** 兼容旧版浏览器缓存：原“已归档”活动统一归入“已结束”。 */
function normalizeActivities(items: unknown): Activity[] {
  if (!Array.isArray(items)) return seedActivities()
  const normalize = (item: unknown) => {
    const activity = item as Omit<Activity, "status"> & { status?: string }
    const legacyStatus = activity.status === "closed" ? "ended" : (activity.status ?? "draft")
    const activityTypes = Array.isArray(activity.activityTypes)
      ? activity.activityTypes.filter((value): value is string => typeof value === "string")
      : []
    return {
      ...activity,
      activityTypes: activityTypes.length > 0 ? activityTypes : ["综合实践"],
      status: getActivityStatus({
        ...activity,
        status: legacyStatus as Activity["status"],
      }),
    } as Activity
  }
  const normalized = items.map(normalize)
  // 已有浏览器缓存时，补入新增的免报名活动示例，便于展示“可直接参加”场景。
  const directParticipationMock = seedActivities().find((activity) => activity.id === "act-7")
  if (directParticipationMock && !normalized.some((activity) => activity.id === directParticipationMock.id)) {
    normalized.push(normalize(directParticipationMock))
  }
  return normalized
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
  flagConfigs: FlagConfig[]
  updateFlagConfig: (id: string, patch: Partial<FlagConfig>) => void
  addFlagConfig: (config: FlagConfig) => void
  removeFlagConfig: (id: string) => void
  classRatingConfigs: ClassRatingConfig[]
  updateClassRatingConfig: (id: string, patch: Partial<ClassRatingConfig>) => void
  addClassRatingConfig: (config: ClassRatingConfig) => void
  removeClassRatingConfig: (id: string) => void
  setFlag: (classId: string, periodKey: string, awarded: boolean, configId?: string, period?: FlagPeriod) => void
  /** 为获流动红旗的班级全部学生发放奖励积分，同一周期同一班只发一次 */
  issueFlagReward: (classId: string, weekKey: string, configId?: string) => void
  awardCards: AwardCardRecord[]
  addAwardCards: (
    cards: Omit<AwardCardRecord, "id" | "createdAt" | "operatorId" | "operatorName" | "source">[],
  ) => void
  honors: HonorRecord[]
  addHonor: (
    honor: Omit<HonorRecord, "id" | "createdAt" | "operatorId" | "operatorName">,
  ) => void
  submitParentHonor: (
    honor: Omit<HonorRecord, "id" | "createdAt" | "operatorId" | "operatorName" | "reviewStatus" | "submittedByParent">,
  ) => { ok: boolean; reason?: string }
  reviewParentHonor: (id: string, status: "approved" | "rejected", note?: string) => void
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
  /* 积分商城 */
  mallProducts: MallProduct[]
  mallConfig: MallConfig
  mallCartItems: MallCartItem[]
  mallRedemptions: MallRedemption[]
  updateMallConfig: (patch: Partial<MallConfig>) => void
  addMallProduct: (product: Omit<MallProduct, "id" | "createdAt" | "updatedAt">) => void
  updateMallProduct: (id: string, patch: Partial<MallProduct>) => void
  removeMallProduct: (id: string) => void
  addMallCartItem: (studentId: string, productId: string, quantity?: number) => void
  updateMallCartItem: (studentId: string, productId: string, quantity: number) => void
  removeMallCartItem: (studentId: string, productId: string) => void
  clearMallCart: (studentId: string) => void
  redeemMallOrder: (studentId: string, items: Array<{ productId: string; quantity: number }>) => { ok: boolean; reason?: string; orderIds?: string[] }
  updateMallOfflineRedeemed: (ids: string[], offlineRedeemed: boolean) => void
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
  const [flagConfigs, setFlagConfigs] = useState<FlagConfig[]>([])
  const [classRatingConfigs, setClassRatingConfigs] = useState<ClassRatingConfig[]>([])
  const [awardCards, setAwardCards] = useState<AwardCardRecord[]>([])
  const [honors, setHonors] = useState<HonorRecord[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([])
  const [evaluations, setEvaluations] = useState<ActivityEvaluation[]>([])
  const [mallProducts, setMallProducts] = useState<MallProduct[]>([])
  const [mallConfig, setMallConfig] = useState<MallConfig>(() => seedMallConfig())
  const [mallCartItems, setMallCartItems] = useState<MallCartItem[]>([])
  const [mallRedemptions, setMallRedemptions] = useState<MallRedemption[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [peScoreUploads, setPeScoreUploads] = useState<PeScoreUpload[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const rawRecords = localStorage.getItem(RECORDS_KEY)
      const rawFlags = localStorage.getItem(FLAGS_KEY)
      const rawFlagConfigs = localStorage.getItem(FLAG_CONFIGS_KEY)
      const rawClassRatingConfigs = localStorage.getItem(CLASS_RATING_CONFIGS_KEY)
      const rawAwardCards = localStorage.getItem(AWARD_CARDS_KEY)
      const rawHonors = localStorage.getItem(HONORS_KEY)
      const rawActivities = localStorage.getItem(ACTIVITIES_KEY)
      const rawEnrollments = localStorage.getItem(ENROLLMENTS_KEY)
      const rawSubmissions = localStorage.getItem(SUBMISSIONS_KEY)
      const rawEvaluations = localStorage.getItem(EVALUATIONS_KEY)
      const rawCurrentUser = localStorage.getItem(CURRENT_USER_KEY)
      const rawPeScores = localStorage.getItem(PE_SCORES_KEY)
      const rawMallProducts = localStorage.getItem(MALL_PRODUCTS_KEY)
      const rawMallConfig = localStorage.getItem(MALL_CONFIG_KEY)
      const rawMallCart = localStorage.getItem(MALL_CART_KEY)
      const rawMallRedemptions = localStorage.getItem(MALL_REDEMPTIONS_KEY)
      const storedRecords = rawRecords ? JSON.parse(rawRecords) as ScoreRecord[] : null
      const storedAwardCards = rawAwardCards ? JSON.parse(rawAwardCards) as AwardCardRecord[] : null
      const storedFlags = rawFlags ? JSON.parse(rawFlags) as WeeklyFlag[] : null
      setRecords(storedRecords
        ? mergeMissingDemoRecords(storedRecords, seedRecords().filter((item) => item.id.startsWith("seed-ranking-") || item.id.startsWith("moral-demo-record-") || item.id.startsWith("homeroom-dashboard-record-")))
        : seedRecords())
      setFlags(storedFlags ? mergeMissingDemoFlags(storedFlags, seedFlags()) : seedFlags())
      const storedFlagConfigs = rawFlagConfigs ? JSON.parse(rawFlagConfigs) as Partial<FlagConfig>[] : null
      setFlagConfigs(storedFlagConfigs ? storedFlagConfigs.map((item) => ({ ...item, points: Number.isFinite(item.points) && Number(item.points) > 0 ? Math.round(Number(item.points)) : 1 } as FlagConfig)) : DEFAULT_FLAG_CONFIGS)
      const storedClassRatingConfigs = rawClassRatingConfigs ? JSON.parse(rawClassRatingConfigs) as Partial<ClassRatingConfig>[] : null
      setClassRatingConfigs(storedClassRatingConfigs ? storedClassRatingConfigs.map((item) => ({
        ...item,
        ruleType: item.ruleType === "score" ? "score" : "rank",
        rankStart: item.rankStart ?? "1",
        rankEnd: item.rankEnd ?? "99",
        scoreStart: item.scoreStart ?? "0",
        scoreEnd: item.scoreEnd ?? "100",
      } as ClassRatingConfig)) : DEFAULT_CLASS_RATING_CONFIGS)
      setAwardCards(storedAwardCards
        ? mergeMissingDemoRecords(storedAwardCards, seedAwardCards().filter((item) => item.id.startsWith("award-leaderboard-") || item.id.startsWith("award-moral-demo-") || item.id.startsWith("award-role-dashboard-") || item.id.startsWith("award-parent-dashboard-")))
        : seedAwardCards())
      setHonors(rawHonors ? mergeMissingDemoRecords(JSON.parse(rawHonors) as HonorRecord[], seedHonors().filter((item) => item.id.startsWith("honor-parent-demo-") || item.id.startsWith("honor-parent-dashboard-"))) : seedHonors())
      setActivities(rawActivities ? normalizeActivities(JSON.parse(rawActivities)) : normalizeActivities(seedActivities()))
      setEnrollments(rawEnrollments ? JSON.parse(rawEnrollments) : seedEnrollments())
      setSubmissions(rawSubmissions ? JSON.parse(rawSubmissions) : seedSubmissions())
      setEvaluations(rawEvaluations ? JSON.parse(rawEvaluations) : seedEvaluations())
      setMallProducts(rawMallProducts ? JSON.parse(rawMallProducts) : seedMallProducts())
      setMallConfig(rawMallConfig ? JSON.parse(rawMallConfig) : seedMallConfig())
      setMallCartItems(rawMallCart ? JSON.parse(rawMallCart) : [])
      setMallRedemptions(rawMallRedemptions ? JSON.parse(rawMallRedemptions) : seedMallRedemptions())
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
      const storedPeScores = rawPeScores ? JSON.parse(rawPeScores) as PeScoreUpload[] : null
      setPeScoreUploads(storedPeScores && storedPeScores.length > 0 ? storedPeScores : seedPeScoreUploads())
    } catch {
      setRecords(seedRecords())
      setFlags(seedFlags())
      setFlagConfigs(DEFAULT_FLAG_CONFIGS)
      setClassRatingConfigs(DEFAULT_CLASS_RATING_CONFIGS)
      setAwardCards(seedAwardCards())
      setHonors(seedHonors())
      setActivities(seedActivities())
      setEnrollments(seedEnrollments())
      setSubmissions(seedSubmissions())
      setEvaluations(seedEvaluations())
      setMallProducts(seedMallProducts())
      setMallConfig(seedMallConfig())
      setMallCartItems([])
      setMallRedemptions(seedMallRedemptions())
      setPeScoreUploads(seedPeScoreUploads())
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const syncActivityStatus = () => {
      setActivities((prev) => {
        let changed = false
        const next = prev.map((activity) => {
          const status = getActivityStatus(activity)
          if (status === activity.status) return activity
          changed = true
          return { ...activity, status }
        })
        return changed ? next : prev
      })
    }
    syncActivityStatus()
    const timer = window.setInterval(syncActivityStatus, 60_000)
    return () => window.clearInterval(timer)
  }, [hydrated])

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
    localStorage.setItem(FLAG_CONFIGS_KEY, JSON.stringify(flagConfigs))
  }, [flagConfigs, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(CLASS_RATING_CONFIGS_KEY, JSON.stringify(classRatingConfigs))
  }, [classRatingConfigs, hydrated])

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
    localStorage.setItem(MALL_PRODUCTS_KEY, JSON.stringify(mallProducts))
  }, [mallProducts, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(MALL_CONFIG_KEY, JSON.stringify(mallConfig))
  }, [mallConfig, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(MALL_CART_KEY, JSON.stringify(mallCartItems))
  }, [mallCartItems, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(MALL_REDEMPTIONS_KEY, JSON.stringify(mallRedemptions))
  }, [mallRedemptions, hydrated])

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
    honors.filter((h) => h.studentId === studentId && h.reviewStatus !== "pending" && h.reviewStatus !== "rejected").reduce((sum, h) => sum + h.points, 0)

  /** 已被占用（报名预扣且未退还）的积分 */
  const getStudentEnrollmentSpent = (studentId: string) =>
    enrollments
      .filter((e) => e.studentId === studentId && e.pointsSpent)
      .reduce((sum, e) => sum + e.pointsCost, 0)

  /** 商城兑换已经消耗的积分 */
  const getStudentMallSpent = (studentId: string) =>
    mallRedemptions
      .filter((item) => item.studentId === studentId)
      .reduce((sum, item) => sum + item.totalPoints, 0)

  const getStudentSpent = (studentId: string) => getStudentEnrollmentSpent(studentId) + getStudentMallSpent(studentId)

  const getStudentBalance = (studentId: string) => getStudentEarned(studentId) - getStudentSpent(studentId)

  const updateMallConfig: EvaluationContextValue["updateMallConfig"] = (patch) => {
    setMallConfig((prev) => ({ ...prev, ...patch }))
  }

  const addMallProduct: EvaluationContextValue["addMallProduct"] = (product) => {
    const now = new Date().toISOString()
    setMallProducts((prev) => [{
      ...product,
      id: `mall-product-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    }, ...prev])
  }

  const updateMallProduct: EvaluationContextValue["updateMallProduct"] = (id, patch) => {
    setMallProducts((prev) => prev.map((product) => product.id === id
      ? { ...product, ...patch, stock: Math.max(0, Number(patch.stock ?? product.stock)), updatedAt: new Date().toISOString() }
      : product,
    ))
  }

  const removeMallProduct: EvaluationContextValue["removeMallProduct"] = (id) => {
    setMallProducts((prev) => prev.filter((product) => product.id !== id))
    setMallCartItems((prev) => prev.filter((item) => item.productId !== id))
  }

  const addMallCartItem: EvaluationContextValue["addMallCartItem"] = (studentId, productId, quantity = 1) => {
    const safeQuantity = Math.max(1, Math.floor(quantity))
    setMallCartItems((prev) => {
      const existing = prev.find((item) => item.studentId === studentId && item.productId === productId)
      if (!existing) return [...prev, { studentId, productId, quantity: safeQuantity }]
      return prev.map((item) => item.studentId === studentId && item.productId === productId
        ? { ...item, quantity: item.quantity + safeQuantity }
        : item,
      )
    })
  }

  const updateMallCartItem: EvaluationContextValue["updateMallCartItem"] = (studentId, productId, quantity) => {
    const safeQuantity = Math.floor(quantity)
    setMallCartItems((prev) => safeQuantity <= 0
      ? prev.filter((item) => !(item.studentId === studentId && item.productId === productId))
      : prev.map((item) => item.studentId === studentId && item.productId === productId ? { ...item, quantity: safeQuantity } : item),
    )
  }

  const removeMallCartItem: EvaluationContextValue["removeMallCartItem"] = (studentId, productId) => {
    setMallCartItems((prev) => prev.filter((item) => !(item.studentId === studentId && item.productId === productId)))
  }

  const clearMallCart: EvaluationContextValue["clearMallCart"] = (studentId) => {
    setMallCartItems((prev) => prev.filter((item) => item.studentId !== studentId))
  }

  const getStudentSemesterLevelPoints = (studentId: string) => {
    const semester = getSemesterRange(new Date())
    const points = new Map<string, number>()
    buildPointEntries(awardCards, honors)
      .filter((entry) => entry.studentId === studentId && inRange(entry.date, semester.start, semester.end))
      .forEach((entry) => points.set(entry.level1, (points.get(entry.level1) ?? 0) + entry.points))
    return points
  }

  const redeemMallOrder: EvaluationContextValue["redeemMallOrder"] = (studentId, items) => {
    const student = STUDENTS.find((item) => item.id === studentId)
    if (!student) return { ok: false, reason: "未找到学生信息" }
    const schoolClass = CLASSES.find((item) => item.id === student.classId)
    if (!schoolClass) return { ok: false, reason: "未找到学生班级信息" }
    const now = new Date()
    const start = mallConfig.startAt ? new Date(mallConfig.startAt) : null
    const end = mallConfig.endAt ? new Date(mallConfig.endAt) : null
    if ((start && now < start) || (end && now > end)) return { ok: false, reason: "当前不在商城开放时间内" }
    const grouped = new Map<string, number>()
    items.forEach((item) => grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + Math.max(1, Math.floor(item.quantity))))
    if (grouped.size === 0) return { ok: false, reason: "请先选择需要兑换的商品" }
    const semesterPoints = getStudentSemesterLevelPoints(studentId)
    const snapshots: Array<{ product: MallProduct; quantity: number }> = []
    let totalPoints = 0
    for (const [productId, quantity] of grouped) {
      const product = mallProducts.find((item) => item.id === productId)
      if (!product || product.status !== "listed") return { ok: false, reason: "有商品已下架，请刷新后重试" }
      if (product.stock < quantity) return { ok: false, reason: `${product.name} 库存不足` }
      if (product.gradeIds.length > 0 && !product.gradeIds.includes(schoolClass.gradeId)) return { ok: false, reason: `${product.name} 暂不面向该年级兑换` }
      if (product.requirementsEnabled && product.requirements.length > 0) {
        const checks = product.requirements.map((requirement) => (semesterPoints.get(requirement.level1) ?? 0) >= requirement.minimumPoints)
        const passed = product.requirementMode === "all" ? checks.every(Boolean) : checks.some(Boolean)
        if (!passed) return { ok: false, reason: `${product.name} 未满足本学期积分条件` }
      }
      totalPoints += product.pointsCost * quantity
      snapshots.push({ product, quantity })
    }
    if (getStudentBalance(studentId) < totalPoints) return { ok: false, reason: `可用积分不足（需要 ${totalPoints} 分）` }
    const orderPrefix = `SC${formatDate(now).replaceAll("-", "")}${Math.random().toString().slice(2, 7)}`
    const created: MallRedemption[] = snapshots.map(({ product, quantity }, index) => ({
      id: `mall-redemption-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      orderNo: `${orderPrefix}${String(index + 1).padStart(2, "0")}`,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      productPoints: product.pointsCost,
      quantity,
      totalPoints: product.pointsCost * quantity,
      studentId,
      studentName: student.name,
      classId: student.classId,
      gradeId: schoolClass.gradeId,
      redeemedAt: now.toISOString(),
      offlineRedeemed: false,
    }))
    setMallProducts((prev) => prev.map((product) => {
      const entry = snapshots.find((snapshot) => snapshot.product.id === product.id)
      return entry ? { ...product, stock: product.stock - entry.quantity, updatedAt: now.toISOString() } : product
    }))
    setMallRedemptions((prev) => [...created, ...prev])
    return { ok: true, orderIds: created.map((item) => item.id) }
  }

  const updateMallOfflineRedeemed: EvaluationContextValue["updateMallOfflineRedeemed"] = (ids, offlineRedeemed) => {
    if (!currentTeacher) return
    const idSet = new Set(ids)
    setMallRedemptions((prev) => prev.map((item) => idSet.has(item.id)
      ? { ...item, offlineRedeemed, offlineRedeemedAt: offlineRedeemed ? new Date().toISOString() : undefined }
      : item,
    ))
  }

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
    const stamped = cards.map((card) => {
      const normalizedLevel1 = getFiveEducationLevel1(card.level1)
      const isLegacyHierarchy = normalizedLevel1 !== card.level1
      return {
        ...card,
        level1: normalizedLevel1,
        level2: isLegacyHierarchy ? card.level1 : card.level2,
        level3: isLegacyHierarchy ? card.level3 ?? card.level2 : card.level3,
        source: "online" as const,
        id: `award-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        operatorId: currentTeacher.id,
        operatorName: currentTeacher.name,
        createdAt: new Date().toISOString(),
      }
    })
    setAwardCards((prev) => [...prev, ...stamped])
  }

  const addHonor: EvaluationContextValue["addHonor"] = (honor) => {
    if (!currentTeacher) return
    const stamped: HonorRecord = {
      ...honor,
      level1: getFiveEducationLevel1(honor.level1),
      id: `honor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      operatorId: currentTeacher.id,
      operatorName: currentTeacher.name,
      createdAt: new Date().toISOString(),
    }
    setHonors((prev) => [...prev, stamped])
  }

  const submitParentHonor: EvaluationContextValue["submitParentHonor"] = (honor) => {
    if (currentUser.kind !== "parent") return { ok: false, reason: "请使用家长身份提交荣誉" }
    const child = currentUser.children.find((item) => item.studentId === honor.studentId && item.classId === honor.classId)
    if (!child) return { ok: false, reason: "仅可为已绑定的孩子提交荣誉" }
    const stamped: HonorRecord = {
      ...honor,
      level1: getFiveEducationLevel1(honor.level1),
      id: `honor-parent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      createdAt: new Date().toISOString(),
      reviewStatus: "pending",
      submittedByParent: true,
    }
    setHonors((prev) => [...prev, stamped])
    return { ok: true }
  }

  const reviewParentHonor: EvaluationContextValue["reviewParentHonor"] = (id, status, note = "") => {
    if (!currentTeacher || currentTeacher.role !== "homeroom") return
    setHonors((prev) => prev.map((honor) => {
      if (honor.id !== id || honor.reviewStatus !== "pending" || !currentTeacher.scoringClassIds.includes(honor.classId)) return honor
      return { ...honor, reviewStatus: status, reviewNote: note, reviewedAt: new Date().toISOString(), reviewedBy: currentTeacher.name }
    }))
  }

  const setFlag = (classId: string, periodKey: string, awarded: boolean, configId?: string, period?: FlagPeriod) => {
    if (!currentTeacher) return
    setFlags((prev) => {
      const existingIdx = prev.findIndex((f) => f.classId === classId && f.weekKey === periodKey && f.configId === configId)
      const updated: WeeklyFlag = {
        classId,
        weekKey: periodKey,
        configId,
        period,
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

  const updateFlagConfig = (id: string, patch: Partial<FlagConfig>) => {
    setFlagConfigs((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  const addFlagConfig = (config: FlagConfig) => {
    setFlagConfigs((prev) => [...prev, config])
  }

  const removeFlagConfig = (id: string) => {
    setFlagConfigs((prev) => prev.filter((item) => item.id !== id))
  }

  const updateClassRatingConfig = (id: string, patch: Partial<ClassRatingConfig>) => {
    setClassRatingConfigs((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  const addClassRatingConfig = (config: ClassRatingConfig) => {
    setClassRatingConfigs((prev) => [...prev, config])
  }

  const removeClassRatingConfig = (id: string) => {
    setClassRatingConfigs((prev) => prev.filter((item) => item.id !== id))
  }

  const issueFlagReward: EvaluationContextValue["issueFlagReward"] = (classId, weekKey, configId) => {
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
    const flagConfig = flagConfigs.find((item) => item.id === configId) ?? flagConfigs.find((item) => item.period === "week" && item.enabled)
    const rewardPoints = flagConfig?.points ?? 1
    const [yearStr, weekStr] = weekKey.split("-W")
    const date = weekStr
      ? formatDate(getWeekRange(new Date(Number(yearStr), 0, 4 + (Number(weekStr) - 1) * 7)).start)
      : formatDate(new Date(`${weekKey}-01T00:00:00`))
    const stamped: AwardCardRecord[] = roster.map((s) => ({
      id: `award-flag-${weekKey}-${classId}-${s.id}`,
      studentId: s.id,
      studentName: s.name,
      classId,
      indicatorId: "award-7-1",
      level1: "劳育",
      level2: "合作创享星",
      level3: "团队协作",
      points: rewardPoints,
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
    const newActivityBase: Activity = {
      ...activity,
      id,
      status: "draft",
      publisherId: currentTeacher.id,
      publisherName: currentTeacher.name,
      createdAt: now,
    }
    const newActivity = { ...newActivityBase, status: getActivityStatus(newActivityBase) }
    setActivities((prev) => [newActivity, ...prev])
    return id
  }

  const updateActivity: EvaluationContextValue["updateActivity"] = (id, patch) => {
    setActivities((prev) => prev.map((a) => {
      if (a.id !== id) return a
      const next = { ...a, ...patch }
      return { ...next, status: getActivityStatus(next) }
    }))
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
    if (!requiresActivityEnrollment(activity)) {
      return { ok: false, reason: "该活动无需报名，可直接参加" }
    }
    if (!isEnrolling(activity)) return { ok: false, reason: "当前不在报名时间" }
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
    if (requiresActivityPointsExchange(activity) && activity.pointsCost > 0) {
      const balance = getStudentEarned(childId) - getStudentSpent(childId)
      if (balance < activity.pointsCost) {
        return { ok: false, reason: `积分不足（需 ${activity.pointsCost} 分，当前 ${balance} 分）` }
      }
    }
    if (requiresActivityPointsExchange(activity) && activity.pointRequirements?.length) {
      const semester = getSemesterRange(new Date())
      const entries = buildPointEntries(awardCards, honors)
      for (const requirement of activity.pointRequirements) {
        const earned = entries
          .filter((entry) => entry.studentId === childId && entry.level1 === requirement.level1)
          .filter((entry) => inRange(entry.date, semester.start, semester.end))
          .reduce((sum, entry) => sum + entry.points, 0)
        if (earned < requirement.minimumPoints) {
          return {
            ok: false,
            reason: `未满足${requirement.level1}学期积分条件（需${requirement.minimumPoints}分，当前${earned}分）`,
          }
        }
      }
    }
    const newEnrollment: Enrollment = {
      id: `enr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      activityId,
      studentId: childId,
      studentName: child.name,
      classId: child.classId,
      pointsCost: requiresActivityPointsExchange(activity) ? activity.pointsCost : 0,
      status: "pending",
      remark: remark.trim(),
      enrolledAt: new Date().toISOString(),
      pointsSpent: requiresActivityPointsExchange(activity) && activity.pointsCost > 0,
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
    flagConfigs,
    updateFlagConfig,
    addFlagConfig,
    removeFlagConfig,
    classRatingConfigs,
    updateClassRatingConfig,
    addClassRatingConfig,
    removeClassRatingConfig,
    setFlag,
    issueFlagReward,
    awardCards,
    addAwardCards,
    honors,
    addHonor,
    submitParentHonor,
    reviewParentHonor,
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
    mallProducts,
    mallConfig,
    mallCartItems,
    mallRedemptions,
    updateMallConfig,
    addMallProduct,
    updateMallProduct,
    removeMallProduct,
    addMallCartItem,
    updateMallCartItem,
    removeMallCartItem,
    clearMallCart,
    redeemMallOrder,
    updateMallOfflineRedeemed,
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
