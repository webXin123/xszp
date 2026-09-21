"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  BadgeCheck,
  ChevronsUpDown,
  Crown,
  FileText,
  Medal,
  TrendingUp,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pagination } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"
import { buildPointEntries, getSemesterRange, inRange, POINT_SOURCE_LABEL, type PointEntry } from "@/lib/points-utils"
import { formatDate } from "@/lib/scoring-utils"
import { getSemesterLabel } from "@/lib/pe-scores"
import type { Student } from "@/lib/types"
import { StudentSemesterReportDrawer } from "@/components/parent/student-semester-report-drawer"
import { getReportAcademicScores, getReportActivities, getReportFitnessMetrics, getReportHonors } from "@/components/report/student-report-data"

interface AdminDataDashboardProps {
  onBack: () => void
}

type SortKey = "semesterTotal" | "cumulativeTotal" | `level1:${string}`
type SortDir = "asc" | "desc"

interface DashboardRow extends Student {
  gradeName: string
  className: string
  byLevel1: Record<string, number>
  semesterTotal: number
  cumulativeTotal: number
}

interface RankedDashboardRow extends DashboardRow {
  rank: number
}

function RankMark({ rank }: { rank: number }) {
  const sharedClassName = "inline-flex size-7 items-center justify-center rounded-md"

  if (rank === 1) return <span role="img" aria-label="第 1 名" className={cn(sharedClassName, "bg-[#e9eeff] text-[#4058b5]")}><Crown className="size-4" aria-hidden="true" /></span>
  if (rank === 2) return <span role="img" aria-label="第 2 名" className={cn(sharedClassName, "bg-[#f0efff] text-[#6664b3]")}><Medal className="size-4" aria-hidden="true" /></span>
  if (rank === 3) return <span role="img" aria-label="第 3 名" className={cn(sharedClassName, "bg-[#ecf3ff] text-[#4f72b8]")}><BadgeCheck className="size-4" aria-hidden="true" /></span>
  return <span className={cn(sharedClassName, "bg-primary/10 text-xs font-bold tabular-nums text-primary")}>{rank}</span>
}

