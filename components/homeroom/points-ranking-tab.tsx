"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import {
  aggregateByStudent,
  buildPointEntries,
  type TimeRange,
} from "@/lib/points-utils"
import { AWARD_LEVEL1_LIST } from "@/lib/award-utils"
import { useEvaluation } from "@/lib/evaluation-context"

interface PointsRankingTabProps {
  classId: string
  /** 频次切换由父组件统一控制（与五育积分动态共用） */
  range: TimeRange
  /** 姓名/学号搜索由父组件首行统一展示 */
  search: string
}

type SortKey = "studentNo" | "cumulativeTotal" | "semesterTotal" | `level1:${string}`
type SortDir = "asc" | "desc"

export function PointsRankingTab({ classId, range, search }: PointsRankingTabProps) {
  const { awardCards, honors, students } = useEvaluation()
  const [sortKey, setSortKey] = useState<SortKey>("cumulativeTotal")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  // 筛选/排序/时间范围变化时回到第一页
  useEffect(() => {
    setPage(1)
  }, [range, search, sortKey, sortDir])

  const allEntries = useMemo(() => buildPointEntries(awardCards, honors), [awardCards, honors])

  const rows = useMemo(
    () => aggregateByStudent(allEntries, allEntries, students, classId, range),
    [allEntries, students, classId, range],
  )

  const filtered = useMemo(() => {
    const q = search.trim()
    const list = q
      ? rows.filter((r) => r.name.includes(q) || r.studentNo.includes(q))
      : rows
    const sorted = [...list].sort((a, b) => {
      const av = valueOf(a, sortKey)
      const bv = valueOf(b, sortKey)
      if (av === bv) return 0
      return sortDir === "asc" ? av - bv : bv - av
    })
    return sorted
  }, [rows, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagedRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
    return sortDir === "asc" ? (
      <ArrowUp className="size-3.5 text-primary" />
    ) : (
      <ArrowDown className="size-3.5 text-primary" />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-gradient-to-r from-primary/8 to-brand-blue/5">
              <Th onClick={() => toggleSort("studentNo")} icon={sortIcon("studentNo")} className="w-16">
                学号
              </Th>
              <Th icon={null} className="w-20">
                姓名
              </Th>
              <th className="w-12 px-2 py-2.5 text-center font-semibold text-foreground">性别</th>
              {AWARD_LEVEL1_LIST.map((name) => (
                <Th
                  key={name}
                  onClick={() => toggleSort(`level1:${name}`)}
                  icon={sortIcon(`level1:${name}`)}
                  className="min-w-16 text-center"
                >
                  {name}
                </Th>
              ))}
              <Th onClick={() => toggleSort("semesterTotal")} icon={sortIcon("semesterTotal")} className="text-center">
                学期积分
              </Th>
              <Th onClick={() => toggleSort("cumulativeTotal")} icon={sortIcon("cumulativeTotal")} className="text-center">
                累计积分
              </Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={AWARD_LEVEL1_LIST.length + 5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  暂无匹配学生
                </td>
              </tr>
            ) : (
              pagedRows.map((r, idx) => (
                <tr
                  key={r.studentId}
                  className={cn(
                    "border-b border-border/40 transition-colors last:border-b-0 hover:bg-accent/30",
                    idx % 2 === 1 && "bg-white/[0.02]",
                  )}
                >
                  <td className="px-3 py-2 text-muted-foreground">{r.studentNo}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                  <td className="px-2 py-2 text-center text-muted-foreground">{r.gender}</td>
                  {AWARD_LEVEL1_LIST.map((name) => (
                    <td key={name} className="px-3 py-2 text-center text-foreground">
                      {r.byLevel1[name] || 0}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-semibold text-brand-blue">
                    {r.semesterTotal}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-brand-green">
                    {r.cumulativeTotal}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        <Pagination
          page={currentPage}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          className="border-t border-border/40"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        说明：一级指标小计与学期积分随顶部时间范围变化，累计积分为全量统计。点击表头可切换升降序。
      </p>
    </div>
  )
}

function valueOf(
  row: ReturnType<typeof aggregateByStudent>[number],
  key: SortKey,
): number {
  if (key === "studentNo") return Number(row.studentNo)
  if (key === "cumulativeTotal") return row.cumulativeTotal
  if (key === "semesterTotal") return row.semesterTotal
  if (key.startsWith("level1:")) {
    const name = key.slice(7)
    return row.byLevel1[name] ?? 0
  }
  return 0
}

function Th({
  children,
  onClick,
  icon,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  icon: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 font-semibold text-foreground",
        onClick && "cursor-pointer select-none hover:bg-accent/40",
        className,
      )}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {icon}
      </span>
    </th>
  )
}
