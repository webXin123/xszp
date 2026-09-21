"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Award,
  BookOpenText,
  CalendarCheck2,
  CalendarRange,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileDown,
  FileSpreadsheet,
  HeartPulse,
  House,
  LayoutGrid,
  Menu,
  Medal,
  PanelLeftOpen,
  Settings2,
  ShoppingBag,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePermission } from "@/lib/use-permission"
import { TeacherSwitcher } from "./teacher-switcher"
import { ClassEvaluationTab } from "./class-evaluation-tab"
import { ClassRankingTab } from "./class-ranking-tab"
import { AwardCardTab } from "./award-card-tab"
import { HonorUploadTab } from "./honor-upload-tab"
import { HomeroomDashboard } from "../homeroom/homeroom-dashboard"
import { SubjectDashboard } from "../subject/subject-dashboard"
import { AdminDashboard } from "../admin/admin-dashboard"
import { AdminDataDashboard } from "../admin/admin-data-dashboard"
import { ParentDashboard, type ParentMobileTab } from "../parent/parent-dashboard"
import { ActivityManageTab } from "../activity/activity-manage-tab"
import { TeacherScoreEntry } from "../teacher/score-entry"
import { TeacherCommentEntry } from "../teacher/comment-entry"
import { SemesterEvaluationEntry } from "../teacher/semester-evaluation-entry"
import { ScoreEntryManagement } from "../admin/score-entry-management"
import { SemesterEvaluationManagement } from "../admin/semester-evaluation-management"
import { ClassConfigTab } from "./class-config-tab"
import { MallManagement } from "../mall/mall-management"
import { PeScoreImportPage } from "@/app/pe-score-import/page"
import { useEvaluation } from "@/lib/evaluation-context"
import { StandalonePageShell } from "./standalone-page-shell"
import { OfflineAwardCardsPage } from "@/app/offline-award-cards/page"

export type MainTab =
  | "home"
  | "subject_home"
  | "admin_home"
  | "parent_home"
  | "class_rating"
  | "score"
  | "ranking"
  | "award"
  | "award_hub"
  | "honor"
  | "activity"
  | "dashboard"
  | "score_entry"
  | "comment_entry"
  | "semester_evaluation"
  | "score_management"
  | "semester_management"
  | "teaching"
  | "academic_management"
  | "operations_management"
  | "class_config"
  | "mall_management"
  | "pe_import"
  | "offline_award_export"
  | "parent_mall"
  | "parent_dashboard"

type StandaloneView = "evaluation" | "ranking" | "config"

interface EvaluationDashboardProps {
  standaloneView?: StandaloneView
  initialMainTab?: MainTab
  embedded?: boolean
}

interface SidebarItem {
  label: string
  icon: typeof LayoutGrid
  key?: MainTab
}

const WORKBENCH_NAVIGATION_MESSAGE = "xszp:workbench-navigation"

const STANDALONE_LABELS: Partial<Record<MainTab, string>> = {
  score: "班级评价",
  class_rating: "班级评价",
  ranking: "班级排行",
  award: "奖卡发放",
  award_hub: "奖卡发放",
  honor: "荣誉录入",
  activity: "活动管理",
  dashboard: "五育积分数据看板",
  score_entry: "成绩上传",
  pe_import: "体测成绩导入",
  comment_entry: "评语录入",
  semester_evaluation: "学期评价",
  teaching: "教学工作",
  academic_management: "教务管理",
  operations_management: "运营管理",
  score_management: "成绩管理",
  semester_management: "学期评价管理",
  class_config: "评价配置",
  mall_management: "商城管理",
  offline_award_export: "线下奖卡导出",
}

type UnifiedPageTab = {
  id: string
  label: string
  content: React.ReactNode
}

