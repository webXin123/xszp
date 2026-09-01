import type { Grade, ParentChild, ParentUser, SchoolClass, Student, Teacher } from "./types"
import { createRandom, pickMany, randomInt } from "./random"
import { PE_CLASS_IDS } from "./pe-scores"

/* ------------------------------------------------------------------ *
 * 校区 / 学段 / 年级 / 班级
 * ------------------------------------------------------------------ */

export const CAMPUSES = ["临港校区", "明珠校区"] as const
export const SEGMENTS = ["小学部", "初中部"] as const

export const GRADES: Grade[] = [
  { id: "grade-5", name: "五年级", segment: "小学部", campus: "临港校区", order: 1 },
  { id: "grade-6", name: "六年级", segment: "小学部", campus: "临港校区", order: 2 },
  { id: "grade-7", name: "七年级", segment: "初中部", campus: "临港校区", order: 3 },
  { id: "grade-8", name: "八年级", segment: "初中部", campus: "临港校区", order: 4 },
  { id: "grade-mz-4", name: "四年级", segment: "小学部", campus: "明珠校区", order: 5 },
]

interface ClassSeed {
  id: string
  gradeId: string
  index: number
  homeroomTeacher: string
  studentCount: number
}

const CLASS_SEEDS: ClassSeed[] = [
  { id: "class-5-1", gradeId: "grade-5", index: 1, homeroomTeacher: "何淑芬", studentCount: 34 },
  { id: "class-5-2", gradeId: "grade-5", index: 2, homeroomTeacher: "罗晓梅", studentCount: 33 },
  { id: "class-5-3", gradeId: "grade-5", index: 3, homeroomTeacher: "邱志远", studentCount: 35 },
  { id: "class-6-1", gradeId: "grade-6", index: 1, homeroomTeacher: "赵得鑫", studentCount: 36 },
  { id: "class-6-2", gradeId: "grade-6", index: 2, homeroomTeacher: "王芳", studentCount: 35 },
  { id: "class-6-3", gradeId: "grade-6", index: 3, homeroomTeacher: "沈亦菲", studentCount: 34 },
  { id: "class-6-4", gradeId: "grade-6", index: 4, homeroomTeacher: "蒋文博", studentCount: 33 },
  { id: "class-7-1", gradeId: "grade-7", index: 1, homeroomTeacher: "徐蓉", studentCount: 38 },
  { id: "class-7-2", gradeId: "grade-7", index: 2, homeroomTeacher: "崔嘉禾", studentCount: 37 },
  { id: "class-7-3", gradeId: "grade-7", index: 3, homeroomTeacher: "汤朗", studentCount: 38 },
  { id: "class-8-1", gradeId: "grade-8", index: 1, homeroomTeacher: "傅逸华", studentCount: 36 },
  { id: "class-8-2", gradeId: "grade-8", index: 2, homeroomTeacher: "谭雪莹", studentCount: 35 },
  { id: "class-mz-4-1", gradeId: "grade-mz-4", index: 1, homeroomTeacher: "顾伟", studentCount: 32 },
  { id: "class-mz-4-2", gradeId: "grade-mz-4", index: 2, homeroomTeacher: "章丽", studentCount: 31 },
]

const GRADE_NAME_BY_ID = new Map(GRADES.map((g) => [g.id, g.name]))

export const CLASSES: SchoolClass[] = CLASS_SEEDS.map((seed) => {
  const shortName = `${String(seed.index).padStart(2, "0")}班`
  return {
    id: seed.id,
    name: `${GRADE_NAME_BY_ID.get(seed.gradeId) ?? ""}${shortName}`,
    shortName,
    gradeId: seed.gradeId,
    homeroomTeacher: seed.homeroomTeacher,
    studentCount: seed.studentCount,
  }
})

/* ------------------------------------------------------------------ *
 * 学生名单（按班级确定性生成，各班互不重名）
 * ------------------------------------------------------------------ */

const SURNAMES = [
  "王", "李", "张", "刘", "陈", "杨", "黄", "赵", "吴", "周",
  "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "罗",
  "郑", "梁", "谢", "宋", "唐", "许", "韩", "冯", "邓", "曹",
  "彭", "曾", "肖", "田", "董", "袁", "潘", "蒋", "蔡", "余",
  "杜", "叶", "程", "苏", "魏", "吕", "丁", "沈", "姚", "卢",
  "姜", "崔", "钟", "谭", "陆", "汪", "范", "金", "石", "廖",
]

