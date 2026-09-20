"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Award,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  Trash2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { EvaluationProvider, useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"
import { AWARD_GROUPS, getAwardGroup } from "@/lib/award-utils"
import {
  exportAwardCardsExcel,
  type AwardCardExportRow,
} from "@/lib/award-print-utils"
import { formatDate, getISOWeekKey } from "@/lib/scoring-utils"

const MAX_QTY = 9999
const MAX_POINTS = 999
const DEFAULT_POINTS = 1

interface CardEntry {
  id: string
  level1: string
  level2: string
  level3: string
  quantity: number
  points: number
}

function newEntryId() {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function OfflineAwardCardsPage({ embedded = false }: { embedded?: boolean }) {
  const { addAwardCards } = useEvaluation()
  const { role } = usePermission()
  // 仅管理员（director）可下载奖卡
  const isAdmin = role === "director"

  const [entries, setEntries] = useState<CardEntry[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [level1, setLevel1] = useState<string>("")
  const [level2, setLevel2] = useState<string>("")
  const [level3, setLevel3] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1)
  const [points, setPoints] = useState<number>(DEFAULT_POINTS)
  const [exported, setExported] = useState(false)

  const selectedLevel1Group = AWARD_GROUPS.find((group) => group.level1 === level1)
  const selectedLevel2Group = selectedLevel1Group?.items.find((group) => group.level2 === level2)
  const selectedLevel3 = selectedLevel2Group?.items.find((item) => item.id === level3)

  const total = useMemo(
    () => entries.reduce((sum, e) => sum + e.quantity, 0),
    [entries],
  )

  const openCreateDialog = () => {
    setEditingId(null)
    setLevel1("")
    setLevel2("")
    setLevel3("")
    setQuantity(1)
    setPoints(DEFAULT_POINTS)
    setDialogOpen(true)
  }

  const openEditDialog = (entry: CardEntry) => {
    setEditingId(entry.id)
    setLevel1(entry.level1)
    setLevel2(entry.level2)
    setLevel3(entry.level3)
    setQuantity(entry.quantity)
    setPoints(entry.points)
    setDialogOpen(true)
  }

  const clampInt = (v: number | string, min: number, max: number) => {
    const n = Math.floor(Number(v) || 0)
    return Math.max(min, Math.min(max, n))
  }

  const handleDialogConfirm = () => {
    const q = clampInt(quantity, 1, MAX_QTY)
    const p = clampInt(points, 0, MAX_POINTS)
    if (!level1 || !level2 || !level3 || !selectedLevel3 || q <= 0) return
    if (editingId) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingId ? { ...e, level1, level2, level3, quantity: q, points: p } : e,
        ),
      )
    } else {
      setEntries((prev) => [
        ...prev,
        { id: newEntryId(), level1, level2, level3, quantity: q, points: p },
      ])
    }
    setExported(false)
    setDialogOpen(false)
  }

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setExported(false)
  }

  const handleExport = () => {
    if (total <= 0) return
    const rows: AwardCardExportRow[] = []
    for (const e of entries) {
      for (let i = 0; i < e.quantity; i += 1) {
        rows.push({ level1: e.level1, level2: e.level2, level3: e.level3, points: e.points })
      }
    }
    exportAwardCardsExcel(rows)

    const weekKey = getISOWeekKey(new Date())
    const today = formatDate(new Date())
    addAwardCards(
      rows.map((r) => ({
        studentId: "offline",
        studentName: "线下发放",
        classId: "offline",
        indicatorId: `offline-${r.level1}-${r.level2}-${r.level3}`,
        level1: r.level1,
        level2: r.level2,
        level3: r.level3,
        points: r.points,
        weekKey,
        date: today,
      })),
    )
    setExported(true)
  }

  const editing = editingId !== null

  // 权限门禁：仅管理员可下载奖卡
  if (!isAdmin) {
    return (
      <StandalonePageShell embedded={embedded} mainId="offline-award-cards-main" activeLabel="线下奖卡导出" activeIcon="download">
        <main id="offline-award-cards-main" className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-3xl border border-[#cfd8f6] bg-white p-8 text-center shadow-[0_24px_50px_-34px_rgba(53,67,150,0.7)]">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Download className="size-7" /></span>
        <p className="text-base font-bold text-foreground">无下载权限</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          线下奖卡导出仅对管理员开放。可在右上角切换身份为「李静 · 管理员」后体验。
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          返回主页
        </Link>
        </div>
        </main>
      </StandalonePageShell>
    )
  }

  return (
    <StandalonePageShell embedded={embedded} mainId="offline-award-cards-main" activeLabel="线下奖卡导出" activeIcon="download">
        <main id="offline-award-cards-main" className="flex w-full min-w-0 flex-col gap-6 bg-transparent p-0">
          {/* ---------------- 标题 + 操作 ---------------- */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dee4f8] bg-gradient-to-r from-[#f1f3ff] via-white to-[#f8f4ff] p-4 sm:p-5">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">线下发放</span>
              {embedded ? (
                <h2 className="mt-2 text-xl font-bold text-foreground">线下奖卡导出</h2>
              ) : (
                <h1 className="mt-2 text-xl font-bold text-foreground">线下奖卡导出</h1>
              )}
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                点击「增加奖卡」选择一级、二级、三级指标，设置数量与积分，确认后点右上「确认导出」生成 Excel
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm font-bold text-primary shadow-[0_6px_14px_-14px_rgba(54,67,153,0.85)]">
                合计 <span className="tabular-nums">{total}</span> 张
              </span>
              <Button
                type="button"
                size="sm"
                className="h-10 rounded-xl px-4 shadow-[0_10px_20px_-14px_rgba(54,67,153,0.9)]"
                disabled={total <= 0}
                onClick={handleExport}
              >
                <FileSpreadsheet className="size-4" />
                确认导出（{total} 张）
              </Button>
            </div>
          </div>

          {/* ---------------- 空态 / 卡片列表 ---------------- */}
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#cbd5f5] bg-[#f8f9ff] py-16">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Award className="size-7" />
              </span>
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-semibold text-foreground">还未添加奖卡</p>
                <p className="text-xs text-muted-foreground">
                  点击下方按钮，选择一级、二级、三级指标并设置发放数量、奖卡积分
                </p>
              </div>
              <Button
                type="button"
                className="mt-1 h-10 rounded-xl px-4"
                onClick={openCreateDialog}
              >
                <Plus className="size-4" />
                增加奖卡
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {entries.map((entry) => {
                  const group = getAwardGroup(entry.level1)
                  const level2Group = group?.items.find((item) => item.level2 === entry.level2)
                  const indicator = level2Group?.items.find((item) => item.id === entry.level3)
                  const cover = indicator?.image ?? null
                  return (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#dce3f7] bg-[#fbfcff] p-3.5 shadow-[0_10px_22px_-22px_rgba(55,67,145,0.65)] transition hover:border-primary/35 hover:bg-white"
                    >
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt={`${entry.level1} 奖卡封面`}
                          className="size-16 shrink-0 rounded-xl border border-[#dce2f5] bg-white object-contain shadow-sm"
                        />
                      ) : (
                        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-[#dce2f5] bg-white text-primary">
                          <Award className="size-6 text-muted-foreground" />
                        </span>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          {entry.level1} · {entry.level2}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          三级指标：{indicator?.level3 ?? entry.level3}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
                          {entry.points} 积分
                        </span>
                        <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700">
                          ×{entry.quantity} 张
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditDialog(entry)}
                          className="flex size-9 items-center justify-center rounded-lg border border-[#dce2f5] bg-white text-muted-foreground transition hover:border-primary/35 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          aria-label={`编辑 ${entry.level1}`}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="flex size-9 items-center justify-center rounded-lg border border-[#dce2f5] bg-white text-muted-foreground transition hover:border-destructive/35 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
                          aria-label={`删除 ${entry.level1}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-[#d5dcf5] bg-[#f8f9ff] px-4 hover:bg-primary/5"
                  onClick={openCreateDialog}
                >
                  <Plus className="size-4" />
                  增加奖卡
                </Button>
              </div>
            </>
          )}

          {/* ---------------- 导出成功提示 ---------------- */}
          {exported && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
              <CheckCircle className="size-4" />
              已生成 {total} 张线下奖卡，Excel 已自动下载
            </div>
          )}
        </main>

      {/* ---------------- 增加 / 编辑奖卡弹窗 ---------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border border-[#d4dcf7] bg-white shadow-[0_26px_60px_-30px_rgba(53,67,150,0.65)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑奖卡" : "增加奖卡"}</DialogTitle>
            <DialogDescription>
              一级、二级、三级指标均为必选项，再设置本次发放的数量与每张奖卡的积分
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                一级指标 <span className="text-destructive">*</span>
              </label>
              <Select
                value={level1}
                onValueChange={(v) => {
                  setLevel1(String(v ?? ""))
                  setLevel2("")
                  setLevel3("")
                }}
              >
                <SelectTrigger className="w-full border-[#dce2f5] bg-[#f9faff]">
                  <SelectValue placeholder="请选择一级指标" />
                </SelectTrigger>
                <SelectContent>
                  {AWARD_GROUPS.map((g) => (
                    <SelectItem key={g.level1} value={g.level1}>
                      {g.level1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                二级指标 <span className="text-destructive">*</span>
              </label>
              <Select
                value={level2}
                onValueChange={(v) => {
                  setLevel2(String(v ?? ""))
                  setLevel3("")
                }}
                disabled={!level1}
              >
                <SelectTrigger className="w-full border-[#dce2f5] bg-[#f9faff]">
                  <SelectValue placeholder="请选择二级指标" />
                </SelectTrigger>
                <SelectContent>
                  {selectedLevel1Group?.items.map((group) => (
                    <SelectItem key={group.level2} value={group.level2}>
                      {group.level2}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                三级指标 <span className="text-destructive">*</span>
              </label>
              <Select
                value={selectedLevel3?.level3 ?? ""}
                onValueChange={(v) => setLevel3(selectedLevel2Group?.items.find((item) => item.level3 === v)?.id ?? "")}
                disabled={!level2}
              >
                <SelectTrigger className="w-full border-[#dce2f5] bg-[#f9faff]">
                  <SelectValue placeholder="请选择三级指标" />
                </SelectTrigger>
                <SelectContent>
                  {selectedLevel2Group?.items.map((item) => (
                    <SelectItem key={item.id} value={item.level3}>
                      {item.level3}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  发放数量 <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={MAX_QTY}
                  value={quantity}
                  onChange={(e) => setQuantity(clampInt(e.target.value, 0, MAX_QTY))}
                  className="h-10 rounded-lg border border-[#dce2f5] bg-[#f9faff] px-3 text-sm font-semibold text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="发放数量"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  奖卡积分 <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={MAX_POINTS}
                  value={points}
                  onChange={(e) => setPoints(clampInt(e.target.value, 0, MAX_POINTS))}
                  className="h-10 rounded-lg border border-[#dce2f5] bg-[#f9faff] px-3 text-sm font-semibold text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="奖卡积分"
                />
              </div>
            </div>

            <p className={cn("text-xs leading-relaxed text-muted-foreground")}>
              每张奖卡对应一条 Excel 记录。本次添加 {quantity} 张，每张 {points} 积分。
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="bg-transparent"
              onClick={() => setDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={
                !level1 ||
                !level2 ||
                !level3 ||
                clampInt(quantity, 0, MAX_QTY) <= 0
              }
              onClick={handleDialogConfirm}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StandalonePageShell>
  )
}

export default function OfflineAwardCardsPageWithProvider() {
  return (
    <EvaluationProvider>
      <OfflineAwardCardsPage />
    </EvaluationProvider>
  )
}