export function AdminDataDashboard({ onBack }: AdminDataDashboardProps) {
  const { awardCards, honors, students, classes, grades, activities } = useEvaluation()
  const { start, end } = useMemo(() => getSemesterRange(), [])
  const [sortKey, setSortKey] = useState<SortKey>("semesterTotal")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const PAGE_SIZE = 12

  const allEntries = useMemo(() => buildPointEntries(awardCards, honors), [awardCards, honors])

  const rows = useMemo<DashboardRow[]>(() => {
    const classById = new Map(classes.map((item) => [item.id, item]))
    const gradeById = new Map(grades.map((item) => [item.id, item.name]))

    return students.map((student) => {
      const schoolClass = classById.get(student.classId)
      const byLevel1: Record<string, number> = Object.fromEntries(
        AWARD_LEVEL1_LIST.map((name) => [name, 0]),
      )
      let semesterTotal = 0
      let cumulativeTotal = 0

      for (const entry of allEntries) {
        if (entry.studentId !== student.id) continue
        cumulativeTotal += entry.points
        if (!inRange(entry.date, start, end)) continue
        byLevel1[entry.level1] = (byLevel1[entry.level1] ?? 0) + entry.points
        semesterTotal += entry.points
      }

      return {
        ...student,
        gradeName: gradeById.get(schoolClass?.gradeId ?? "") ?? "—",
        className: schoolClass?.shortName ?? schoolClass?.name ?? "—",
        byLevel1,
        semesterTotal,
        cumulativeTotal,
      }
    })
  }, [allEntries, classes, end, grades, start, students])

  useEffect(() => {
    setPage(1)
  }, [sortKey, sortDir])

  const sortedRows = useMemo<RankedDashboardRow[]>(() => {
    const sorted = [...rows].sort((a, b) => {
      const difference = valueOf(b, sortKey) - valueOf(a, sortKey)
      if (difference !== 0) return sortDir === "asc" ? -difference : difference
      return a.studentNo.localeCompare(b.studentNo, "zh-Hans-CN")
    })
    const rankValue = (row: DashboardRow) => valueOf(row, sortKey)
    let previousValue: number | undefined
    let rank = 0
    return sorted.map((row, index) => {
      const currentValue = rankValue(row)
      if (currentValue !== previousValue) rank = index + 1
      previousValue = currentValue
      return { ...row, rank }
    })
  }, [rows, sortDir, sortKey])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagedRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selectedRow = selectedStudentId ? rows.find((row) => row.id === selectedStudentId) ?? null : null

  const selectedClass = useMemo(() => selectedRow ? classes.find((item) => item.id === selectedRow.classId) ?? null : null, [classes, selectedRow])
  const selectedGradeName = useMemo(() => selectedClass ? grades.find((item) => item.id === selectedClass.gradeId)?.name ?? "" : "", [grades, selectedClass])
  const selectedHonors = useMemo(() => selectedRow ? getReportHonors(honors, selectedRow.id, start, end) : [], [end, honors, selectedRow, start])
  const selectedActivities = useMemo(() => selectedRow ? getReportActivities(activities, selectedRow.classId, start, end) : [], [activities, end, selectedRow, start])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDir("desc")
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ChevronsUpDown className="size-3.5 text-muted-foreground/55" aria-hidden="true" />
    return sortDir === "asc" ? (
      <ArrowUp className="size-3.5 text-primary" aria-hidden="true" />
    ) : (
      <ArrowDown className="size-3.5 text-primary" aria-hidden="true" />
    )
  }

  return (
    <section className="rounded-2xl border border-[#cfd7f6] bg-white p-5 shadow-[0_14px_30px_-26px_rgba(48,62,139,0.62)] sm:p-6" aria-labelledby="data-dashboard-title">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回管理员首页
        </button>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="data-dashboard-title" className="text-xl font-bold text-foreground text-balance">五育积分数据看板</h2>
              <p className="mt-1 text-xs text-muted-foreground">学生本学期积分明细 · {formatDate(start)} 至 {formatDate(end)}</p>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-2 rounded-xl bg-primary/[0.06] px-3 py-2 text-xs text-primary sm:flex">
            <TrendingUp className="size-4" aria-hidden="true" />
            默认按学期积分降序
          </div>
        </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e9fa] pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Medal className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">学生积分表</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">共 {rows.length} 名学生 · 点击数值列切换升降序</p>
          </div>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">当前显示第 {currentPage} / {pageCount} 页</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#dce3fa]">
          <div className="overflow-x-auto">
            <table className="min-w-[1220px] w-full border-collapse text-sm">
              <caption className="sr-only">学生五育积分表，默认按学期积分从高到低排列</caption>
              <thead>
                <tr className="border-b border-[#dce3fa] bg-[#f8faff] text-xs text-muted-foreground">
                  <th scope="col" className="w-16 px-3 py-3 text-center font-semibold">排名</th>
                  <th scope="col" className="w-24 px-3 py-3 text-left font-semibold">年级</th>
                  <th scope="col" className="w-24 px-3 py-3 text-left font-semibold">班级</th>
                  <th scope="col" className="w-28 px-3 py-3 text-left font-semibold">姓名</th>
                  <th scope="col" className="w-24 px-3 py-3 text-left font-semibold">学号</th>
                  <SortableHeader
                    label="学期积分"
                    sortKey="semesterTotal"
                    activeSortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                    icon={sortIcon("semesterTotal")}
                    className="w-28 text-right"
                  />
                  <SortableHeader
                    label="累计积分"
                    sortKey="cumulativeTotal"
                    activeSortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                    icon={sortIcon("cumulativeTotal")}
                    className="w-28 text-right"
                  />
                  {AWARD_LEVEL1_LIST.map((name) => (
                    <SortableHeader
                      key={name}
                      label={`${name}学期总分`}
                      sortKey={`level1:${name}`}
                      activeSortKey={sortKey}
                      sortDir={sortDir}
                      onClick={toggleSort}
                      icon={sortIcon(`level1:${name}`)}
                      className="w-28 text-right"
                    />
                  ))}
                  <th scope="col" className="sticky right-0 w-36 bg-[#f8faff] px-3 py-3 text-right font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={AWARD_LEVEL1_LIST.length + 8} className="px-3 py-12 text-center text-sm text-muted-foreground">暂无学生数据</td>
                  </tr>
                ) : (
                  pagedRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-[#edf0fb] transition-colors last:border-0 hover:bg-[#f8faff]",
                        index % 2 === 1 && "bg-[#fcfdff]",
                      )}
                    >
                      <td className="px-3 py-3 text-center"><RankMark rank={row.rank} /></td>
                      <td className="px-3 py-3 text-muted-foreground">{row.gradeName}</td>
                      <td className="px-3 py-3 text-muted-foreground">{row.className}</td>
                      <td className="px-3 py-3 font-semibold text-foreground">{row.name}</td>
                      <td className="px-3 py-3 font-mono text-xs tabular-nums text-muted-foreground">{row.studentNo}</td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums text-primary">{row.semesterTotal}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-brand-green">{row.cumulativeTotal}</td>
                      {AWARD_LEVEL1_LIST.map((name) => (
                        <td key={name} className="px-3 py-3 text-right tabular-nums text-foreground">{row.byLevel1[name] ?? 0}</td>
                      ))}
                      <td className="sticky right-0 bg-inherit px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(row.id)}
                          className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                        >
                          <FileText className="size-3.5" aria-hidden="true" />
                          查看学生报告单
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={currentPage}
            total={sortedRows.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            className="border-t border-[#edf0fb]"
          />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">说明：学期积分和五育一级指标均按 {formatDate(start)} 至 {formatDate(end)} 统计，累计积分为全部历史积分。学生报告单可查看本学期积分来源。</p>

      {selectedRow && <StudentSemesterReportDrawer
        open={Boolean(selectedRow)}
        onOpenChange={(open) => !open && setSelectedStudentId(null)}
        semesterLabel={getSemesterLabel(new Date())}
        student={{ name: selectedRow.name, gender: selectedRow.gender, studentNo: selectedRow.studentNo }}
        className={selectedClass?.shortName ?? ""}
        gradeName={selectedGradeName}
        homeroomTeacher={selectedClass?.homeroomTeacher ?? "班主任老师"}
        semesterPoints={selectedRow.semesterTotal}
        totalPoints={selectedRow.cumulativeTotal}
        fiveEducation={AWARD_LEVEL1_LIST.map((name) => selectedRow.byLevel1[name] ?? 0)}
        academicScores={getReportAcademicScores(selectedRow)}
        fitnessMetrics={getReportFitnessMetrics(selectedRow.id)}
        honors={selectedHonors}
        activities={selectedActivities}
      />}
    </section>
  )
}

