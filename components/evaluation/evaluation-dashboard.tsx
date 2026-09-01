"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Award,
  CalendarRange,
  ChevronDown,
  Flag,
  House,
  LayoutGrid,
  Medal,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePermission } from "@/lib/use-permission"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TeacherSwitcher } from "./teacher-switcher"
import { ClassEvaluationTab } from "./class-evaluation-tab"
import { WeeklyFlagTab } from "./weekly-flag-tab"
import { AwardCardTab } from "./award-card-tab"
import { HonorUploadTab } from "./honor-upload-tab"
import { HomeroomDashboard } from "../homeroom/homeroom-dashboard"
import { SubjectDashboard } from "../subject/subject-dashboard"
import { AdminDashboard } from "../admin/admin-dashboard"
import { ParentDashboard } from "../parent/parent-dashboard"
import { ActivityManageTab } from "../activity/activity-manage-tab"

export type MainTab =
  | "home"
  | "subject_home"
  | "admin_home"
  | "parent_home"
  | "score"
  | "award"
  | "honor"
  | "activity"

type ScoreSubTab = "evaluation" | "flag"

interface NavItem {
  key: MainTab
  label: string
  icon: typeof LayoutGrid
}

export function EvaluationDashboard() {
  const {
    canEvaluate,
    canManageFlags,
    canManageActivities,
    isParent,
    role,
  } = usePermission()
  const canUploadHonor = role === "homeroom"
  const isHomeroom = role === "homeroom"
  const isSubject = role === "subject"
  const isDirector = role === "director"
  const isGradeLeader = role === "grade_leader"

  const [mainTab, setMainTab] = useState<MainTab>(
    isParent
      ? "parent_home"
      : isHomeroom
        ? "home"
        : isSubject
          ? "subject_home"
          : isDirector || isGradeLeader
            ? "admin_home"
            : canEvaluate
              ? "score"
              : "award",
  )
  const [scoreSubTab, setScoreSubTab] = useState<ScoreSubTab>("evaluation")

  // 一级 nav：只放当前身份的"首页"
  const primaryNavItems = useMemo<NavItem[]>(() => {
    if (isParent) {
      return [{ key: "parent_home", label: "家长首页", icon: House }]
    }
    if (isHomeroom) {
      return [{ key: "home", label: "班主任首页", icon: House }]
    }
    if (isSubject) {
      return [{ key: "subject_home", label: "任课教师首页", icon: House }]
    }
    if (isDirector || isGradeLeader) {
      return [{ key: "admin_home", label: "管理员首页", icon: House }]
    }
    return []
  }, [isParent, isHomeroom, isSubject, isDirector, isGradeLeader])

  // 二级页面分组：当前角色可用的功能页
  const secondaryItems = useMemo<NavItem[]>(() => {
    if (isParent) return []
    const items: NavItem[] = []
    if (canEvaluate || canManageFlags) {
      items.push({ key: "score", label: "班级评价", icon: LayoutGrid })
    }
    items.push({ key: "award", label: "奖卡发放", icon: Award })
    if (canUploadHonor) {
      items.push({ key: "honor", label: "荣誉上传", icon: Medal })
    }
    if (canManageActivities) {
      items.push({ key: "activity", label: "活动管理", icon: CalendarRange })
    }
    return items
  }, [isParent, canEvaluate, canManageFlags, canUploadHonor, canManageActivities])

  // 二级页面当前激活项（用于在 trigger 上显示"当前选中"状态）
  const activeSecondary = useMemo(
    () => secondaryItems.find((n) => n.key === mainTab),
    [secondaryItems, mainTab],
  )

  // 身份切换后，若当前 tab 不可用，回落到首页
  useEffect(() => {
    if (isParent) {
      if (mainTab !== "parent_home") setMainTab("parent_home")
      return
    }
    const allAvailable = [...primaryNavItems, ...secondaryItems]
    if (allAvailable.length > 0 && !allAvailable.some((n) => n.key === mainTab)) {
      setMainTab(primaryNavItems[0]?.key ?? allAvailable[0].key)
    }
  }, [isParent, mainTab, primaryNavItems, secondaryItems])

  const isTeacher = !isParent
  const showSecondaryGroup = secondaryItems.length > 0

  return (
    <div className="flex min-h-screen flex-col px-4 pb-4 pt-16 sm:px-6">
      {/* 固定顶栏：logo + 导航 + 用户信息 */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center justify-between gap-4 px-4">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg ring-1 ring-border/40">
              <Image src="/images/logo.png" alt="明珠临港" width={30} height={30} />
            </span>
            <div className="hidden flex-col leading-tight md:flex">
              <span className="text-sm font-bold text-foreground">明珠临港</span>
              <span className="text-[11px] text-muted-foreground">
                {isParent ? "家长成长看板" : "学生综合评价"}
              </span>
            </div>
          </div>

          <nav className="flex min-w-0 items-center gap-1">
            {/* 一级 nav：身份首页 */}
            {primaryNavItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMainTab(key)}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-4 text-sm font-medium transition",
                  mainTab === key
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
                {mainTab === key && (
                  <span className="absolute inset-x-4 bottom-1.5 h-0.5 rounded-full bg-gradient-to-r from-primary to-primary-2 shadow-[0_0_10px_-1px] shadow-primary/50" />
                )}
              </button>
            ))}

            {/* 二级页面分组（仅教师可见） */}
            {/* 二级页面分组（仅教师可见） */}
            {isTeacher && showSecondaryGroup && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        "relative flex items-center gap-1.5 px-4 py-4 text-sm font-medium transition",
                        activeSecondary
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    />
                  }
                >
                  <MoreHorizontal className="size-4" />
                  二级页面
                  <ChevronDown className="size-3.5" />
                  {activeSecondary && (
                    <span className="absolute inset-x-4 bottom-1.5 h-0.5 rounded-full bg-gradient-to-r from-primary to-primary-2 shadow-[0_0_10px_-1px] shadow-primary/50" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="glass-surface w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      功能页面
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {secondaryItems.map(({ key, label, icon: Icon }) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => setMainTab(key)}
                        className={cn(
                          "flex items-center gap-2 py-2",
                          mainTab === key && "bg-accent/70 font-medium",
                        )}
                      >
                        <Icon className="size-4" />
                        <span className="text-sm">{label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          <div className="flex shrink-0 items-center">
            <TeacherSwitcher />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full flex-1 flex-col gap-4 max-w-[1240px]">
        <main className="glass-panel flex w-full min-w-0  flex-col gap-6 rounded-2xl p-4 sm:p-6">
          {isParent ? (
            <ParentDashboard />
          ) : mainTab === "home" && isHomeroom ? (
            <HomeroomDashboard onNavigate={setMainTab} />
          ) : mainTab === "subject_home" && isSubject ? (
            <SubjectDashboard onNavigate={setMainTab} />
          ) : mainTab === "admin_home" && (isDirector || isGradeLeader) ? (
            <AdminDashboard onNavigate={setMainTab} />
          ) : mainTab === "score" ? (
            <div className="flex flex-col gap-6">
              <div className="flex gap-2">
                {canEvaluate && (
                  <button
                    type="button"
                    onClick={() => setScoreSubTab("evaluation")}
                    className={cn(
                      "rounded-xl px-5 py-2.5 text-sm font-semibold transition",
                      scoreSubTab === "evaluation"
                        ? "bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-md shadow-primary/30"
                        : "glass-panel text-muted-foreground hover:text-foreground",
                    )}
                  >
                    班级评价
                  </button>
                )}
                {canManageFlags && (
                  <button
                    type="button"
                    onClick={() => setScoreSubTab("flag")}
                    className={cn(
                      "rounded-xl px-5 py-2.5 text-sm font-semibold transition",
                      scoreSubTab === "flag"
                        ? "bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-md shadow-primary/30"
                        : "glass-panel text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Flag className="mr-1.5 inline size-4 align-[-2px]" />
                    优雅班集体颁发
                  </button>
                )}
              </div>

              {scoreSubTab === "evaluation" && canEvaluate ? (
                <ClassEvaluationTab />
              ) : scoreSubTab === "flag" && canManageFlags ? (
                <WeeklyFlagTab />
              ) : canEvaluate ? (
                <ClassEvaluationTab />
              ) : canManageFlags ? (
                <WeeklyFlagTab />
              ) : null}
            </div>
          ) : mainTab === "honor" && canUploadHonor ? (
            <HonorUploadTab />
          ) : mainTab === "activity" && canManageActivities ? (
            <ActivityManageTab />
          ) : (
            <AwardCardTab />
          )}
        </main>
      </div>
    </div>
  )
}
