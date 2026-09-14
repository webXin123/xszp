"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  FileText,
  Gift,
  GraduationCap,
  HeartPulse,
  Medal,
  Megaphone,
  Radar as RadarIcon,
  ShoppingBag,
  TrendingUp,
  Trophy,
  Upload,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { useEvaluation } from "@/lib/evaluation-context"
import { AWARD_LEVEL1_LIST, getAwardIndicator } from "@/lib/award-utils"
import { getAcademicScores, ACADEMIC_SUBJECTS } from "@/lib/academic-scores"
import { getSemesterLabel } from "@/lib/pe-scores"
import { buildPointEntries, getSemesterRange, inRange } from "@/lib/points-utils"
import { ACTIVITY_STATUS_META, canSubmit, isEnrolling, requiresActivityEnrollment } from "@/lib/activity-utils"
import styles from "../role-home.module.css"
import type { Activity } from "@/lib/types"
import { PointsRadarChart, type RadarSeries } from "./points-radar-chart"
import { SemesterGrowthChart } from "./semester-growth-chart"
import { ParentActivityDetailDialog } from "./parent-activity-detail-dialog"
import { ScanFab } from "./scan-fab"
import { StudentSemesterReportDrawer } from "./student-semester-report-drawer"
import { ParentHonorUploadDrawer } from "./parent-honor-upload-drawer"

const HONOR_LEVEL_LABEL: Record<string, string> = {
  school: "校级",
  district: "区级",
  city: "市级",
  national: "国家级及以上",
}

const HONOR_LEVEL_STYLE: Record<string, string> = {
  school: "bg-brand-blue/15 text-brand-blue",
  district: "bg-brand-green/15 text-brand-green",
  city: "bg-brand-orange/15 text-brand-orange",
  national: "bg-brand-yellow/20 text-brand-yellow",
}

const AWARD_SOURCE_LABEL = {
  online: "线上发放",
  offline_scan: "线下兑换",
  flag_reward: "班级奖励",
} as const

const GROWTH_STAGES = [
  { min: 0, max: 39, title: "萌芽起步", mascot: "小芽精灵", tone: "blue" },
  { min: 40, max: 99, title: "向阳成长", mascot: "小熊学徒", tone: "green" },
  { min: 100, max: 199, title: "活力进阶", mascot: "小鹿探索家", tone: "yellow" },
  { min: 200, max: 349, title: "闪耀之星", mascot: "小狮队长", tone: "orange" },
  { min: 350, max: Number.POSITIVE_INFINITY, title: "卓越领航", mascot: "小龙领航员", tone: "purple" },
] as const

type QuickPanel = "academic" | "fitness" | null
type RecordTab = "awards" | "honors" | "activities"

function formatPublishedDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "发布时间待定"
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

function GrowthMascot({ name }: { name: string }) {
  return (
    <img
      src="/xszp/images/student-pet-mascot.png"
      alt={`${name}成长萌宠`}
      width={112}
      height={112}
      className="size-20 rounded-full object-cover drop-shadow-[0_10px_16px_rgba(70,88,160,0.18)] motion-safe:animate-[pet-bob_3s_ease-in-out_infinite] sm:size-[5.25rem]"
    />
  )
}

function QuickEntry({ icon: Icon, label, color, onClick, href }: {
  icon: typeof HeartPulse
  label: string
  color: string
  onClick?: () => void
  href?: string
}) {
  const content = <><span className={cn("flex size-10 items-center justify-center rounded-xl transition group-hover:scale-105", color)}><Icon className="size-5" aria-hidden="true" /></span><span className="text-xs font-semibold text-foreground">{label}</span></>
  const className = "group flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-[#dce3f8] bg-white px-2 py-2 text-center transition hover:-translate-y-0.5 hover:border-primary/45 hover:bg-[#fafbff] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
  return href ? <Link href={href} className={className}>{content}</Link> : <button type="button" onClick={onClick} className={className}>{content}</button>
}