const GIVEN_NAMES = [
  "思远", "晓雨", "浩然", "梓萱", "子豪", "一诺", "欣怡", "俊杰",
  "晓彤", "天宇", "佳琪", "铭轩", "思彤", "宇轩", "雨桐", "嘉怡",
  "子涵", "若曦", "明轩", "语汐", "泽楷", "亦然", "心悦", "睿哲",
  "佳宁", "昱辰", "承泽", "书瑶", "沐辰", "婉清", "晨曦", "皓宇",
  "芷若", "楚涵", "星然", "佩瑶", "静姝", "逸凡", "可欣", "泓宇",
  "灵萱", "修远", "宛宁", "依然", "皓轩", "芸熙", "博文", "语彤",
  "靖雯", "冠霖", "沐言", "予安", "昭阳", "若初", "亦安", "慕青",
  "清和", "知微", "砚书", "望舒", "长风", "明月", "星野", "松月",
  "竹青", "简言", "白露", "南乔", "初见", "相宜", "洛熙", "念安",
  "泽宇", "雨萱", "锦程", "书言", "婉柔", "亦朗", "晴川", "允诺",
]

function buildRoster(classId: string, count: number): Student[] {
  const rand = createRandom(`roster:${classId}`)
  const used = new Set<string>()
  const names: string[] = []
  let guard = 0
  while (names.length < count && guard < count * 40) {
    guard += 1
    const surname = SURNAMES[randomInt(rand, 0, SURNAMES.length - 1)]
    const given = GIVEN_NAMES[randomInt(rand, 0, GIVEN_NAMES.length - 1)]
    const full = `${surname}${given}`
    if (used.has(full)) continue
    used.add(full)
    names.push(full)
  }
  // 学号按姓名排序后编号，接近真实花名册
  return names
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
    .map((name, idx) => ({
      id: `${classId}-stu-${idx + 1}`,
      name,
      studentNo: String(idx + 1).padStart(2, "0"),
      classId,
      // 学号奇偶确定性生成性别（奇=男，偶=女）
      gender: (idx + 1) % 2 === 1 ? "男" as const : "女" as const,
    }))
}

export const STUDENTS: Student[] = CLASSES.flatMap((c) => buildRoster(c.id, c.studentCount))

const STUDENTS_BY_CLASS = new Map<string, Student[]>()
for (const student of STUDENTS) {
  const list = STUDENTS_BY_CLASS.get(student.classId)
  if (list) list.push(student)
  else STUDENTS_BY_CLASS.set(student.classId, [student])
}

export function getStudentsOfClass(classId: string): Student[] {
  return STUDENTS_BY_CLASS.get(classId) ?? []
}

/** 随机抽 n 名该班学生姓名（确定性，用于生成演示记录） */
export function pickStudentNames(classId: string, seed: string, count: number): string[] {
  if (count <= 0) return []
  const roster = getStudentsOfClass(classId)
  const rand = createRandom(`names:${classId}:${seed}`)
  return pickMany(rand, roster, count).map((s) => s.name)
}

/* ------------------------------------------------------------------ *
 * 教师与权限
 * ------------------------------------------------------------------ */

const GRADE_6_CLASSES = CLASSES.filter((c) => c.gradeId === "grade-6").map((c) => c.id)
const GRADE_7_CLASSES = CLASSES.filter((c) => c.gradeId === "grade-7").map((c) => c.id)
const ALL_CLASS_IDS = CLASSES.map((c) => c.id)
const ALL_GRADE_IDS = GRADES.map((g) => g.id)

/**
 * 权限模型：
 * - 班主任（homeroom）：本班发卡 + 本班班级评价
 * - 任课教师（subject）：仅对任教班级发放奖卡，无班级评价权限；
 *   若兼任体育（配置了 peTeacherClassIds），额外获得体质健康成绩导入权限
 * - 体育老师（pe_teacher）：负责 1-5 年级体质健康成绩导入，无班级评价/发卡权限（当前演示账号已下线）
 * - 年级组长（grade_leader）：本年级发卡 + 班级评价 + 流动红旗发放
 * - 管理员（director）：全部权限
 */
