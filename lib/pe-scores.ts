import { createRandom, randomInt } from "./random"

/** 体质健康成绩性别分类 */
export type PeGender = "male" | "female"

export function peGenderLabel(gender: PeGender) {
  return gender === "male" ? "男生" : "女生"
}

export interface PeClass {
  id: string
  gradeName: string
  index: number
  name: string
  maleCount: number
  femaleCount: number
}

export const PE_GRADE_NAMES = ["一年级", "二年级", "三年级", "四年级", "五年级"] as const

/** 体质健康成绩导入范围：1-5 年级各 3 个班，人数按种子确定性生成 */
export const PE_CLASSES: PeClass[] = PE_GRADE_NAMES.flatMap((gradeName, gi) =>
  [1, 2, 3].map((index) => {
    const rand = createRandom(`pe-class:${gradeName}-${index}`)
    return {
      id: `pe-g${gi + 1}-c${index}`,
      gradeName,
      index,
      name: `${gradeName}${String(index).padStart(2, "0")}班`,
      maleCount: randomInt(rand, 16, 20),
      femaleCount: randomInt(rand, 15, 19),
    }
  }),
)

export const PE_CLASS_IDS = PE_CLASSES.map((c) => c.id)

export function getPeClass(classId: string): PeClass | undefined {
  return PE_CLASSES.find((c) => c.id === classId)
}

/** 单个班级 × 性别的成绩文件上传记录 */
export interface PeScoreUpload {
  id: string
  classId: string
  gender: PeGender
  fileName: string
  rowCount: number
  uploadedAt: string
  uploaderId: string
  uploaderName: string
  /** 表格预览：第一行为表头，最多保留数行 */
  preview: (string | number)[][]
}

/* ------------------------------------------------------------------ *
 * 演示用预览数据（确定性生成，仅用于原型展示）
 * ------------------------------------------------------------------ */

const PE_SURNAMES = [
  "王", "李", "张", "刘", "陈", "杨", "黄", "赵", "吴", "周",
  "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "罗",
]

const PE_GIVENS = [
  "思远", "晓雨", "浩然", "梓萱", "子豪", "一诺", "欣怡", "俊杰",
  "晓彤", "天宇", "佳琪", "铭轩", "思彤", "宇轩", "雨桐", "嘉怡",
  "子涵", "若曦", "明轩", "语汐", "泽楷", "亦然", "心悦", "睿哲",
]

export const PE_PREVIEW_HEADER = [
  "姓名",
  "学号",
  "性别",
  "身高(cm)",
  "体重(kg)",
  "50米跑(秒)",
  "坐位体前屈(cm)",
  "1分钟跳绳(个)",
  "总评等级",
]

const PE_GRADE_LABELS = ["优秀", "良好", "及格", "待提高"]

/** 生成 header + rows 行演示数据 */
export function buildPePreviewRows(
  classId: string,
  gender: PeGender,
  rows: number,
): (string | number)[][] {
  const rand = createRandom(`pe-preview:${classId}:${gender}`)
  const out: (string | number)[][] = [PE_PREVIEW_HEADER]
  for (let i = 0; i < rows; i += 1) {
    const name =
      PE_SURNAMES[Math.floor(rand() * PE_SURNAMES.length)] +
      PE_GIVENS[Math.floor(rand() * PE_GIVENS.length)]
    out.push([
      name,
      String(i + 1).padStart(2, "0"),
      peGenderLabel(gender),
      randomInt(rand, 112, 158),
      randomInt(rand, 19, 46),
      (randomInt(rand, 88, 138) / 10).toFixed(1),
      randomInt(rand, -2, 22),
      randomInt(rand, 30, 130),
      PE_GRADE_LABELS[Math.floor(rand() * PE_GRADE_LABELS.length * 0.7)],
    ])
  }
  return out
}

/** 当前学期标签：8月起按新学年第一学期（开学准备期） */
export function getSemesterLabel(date: Date = new Date()) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  if (m >= 8) return `${y}-${y + 1} 学年第一学期`
  if (m <= 1) return `${y - 1}-${y} 学年第一学期`
  return `${y - 1}-${y} 学年第二学期`
}
