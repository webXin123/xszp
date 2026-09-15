"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Crown, Flag, Medal, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { computeWeeklyScore, formatDate, formatDateRangeLabel, getISOWeekKey, getRecordsForWeek, getWeekRange } from "@/lib/scoring-utils"

type RankingPeriod = "day" | "week" | "month"

const PERIOD_LABEL: Record<RankingPeriod, string> = { day: "日榜", week: "周榜", month: "月榜" }
const DEFAULT_ICON_PATH = "/xszp/images"

function getSemesterStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() >= 7 ? 8 : 1, 1)
}

function getSemesterWeekKeys(date: Date) {
  const semesterStart = getSemesterStart(date)
  const cursor = new Date(date)
  const result: string[] = []
  while (getWeekRange(cursor).end >= semesterStart) {
    result.push(getISOWeekKey(cursor))
    cursor.setDate(cursor.getDate() - 7)
  }
  return result
}

function getSemesterMonthKeys(date: Date) {
  const semesterStart = getSemesterStart(date)
  const cursor = new Date(date.getFullYear(), date.getMonth(), 1)
  const result: string[] = []
  while (cursor >= semesterStart) {
    result.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`)
    cursor.setMonth(cursor.getMonth() - 1)
  }
  return result
}

function formatWeekLabel(weekKey: string) {
  return `第${Number(weekKey.split("-W")[1])}周`
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-")
  return `${year}年${Number(month)}月`
}

export function ClassRankingTab() {
  const { classes, grades, records, flags, flagConfigs, classRatingConfigs, setFlag, issueFlagReward } = useEvaluation()
  const { visibleGrades, canManageFlags, role, scoringClasses } = usePermission()
  const [period, setPeriod] = useState<RankingPeriod>("day")
  const weekOptions = useMemo(() => getSemesterWeekKeys(new Date()), [])
  const monthOptions = useMemo(() => getSemesterMonthKeys(new Date()), [])
  const currentWeekKey = weekOptions[0] ?? getISOWeekKey(new Date())
  const currentMonthKey = monthOptions[0] ?? formatDate(new Date()).slice(0, 7)
  const [weekKey, setWeekKey] = useState(currentWeekKey)
  const [monthPrefix, setMonthPrefix] = useState(currentMonthKey)
  const [gradeFilter, setGradeFilter] = useState("all")
  const [detailClassId, setDetailClassId] = useState<string | null>(null)
  const [flagDialog, setFlagDialog] = useState<{ classId: string; configId: string } | null>(null)
  const [syncPoints, setSyncPoints] = useState(true)

  const homeroomGrade = role === "homeroom" ? grades.find((grade) => grade.id === scoringClasses[0]?.gradeId) : undefined
  const isHomeroomRanking = role === "homeroom"
  const availableClasses = isHomeroomRanking
    ? classes.filter((item) => item.gradeId === homeroomGrade?.id)
    : scoringClasses.length > 0 ? scoringClasses : classes
  const today = formatDate(new Date())
  const periodKey = period === "month" ? monthPrefix : weekKey
  const isHistorical = period === "week" ? weekKey !== currentWeekKey : period === "month" ? monthPrefix !== currentMonthKey : false
  const gradeOptions = isHomeroomRanking ? homeroomGrade ? [homeroomGrade] : [] : visibleGrades.length > 0 ? visibleGrades : grades
  const activeFlagConfigs = useMemo(
    () => flagConfigs.filter((item) => item.period === period && (item.enabled || isHistorical)),
    [flagConfigs, isHistorical, period],
  )
  const tableMinWidth = period === "day" ? 600 : 620 + activeFlagConfigs.length * 108

  const ranking = useMemo(() => availableClasses
    .filter((item) => gradeFilter === "all" || item.gradeId === gradeFilter)
    .map((cls) => {
      const periodRecords = period === "day"
        ? records.filter((record) => record.classId === cls.id && record.date === today)
        : period === "week"
          ? getRecordsForWeek(records, cls.id, weekKey)
          : records.filter((record) => record.classId === cls.id && record.date.startsWith(monthPrefix))
      const deduction = periodRecords.filter((record) => record.totalDeduction < 0).reduce((sum, record) => sum + Math.abs(record.totalDeduction), 0)
      const addition = periodRecords.filter((record) => record.totalDeduction > 0).reduce((sum, record) => sum + record.totalDeduction, 0)
      const delta = addition - deduction
      const total = period === "week" ? computeWeeklyScore(records, cls.id, weekKey).total : period === "month" ? 100 + delta : delta
      return { cls, grade: grades.find((item) => item.id === cls.gradeId), periodRecords, deduction, addition, total }
    })
    .sort((a, b) => b.total - a.total), [availableClasses, flags, gradeFilter, grades, monthPrefix, period, records, today, weekKey])

  const detailClass = ranking.find((item) => item.cls.id === detailClassId)
  const podiumRows = [ranking[1], ranking[0], ranking[2]]

  const getRating = (rank: number) => {
    const currentRank = rank + 1
    const config = classRatingConfigs.find((item) => currentRank >= Number(item.rankStart) && currentRank <= Number(item.rankEnd))
    if (config) return { label: config.name, image: config.image ?? (config.defaultImage === "cry" ? `${DEFAULT_ICON_PATH}/rating-cry.svg` : `${DEFAULT_ICON_PATH}/rating-smile.svg`) }
    return { label: "成长加油", image: `${DEFAULT_ICON_PATH}/rating-cry.svg` }
  }

  const isFlagAwarded = (classId: string, configId: string, configIndex: number) => flags.some((item) => item.classId === classId && item.weekKey === periodKey && (item.configId === configId || (!item.configId && period === "week" && configIndex === 0)) && item.awarded)
  const selectedFlagConfig = flagDialog ? flagConfigs.find((item) => item.id === flagDialog.configId) : undefined
  const selectedFlagAwarded = flagDialog ? isFlagAwarded(flagDialog.classId, flagDialog.configId, activeFlagConfigs.findIndex((item) => item.id === flagDialog.configId)) : false

  const handleFlag = () => {
    if (!canManageFlags || isHistorical || !flagDialog || !selectedFlagConfig || selectedFlagAwarded) return
    setFlag(flagDialog.classId, periodKey, true, selectedFlagConfig.id, selectedFlagConfig.period)
    if (syncPoints && selectedFlagConfig.syncFiveEducation) issueFlagReward(flagDialog.classId, periodKey)
    setFlagDialog(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-[26px] border border-[#cfd8f6] bg-white shadow-[0_22px_46px_-34px_rgba(54,67,148,0.78)]">
        <div className="flex flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-[#eef1ff] via-[#f9faff] to-[#f5efff] px-4 py-4 sm:px-5 sm:py-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">班级排行榜</h2>
            <p className="mt-1 text-xs text-muted-foreground">{isHomeroomRanking ? `${homeroomGrade?.name ?? "本年级"} · ` : ""}{PERIOD_LABEL[period]} · {ranking.length} 个班级参与评比 · 点击班级可查看评价详情</p>
          </div>
          {isHomeroomRanking ? <span className="inline-flex min-h-10 items-center rounded-xl border border-primary/15 bg-white/80 px-3 text-xs font-semibold text-primary">仅查看{homeroomGrade?.name ?? "本年级"}</span> : <Select value={gradeFilter === "all" ? "全部年级" : gradeOptions.find((grade) => grade.id === gradeFilter)?.name ?? ""} onValueChange={(value) => setGradeFilter(value === "全部年级" ? "all" : gradeOptions.find((grade) => grade.name === value)?.id ?? "all")}><SelectTrigger aria-label="筛选年级" className="w-32 text-xs font-semibold"><SelectValue placeholder="全部年级" /></SelectTrigger><SelectContent><SelectItem value="全部年级">全部年级</SelectItem>{gradeOptions.map((grade) => <SelectItem key={grade.id} value={grade.name}>{grade.name}</SelectItem>)}</SelectContent></Select>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#e8ebfa] bg-white px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-2xl border border-primary/10 bg-[#eef1ff] p-1.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_80%)]" role="tablist" aria-label="排行榜周期">
              {(["day", "week", "month"] as RankingPeriod[]).map((item) => <button key={item} type="button" role="tab" aria-selected={period === item} onClick={() => setPeriod(item)} className={cn("min-h-10 min-w-16 rounded-xl px-3.5 text-xs font-bold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", period === item ? "bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-[0_7px_16px_-9px_rgba(63,81,188,0.92)]" : "text-[#687898] hover:bg-white/85 hover:text-primary")}>{PERIOD_LABEL[item]}</button>)}
            </div>
            {period === "week" && <Select value={weekKey} onValueChange={(value) => setWeekKey(String(value ?? currentWeekKey))}>
              <SelectTrigger aria-label="选择历史周次" className="h-11 min-w-44 rounded-xl border-[#dbe3f7] bg-[#fbfcff] px-3 text-xs font-semibold"><CalendarDays className="size-3.5 text-primary" /><SelectValue placeholder="选择周次" /></SelectTrigger>
              <SelectContent><SelectGroup>{weekOptions.map((key) => <SelectItem key={key} value={key}>{key === currentWeekKey ? `本周 · ${formatWeekLabel(key)}` : `${formatWeekLabel(key)} · ${formatDateRangeLabel(key)}`}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>}
            {period === "month" && <Select value={monthPrefix} onValueChange={(value) => setMonthPrefix(String(value ?? currentMonthKey))}>
              <SelectTrigger aria-label="选择历史月份" className="h-11 min-w-36 rounded-xl border-[#dbe3f7] bg-[#fbfcff] px-3 text-xs font-semibold"><CalendarDays className="size-3.5 text-primary" /><SelectValue placeholder="选择月份" /></SelectTrigger>
              <SelectContent><SelectGroup>{monthOptions.map((key) => <SelectItem key={key} value={key}>{key === currentMonthKey ? `本月 · ${formatMonthLabel(key)}` : formatMonthLabel(key)}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>}
            {isHistorical && <span className="inline-flex min-h-9 items-center rounded-full border border-[#dbe3f7] bg-[#f7f9ff] px-2.5 text-xs font-semibold text-[#64749a]">历史数据 · 仅查看</span>}
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-[#f7f8ff] px-2.5 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex"><Sparkles aria-hidden="true" className="size-3.5 text-[#8f84ee]" />荣耀前三</span>
        </div>

        <div className="relative m-3 grid grid-cols-3 items-end gap-2 overflow-hidden rounded-2xl border border-[#e2e6f8] bg-[radial-gradient(circle_at_50%_0%,#fff9dc_0%,#f8f9ff_52%,#f2f4ff_100%)] p-2 pt-4 sm:m-4 sm:gap-3 sm:p-3 sm:pt-5">
          {podiumRows.map((row, podiumIndex) => {
            if (!row) return <div key={`empty-${podiumIndex}`} />
            const rank = ranking.indexOf(row) + 1
            const isFirst = rank === 1
            const PodiumIcon = isFirst ? Crown : Medal
            return <button key={row.cls.id} type="button" onClick={() => setDetailClassId(row.cls.id)} className={cn("group relative flex min-w-0 flex-col items-center overflow-hidden rounded-xl border px-2 pt-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", isFirst ? "z-10 min-h-[156px] border-[#f1cc72] bg-gradient-to-b from-[#fffdf3] to-white shadow-[0_18px_28px_-20px_rgba(209,157,50,0.82)]" : rank === 2 ? "mt-6 min-h-[132px] border-[#dce2f1] bg-white shadow-[0_12px_22px_-21px_rgba(99,111,148,0.75)] hover:border-[#bdc7e4]" : "mt-8 min-h-[124px] border-[#f1ded5] bg-white shadow-[0_12px_22px_-21px_rgba(159,103,77,0.6)] hover:border-[#eac6b4]") }>
              {isFirst && <span className="absolute right-2 top-2 rounded-full bg-[#fff0b8] px-1.5 py-0.5 text-[9px] font-black tracking-[0.08em] text-[#a56b13]">CHAMPION</span>}
              <span className={cn("flex size-7 items-center justify-center rounded-full", isFirst ? "bg-[#fff1bf] text-[#d89522]" : rank === 2 ? "bg-[#e8ecf6] text-[#74819c]" : "bg-[#ffeadf] text-[#d97c51]")}><PodiumIcon aria-hidden="true" className={cn(isFirst ? "size-4" : "size-3.5")} /></span>
              <span className={cn("mt-1.5 flex items-center justify-center rounded-full border text-sm font-bold transition-transform group-hover:scale-105", isFirst ? "size-12 border-[#f2d274] bg-[#fff6d3] text-[#8e651a] sm:size-14" : rank === 2 ? "size-10 border-[#d3daeb] bg-[#eef2fa] text-[#657298] sm:size-11" : "size-10 border-[#f0d4c6] bg-[#fff0e8] text-[#b86745] sm:size-11")}>{row.cls.shortName || row.cls.name.slice(-2)}</span>
              <span className="mt-1.5 max-w-full truncate text-[11px] font-bold text-foreground sm:text-xs">{row.cls.name}</span>
              <span className={cn("mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums", isFirst ? "bg-[#fff3ca] text-[#9a6b16]" : rank === 2 ? "bg-[#eef1f7] text-[#687592]" : "bg-[#fff0e8] text-[#b86a49]")}>{row.total > 0 ? "+" : ""}{row.total.toFixed(1)} 分</span>
              <span className={cn("mt-auto w-full py-1.5 text-[10px] font-black tracking-[0.12em]", isFirst ? "bg-[#f7d26e] text-[#7f5916]" : rank === 2 ? "bg-[#dfe5f1] text-[#63708d]" : "bg-[#f4c6ad] text-[#915036]")}>NO. 0{rank}</span>
            </button>
          })}
        </div>
      </section>

      <div className="overflow-hidden rounded-[24px] border border-[#cfd8f6] bg-white shadow-[0_20px_42px_-34px_rgba(54,67,148,0.68)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm tabular-nums" style={{ minWidth: tableMinWidth }}>
            <thead>
              <tr className="border-b border-[#dfe4f7] bg-[#f5f7ff] text-left text-xs font-bold text-muted-foreground">
                <th className="w-20 px-4 py-3">排名</th>
                <th className="px-4 py-3">班级</th>
                <th className="px-4 py-3">加分</th>
                <th className="px-4 py-3">扣分</th>
                <th className="px-4 py-3">{period === "day" ? "今日净分" : period === "week" ? "班级总分" : "月综合分"}</th>
                {period === "week" && <th className="px-4 py-3">班级评级</th>}
                {activeFlagConfigs.map((config) => <th key={config.id} className="min-w-[108px] px-3 py-3 text-center"><span className="line-clamp-2 inline-block max-w-[96px] leading-4">{config.name}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 ? <tr><td colSpan={5 + (period !== "day" ? 1 : 0) + activeFlagConfigs.length} className="px-4 py-12 text-center text-sm text-muted-foreground">当前筛选条件下暂无班级数据</td></tr> : ranking.map((row, index) => {
                const rating = getRating(index)
                return <tr key={row.cls.id} className={cn("border-b border-[#edf0fa] transition-colors last:border-0 hover:bg-[#f5f7ff]", index === 0 && "bg-[#fbfaff]", index === 1 && "bg-slate-50/50", index === 2 && "bg-[#fffdfa]")}>
                  <td className="px-4 py-2.5"><span className={cn("inline-flex size-7 items-center justify-center rounded-full text-xs font-bold shadow-sm", index === 0 ? "bg-gradient-to-br from-[#ffd976] to-[#f3aa4b] text-[#72501b]" : index === 1 ? "bg-gradient-to-br from-[#e7ecff] to-[#aebae5] text-[#55617f]" : index === 2 ? "bg-gradient-to-br from-[#ffcfad] to-[#ef9268] text-[#874527]" : "bg-muted text-muted-foreground")}>{index + 1}</span></td>
                  <td className="px-4 py-2.5"><button type="button" onClick={() => setDetailClassId(row.cls.id)} className="rounded-sm text-left font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">{row.cls.name}<span className="ml-2 text-xs font-normal text-muted-foreground">{row.grade?.name}</span></button></td>
                  <td className="px-4 py-2.5 font-medium text-emerald-700">{row.addition > 0 ? `+${row.addition.toFixed(1)}` : "—"}</td>
                  <td className="px-4 py-2.5 font-medium text-rose-700">{row.deduction > 0 ? `-${row.deduction.toFixed(1)}` : "—"}</td>
                  <td className="px-4 py-2.5"><button type="button" onClick={() => setDetailClassId(row.cls.id)} className="rounded-sm font-bold text-primary transition-colors hover:text-primary-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">{row.total > 0 ? "+" : ""}{row.total.toFixed(1)}</button></td>
                  {period === "week" && <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.05] py-1 pl-1 pr-2.5 text-xs font-medium text-primary shadow-[0_4px_10px_-9px_rgba(95,102,205,0.9)]"><img src={rating.image} alt="" width="24" height="24" loading="lazy" className="size-6 rounded-full object-cover" />{rating.label}</span></td>}
                  {activeFlagConfigs.map((config, configIndex) => {
                    const awarded = isFlagAwarded(row.cls.id, config.id, configIndex)
                    const image = config.image ?? (awarded ? `${DEFAULT_ICON_PATH}/flag-issued.svg` : `${DEFAULT_ICON_PATH}/flag-unissued.svg`)
                    const flagStatus = <span className={cn("inline-flex size-11 items-center justify-center rounded-xl border p-1.5", awarded ? "border-rose-200 bg-rose-50" : "border-primary/15 bg-primary/[0.035]")} aria-label={`${row.cls.name}${config.name}${awarded ? "已发放" : "未发放"}`}><img src={image} alt="" width={36} height={36} loading="lazy" className="size-9 rounded-md object-cover" /></span>
                    return <td key={config.id} className="px-3 py-2.5 text-center">{canManageFlags ? <button type="button" onClick={() => { setFlagDialog({ classId: row.cls.id, configId: config.id }); setSyncPoints(config.syncFiveEducation) }} className="rounded-xl transition-colors hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label={`查看${row.cls.name}${config.name}颁发信息`}>{flagStatus}</button> : flagStatus}</td>
                  })}
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detailClassId} onOpenChange={(open) => !open && setDetailClassId(null)}>
        <DialogContent className="glass-surface max-h-[80vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{detailClass?.cls.name} · {PERIOD_LABEL[period]}评价记录</DialogTitle></DialogHeader><div className="rounded-lg border border-border/60">{(detailClass?.periodRecords.length ?? 0) === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">暂无评价记录</p> : detailClass?.periodRecords.map((record) => <div key={record.id} className="flex flex-wrap items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0"><span className="w-24 text-xs text-muted-foreground">{record.date}</span><span className="flex-1 text-sm">{record.level1} / {record.level2}</span><span className={cn("font-semibold", record.totalDeduction > 0 ? "text-emerald-700" : "text-rose-700")}>{record.totalDeduction > 0 ? "+" : ""}{record.totalDeduction}</span></div>)}</div></DialogContent>
      </Dialog>

      <Dialog open={!!flagDialog} onOpenChange={(open) => !open && setFlagDialog(null)}>
        <DialogContent className="max-w-md overflow-hidden border border-amber-200/80 bg-gradient-to-b from-[#fff8e8] via-white to-[#f3f1ff] p-0 shadow-[0_24px_60px_-28px_rgba(126,91,209,0.58)] sm:max-w-md">
          <div className="h-1.5 bg-gradient-to-r from-[#f3bd48] via-[#ffda7e] to-[#9d91f7]" />
          <div className="p-6">
            <DialogHeader className="items-center text-center">
              <div className="mb-2 flex size-14 items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-[#ffd96b] to-[#f09a4c] text-white shadow-[0_12px_24px_-14px_rgba(224,144,43,0.85)]"><Flag className="size-7 fill-current" /></div>
              <DialogTitle className="text-lg text-[#5c4a28]">{isHistorical ? "查看历史流动红旗" : selectedFlagAwarded ? "流动红旗已发放" : "颁发流动红旗"}</DialogTitle>
              <p className="text-xs text-[#8b7d5d]">{isHistorical ? "历史周期数据仅供查看，不可修改" : `将${period === "week" ? "本周" : "本月"}荣誉授予表现优秀的班级`}</p>
            </DialogHeader>
            <div className="mt-5 rounded-2xl border border-amber-200/80 bg-white/75 p-4 text-center">
              <p className="text-xs font-medium tracking-[0.16em] text-[#af8a42]">{isHistorical ? period === "week" ? `${formatWeekLabel(weekKey)}历史记录` : `${formatMonthLabel(monthPrefix)}历史记录` : period === "week" ? "本周" : "本月"}荣誉班级</p>
              <p className="mt-1 text-xl font-bold text-[#54477f]">{ranking.find((row) => row.cls.id === flagDialog?.classId)?.cls.name}</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"><Sparkles className="size-3.5" />{selectedFlagConfig?.name ?? "流动红旗"}</span>
            </div>
            {!isHistorical && !selectedFlagAwarded && selectedFlagConfig?.syncFiveEducation && <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.05] p-3 text-sm font-medium text-foreground hover:bg-primary/[0.08]">
              <input type="checkbox" checked={syncPoints} onChange={(event) => setSyncPoints(event.target.checked)} className="size-4 accent-[var(--primary)]" />
              <span className="flex min-w-0 flex-1 flex-col"><span>同步发放五育积分</span><span className="mt-0.5 text-xs font-normal text-muted-foreground">按当前流动红旗配置同步积分</span></span>
            </label>}
            <DialogFooter className="mt-5 gap-2 sm:justify-center">
              <Button variant="outline" className="h-10 rounded-full border-border/70 bg-white/70 px-5" onClick={() => setFlagDialog(null)}>{isHistorical || selectedFlagAwarded ? "关闭" : "暂不颁发"}</Button>
              {!isHistorical && !selectedFlagAwarded && canManageFlags && <Button className="h-10 rounded-full bg-gradient-to-r from-[#f4b63e] to-[#f08a4b] px-5 font-bold text-white shadow-[0_10px_20px_-12px_rgba(213,123,35,0.85)] hover:from-[#e9a832] hover:to-[#e97c40]" onClick={handleFlag}><Flag className="size-4 fill-current" />确认颁发</Button>}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