export const TEACHERS: Teacher[] = [
  /* ---------------------------------- 班主任 ---------------------------------- */
  {
    id: "teacher-zhao",
    name: "赵得鑫",
    avatar: "",
    role: "homeroom",
    title: "六年级01班 班主任",
    scoringClassIds: ["class-6-1"],
    awardClassIds: ["class-6-1"],
    viewGradeIds: ["grade-6"],
  },
  {
    id: "teacher-wang",
    name: "王芳",
    avatar: "",
    role: "homeroom",
    title: "六年级02班 班主任",
    scoringClassIds: ["class-6-2"],
    awardClassIds: ["class-6-2"],
    viewGradeIds: ["grade-6"],
  },
  /* ---------------------------------- 任课教师 ---------------------------------- */
  {
    id: "teacher-liu",
    name: "刘敏",
    avatar: "",
    role: "subject",
    title: "六年级 数学任课教师",
    scoringClassIds: [],
    awardClassIds: ["class-6-1"],
    viewGradeIds: ["grade-6"],
  },
  {
    id: "teacher-qian",
    name: "钱进",
    avatar: "",
    role: "subject",
    title: "六年级 语文、体育任课教师",
    scoringClassIds: [],
    awardClassIds: ["class-6-2", "class-6-3"],
    viewGradeIds: ["grade-6"],
    // 兼任体育：负责 1-5 年级体质健康成绩导入
    peTeacherClassIds: PE_CLASS_IDS,
  },
  /* ---------------------------------- 年级组长 ---------------------------------- */
  {
    id: "teacher-chen",
    name: "陈明",
    avatar: "",
    role: "grade_leader",
    title: "六年级 年级组长",
    scoringClassIds: GRADE_6_CLASSES,
    awardClassIds: GRADE_6_CLASSES,
    viewGradeIds: ["grade-6"],
  },
  {
    id: "teacher-xu",
    name: "徐蓉",
    avatar: "",
    role: "grade_leader",
    title: "七年级 年级组长",
    scoringClassIds: GRADE_7_CLASSES,
    awardClassIds: GRADE_7_CLASSES,
    viewGradeIds: ["grade-7", "grade-8"],
  },
  /* ---------------------------------- 管理员 ---------------------------------- */
  {
    id: "teacher-li",
    name: "李静",
    avatar: "",
    role: "director",
    title: "管理员",
    scoringClassIds: ALL_CLASS_IDS,
    awardClassIds: ALL_CLASS_IDS,
    viewGradeIds: ALL_GRADE_IDS,
  },
]

/** 首屏默认身份：年级组长，可评分班级多、榜单也有内容，演示效果最好 */
export const DEFAULT_TEACHER_ID = "teacher-chen"

/* ------------------------------------------------------------------ *
 * 查询辅助
 * ------------------------------------------------------------------ */

const CLASS_BY_ID = new Map(CLASSES.map((c) => [c.id, c]))
const GRADE_BY_ID = new Map(GRADES.map((g) => [g.id, g]))

export function getClassById(classId: string) {
  return CLASS_BY_ID.get(classId)
}

export function getGradeById(gradeId: string) {
  return GRADE_BY_ID.get(gradeId)
}

export function getGradeOfClass(classId: string) {
  const cls = CLASS_BY_ID.get(classId)
  return cls ? GRADE_BY_ID.get(cls.gradeId) : undefined
}

/* ------------------------------------------------------------------ *
 * 家长身份（绑定一个或多个孩子，页内可切换）
 * ------------------------------------------------------------------ */

const STUDENT_BY_ID = new Map(STUDENTS.map((s) => [s.id, s]))
const GRADE_ID_OF_CLASS = new Map(CLASSES.map((c) => [c.id, c.gradeId]))

function buildParentChild(studentId: string): ParentChild {
  const s = STUDENT_BY_ID.get(studentId)!
  const cls = CLASS_BY_ID.get(s.classId)!
  return {
    studentId: s.id,
    name: s.name,
    classId: s.classId,
    className: cls.name,
    gradeId: GRADE_ID_OF_CLASS.get(s.classId)!,
  }
}

function buildParentUser(
  id: string,
  name: string,
  studentIds: string[],
): ParentUser {
  return {
    id,
    kind: "parent",
    name,
    children: studentIds.map(buildParentChild),
  }
}

export const PARENT_USERS: ParentUser[] = [
  // 单孩家长
  buildParentUser("parent-u-1", "陈妈妈", ["class-6-1-stu-1"]),
  // 双孩家长：孩子分别在 六年级01班 与 六年级02班
  buildParentUser("parent-u-2", "林爸爸", ["class-6-1-stu-2", "class-6-2-stu-1"]),
]
