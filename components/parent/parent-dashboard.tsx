"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Coins,
  GraduationCap,
  Medal,
  Megaphone,
  Radar as RadarIcon,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useLoadMore, useScrollLoadMore } from "@/lib/use-load-more"
import { LoadMoreFooter } from "@/components/ui/load-more"
import { useEvaluation } from "@/lib/evaluation-context"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"
import { formatDate } from "@/lib/scoring-utils"
import {
  buildPointEntries,
  getSemesterRange,
  inRange,
} from "@/lib/points-utils"
import { getSemesterLabel } from "@/lib/pe-scores"
import { ACTIVITY_STATUS_META, isEnrolling } from "@/lib/activity-utils"
import { PointsRadarChart, type RadarSeries } from "./points-radar-chart"
import { ScanFab } from "./scan-fab"

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

  // 家长身份才进入此组件（由外层 nav 控制）
  const parentUser = currentUser.kind === "parent" ? currentUser : null
  const children = parentUser?.children ?? []
  const [selectedChildId, setSelectedChildId] = useState<string>("")

  // 默认选中第一个孩子；身份切换时重置
  useEffect(() => {
    if (children.length === 0) {
      if (selectedChildId !== "") setSelectedChildId("")
      return
    }
    if (!children.some((c) => c.studentId === selectedChildId)) {
      setSelectedChildId(children[0].studentId)
    }
  }, [children, selectedChildId])

  const currentChild = useMemo(
    () => children.find((c) => c.studentId === selectedChildId) ?? children[0] ?? null,
    [children, selectedChildId],
  )
  const studentId = currentChild?.studentId ?? ""

  // 学期范围（今日 2026-08-31：归入新学年第一学期 8/1 ~ 次年 6/30）
  const semester = useMemo(() => getSemesterRange(new Date()), [])
  const semesterLabel = getSemesterLabel(new Date())
  const today = formatDate(new Date())

  // 全部积分流水（奖卡 + 荣誉）
  const allPointEntries = useMemo(() => buildPointEntries(awardCards, honors), [awardCards, honors])

  // 本学期全校积分流水
  const semesterEntries = useMemo(
    () => allPointEntries.filter((e) => inRange(e.date, semester.start, semester.end)),
    [allPointEntries, semester],
  )

  // 孩子本学期积分（按一级指标）
  const childSemByLevel1 = useMemo(() => {
    const map = new Map<string, number>()
    for (const name of AWARD_LEVEL1_LIST) map.set(name, 0)
    for (const e of semesterEntries) {
      if (e.studentId !== studentId) continue
      map.set(e.level1, (map.get(e.level1) ?? 0) + e.points)
    }
    return AWARD_LEVEL1_LIST.map((level1) => map.get(level1) ?? 0)
  }, [semesterEntries, studentId])

  // 班级均分 / 年级均分（本学期，按一级指标）
  const { classAvgByLevel1, gradeAvgByLevel1 } = useMemo(() => {
    const classId = currentChild?.classId ?? ""
    const gradeId = currentChild?.gradeId ?? ""
    const classRoster = students.filter((s) => s.classId === classId).length || 1
    const gradeClassIds = classes.filter((c) => c.gradeId === gradeId).map((c) => c.id)
    const gradeRoster = students.filter((s) => gradeClassIds.includes(s.classId)).length || 1

    const classSum = new Map<string, number>()
    const gradeSum = new Map<string, number>()
    for (const e of semesterEntries) {
      if (e.classId === classId) {
        classSum.set(e.level1, (classSum.get(e.level1) ?? 0) + e.points)
      }
      if (gradeClassIds.includes(e.classId)) {
        gradeSum.set(e.level1, (gradeSum.get(e.level1) ?? 0) + e.points)
      }
    }
    const round2 = (n: number) => Math.round(n * 100) / 100
    return {
      classAvgByLevel1: AWARD_LEVEL1_LIST.map((l) => round2((classSum.get(l) ?? 0) / classRoster)),
      gradeAvgByLevel1: AWARD_LEVEL1_LIST.map((l) => round2((gradeSum.get(l) ?? 0) / gradeRoster)),
    }
  }, [semesterEntries, students, classes, currentChild])

  const radarSeries: RadarSeries[] = useMemo(() => {
    if (!currentChild) return []
    return [
      {
        key: "student",
        label: currentChild.name,
        values: childSemByLevel1,
        color: "var(--color-brand-blue)",
        fillOpacity: 0.22,
      },
      {
        key: "class",
        label: "班级均分",
        values: classAvgByLevel1,
        color: "var(--color-chart-2)",
        fillOpacity: 0.08,
      },
      {
        key: "grade",
        label: "年级均分",
        values: gradeAvgByLevel1,
        color: "var(--color-chart-3)",
        fillOpacity: 0.06,
        dashed: true,
      },
    ]
  }, [currentChild, childSemByLevel1, classAvgByLevel1, gradeAvgByLevel1])

  // 四项积分指标
  const totalEarned = getStudentEarned(studentId)
  const balance = getStudentBalance(studentId)
  const spent = totalEarned - balance
  const semesterEarned = useMemo(
    () => childSemByLevel1.reduce((s, v) => s + v, 0),
    [childSemByLevel1],
  )

  // 学生基本信息
  const student = useMemo(
    () => students.find((s) => s.id === studentId) ?? null,
    [students, studentId],
  )
  const clazz = useMemo(
    () => classes.find((c) => c.id === currentChild?.classId) ?? null,
    [classes, currentChild],
  )

  // 孩子可见的活动（面向所在班级）
  const visibleActivities = useMemo(() => {
    const classId = currentChild?.classId ?? ""
    if (!classId) return []
    return activities.filter(
      (a) => a.status !== "draft" && a.classIds.includes(classId),
    )
  }, [activities, currentChild])

  // 最新发布的可报名活动（页面顶部横幅）
  const latestRecruiting = useMemo(() => {
    const list = visibleActivities
      .filter((a) => isEnrolling(a, today))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return list[0] ?? null
  }, [visibleActivities, today])

  // 本学期参加的活动（活动开始日期落在本学期）
  const semesterActivities = useMemo(
    () =>
      visibleActivities
        .filter((a) => inRange(a.startDate, semester.start, semester.end))
        .slice()
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [visibleActivities, semester],
  )

  // 孩子本学期荣誉
  const semesterHonors = useMemo(
    () =>
      honors
        .filter((h) => h.studentId === studentId && inRange(h.awardDate, semester.start, semester.end))
        .slice()
        .sort((a, b) => b.awardDate.localeCompare(a.awardDate)),
    [honors, studentId, semester],
  )

  const semesterHonorsLoadMore = useLoadMore(semesterHonors, 10)
  const semesterHonorsScroll = useScrollLoadMore(
    semesterHonorsLoadMore.hasMore,
    semesterHonorsLoadMore.loadMore,
  )

  const semesterActivitiesLoadMore = useLoadMore(semesterActivities, 8)
  const semesterActivitiesScroll = useScrollLoadMore(
    semesterActivitiesLoadMore.hasMore,
    semesterActivitiesLoadMore.loadMore,
  )

  const enrollmentOf = (activityId: string) =>
    enrollments.find(
      (e) => e.activityId === activityId && e.studentId === studentId && e.status !== "cancelled",
    )

  if (!parentUser || !currentChild) return null

  const gradeNameLabel = grades.find((g) => g.id === currentChild.gradeId)?.name ?? ""

  return (
    <div className="flex flex-col gap-5">
      {/* 顶部：最新发布活动消息横幅 */}
      {latestRecruiting && (
        <Link
          href={`/activities/enroll?student=${encodeURIComponent(studentId)}&id=${encodeURIComponent(latestRecruiting.id)}`}
          className="group flex items-center gap-3 rounded-2xl border border-brand-blue/25 bg-brand-blue/10 px-4 py-3 transition hover:bg-brand-blue/15"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-brand-blue">
            <Megaphone className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              最新发布活动：{latestRecruiting.title}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {latestRecruiting.level1} · 报名截止 {latestRecruiting.enrollEnd} ·{" "}
              {latestRecruiting.publisherName} 发布，点击前往报名
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white">
            前往报名
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {/* 家长身份 + 孩子切换 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="glass-panel flex items-center gap-3 rounded-xl px-4 py-2.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-yellow/25 to-brand-orange/20 text-sm font-bold text-brand-yellow shadow-sm">
              {currentChild.name.slice(0, 1)}
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-foreground">{currentChild.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {currentChild.className} · 家长：{parentUser.name}
              </span>
            </div>
          </div>

          {/* 多孩家庭：孩子切换器 */}
          {children.length > 1 && (
            <div className="glass-panel flex items-center gap-1 rounded-xl px-1.5 py-1.5">
              <Users className="ml-1.5 size-3.5 text-muted-foreground" />
              {children.map((c) => {
                const active = c.studentId === currentChild.studentId
                return (
                  <button
                    key={c.studentId}
                    type="button"
                    onClick={() => setSelectedChildId(c.studentId)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c.name}
                    <span className="ml-1 text-[10px] opacity-70">{c.className}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-gradient-to-r from-primary/10 to-brand-blue/10 px-3 py-1.5 text-xs font-medium text-foreground">
          <CalendarDays className="size-3.5 text-brand-blue" />
          {semesterLabel}
        </div>
      </div>

      {/* 学生基本信息 + 点击用户 ID 跳活动报名 */}
      <section className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue/20 to-primary/20 text-brand-blue">
              <GraduationCap className="size-6" />
            </span>
            <div>
              <p className="text-base font-bold text-foreground">
                {currentChild.name}
                <span className="ml-2 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {student?.gender ?? ""}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {gradeNameLabel}
                {clazz ? ` · ${clazz.name}` : ` · ${currentChild.className}`}
                {clazz ? ` · 班主任 ${clazz.homeroomTeacher}` : ""}
              </p>
            </div>
          </div>
          <Link
            href={`/activities/enroll?student=${encodeURIComponent(studentId)}`}
            className="group flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-primary/10"
            title="点击用户 ID 前往活动报名"
          >
            <span className="text-[11px] text-muted-foreground">用户 ID</span>
            <span className="font-mono text-xs font-semibold">{studentId}</span>
            <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* 四项积分指标 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel flex items-center gap-3 rounded-2xl p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue">
            <Sparkles className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] text-muted-foreground">累计获得积分</span>
            <span className="text-lg font-bold text-foreground">
              {totalEarned}
              <span className="ml-1 text-xs font-normal text-muted-foreground">分</span>
            </span>
          </div>
        </div>
        <div className="glass-panel flex items-center gap-3 rounded-2xl p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/15 text-brand-yellow">
            <TrendingUp className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] text-muted-foreground">当前学期累计获得</span>
            <span className="text-lg font-bold text-foreground">
              {semesterEarned}
              <span className="ml-1 text-xs font-normal text-muted-foreground">分</span>
            </span>
          </div>
        </div>
        <div className="glass-panel flex items-center gap-3 rounded-2xl p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/15 text-brand-orange">
            <Coins className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] text-muted-foreground">已使用积分</span>
            <span className="text-lg font-bold text-foreground">
              {spent}
              <span className="ml-1 text-xs font-normal text-muted-foreground">分</span>
            </span>
          </div>
        </div>
        <div className="glass-panel flex items-center gap-3 rounded-2xl p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green">
            <Wallet className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] text-muted-foreground">剩余积分</span>
            <span className="text-lg font-bold text-foreground">
              {balance}
              <span className="ml-1 text-xs font-normal text-muted-foreground">分</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* 雷达图：本学期一级指标积分对比 */}
        <section className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <RadarIcon className="size-4 text-brand-blue" />
              五育积分雷达
              <span className="text-xs font-normal text-muted-foreground">本学期 · 对比班级/年级均分</span>
            </h3>
          </div>
          <PointsRadarChart series={radarSeries} />
        </section>

        {/* 本学期荣誉记录 */}
        <section className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Medal className="size-4 text-brand-orange" />
              本学期荣誉记录
            </h3>
            <span className="text-xs text-muted-foreground">共 {semesterHonors.length} 条</span>
          </div>
          {semesterHonors.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              本学期暂无荣誉记录
            </p>
          ) : (
            <ul
              className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1"
              onScroll={semesterHonorsScroll.onScroll}
            >
              {semesterHonorsLoadMore.visible.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{h.honorName}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {h.level1} · {h.issuer} · {h.awardDate}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold",
                      HONOR_LEVEL_STYLE[h.honorLevel],
                    )}
                  >
                    {HONOR_LEVEL_LABEL[h.honorLevel]} +{h.points}
                  </span>
                </li>
              ))}
              <li>
                <LoadMoreFooter
                  hasMore={semesterHonorsLoadMore.hasMore}
                  loaded={semesterHonorsLoadMore.visible.length}
                  total={semesterHonorsLoadMore.total}
                  onLoadMore={semesterHonorsLoadMore.loadMore}
                />
              </li>
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground">由班主任录入上传</p>
        </section>
      </div>

      {/* 本学期参加的活动 */}
      <section className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CalendarRange className="size-4 text-brand-blue" />
            本学期参加的活动
            <span className="text-xs font-normal text-muted-foreground">
              点击活动名称查看详情
            </span>
          </h3>
          <Link
            href={`/activities/enroll?student=${encodeURIComponent(studentId)}`}
            className="flex items-center gap-1 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-primary/10"
          >
            查看全部活动
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
        {semesterActivities.length === 0 ? (
          <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
            本学期暂无活动安排
          </p>
        ) : (
          <ul
            className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1"
            onScroll={semesterActivitiesScroll.onScroll}
          >
            {semesterActivitiesLoadMore.visible.map((act) => {
              const meta = ACTIVITY_STATUS_META[act.status]
              const my = enrollmentOf(act.id)
              return (
                <li
                  key={act.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-muted/30 px-3 py-2.5 transition hover:bg-muted/50"
                >
                  <Link
                    href={`/activities/detail?student=${encodeURIComponent(studentId)}&id=${encodeURIComponent(act.id)}`}
                    className="min-w-0 flex-1 text-sm font-medium text-foreground underline-offset-4 transition hover:text-brand-blue hover:underline"
                  >
                    {act.title}
                  </Link>
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">
                    {act.startDate} ~ {act.endDate} · {act.location}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      meta.className,
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </span>
                  {my ? (
                    <EnrollmentStatusBadge status={my.status} />
                  ) : isEnrolling(act, today) ? (
                    <Link
                      href={`/activities/enroll?student=${encodeURIComponent(studentId)}&id=${encodeURIComponent(act.id)}`}
                      className="rounded-lg bg-brand-green/15 px-2 py-0.5 text-[11px] font-semibold text-brand-green transition hover:bg-brand-green/25"
                    >
                      去报名
                    </Link>
                  ) : null}
                </li>
              )
            })}
            <li>
              <LoadMoreFooter
                hasMore={semesterActivitiesLoadMore.hasMore}
                loaded={semesterActivitiesLoadMore.visible.length}
                total={semesterActivitiesLoadMore.total}
                onLoadMore={semesterActivitiesLoadMore.loadMore}
              />
            </li>
          </ul>
        )}
      </section>

      {/* 右下角可拖动扫描按钮 */}
      <ScanFab />
    </div>
  )
}

function EnrollmentStatusBadge({ status }: { status: "pending" | "approved" | "rejected" | "cancelled" }) {
  const map = {
    pending: { label: "待审核", cls: "bg-brand-yellow/20 text-brand-yellow" },
    approved: { label: "已通过", cls: "bg-brand-green/15 text-brand-green" },
    rejected: { label: "未通过", cls: "bg-destructive/15 text-destructive" },
    cancelled: { label: "已取消", cls: "bg-muted/40 text-muted-foreground" },
  } as const
  const s = map[status]
  return (
    <span className={cn("shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold", s.cls)}>
      {s.label}
    </span>
  )
}
