"use client"

import { useMemo } from "react"
import { useEvaluation } from "./evaluation-context"
import { PE_CLASS_IDS } from "./pe-scores"
import type { TeacherRole } from "./types"

export interface Permission {
  isParent: boolean
  role: TeacherRole | null
  scoringClasses: ReturnType<typeof useEvaluation>["classes"]
  visibleGrades: ReturnType<typeof useEvaluation>["grades"]
  awardClasses: ReturnType<typeof useEvaluation>["classes"]
  canManageFlags: boolean
  canPickHistoricalWeek: boolean
  canEvaluate: boolean
  canManageActivities: boolean
  /** 体质健康成绩导入：体育老师（含兼任体育的任课教师）+ 管理员 */
  canImportPeScores: boolean
  /** 可导入成绩范围的班级 id 列表 */
  peClassIds: string[]
  canScoreClass: (classId: string) => boolean
  canViewGrade: (gradeId: string) => boolean
}

const EMPTY_PERMISSION: Permission = {
  isParent: false,
  role: null,
  scoringClasses: [],
  visibleGrades: [],
  awardClasses: [],
  canManageFlags: false,
  canPickHistoricalWeek: true,
  canEvaluate: false,
  canManageActivities: false,
  canImportPeScores: false,
  peClassIds: [],
  canScoreClass: () => false,
  canViewGrade: () => false,
}

export function usePermission(): Permission {
  const { currentUser, currentTeacher, classes, grades } = useEvaluation()

  return useMemo(() => {
    // 家长身份：只读访问自己孩子的数据
    if (currentUser.kind === "parent") {
      return { ...EMPTY_PERMISSION, isParent: true }
    }

    // 学生身份（老数据可能残留）或非教师身份且 currentTeacher 尚未就绪时，回退到空权限
    if (!currentTeacher || currentUser.kind !== "teacher" && currentUser.kind !== undefined) {
      return EMPTY_PERMISSION
    }

    const teacher = currentTeacher
    const scoringClasses = classes.filter((c) => teacher.scoringClassIds.includes(c.id))
    const visibleGrades = grades.filter((g) => teacher.viewGradeIds.includes(g.id))

    // 奖卡发放范围：awardClassIds 为空数组表示不可发卡（如部分管理角色），undefined 表示全部
    const awardClasses = teacher.awardClassIds
      ? classes.filter((c) => teacher.awardClassIds!.includes(c.id))
      : classes

    // 流动红旗发放：年级组长 + 管理员
    const canManageFlags = teacher.role === "grade_leader" || teacher.role === "director"
    // 任意角色都可以查看历史周次
    const canPickHistoricalWeek = true
    // 班级评价：任课教师无权限
    const canEvaluate = scoringClasses.length > 0
    // 活动管理：年级组长 + 管理员
    const canManageActivities = teacher.role === "grade_leader" || teacher.role === "director"
    // 体质健康成绩导入：管理员全量；配置了 peTeacherClassIds 的教师（体育老师 / 兼任体育的任课教师）
    const peClassIds =
      teacher.role === "director"
        ? PE_CLASS_IDS
        : teacher.peTeacherClassIds && teacher.peTeacherClassIds.length > 0
          ? teacher.peTeacherClassIds
          : teacher.role === "pe_teacher"
            ? PE_CLASS_IDS
            : []
    const canImportPeScores = peClassIds.length > 0

    return {
      isParent: false,
      role: teacher.role,
      scoringClasses,
      visibleGrades,
      awardClasses,
      canManageFlags,
      canPickHistoricalWeek,
      canEvaluate,
      canManageActivities,
      canImportPeScores,
      peClassIds,
      canScoreClass: (classId: string) => teacher.scoringClassIds.includes(classId),
      canViewGrade: (gradeId: string) => teacher.viewGradeIds.includes(gradeId),
    }
  }, [currentUser, currentTeacher, classes, grades])
}