function UnifiedPageTabs({ title, description, tabs, initialTab }: { title: string; description: string; tabs: UnifiedPageTab[]; initialTab?: string }) {
  const defaultTab = tabs.some((tab) => tab.id === initialTab) ? initialTab : tabs[0]?.id ?? ""
  const [activeTab, setActiveTab] = useState(defaultTab)

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) setActiveTab(defaultTab)
  }, [activeTab, defaultTab, tabs])

  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]
  const tabGridClass = tabs.length === 1 ? "grid-cols-1" : tabs.length === 2 ? "grid-cols-2" : "grid-cols-3"

  return <div className="flex min-w-0 flex-col gap-5">
    <section className="rounded-2xl border border-[#d6e1f3] bg-white/84 p-3 shadow-[0_14px_30px_-26px_rgba(38,67,118,0.46)] backdrop-blur-sm sm:p-4" aria-labelledby={`${title}-title`}>
      <div className="mb-3 flex flex-col gap-1 px-1 sm:mb-4"><h1 id={`${title}-title`} className="text-lg font-bold tracking-tight text-foreground">{title}</h1><p className="text-sm text-muted-foreground">{description}</p></div>
      <div className={cn("grid gap-1 rounded-xl bg-primary/5 p-1", tabGridClass)} role="tablist" aria-label={`${title}功能切换`}>
        {tabs.map((tab) => {
          const isActive = tab.id === currentTab?.id
          return <button key={tab.id} id={`${title}-${tab.id}-tab`} type="button" role="tab" aria-selected={isActive} aria-controls={`${title}-${tab.id}-panel`} onClick={() => setActiveTab(tab.id)} className={cn("min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", isActive ? "bg-white text-primary shadow-[0_5px_14px_-10px_rgba(53,101,212,0.8)]" : "text-muted-foreground hover:bg-white/75 hover:text-foreground")}>{tab.label}</button>
        })}
      </div>
    </section>
    {currentTab && <section id={`${title}-${currentTab.id}-panel`} role="tabpanel" aria-labelledby={`${title}-${currentTab.id}-tab`} className="min-w-0">{currentTab.content}</section>}
  </div>
}

export function TeachingWorkPage() {
  const { role } = usePermission()
  const isPe = role === "pe_teacher"
  return <UnifiedPageTabs title="教学工作" description="按工作类型完成成绩、评语与学期评价" tabs={[
    { id: "score", label: isPe ? "体测成绩" : "成绩录入", content: isPe ? <PeScoreImportPage embedded /> : <TeacherScoreEntry /> },
    { id: "comment", label: "评语录入", content: <TeacherCommentEntry /> },
    { id: "semester", label: "学期评价", content: <SemesterEvaluationEntry /> },
  ]} />
}

export function AcademicManagementPage() {
  const { grades } = useEvaluation()
  return <ScoreEntryManagement grades={grades} />
}

export function OperationsManagementPage() {
  return <ActivityManageTab />
}

