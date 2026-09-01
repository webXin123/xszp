import type { ScoreRecord, WeeklyFlag } from "../types"
import { CLASSES, GRADES, getGradeOfClass, pickStudentNames } from "../mock-data"
import { INDICATOR_GROUPS, formatDate, getISOWeekKey, getWeekRange } from "../scoring-utils"
import { chance, createRandom, pickOne, randomInt, type Random } from "../random"

/** 演示数据回溯的完整周数（当前周之外） */
export const DEMO_HISTORY_WEEKS = 3

/** 检查人：按一级指标区分，让「谁记的」看起来合理 */
const CHECKERS: Record<string, { id: string; name: string }[]> = {
  卫生: [
    { id: "duty-zhou", name: "周敏（值周）" },
    { id: "duty-qian", name: "钱理（卫生检查）" },
  ],
  课间文明休息: [
    { id: "duty-zhou", name: "周敏（值周）" },
    { id: "teacher-li", name: "李静（德育）" },
  ],
  路队: [
    { id: "duty-song", name: "宋成（值周）" },
    { id: "teacher-li", name: "李静（德育）" },
  ],
  礼仪形象: [
    { id: "duty-yan", name: "闫小柯（大门值勤）" },
    { id: "duty-zhou", name: "周敏（值周）" },
  ],
  早操: [
    { id: "pe-fang", name: "方振（体育组）" },
    { id: "duty-song", name: "宋成（值周）" },
  ],
  "午休、午会": [
    { id: "teacher-chen", name: "陈明（年级组长）" },
    { id: "teacher-xu", name: "徐蓉（年级组长）" },
  ],
}

/** 记录时间段：贴合各项检查在一天里的真实发生时刻 */
const CHECK_WINDOW: Record<string, [number, number]> = {
  礼仪形象: [7 * 60 + 30, 7 * 60 + 55],
  卫生: [7 * 60 + 50, 8 * 60 + 20],
  早操: [8 * 60 + 5, 8 * 60 + 25],
  课间文明休息: [9 * 60 + 40, 10 * 60 + 20],
  "午休、午会": [12 * 60 + 30, 13 * 60 + 10],
  路队: [15 * 60 + 40, 16 * 60 + 10],
}

const NOTES: Record<string, string[]> = {
  卫生: [
    "讲台侧面积灰未清理",
    "教室后排地面有纸屑",
    "拖把未挂回工具架",
    "作业柜第三层书本歪斜",
    "垃圾桶已满未清倒",
  ],
  课间文明休息: [
    "两名同学在走廊追逐",
    "楼梯口出现推搡",
    "课间教室内喧闹明显",
    "在楼梯扶手上滑行",
  ],
  路队: [
    "队伍前后拖得较长",
    "行进中队尾说话不断",
    "转弯处队形散开",
    "未走指定的东侧通道",
  ],
  礼仪形象: [
    "个别同学未穿校服外套",
    "红领巾佩戴歪斜",
    "遇到来访家长未问好",
    "指甲过长未修剪",
  ],
  早操: [
    "第三节动作跟不上节拍",
    "退场时有同学奔跑",
    "队列站位不齐",
    "整体精神状态偏松散",
  ],
  "午休、午会": [
    "午休前十分钟仍有讲话",
    "午会主题未按周计划落实",
    "看班教师中途离开",
    "班主任未到班组织",
  ],
}

/** 涉及具体学生的一级指标（班级层面的项目一般不点名） */
const PERSONAL_LEVEL1 = new Set(["礼仪形象", "课间文明休息"])

/** 一张极小的占位「现场照片」，用来演示图片附件的展示效果 */
const PHOTO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="14" fill="#dbe4f5"/><rect x="18" y="34" width="84" height="56" rx="8" fill="#8fa6cf"/><circle cx="44" cy="56" r="9" fill="#f3f6fc"/><path d="M26 84l24-22 18 16 14-11 12 17z" fill="#f3f6fc"/><text x="60" y="108" font-size="13" text-anchor="middle" fill="#4a5b7d">现场照片</text></svg>`
const PHOTO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(PHOTO_SVG)}`