function valueOf(row: DashboardRow, key: SortKey) {
  if (key === "semesterTotal") return row.semesterTotal
  if (key === "cumulativeTotal") return row.cumulativeTotal
  return row.byLevel1[key.slice(7)] ?? 0
}

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onClick,
  icon,
  className,
}: {
  label: string
  sortKey: SortKey
  activeSortKey: SortKey
  sortDir: SortDir
  onClick: (key: SortKey) => void
  icon: React.ReactNode
  className?: string
}) {
  const active = activeSortKey === sortKey
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-1.5 font-semibold", className)}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className="flex min-h-10 w-full items-center justify-end gap-1 rounded-md text-right transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
        aria-label={`${label}，当前${active ? (sortDir === "asc" ? "升序" : "降序") : "未排序"}，点击切换`}
      >
        <span>{label}</span>
        {icon}
      </button>
    </th>
  )
}

function StudentReportDialog({
  row,
  entries,
  semesterStart,
  semesterEnd,
}: {
  row: DashboardRow
  entries: PointEntry[]
  semesterStart: Date
  semesterEnd: Date
}) {
  return (
    <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto overscroll-contain p-0">
      <DialogHeader className="border-b border-[#e4e8f7] bg-[#f8faff] px-5 py-5 pr-12 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg font-bold text-foreground">学生积分报告单</DialogTitle>
            <DialogDescription className="mt-1">{row.gradeName} · {row.className} · {row.name} · 学号 {row.studentNo}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
        <div className="data-card-grid-compact gap-3">
          <ReportMetric label="学期积分" value={row.semesterTotal} tone="primary" />
          <ReportMetric label="累计积分" value={row.cumulativeTotal} tone="green" />
          <ReportMetric label="本学期记录" value={entries.length} tone="orange" />
          <ReportMetric label="最高维度" value={topLevel1(row)} tone="neutral" isText />
        </div>

        <section aria-labelledby="report-five-education-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="report-five-education-title" className="text-sm font-bold text-foreground">五育一级指标学期总分</h3>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(semesterStart)} 至 {formatDate(semesterEnd)}</p>
            </div>
            <span className="text-xs text-muted-foreground">单位：分</span>
          </div>
          <div className="data-card-grid-compact mt-3 gap-2.5">
            {AWARD_LEVEL1_LIST.map((name) => (
              <div key={name} className="rounded-xl border border-[#e1e6f7] bg-white px-3 py-3">
                <p className="text-xs text-muted-foreground">{name}</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{row.byLevel1[name] ?? 0}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="report-records-title">
          <div className="flex items-center justify-between gap-3">
            <h3 id="report-records-title" className="text-sm font-bold text-foreground">本学期积分来源</h3>
            <span className="text-xs text-muted-foreground">最近 {Math.min(entries.length, 5)} 条</span>
          </div>
          {entries.length > 0 ? (
            <ul className="mt-3 divide-y divide-[#edf0fb] rounded-xl border border-[#e1e6f7]">
              {entries.slice(0, 5).map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Medal className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{entry.detail}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{entry.level1} · {POINT_SOURCE_LABEL[entry.source]} · {entry.date}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-brand-green">+{entry.points}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-[#cfd7f6] bg-[#fafbff] px-3 py-8 text-center text-sm text-muted-foreground">本学期暂无积分来源记录</p>
          )}
        </section>
      </div>
    </DialogContent>
  )
}

function ReportMetric({
  label,
  value,
  tone,
  isText = false,
}: {
  label: string
  value: number | string
  tone: "primary" | "green" | "orange" | "neutral"
  isText?: boolean
}) {
  return (
    <div className="rounded-xl border border-[#e1e6f7] bg-white px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "mt-1 truncate font-bold text-foreground",
        isText ? "text-sm" : "text-lg tabular-nums",
        tone === "primary" && "text-primary",
        tone === "green" && "text-brand-green",
        tone === "orange" && "text-brand-orange",
      )}>{value}</p>
    </div>
  )
}

function topLevel1(row: DashboardRow) {
  if (row.semesterTotal === 0) return "—"
  return AWARD_LEVEL1_LIST.reduce((best, current) => row.byLevel1[current] > row.byLevel1[best] ? current : best, AWARD_LEVEL1_LIST[0])
}