export function EvaluationDashboard({ standaloneView, initialMainTab, embedded = false }: EvaluationDashboardProps) {
  const router = useRouter()
  const { grades, classes, currentUser } = useEvaluation()
  const { canEvaluate, canManageActivities, canManageFlags, isParent, role } = usePermission()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [embedOptions, setEmbedOptions] = useState({ embedded: false, hub: false })
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setEmbedOptions({ embedded: params.get("embedded") === "1", hub: params.get("hub") === "1" })
  }, [])
  const isEmbedded = embedded || embedOptions.embedded
  const isHomeroom = role === "homeroom"
  const isSubject = role === "subject" || role === "pe_teacher"
  const isDirector = role === "director"
  const isMoralDirector = role === "moral_director"
  const canUploadHonor = isHomeroom
  const canOpenEvaluation = canEvaluate || canManageFlags

  const [mainTab, setMainTab] = useState<MainTab>(() => initialMainTab ?? (
    standaloneView === "ranking" ? "ranking" : standaloneView === "config" ? "class_config" : standaloneView === "evaluation" ? "score" : isParent ? "parent_home" : isHomeroom ? "home" : isSubject ? "subject_home" : isDirector || isMoralDirector ? "admin_home" : "award"
  ))
  const [parentMobileTab, setParentMobileTab] = useState<ParentMobileTab>("home")

  const homeKey: MainTab = isParent ? "parent_home" : isHomeroom ? "home" : isSubject ? "subject_home" : "admin_home"
  const roleLabel = isParent ? "学生成长中心" : isHomeroom ? "班主任工作台" : isSubject ? role === "pe_teacher" ? "体育教师工作台" : "任课教师工作台" : isMoralDirector ? "德育主任工作台" : "学校管理工作台"

  const navigate = (tab: MainTab) => {
    if (isEmbedded && typeof window !== "undefined" && window.parent !== window) {
      window.parent.postMessage({ type: WORKBENCH_NAVIGATION_MESSAGE, tab }, window.location.origin)
      return
    }
    if (tab === "dashboard") {
      router.push("/school-command-center")
      return
    }
    setMainTab(tab)
  }

  const renderEmbeddedStandaloneContent = () => {
    if (standaloneView === "evaluation" && !embedOptions.hub) return <ClassEvaluationTab />
    if (standaloneView === "ranking" && !embedOptions.hub) return <ClassRankingTab />
    if (standaloneView === "config" && !embedOptions.hub) return <ClassConfigTab />
    return renderMainContent()
  }

  const renderMainContent = () => mainTab === "home" && isHomeroom ? <HomeroomDashboard onNavigate={navigate} />
    : mainTab === "subject_home" && isSubject ? <SubjectDashboard onNavigate={navigate} />
      : mainTab === "admin_home" && (isDirector || isMoralDirector) ? <AdminDashboard onNavigate={navigate} />
        : mainTab === "dashboard" && (isDirector || isMoralDirector) ? <AdminDataDashboard onBack={() => router.push("/")} />
          : (mainTab === "class_rating" || mainTab === "score") && canOpenEvaluation ? <ClassEvaluationTab />
            : mainTab === "ranking" && canOpenEvaluation ? <ClassRankingTab />
              : mainTab === "class_config" && (isDirector || isMoralDirector) ? <ClassConfigTab />
            : mainTab === "score_entry" ? <TeacherScoreEntry />
              : mainTab === "pe_import" ? <PeScoreImportPage embedded />
                : mainTab === "comment_entry" ? <TeacherCommentEntry />
                          : mainTab === "semester_evaluation" ? <SemesterEvaluationEntry />
                            : mainTab === "teaching" ? <TeachingWorkPage />
                              : mainTab === "academic_management" && isDirector ? <AcademicManagementPage />
                                : mainTab === "operations_management" && (isDirector || isMoralDirector) ? <OperationsManagementPage />
                          : mainTab === "score_management" && isDirector ? <ScoreEntryManagement grades={grades} />
                      : mainTab === "semester_management" && isDirector ? <SemesterEvaluationManagement grades={grades} classes={classes} />
                          : mainTab === "mall_management" && isDirector ? <MallManagement embedded />
                            : mainTab === "offline_award_export" && isDirector ? <OfflineAwardCardsPage embedded />
                            : mainTab === "honor" && canUploadHonor ? <HonorUploadTab />
                                : mainTab === "activity" && canManageActivities ? <ActivityManageTab />
                                  : <AwardCardTab />

  const iframeSources: Partial<Record<MainTab, string>> = {
    parent_home: "/xszp/?embedded=1",
    parent_mall: "/xszp/points-mall/?embedded=1",
    parent_dashboard: "/xszp/student-command-center/?embedded=1",
    home: "/xszp/workbench/?embedded=1",
    subject_home: "/xszp/workbench/?embedded=1",
    admin_home: "/xszp/workbench/?embedded=1",
    class_rating: "/xszp/class-evaluation/?embedded=1",
    score: "/xszp/class-evaluation/?embedded=1",
    ranking: "/xszp/class-ranking/?embedded=1",
    class_config: "/xszp/class-evaluation-config/?embedded=1",
    award: "/xszp/award-cards/?embedded=1&nav=online",
    award_hub: "/xszp/award-cards/?embedded=1&nav=online",
    offline_award_export: "/xszp/offline-award-cards/?embedded=1",
    honor: "/xszp/honor-upload/?embedded=1",
    teaching: "/xszp/teaching-work/?embedded=1",
    operations_management: "/xszp/operations-management/?embedded=1",
    score_management: "/xszp/score-entry-management/?embedded=1",
    semester_management: "/xszp/comment-entry-management/?embedded=1",
    activity: "/xszp/activities/?embedded=1",
    mall_management: "/xszp/mall-management/?embedded=1",
    dashboard: "/xszp/school-command-center/",
  }

  const renderHostContent = () => {
    if (isEmbedded || standaloneView || initialMainTab) return standaloneView ? renderEmbeddedStandaloneContent() : renderMainContent()
    const src = iframeSources[mainTab]
    if (!src) return renderMainContent()
    const label = sidebarItems.find((item) => item.key === mainTab)?.label ?? mobileSidebarItems.find((item) => item.key === mainTab)?.label ?? "主体页面"
    const userAwareSrc = `${src}${src.includes("?") ? "&" : "?"}user=${encodeURIComponent(currentUser.id)}`
    return <iframe ref={iframeRef} id="workbench-content-frame" title={label} src={userAwareSrc} loading="eager" scrolling="auto" className="block h-full min-h-0 w-full flex-1 border-0" />
  }

  const sidebarItems = useMemo<SidebarItem[]>(() => {
    if (isParent) return [
      { key: "parent_home", label: "首页", icon: House },
      { key: "parent_mall", label: "积分商城", icon: ShoppingBag },
      { key: "parent_dashboard", label: "成长大屏", icon: ChartNoAxesCombined },
    ]
    const items: SidebarItem[] = [{ key: homeKey, label: "工作台", icon: House }]
    if (canOpenEvaluation) {
      items.push({ key: "score", label: "班级评价", icon: ClipboardCheck })
      items.push({ key: "ranking", label: "班级排行", icon: Trophy })
      if (isDirector || isMoralDirector) items.push({ key: "class_config", label: "评价配置", icon: Settings2 })
    }
    items.push({ key: "award", label: "奖卡发放", icon: Award })
    if (isDirector) items.push({ key: "offline_award_export", label: "线下奖卡导出", icon: FileDown })
    if (canUploadHonor) items.push({ key: "honor", label: "荣誉录入", icon: Medal })

    if (isSubject) {
      items.push({ key: "teaching", label: "教学工作", icon: role === "pe_teacher" ? HeartPulse : BookOpenText })
    }
    if (isDirector) {
      items.push({ key: "score_management", label: "成绩管理", icon: FileSpreadsheet })
      items.push({ key: "semester_management", label: "学期评价管理", icon: CalendarCheck2 })
      items.push({ key: "activity", label: "活动管理", icon: CalendarRange })
      items.push({ key: "mall_management", label: "商城管理", icon: ShoppingBag })
    } else if (isMoralDirector) {
      items.push({ key: "activity", label: "活动管理", icon: CalendarRange })
    }
    if (isDirector || isMoralDirector) {
      items.push({ key: "dashboard", label: "学校数据大屏", icon: ChartNoAxesCombined })
    }
    return items
  }, [canManageActivities, canOpenEvaluation, canUploadHonor, homeKey, isDirector, isHomeroom, isMoralDirector, isParent, isSubject, role])

  const mobileSidebarItems = useMemo<SidebarItem[]>(() => {
    if (isParent) return [
      { key: "parent_home", label: "首页", icon: House },
      { key: "parent_mall", label: "积分商城", icon: ShoppingBag },
      { key: "parent_dashboard", label: "成长大屏", icon: ChartNoAxesCombined },
    ]
    const items: SidebarItem[] = [{ key: homeKey, label: "工作台", icon: House }]
    if (isDirector || isMoralDirector) {
      if (canOpenEvaluation) items.push({ key: "score", label: "班级评价", icon: ClipboardCheck })
      items.push({ key: "award", label: "奖卡发放", icon: Award })
      if (isDirector) items.push({ key: "mall_management", label: "商城管理", icon: ShoppingBag })
    } else if (isHomeroom) {
      items.push({ key: "ranking", label: "班级排名", icon: Trophy })
      items.push({ key: "award", label: "奖卡发放", icon: Award })
    } else if (isSubject) {
      items.push({ key: "award", label: "奖卡发放", icon: Award })
    }
    return items
  }, [canOpenEvaluation, homeKey, isDirector, isHomeroom, isMoralDirector, isParent, isSubject])

  useEffect(() => {
    if (isEmbedded) return
    const handleWorkbenchNavigation = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return
      const data = event.data as { type?: unknown; tab?: unknown } | null
      if (data?.type !== WORKBENCH_NAVIGATION_MESSAGE || typeof data.tab !== "string") return
      const tab = data.tab as MainTab
      const availableTabs = [...sidebarItems, ...mobileSidebarItems]
        .map((item) => item.key)
        .filter((key): key is MainTab => Boolean(key))
      if (tab === "dashboard" || availableTabs.includes(tab)) navigate(tab)
    }
    window.addEventListener("message", handleWorkbenchNavigation)
    return () => window.removeEventListener("message", handleWorkbenchNavigation)
  }, [isEmbedded, isParent, mobileSidebarItems, navigate, sidebarItems])

  useEffect(() => {
    if (standaloneView || initialMainTab) return
    const available = [...sidebarItems, ...mobileSidebarItems].map((item) => item.key).filter((key): key is MainTab => Boolean(key))
    if (available.length > 0 && !available.includes(mainTab)) setMainTab(homeKey)
  }, [homeKey, initialMainTab, isParent, mainTab, mobileSidebarItems, sidebarItems, standaloneView])

  if (isEmbedded && standaloneView) {
    return <main id="main-content" tabIndex={-1} className="app-content app-workspace flex min-h-screen w-full min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-7">{renderEmbeddedStandaloneContent()}</main>
  }

  if (standaloneView || initialMainTab) {
    const label = STANDALONE_LABELS[mainTab] ?? "业务页面"
    return <StandalonePageShell mainId={`${mainTab}-main`} activeLabel={label} activeIcon="file">{renderMainContent()}</StandalonePageShell>
  }

  const sidebar = () => (
    <aside aria-label="工作台侧边导航" className="flex h-full w-[240px] flex-col border-r border-[#d9e3f2] bg-white/95 shadow-[8px_0_24px_-24px_rgba(43,72,130,0.42)] backdrop-blur-xl">
      <div className="flex h-[60px] items-center gap-2.5 border-b border-[#eaf0f8] px-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-white shadow-[0_7px_14px_-9px_rgba(53,101,212,0.8)]">综</span>
        <div className="min-w-0 leading-tight"><p className="truncate text-sm font-extrabold tracking-tight text-[#20324f]">屹力小学</p><p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground">综合素质评价</p></div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-5" aria-label="角色功能导航">
        <div className="space-y-1.5">
          {sidebarItems.map(({ key, label, icon: Icon }) => {
            const active = key === mainTab
            const itemClass = cn("group flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", active ? "bg-primary text-primary-foreground shadow-[0_7px_14px_-10px_rgba(53,101,212,0.9)]" : "text-muted-foreground hover:bg-primary/10 hover:text-primary")
            const itemContent = <><Icon className="size-[18px] shrink-0" aria-hidden="true" /><span className="min-w-0 truncate">{label}</span></>
            return <button key={label} type="button" onClick={(event) => { event.preventDefault(); if (key) navigate(key) }} aria-controls="workbench-content-frame" aria-current={active ? "page" : undefined} className={itemClass}>{itemContent}</button>
          })}
        </div>
      </nav>
      <div className="border-t border-[#eaf0f8] px-5 py-4 text-xs leading-5 text-muted-foreground">当前角色的可用功能</div>
    </aside>
  )

  if (isEmbedded) {
    if (isParent) return <main id="main-content" tabIndex={-1} className="app-content app-workspace flex min-h-screen w-full min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-7"><ParentDashboard mobileTab={parentMobileTab} /></main>
    return <main id="main-content" tabIndex={-1} className="app-content app-workspace flex min-h-screen w-full min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-7">{renderMainContent()}</main>
  }

  return <div className="app-page-shell flex h-dvh min-h-0 flex-col overflow-hidden lg:pl-[240px]">
    <a href="#main-content" className="sr-only z-[80] rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#1f3845] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:ring-2 focus-visible:ring-[#28bd73]/50">跳转到主要内容</a>
    <div className="fixed inset-y-0 left-0 z-50 hidden lg:block">{sidebar()}</div>
    <header className="app-header sticky top-0 z-40 h-[60px] border-b border-border bg-background/90 backdrop-blur-xl"><div className="flex h-full w-full items-center justify-between gap-4 px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><Menu className="size-5 shrink-0 text-primary lg:hidden" aria-hidden="true" /><PanelLeftOpen className="hidden size-5 shrink-0 text-primary lg:block" aria-hidden="true" /><div className="min-w-0"><h1 className="truncate text-base font-extrabold tracking-tight text-foreground">{roleLabel}</h1><p className="hidden text-xs font-medium text-muted-foreground sm:block">综合素质评价 · 工作台</p></div></div><div className="flex shrink-0 items-center gap-2"><span className="hidden rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground xl:inline-flex">2025-2026学年 第二学期</span><TeacherSwitcher /></div></div></header>
    <main id="main-content" tabIndex={-1} className="app-content flex h-[calc(100dvh-124px-env(safe-area-inset-bottom))] min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden p-0 lg:h-[calc(100dvh-60px)]">
      {renderHostContent()}
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-50 flex min-h-16 items-stretch gap-1 border-t border-[#d9e3f2] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_28px_-24px_rgba(43,72,130,.65)] backdrop-blur-xl lg:hidden" aria-label="移动端功能导航">
      {mobileSidebarItems.map(({ key, label, icon: Icon }) => { const active = key === mainTab; const itemClass = cn("flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45", active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"); const content = <><Icon className="size-4" aria-hidden="true" /><span className="max-w-full truncate">{label}</span></>; return <button key={label} type="button" onClick={(event) => { event.preventDefault(); if (key) navigate(key) }} aria-controls="workbench-content-frame" aria-current={active ? "page" : undefined} className={itemClass}>{content}</button> })}
    </nav>
  </div>
}
