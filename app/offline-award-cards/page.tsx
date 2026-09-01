"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
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
  quantity: number
  points: number
}

function newEntryId() {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function OfflineAwardCardsPage() {
  const { addAwardCards } = useEvaluation()
  const { role } = usePermission()
  // 仅管理员（director）可下载奖卡
  const isAdmin = role === "director"

  const [entries, setEntries] = useState<CardEntry[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [level1, setLevel1] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1)
  const [points, setPoints] = useState<number>(DEFAULT_POINTS)
  const [exported, setExported] = useState(false)

  const total = useMemo(
    () => entries.reduce((sum, e) => sum + e.quantity, 0),
    [entries],
  )

  const openCreateDialog = () => {
    setEditingId(null)
    setLevel1("")
    setQuantity(1)
    setPoints(DEFAULT_POINTS)
    setDialogOpen(true)
  }

  const openEditDialog = (entry: CardEntry) => {
    setEditingId(entry.id)
    setLevel1(entry.level1)
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
    if (!level1 || q <= 0) return
    if (editingId) {
      setEntries((prev) =>
        prev.map((e) => (e.id === editingId ? { ...e, level1, quantity: q, points: p } : e)),
      )
    } else {
      setEntries((prev) => [
        ...prev,
        { id: newEntryId(), level1, quantity: q, points: p },
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
        rows.push({ level1: e.level1, points: e.points })
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
        indicatorId: `offline-${r.level1}`,
        level1: r.level1,
        level2: "线下奖卡",
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Download className="size-10 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">无下载权限</p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          线下奖卡下载仅对管理员开放。可在右上角切换身份为「李静 · 管理员」后体验。
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-gradient-to-r from-primary to-primary-2 px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30 transition hover:shadow-lg hover:shadow-primary/40 hover:brightness-105"
        >
          返回主页
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden px-4 pb-4 pt-16 sm:px-6">
      {/* 固定顶栏：与主站一致 */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center justify-between gap-4 px-4">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg ring-1 ring-border/40">
              <Image src="/images/logo.png" alt="明珠临港" width={30} height={30} />
            </span>
            <div className="hidden flex-col leading-tight md:flex">
              <span className="text-sm font-bold text-foreground">明珠临港</span>
              <span className="text-[11px] text-muted-foreground">学生综合评价</span>
            </div>
          </div>

          <nav className="flex min-w-0 items-center gap-1">
            <Link
              href="/"
              className="relative flex items-center gap-1.5 px-4 py-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <Award className="size-4" />
              班级评价
            </Link>
            <span className="relative flex items-center gap-1.5 px-4 py-4 text-sm font-semibold text-foreground">
              <Download className="size-4" />
              线下奖卡下载
              <span className="absolute inset-x-4 bottom-1.5 h-0.5 rounded-full bg-gradient-to-r from-primary to-primary-2 shadow-[0_0_10px_-1px] shadow-primary/50" />
            </span>
          </nav>

          <span className="shrink-0 text-xs text-muted-foreground">教务管理</span>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full  flex-col gap-4 max-w-[1240px]">
        <main className="glass-panel flex min-h-0 w-full min-w-0 flex-col gap-6 overflow-y-auto rounded-2xl p-4 sm:p-6">
          {/* ---------------- 标题 + 操作 ---------------- */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground">线下奖卡下载</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                点击「增加奖卡」选择一级指标、数量与积分，确认后点右上「确认导出」生成 Excel
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-green/15 px-3 py-1 text-sm font-semibold text-brand-green">
                合计 {total} 张
              </span>
              <Button
                type="button"
                size="sm"
                className="rounded-lg"
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
            <div className="glass-panel flex flex-col items-center justify-center gap-3 rounded-2xl border-dashed py-14">
              <span className="flex size-14 items-center justify-center rounded-full bg-muted/50">
                <Award className="size-7 text-muted-foreground" />
              </span>
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-semibold text-foreground">还未添加奖卡</p>
                <p className="text-xs text-muted-foreground">
                  点击下方按钮，从 10 类一级指标中选择并设置发放数量、奖卡积分
                </p>
              </div>
              <Button
                type="button"
                className="mt-1 rounded-lg"
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
                  const cover = group?.items[0]?.image ?? null
                  return (
                    <div
                      key={entry.id}
                      className="glass-panel flex flex-wrap items-center gap-4 rounded-2xl border-brand-green/40 p-3 transition"
                    >
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt={`${entry.level1} 奖卡封面`}
                          className="size-16 shrink-0 rounded-xl border border-border/40 bg-white object-contain"
                        />
                      ) : (
                        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-white/5">
                          <Award className="size-6 text-muted-foreground" />
                        </span>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          {entry.level1}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          二级指标：{group ? group.items.map((i) => i.level2).join("、") : "-"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
                          {entry.points} 积分
                        </span>
                        <span className="rounded-full bg-brand-green/15 px-3 py-1 text-sm font-semibold text-brand-green">
                          ×{entry.quantity} 张
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditDialog(entry)}
                          className="flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
                          aria-label={`编辑 ${entry.level1}`}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
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
                  className="rounded-lg bg-transparent"
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
            <div className="glass-panel flex items-center gap-2 rounded-2xl p-3 text-sm font-medium text-brand-green">
              <CheckCircle className="size-4" />
              已生成 {total} 张线下奖卡，Excel 已自动下载
            </div>
          )}
        </main>
      </div>

      {/* ---------------- 增加 / 编辑奖卡弹窗 ---------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑奖卡" : "增加奖卡"}</DialogTitle>
            <DialogDescription>
              选择一级指标，并设置本次发放的数量与每张奖卡的积分
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                一级指标 <span className="text-destructive">*</span>
              </label>
              <Select value={level1} onValueChange={(v) => setLevel1(String(v ?? ""))}>
                <SelectTrigger className="w-full">
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
                  className="glass-panel h-9 rounded-lg border-border/60 bg-transparent px-3 text-sm font-semibold text-foreground outline-none focus:border-primary/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                  className="glass-panel h-9 rounded-lg border-border/60 bg-transparent px-3 text-sm font-semibold text-foreground outline-none focus:border-primary/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="奖卡积分"
                />
              </div>
            </div>

            <p className={cn("text-[11px] leading-relaxed text-muted-foreground")}>
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
              disabled={!level1 || clampInt(quantity, 0, MAX_QTY) <= 0}
              onClick={handleDialogConfirm}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function OfflineAwardCardsPageWithProvider() {
  return (
    <EvaluationProvider>
      <OfflineAwardCardsPage />
    </EvaluationProvider>
  )
}
