"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown, FileText, Medal } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pagination } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import {
  aggregateByStudent,
  buildPointEntries,
  getSemesterRange,
  inRange,
  POINT_SOURCE_LABEL,
  TIME_RANGE_LABEL,
  type PointEntry,
  type TimeRange,
} from "@/lib/points-utils"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"
import { formatDate } from "@/lib/scoring-utils"
import { getSemesterLabel } from "@/lib/pe-scores"
import { useEvaluation } from "@/lib/evaluation-context"
import { StudentSemesterReportDrawer } from "@/components/parent/student-semester-report-drawer"
import { getReportAcademicScores, getReportActivities, getReportFitnessMetrics, getReportHonors } from "@/components/report/student-report-data"

interface PointsRankingTabProps {
  classId: string
  range: TimeRange
  search: string
}

type SortKey = "studentNo" | "cumulativeTotal" | "semesterTotal" | `level1:${string}`
type SortDir = "asc" | "desc"

export function PointsRankingTab({ classId, range, search }: PointsRankingTabProps) {
  const { awardCards, honors, students, classes, grades, activities } = useEvaluation()
  const [sortKey, setSortKey] = useState<SortKey>("semesterTotal")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const PAGE_SIZE = 10

  const allEntries = useMemo(() => buildPointEntries(awardCards, honors), [awardCards, honors])
  const rangeRows = useMemo(() => aggregateByStudent(allEntries, allEntries, students, classId, range), [allEntries, classId, range, students])
  const semesterRows = useMemo(() => aggregateByStudent(allEntries, allEntries, students, classId, "semester"), [allEntries, classId, students])
  const rows = useMemo(() => {
    const semesterById = new Map(semesterRows.map((row) => [row.studentId, row]))
    return rangeRows.map((row) => ({ ...row, byLevel1: semesterById.get(row.studentId)?.byLevel1 ?? row.byLevel1 }))
  }, [rangeRows, semesterRows])

  const filtered = useMemo(() => {
    const query = search.trim()
    const list = query ? rows.filter((row) => row.name.includes(query) || row.studentNo.includes(query)) : rows
    return [...list].sort((a, b) => {
      const difference = valueOf(b, sortKey) - valueOf(a, sortKey)
      if (difference !== 0) return sortDir === "asc" ? -difference : difference
      return a.studentNo.localeCompare(b.studentNo, "zh-Hans-CN")
    })
  }, [rows, search, sortDir, sortKey])

  useEffect(() => setPage(1), [range, search, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagedRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selectedRow = selectedStudentId ? semesterRows.find((row) => row.studentId === selectedStudentId) ?? null : null
  const selectedStudent = useMemo(() => selectedStudentId ? students.find((student) => student.id === selectedStudentId) ?? null : null, [selectedStudentId, students])
  const selectedClass = useMemo(() => classes.find((item) => item.id === classId) ?? null, [classId, classes])
  const selectedGradeName = useMemo(() => selectedClass ? grades.find((item) => item.id === selectedClass.gradeId)?.name ?? "" : "", [grades, selectedClass])
  const { start: semesterStart, end: semesterEnd } = useMemo(() => getSemesterRange(), [])
  const selectedEntries = useMemo(() => {
    if (!selectedStudentId) return []
    return allEntries
      .filter((entry) => entry.studentId === selectedStudentId && inRange(entry.date, semesterStart, semesterEnd))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [allEntries, selectedStudentId, semesterEnd, semesterStart])
  const selectedHonors = useMemo(() => selectedStudentId ? getReportHonors(honors, selectedStudentId, semesterStart, semesterEnd) : [], [honors, selectedStudentId, semesterEnd, semesterStart])
  const selectedActivities = useMemo(() => getReportActivities(activities, classId, semesterStart, semesterEnd), [activities, classId, semesterEnd, semesterStart])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => current === "asc" ? "desc" : "asc")
      return
    }
    setSortKey(key)
    setSortDir("desc")
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ChevronsUpDown className="size-3.5 text-muted-foreground/45" aria-hidden="true" />
    return sortDir === "asc" ? <ArrowUp className="size-3.5 text-primary" aria-hidden="true" /> : <ArrowDown className="size-3.5 text-primary" aria-hidden="true" />
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-[#d7def5] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1160px] w-full border-collapse text-sm">
            <caption className="sr-only">班级学生积分排名，默认按学期总积分从高到低排列</caption>
            <thead>
              <tr className="border-b border-[#dce3f7] bg-[#f8faff] text-xs text-muted-foreground">
                <th scope="col" className="w-16 px-3 py-3 text-center font-semibold">排名</th>
                <th scope="col" className="w-28 px-3 py-3 text-center font-semibold">学生姓名</th>
                <SortableHeader label="学号" sortKey="studentNo" activeSortKey={sortKey} sortDir={sortDir} onClick={toggleSort} icon={sortIcon("studentNo")} className="w-24 text-center" />
                <th scope="col" className="w-16 px-3 py-3 text-center font-semibold">性别</th>
                {AWARD_LEVEL1_LIST.map((name) => <SortableHeader key={name} label={name} sortKey={`level1:${name}`} activeSortKey={sortKey} sortDir={sortDir} onClick={toggleSort} icon={sortIcon(`level1:${name}`)} className="w-24 text-center" />)}
                <SortableHeader label={`${TIME_RANGE_LABEL[range]}总积分`} sortKey="semesterTotal" activeSortKey={sortKey} sortDir={sortDir} onClick={toggleSort} icon={sortIcon("semesterTotal")} className="w-28 text-center" />
                <SortableHeader label="累计总积分" sortKey="cumulativeTotal" activeSortKey={sortKey} sortDir={sortDir} onClick={toggleSort} icon={sortIcon("cumulativeTotal")} className="w-28 text-center" />
                <th scope="col" className="sticky right-0 w-36 bg-[#f8faff] px-3 py-3 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? <tr><td colSpan={AWARD_LEVEL1_LIST.length + 7} className="px-3 py-12 text-center text-sm text-muted-foreground">暂无匹配学生</td></tr> : pagedRows.map((row, index) => <tr key={row.studentId} className={cn("border-b border-[#edf0fa] transition-colors last:border-0 hover:bg-[#f8faff]", index % 2 === 1 && "bg-[#fcfdff]")}>
                <td className="px-3 py-3 text-center"><RankMark rank={(currentPage - 1) * PAGE_SIZE + index + 1} /></td>
                <td className="px-3 py-3 text-center font-semibold text-foreground">{row.name}</td>
                <td className="px-3 py-3 text-center font-mono text-xs tabular-nums text-muted-foreground">{row.studentNo}</td>
                <td className="px-3 py-3 text-center text-muted-foreground">{row.gender}</td>
                {AWARD_LEVEL1_LIST.map((name) => <td key={name} className="px-3 py-3 text-center tabular-nums text-foreground">{row.byLevel1[name] ?? 0}</td>)}
                <td className="px-3 py-3 text-center font-bold tabular-nums text-primary">{row.semesterTotal}</td>
                <td className="px-3 py-3 text-center font-semibold tabular-nums text-brand-green">{row.cumulativeTotal}</td>
                <td className="sticky right-0 bg-inherit px-3 py-3 text-center"><button type="button" onClick={() => setSelectedStudentId(row.studentId)} className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"><FileText className="size-3.5" aria-hidden="true" />查看报告单</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <Pagination page={currentPage} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} className="border-t border-[#edf0fa]" />
      </div>
      <p className="text-xs text-muted-foreground">说明：五育一级指标列固定展示本学期总分；{TIME_RANGE_LABEL[range]}总积分随顶部范围切换，累计总积分为全部历史积分。</p>

      {selectedRow && selectedStudent && <StudentSemesterReportDrawer
        open={Boolean(selectedRow)}
        onOpenChange={(open) => !open && setSelectedStudentId(null)}
        semesterLabel={getSemesterLabel(new Date())}
        student={{ name: selectedStudent.name, gender: selectedStudent.gender, studentNo: selectedStudent.studentNo }}
        className={selectedClass?.shortName ?? ""}
        gradeName={selectedGradeName}
        homeroomTeacher={selectedClass?.homeroomTeacher ?? "班主任老师"}
        semesterPoints={selectedRow.semesterTotal}
        totalPoints={selectedRow.cumulativeTotal}
        fiveEducation={AWARD_LEVEL1_LIST.map((name) => selectedRow.byLevel1[name] ?? 0)}
        academicScores={getReportAcademicScores(selectedStudent)}
        fitnessMetrics={getReportFitnessMetrics(selectedStudent.id)}
        honors={selectedHonors}
        activities={selectedActivities}
      />}
    </div>
  )
}

function valueOf(row: ReturnType<typeof aggregateByStudent>[number], key: SortKey) {
  if (key === "studentNo") return Number(row.studentNo)
  if (key === "cumulativeTotal") return row.cumulativeTotal
  if (key === "semesterTotal") return row.semesterTotal
  return row.byLevel1[key.slice(7)] ?? 0
}

function RankMark({ rank }: { rank: number }) {
  return <span className={cn("inline-flex size-7 items-center justify-center rounded-lg text-xs font-bold tabular-nums", rank === 1 ? "bg-[#fff1c8] text-[#a16b0a]" : rank === 2 ? "bg-[#eef0ff] text-[#5969c3]" : rank === 3 ? "bg-[#eaf8f1] text-[#21845b]" : "bg-[#f1f3fa] text-muted-foreground")}>{rank}</span>
}

function SortableHeader({ label, sortKey, activeSortKey, sortDir, onClick, icon, className }: { label: string; sortKey: SortKey; activeSortKey: SortKey; sortDir: SortDir; onClick: (key: SortKey) => void; icon: React.ReactNode; className?: string }) {
  const active = activeSortKey === sortKey
  return <th scope="col" aria-sort={active ? sortDir === "asc" ? "ascending" : "descending" : "none"} className={cn("px-3 py-1.5 text-center font-semibold", className)}><button type="button" onClick={() => onClick(sortKey)} aria-label={`${label}，当前${active ? sortDir === "asc" ? "升序" : "降序" : "未排序"}，点击切换`} className="flex min-h-10 w-full items-center justify-center gap-1 rounded-md text-center transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{label}{icon}</button></th>
}

function StudentReportDialog({ row, entries, semesterStart, semesterEnd }: { row: ReturnType<typeof aggregateByStudent>[number]; entries: PointEntry[]; semesterStart: Date; semesterEnd: Date }) {
  return <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto overscroll-contain p-0"><DialogHeader className="border-b border-[#e4e8f7] bg-[#f8faff] px-5 py-5 pr-12 sm:px-6"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" aria-hidden="true" /></span><div className="min-w-0"><DialogTitle className="text-lg font-bold text-foreground">学生学期报告单</DialogTitle><DialogDescription className="mt-1">{row.name} · 学号 {row.studentNo} · {row.gender}</DialogDescription></div></div></DialogHeader><div className="flex flex-col gap-5 px-5 py-5 sm:px-6"><div className="data-card-grid-compact gap-3"><ReportMetric label="学期总积分" value={row.semesterTotal} tone="primary" /><ReportMetric label="累计总积分" value={row.cumulativeTotal} tone="green" /><ReportMetric label="本学期记录" value={entries.length} tone="orange" /></div><section aria-labelledby="homeroom-report-five-title"><div className="flex items-center justify-between gap-3"><div><h3 id="homeroom-report-five-title" className="text-sm font-bold text-foreground">五育一级指标学期总分</h3><p className="mt-1 text-xs text-muted-foreground">{formatDate(semesterStart)} 至 {formatDate(semesterEnd)}</p></div><span className="text-xs text-muted-foreground">单位：分</span></div><div className="data-card-grid-compact mt-3 gap-2.5">{AWARD_LEVEL1_LIST.map((name) => <div key={name} className="rounded-xl border border-[#e1e6f7] bg-white px-3 py-3"><p className="text-xs text-muted-foreground">{name}</p><p className="mt-1 text-lg font-bold tabular-nums text-foreground">{row.byLevel1[name] ?? 0}</p></div>)}</div></section><section aria-labelledby="homeroom-report-records-title"><div className="flex items-center justify-between gap-3"><h3 id="homeroom-report-records-title" className="text-sm font-bold text-foreground">本学期积分来源</h3><span className="text-xs text-muted-foreground">最近 {Math.min(entries.length, 5)} 条</span></div>{entries.length > 0 ? <ul className="mt-3 divide-y divide-[#edf0fb] rounded-xl border border-[#e1e6f7]">{entries.slice(0, 5).map((entry) => <li key={entry.id} className="flex items-center gap-3 px-3.5 py-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Medal className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{entry.detail}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{entry.level1} · {POINT_SOURCE_LABEL[entry.source]} · {entry.date}</span></span><span className="shrink-0 text-sm font-bold tabular-nums text-brand-green">+{entry.points}</span></li>)}</ul> : <p className="mt-3 rounded-xl border border-dashed border-[#cfd7f6] bg-[#fafbff] px-3 py-8 text-center text-sm text-muted-foreground">本学期暂无积分来源记录</p>}</section></div></DialogContent>
}

function ReportMetric({ label, value, tone }: { label: string; value: number; tone: "primary" | "green" | "orange" }) {
  const textTone = tone === "primary" ? "text-primary" : tone === "green" ? "text-brand-green" : "text-brand-orange"
  return <div className="rounded-xl border border-[#e1e6f7] bg-[#fbfcff] px-3 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className={cn("mt-1 text-xl font-bold tabular-nums", textTone)}>{value}</p></div>
}