export function ParentDashboard() {
  const {
    currentUser,
    students,
    classes,
    grades,
    awardCards,
    honors,
    activities,
    enrollments,
    getStudentEarned,
    getStudentBalance,
  } = useEvaluation()
  const parentUser = currentUser.kind === "parent" ? currentUser : null
  const children = parentUser?.children ?? []
  const [selectedChildId, setSelectedChildId] = useState("")
  const [quickPanel, setQuickPanel] = useState<QuickPanel>(null)
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false)
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)
  const [recordTab, setRecordTab] = useState<RecordTab>("awards")
  const [activityDialogTarget, setActivityDialogTarget] = useState<Activity | null>(null)

  useEffect(() => {
    if (children.length === 0) {
      setSelectedChildId("")
      return
    }
    if (!children.some((child) => child.studentId === selectedChildId)) setSelectedChildId(children[0].studentId)
  }, [children, selectedChildId])

  const currentChild = useMemo(() => children.find((child) => child.studentId === selectedChildId) ?? children[0] ?? null, [children, selectedChildId])
  const studentId = currentChild?.studentId ?? ""
  const student = useMemo(() => students.find((item) => item.id === studentId) ?? null, [students, studentId])
  const clazz = useMemo(() => classes.find((item) => item.id === currentChild?.classId) ?? null, [classes, currentChild])
  const gradeName = grades.find((item) => item.id === currentChild?.gradeId)?.name ?? ""
  const semester = useMemo(() => getSemesterRange(new Date()), [])
  const semesterLabel = getSemesterLabel(new Date())

  const allPointEntries = useMemo(() => buildPointEntries(awardCards, honors), [awardCards, honors])
  const semesterEntries = useMemo(() => allPointEntries.filter((item) => inRange(item.date, semester.start, semester.end)), [allPointEntries, semester])
  const childSemByLevel1 = useMemo(() => {
    const points = new Map<string, number>(AWARD_LEVEL1_LIST.map((level) => [level, 0]))
    semesterEntries.filter((entry) => entry.studentId === studentId).forEach((entry) => points.set(entry.level1, (points.get(entry.level1) ?? 0) + entry.points))
    return AWARD_LEVEL1_LIST.map((level) => points.get(level) ?? 0)
  }, [semesterEntries, studentId])

  const { classAvgByLevel1, gradeAvgByLevel1 } = useMemo(() => {
    const classId = currentChild?.classId ?? ""
    const gradeId = currentChild?.gradeId ?? ""
    const classSize = students.filter((item) => item.classId === classId).length || 1
    const gradeClassIds = classes.filter((item) => item.gradeId === gradeId).map((item) => item.id)
    const gradeSize = students.filter((item) => gradeClassIds.includes(item.classId)).length || 1
    const classTotal = new Map<string, number>()
    const gradeTotal = new Map<string, number>()
    semesterEntries.forEach((entry) => {
      if (entry.classId === classId) classTotal.set(entry.level1, (classTotal.get(entry.level1) ?? 0) + entry.points)
      if (gradeClassIds.includes(entry.classId)) gradeTotal.set(entry.level1, (gradeTotal.get(entry.level1) ?? 0) + entry.points)
    })
    return {
      classAvgByLevel1: AWARD_LEVEL1_LIST.map((level) => Math.round(((classTotal.get(level) ?? 0) / classSize) * 100) / 100),
      gradeAvgByLevel1: AWARD_LEVEL1_LIST.map((level) => Math.round(((gradeTotal.get(level) ?? 0) / gradeSize) * 100) / 100),
    }
  }, [classes, currentChild, semesterEntries, students])

  const radarSeries: RadarSeries[] = useMemo(() => currentChild ? [
    { key: "student", label: "个人", values: childSemByLevel1, color: "var(--color-brand-green)", fillOpacity: 0.22 },
    { key: "class", label: "班级均分", values: classAvgByLevel1, color: "var(--color-brand-blue)", fillOpacity: 0.08 },
    { key: "grade", label: "年级均分", values: gradeAvgByLevel1, color: "var(--color-chart-3)", fillOpacity: 0.05, dashed: true },
  ] : [], [childSemByLevel1, classAvgByLevel1, currentChild, gradeAvgByLevel1])

  const totalEarned = getStudentEarned(studentId)
  const balance = getStudentBalance(studentId)
  const spent = Math.max(0, totalEarned - balance)
  const semesterEarned = childSemByLevel1.reduce((total, value) => total + value, 0)
  const stage = GROWTH_STAGES.find((item) => totalEarned >= item.min && totalEarned <= item.max) ?? GROWTH_STAGES[0]
  const nextStage = GROWTH_STAGES[GROWTH_STAGES.indexOf(stage) + 1] ?? null
  const stageFloor = stage.min
  const stageCeiling = nextStage?.min ?? Math.max(totalEarned, stageFloor + 1)
  const stageProgress = nextStage ? Math.min(100, Math.max(0, ((totalEarned - stageFloor) / Math.max(1, stageCeiling - stageFloor)) * 100)) : 100
  const pointsToNextStage = nextStage ? Math.max(0, nextStage.min - totalEarned) : 0

  const visibleActivities = useMemo(() => {
    const classId = currentChild?.classId ?? ""
    const gradeId = currentChild?.gradeId ?? ""
    return classId
      ? activities
        .filter((item) => item.classIds.length > 0 ? item.classIds.includes(classId) : item.gradeIds.length === 0 || item.gradeIds.includes(gradeId))
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : []
  }, [activities, currentChild])
  const semesterActivities = useMemo(() => visibleActivities.filter((item) => inRange(item.startDate, semester.start, semester.end)).sort((a, b) => b.startDate.localeCompare(a.startDate)), [semester, visibleActivities])
  const latestRecruiting = useMemo(() => visibleActivities.filter((item) => isEnrolling(item)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null, [visibleActivities])
  const ongoingActivity = useMemo(() => visibleActivities.find((item) => item.status === "ongoing") ?? null, [visibleActivities])
  const myLatestEnrollment = useMemo(() => enrollments.filter((item) => item.studentId === studentId && item.status !== "cancelled").sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))[0] ?? null, [enrollments, studentId])
  const enrolledActivity = useMemo(() => visibleActivities.find((item) => item.id === myLatestEnrollment?.activityId) ?? null, [myLatestEnrollment, visibleActivities])

  const notifications = useMemo(() => {
    const items: { id: string; icon: typeof Megaphone; title: string; detail: string; href?: string; action?: () => void; color: string }[] = []
    if (latestRecruiting) items.push({ id: "publish", icon: Megaphone, title: `新活动发布：${latestRecruiting.title}`, detail: `报名截止 ${latestRecruiting.enrollEnd}，点击查看报名要求`, href: `/activities/enroll?student=${encodeURIComponent(studentId)}&id=${encodeURIComponent(latestRecruiting.id)}`, color: "text-brand-blue bg-brand-blue/12" })
    if (enrolledActivity && myLatestEnrollment) items.push({ id: "enrollment", icon: CalendarDays, title: `活动报名${myLatestEnrollment.status === "approved" ? "已通过" : "已提交"}`, detail: `${enrolledActivity.title} · ${myLatestEnrollment.enrolledAt.slice(0, 10)}`, action: () => setActivityDialogTarget(enrolledActivity), color: "text-brand-green bg-brand-green/12" })
    if (ongoingActivity) items.push({ id: "participate", icon: Upload, title: `活动进行中：${ongoingActivity.title}`, detail: "活动开始后可上传成果、填写活动收获", action: () => setActivityDialogTarget(ongoingActivity), color: "text-brand-orange bg-brand-orange/12" })
    return items.slice(0, 3)
  }, [enrolledActivity, latestRecruiting, myLatestEnrollment, ongoingActivity, studentId])

  const semesterHonors = useMemo(() => honors.filter((item) => item.studentId === studentId && inRange(item.awardDate, semester.start, semester.end)).sort((a, b) => b.awardDate.localeCompare(a.awardDate)), [honors, semester, studentId])
  const semesterAwardCards = useMemo(() => awardCards.filter((item) => item.studentId === studentId && inRange(item.date, semester.start, semester.end)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [awardCards, semester, studentId])
  const awardCardsLoadMore = useLoadMore(semesterAwardCards, 6)
  const awardCardsScroll = useScrollLoadMore(awardCardsLoadMore.hasMore, awardCardsLoadMore.loadMore)
  const honorsLoadMore = useLoadMore(semesterHonors, 6)
  const honorsScroll = useScrollLoadMore(honorsLoadMore.hasMore, honorsLoadMore.loadMore)
  const activitiesLoadMore = useLoadMore(visibleActivities, 6)
  const activitiesScroll = useScrollLoadMore(activitiesLoadMore.hasMore, activitiesLoadMore.loadMore)

  const historyTrend = useMemo(() => {
    const current = Math.max(semesterEarned, 8)
    return [
      { label: "24秋", value: Math.max(6, Math.round(current * 0.58 + 5)) },
      { label: "25春", value: Math.max(7, Math.round(current * 0.72 + 3)) },
      { label: "25秋", value: Math.max(8, Math.round(current * 0.65 + 7)) },
      { label: "26春", value: Math.max(9, Math.round(current * 0.82 + 4)) },
      { label: "本学期", value: current },
    ]
  }, [semesterEarned])
  const academicScores = useMemo(() => student ? getAcademicScores(student, ACADEMIC_SUBJECTS) : [], [student])
  const fitnessMetrics = useMemo(() => {
    const code = studentId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return { height: 128 + (code % 25), weight: 28 + (code % 16), run: (8.8 + (code % 12) / 10).toFixed(1), rope: 112 + (code % 36), level: code % 4 === 0 ? "优秀" : "良好" }
  }, [studentId])

  if (!parentUser || !currentChild || !student) return null

  const circumference = 2 * Math.PI * 44
  const progressOffset = circumference * (1 - stageProgress / 100)

  return (
    <div className={cn("relative flex flex-col gap-3 pb-6 lg:gap-3", styles.parentHome)}>
      <div aria-label="最新动态" className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#dde3f8] bg-white px-3 py-2.5 shadow-[0_12px_26px_-26px_rgba(64,80,166,0.75)]">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Megaphone className="size-4" aria-hidden="true" /></span>
        {notifications[0] ? (() => {
          const notice = notifications[0]
          const content = <span className="block truncate text-sm font-semibold text-foreground">{notice.title}</span>
          return <div className="min-w-0 flex-1">{notice.href ? <Link href={notice.href} className="block min-w-0 rounded-lg px-1 py-1 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{content}</Link> : <button type="button" onClick={notice.action} className="block w-full min-w-0 rounded-lg px-1 py-1 text-left transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{content}</button>}</div>
        })() : <p className="text-sm text-muted-foreground">暂无最新动态</p>}
        {notifications.length > 1 && <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">+{notifications.length - 1}</span>}
      </div>

      <section className="rounded-[18px] border border-[#d7def8] bg-white p-2 shadow-[0_18px_38px_-34px_rgba(64,80,166,0.68)] sm:p-2.5">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.08fr)_minmax(250px,.72fr)_minmax(250px,.72fr)]">
          <div className="grid gap-2">
            <div className="flex min-w-0 items-center justify-between gap-4 rounded-2xl bg-[#fbfcff] p-3 sm:p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#9b8cf0] text-white shadow-lg shadow-primary/20"><GraduationCap className="size-7" aria-hidden="true" /></span>
                <div className="min-w-0"><h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-foreground">{currentChild.name}<span className="rounded-full bg-primary/8 px-2 py-0.5 text-xs font-medium text-primary">{student.gender}</span></h1><p className="mt-1 truncate text-xs text-muted-foreground">{gradeName} · {clazz?.name ?? currentChild.className}</p></div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5"><span className="text-[11px] font-semibold text-primary">{semesterLabel}</span>{children.length > 1 && <button type="button" onClick={() => setStudentPickerOpen(true)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/20 bg-white px-2.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><Users className="size-3.5" aria-hidden="true" />切换</button>}</div>
            </div>

            <section aria-label="积分情况" className="rounded-2xl bg-[#fbfcff] p-2 sm:p-2.5"><div className="grid grid-cols-4 gap-1.5"><Metric label="学期累计积分" value={semesterEarned} tone="blue" /><Metric label="兑换消耗积分" value={spent} tone="orange" /><Metric label="可用积分" value={balance} tone="green" /><Metric label="累计积分" value={totalEarned} tone="purple" /></div></section>
          </div>

          <section aria-label={`成长阶段：${stage.title}`} className="flex min-h-[175px] flex-col items-center justify-center rounded-2xl bg-[#fbfcff] p-2 text-center sm:p-2.5"><div className="relative shrink-0"><svg viewBox="0 0 110 110" className="size-[6.5rem] -rotate-90 sm:size-28" aria-hidden="true"><circle cx="55" cy="55" r="44" fill="none" stroke="rgba(112,140,185,.15)" strokeWidth="10" /><circle cx="55" cy="55" r="44" fill="none" stroke="var(--color-primary)" strokeLinecap="round" strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={progressOffset} /></svg><span className="absolute inset-0 flex items-center justify-center"><GrowthMascot name={stage.mascot} /></span><span className="absolute inset-x-1 bottom-0 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-foreground shadow-sm">{stage.title}</span></div><p className="mt-1 text-[10px] text-muted-foreground">{nextStage ? <>距下一阶段 <span className="font-bold text-primary">{pointsToNextStage} 分</span></> : "已达最高阶段"}</p></section>

          <section aria-label="学生服务入口" className="flex min-h-[175px] items-center rounded-2xl bg-[#fbfcff] p-2 sm:p-2.5"><div className="grid w-full grid-cols-2 gap-1.5"><QuickEntry icon={BookOpenCheck} label="学科成绩" color="bg-primary/12 text-primary" onClick={() => setQuickPanel("academic")} /><QuickEntry icon={HeartPulse} label="体质健康" color="bg-[#8fa2ff]/14 text-[#6178e9]" onClick={() => setQuickPanel("fitness")} /><QuickEntry icon={FileText} label="学期报告" color="bg-[#ad9df5]/15 text-[#8571db]" onClick={() => setReportDrawerOpen(true)} /><QuickEntry icon={ShoppingBag} label="积分商城" color="bg-primary/12 text-primary" href={`/points-mall?student=${encodeURIComponent(studentId)}`} /></div></section>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[1.05fr_.95fr]">
        <section className="flex min-h-[360px] flex-col rounded-[18px] border border-[#dce3f8] bg-white p-3.5 shadow-[0_18px_40px_-32px_rgba(64,80,166,.65)] sm:p-4"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-1.5 text-base font-bold text-foreground"><RadarIcon className="size-4 text-primary" aria-hidden="true" />五育发展</h2><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{semesterLabel}</span></div><div className="mt-2 min-h-0 flex-1"><PointsRadarChart series={radarSeries} /></div></section>
        <section className="flex min-h-[360px] flex-col rounded-[18px] border border-[#dce3f8] bg-white p-3.5 shadow-[0_18px_40px_-32px_rgba(64,80,166,.65)] sm:p-4"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-1.5 text-base font-bold text-foreground"><TrendingUp className="size-4 text-primary" aria-hidden="true" />成长趋势</h2><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">积分</span></div><div className="mt-3 min-h-0 flex-1"><SemesterGrowthChart data={historyTrend} studentName={currentChild.name} /></div></section>
      </div>

      <section className="flex min-h-[340px] flex-col rounded-[18px] border border-[#dce3f8] bg-white p-3.5 shadow-[0_18px_40px_-32px_rgba(64,80,166,.65)] sm:p-4">
        <div role="tablist" aria-label="本学期成长记录分类" className="inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-[#d5ddf8] bg-white p-1 shadow-[0_8px_18px_-14px_rgba(64,80,166,.75)]">
          <button type="button" role="tab" aria-selected={recordTab === "awards"} onClick={() => setRecordTab("awards")} className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", recordTab === "awards" ? "bg-primary text-primary-foreground shadow-[0_5px_12px_rgba(113,140,255,.35)]" : "text-primary hover:bg-primary/8")}><Gift className="size-4" aria-hidden="true" />奖卡记录</button>
          <button type="button" role="tab" aria-selected={recordTab === "honors"} onClick={() => setRecordTab("honors")} className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", recordTab === "honors" ? "bg-primary text-primary-foreground shadow-[0_5px_12px_rgba(113,140,255,.35)]" : "text-primary hover:bg-primary/8")}><Medal className="size-4" aria-hidden="true" />荣誉记录</button>
          <button type="button" role="tab" aria-selected={recordTab === "activities"} onClick={() => setRecordTab("activities")} className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", recordTab === "activities" ? "bg-primary text-primary-foreground shadow-[0_5px_12px_rgba(113,140,255,.35)]" : "text-primary hover:bg-primary/8")}><CalendarRange className="size-4" aria-hidden="true" />活动列表</button>
        </div>
        <div className="contents">
          <section className={cn("flex min-h-[360px] flex-col pt-4", recordTab !== "awards" && "hidden")}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-foreground">最近获得的奖卡</p><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{semesterAwardCards.length} 张</span></div>{semesterAwardCards.length === 0 ? <EmptyState text="本学期暂无奖卡记录" /> : <ul className="mt-4 flex max-h-[430px] flex-col gap-2 overflow-y-auto pr-1" onScroll={awardCardsScroll.onScroll}>{awardCardsLoadMore.visible.map((award) => { const cover = getAwardIndicator(award.indicatorId)?.image; return <li key={award.id} className="flex min-h-[72px] items-center gap-3 rounded-xl border border-[#e0e5f8] bg-[#fbfcff] p-2.5 transition hover:border-primary/35 hover:bg-white"><span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/15 bg-primary/10">{cover ? <img src={cover} alt={`${award.level2}奖卡`} width={48} height={48} loading="lazy" className="size-full object-cover" /> : <Gift className="size-5 text-primary" aria-hidden="true" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{award.level2 || award.level1}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{award.date} · {AWARD_SOURCE_LABEL[award.source]} · {award.operatorName}</p></div><span className="shrink-0 text-sm font-bold text-primary">+{award.points} 分</span></li> })}<li><LoadMoreFooter hasMore={awardCardsLoadMore.hasMore} loaded={awardCardsLoadMore.visible.length} total={awardCardsLoadMore.total} onLoadMore={awardCardsLoadMore.loadMore} /></li></ul>}</section>

          <section className={cn("flex min-h-[360px] flex-col pt-4", recordTab !== "honors" && "hidden")}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-foreground">最近获得的荣誉</p><div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{semesterHonors.length} 项</span><ParentHonorUploadDrawer child={currentChild} /></div></div>{semesterHonors.length === 0 ? <EmptyState text="本学期暂无荣誉记录" /> : <ul className="mt-4 flex max-h-[430px] flex-col gap-2 overflow-y-auto pr-1" onScroll={honorsScroll.onScroll}>{honorsLoadMore.visible.map((honor) => <li key={honor.id} className="relative flex min-h-[70px] items-center gap-3 overflow-hidden rounded-xl border border-[#e0e5f8] bg-[#fbfcff] p-3"><span className={cn("absolute inset-y-2 left-0.5 w-1 rounded-full", honor.honorLevel === "school" && "bg-brand-blue", honor.honorLevel === "district" && "bg-brand-green", honor.honorLevel === "city" && "bg-brand-orange", honor.honorLevel === "national" && "bg-brand-yellow")} /><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Trophy className="size-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{honor.honorName}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{HONOR_LEVEL_LABEL[honor.honorLevel]} · {honor.awardDate}</p></div><span className={cn("shrink-0 rounded-full px-2 py-1 text-xs font-semibold", HONOR_LEVEL_STYLE[honor.honorLevel])}>+{honor.points}</span></li>)}<li><LoadMoreFooter hasMore={honorsLoadMore.hasMore} loaded={honorsLoadMore.visible.length} total={honorsLoadMore.total} onLoadMore={honorsLoadMore.loadMore} /></li></ul>}</section>
      </div>

        <section className={cn("flex min-h-[300px] flex-col pt-4", recordTab !== "activities" && "hidden")}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-foreground">活动列表</p><p className="mt-0.5 text-xs text-muted-foreground">{clazz?.name ?? currentChild.className}可参与活动，按发布时间排序</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{visibleActivities.length} 个活动</span></div>{visibleActivities.length === 0 ? <EmptyState text="当前班级暂无可参与活动" /> : <ul className="mt-4 flex max-h-[440px] flex-col gap-2 overflow-y-auto pr-1" onScroll={activitiesScroll.onScroll}>{activitiesLoadMore.visible.map((activity) => { const meta = ACTIVITY_STATUS_META[activity.status]; const enrollment = enrollments.find((item) => item.activityId === activity.id && item.studentId === studentId && item.status !== "cancelled"); const needsEnrollment = requiresActivityEnrollment(activity); const canEnroll = needsEnrollment && !enrollment && isEnrolling(activity); const detailHref = `/activities/detail?student=${encodeURIComponent(studentId)}&id=${encodeURIComponent(activity.id)}`; const enrollHref = `/activities/enroll?student=${encodeURIComponent(studentId)}&id=${encodeURIComponent(activity.id)}`; return <li key={activity.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#e0e5f8] bg-[#fbfcff] px-3 py-3 transition hover:border-primary/35 hover:bg-white"><div className="min-w-0 flex-1"><Link href={detailHref} className="block truncate text-sm font-semibold text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{activity.title}</Link><p className="mt-0.5 truncate text-xs text-muted-foreground">发布于 {formatPublishedDate(activity.createdAt)} · {activity.startDate} · {activity.location || "待通知地点"}</p></div><span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold", meta.className)}><span className={cn("size-1.5 rounded-full", meta.dot)} />{meta.label}</span>{!needsEnrollment && <span className="rounded-full bg-brand-green/15 px-2 py-1 text-xs font-semibold text-brand-green">无需报名</span>}{enrollment && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">已报名</span>}{canSubmit(activity) ? <button type="button" onClick={() => setActivityDialogTarget(activity)} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><Upload className="size-3.5" aria-hidden="true" />上传成果</button> : canEnroll ? <Link href={enrollHref} className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">立即报名</Link> : <Link href={detailHref} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-primary/20 bg-white px-3 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">查看详情<ChevronRight className="size-3.5" aria-hidden="true" /></Link>}</li> })}<li><LoadMoreFooter hasMore={activitiesLoadMore.hasMore} loaded={activitiesLoadMore.visible.length} total={activitiesLoadMore.total} onLoadMore={activitiesLoadMore.loadMore} /></li></ul>}</section>
      </section>

      <ScanFab />

      <ParentActivityDetailDialog activity={activityDialogTarget} open={!!activityDialogTarget} onOpenChange={(open) => !open && setActivityDialogTarget(null)} studentId={studentId} childName={currentChild.name} classId={currentChild.classId} />

      <StudentSemesterReportDrawer
        open={reportDrawerOpen}
        onOpenChange={setReportDrawerOpen}
        semesterLabel={semesterLabel}
        student={{ name: currentChild.name, gender: student.gender, studentNo: student.studentNo }}
        className={clazz?.name ?? currentChild.className}
        gradeName={gradeName}
        homeroomTeacher={clazz?.homeroomTeacher ?? "班主任老师"}
        semesterPoints={semesterEarned}
        totalPoints={totalEarned}
        fiveEducation={childSemByLevel1}
        academicScores={academicScores}
        fitnessMetrics={fitnessMetrics}
        honors={semesterHonors}
        activities={semesterActivities}
      />

      <Dialog open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
        <DialogContent className="glass-surface sm:max-w-md">
          <DialogHeader><DialogTitle>切换学生</DialogTitle><DialogDescription>选择要查看成长记录的学生</DialogDescription></DialogHeader>
          <div className="grid gap-2">
            {children.map((child) => <button key={child.studentId} type="button" aria-pressed={child.studentId === studentId} onClick={() => { setSelectedChildId(child.studentId); setStudentPickerOpen(false) }} className={cn("flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", child.studentId === studentId ? "border-primary/45 bg-primary/[0.07]" : "border-border/55 bg-white/75 hover:border-primary/30 hover:bg-white")}><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold", child.studentId === studentId ? "bg-primary text-primary-foreground" : "bg-brand-green/12 text-brand-green")}>{child.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{child.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{child.className}</span></span><span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", child.studentId === studentId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{child.studentId === studentId ? "当前查看" : "切换"}</span></button>)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!quickPanel} onOpenChange={(open) => !open && setQuickPanel(null)}>
        <DialogContent className="glass-surface sm:max-w-lg">
          <DialogHeader><DialogTitle>{quickPanel === "academic" ? "学科成绩" : "体质健康"}</DialogTitle><DialogDescription>{currentChild.name} · {semesterLabel}</DialogDescription></DialogHeader>
          {quickPanel === "academic" && <div className="overflow-hidden rounded-xl border border-[#dce3f8]"><table className="w-full text-sm"><caption className="sr-only">{currentChild.name}本学期各科成绩</caption><thead className="bg-primary/[0.06] text-xs text-muted-foreground"><tr><th className="px-3 py-2 text-left font-semibold">科目</th><th className="px-3 py-2 text-right font-semibold">成绩</th><th className="px-3 py-2 text-right font-semibold">等级</th></tr></thead><tbody>{academicScores.map((score) => <tr key={score.subject} className="border-t border-[#e5e9f9]"><th className="px-3 py-2.5 text-left font-medium text-foreground">{score.subject}</th><td className="px-3 py-2.5 text-right font-bold tabular-nums text-foreground">{score.score}</td><td className="px-3 py-2.5 text-right text-xs font-semibold text-primary">{score.level}</td></tr>)}</tbody></table></div>}
          {quickPanel === "fitness" && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><InfoTile label="身高" value={`${fitnessMetrics.height} cm`} /><InfoTile label="体重" value={`${fitnessMetrics.weight} kg`} /><InfoTile label="50米跑" value={`${fitnessMetrics.run} 秒`} /><InfoTile label="综合等级" value={fitnessMetrics.level} tone="green" /></div>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setQuickPanel(null)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "blue" | "orange" | "green" | "purple" }) {
  const classes = {
    blue: "text-primary",
    orange: "text-[#d97706]",
    green: "text-[#3c9a69]",
    purple: "text-[#8067dc]",
  }
  return <div className="min-w-0 rounded-xl border border-[#e4e8f7] bg-white px-2.5 py-1.5"><p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p><p className={cn("mt-0.5 text-lg font-bold tabular-nums", classes[tone])}>{value}<span className="ml-0.5 text-xs font-semibold">分</span></p></div>
}

function InfoTile({ label, value, tone = "blue" }: { label: string; value: string; tone?: "blue" | "green" }) {
  return <div className={cn("rounded-xl p-3", tone === "green" ? "bg-brand-green/10" : "bg-primary/[0.07]")}><p className="text-xs text-muted-foreground">{label}</p><p className={cn("mt-1 text-sm font-bold", tone === "green" ? "text-brand-green" : "text-foreground")}>{value}</p></div>
}

function EmptyState({ text }: { text: string }) {
  return <p className="my-auto rounded-xl border border-dashed border-border/65 bg-white/45 px-3 py-8 text-center text-sm text-muted-foreground">{text}</p>
}
