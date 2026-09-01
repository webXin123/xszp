"use client"

import { useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Download, Eye, HeartPulse, Upload } from "lucide-react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { EvaluationProvider, useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import {
  PE_CLASSES,
  PE_GRADE_NAMES,
  buildPePreviewRows,
  getPeClass,
  getSemesterLabel,
  peGenderLabel,
  type PeClass,
  type PeGender,
  type PeScoreUpload,
} from "@/lib/pe-scores"

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

function expectedCount(cls: PeClass, gender: PeGender) {
  return gender === "male" ? cls.maleCount : cls.femaleCount
}

function PeScoreImportPage() {
  const { currentTeacher, peScoreUploads, addPeScoreUpload } = useEvaluation()
  const { canImportPeScores, peClassIds, role } = usePermission()
  const isAdmin = role === "director"

  const visibleClasses = useMemo(
    () => PE_CLASSES.filter((c) => peClassIds.includes(c.id)),
    [peClassIds],
  )

  const uploadMap = useMemo(() => {
    const map = new Map<string, PeScoreUpload>()
    for (const u of peScoreUploads) map.set(`${u.classId}:${u.gender}`, u)
    return map
  }, [peScoreUploads])

  const totalFiles = visibleClasses.length * 2
  const uploadedFiles = useMemo(
    () =>
      visibleClasses.reduce(
        (acc, c) =>
          acc +
          (uploadMap.has(`${c.id}:male`) ? 1 : 0) +
          (uploadMap.has(`${c.id}:female`) ? 1 : 0),
        0,
      ),
    [visibleClasses, uploadMap],
  )
  const uploadedRows = useMemo(
    () =>
      visibleClasses.reduce(
        (acc, c) =>
          acc +
          (uploadMap.get(`${c.id}:male`)?.rowCount ?? 0) +
          (uploadMap.get(`${c.id}:female`)?.rowCount ?? 0),
        0,
      ),
    [visibleClasses, uploadMap],
  )
  const pendingStudents = useMemo(
    () =>
      visibleClasses.reduce(
        (acc, c) =>
          acc +
          (uploadMap.has(`${c.id}:male`) ? 0 : c.maleCount) +
          (uploadMap.has(`${c.id}:female`) ? 0 : c.femaleCount),
        0,
      ),
    [visibleClasses, uploadMap],
  )

  const [pendingSlot, setPendingSlot] = useState<{ classId: string; gender: PeGender } | null>(
    null,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [viewing, setViewing] = useState<PeScoreUpload | null>(null)

  const startUpload = (classId: string, gender: PeGender) => {
    setPendingSlot({ classId, gender })
    fileInputRef.current?.click()
  }

  const handleFilePicked: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    const slot = pendingSlot
    if (!file || !slot) return

    const reader = new FileReader()
    reader.onload = () => {
      let rowCount = 0
      let preview: (string | number)[][] = []
      try {
        const wb = XLSX.read(reader.result, { type: "array" })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        if (sheet) {
          const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
            header: 1,
            defval: "",
          })
          rowCount = Math.max(rows.length - 1, 0)
          preview = rows.slice(0, 9)
        }
      } catch {
        rowCount = 0
        preview = []
      }
      // 原型兜底：空文件 / 解析失败时生成演示预览，保证展示效果
      const cls = getPeClass(slot.classId)
      const expected = cls ? expectedCount(cls, slot.gender) : 0
      if (rowCount <= 0 || preview.length === 0) {
        rowCount = expected
        preview = buildPePreviewRows(slot.classId, slot.gender, Math.min(expected, 8))
      }
      addPeScoreUpload({
        classId: slot.classId,
        gender: slot.gender,
        fileName: file.name,
        rowCount,
        preview,
      })
      setPendingSlot(null)
    }
    reader.readAsArrayBuffer(file)
  }

  const downloadViewing = () => {
    if (!viewing) return
    const sheet = XLSX.utils.aoa_to_sheet(viewing.preview)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "成绩")
    XLSX.writeFile(book, viewing.fileName)
  }

  const viewingClass = viewing ? getPeClass(viewing.classId) : undefined

  const renderSlot = (cls: PeClass, gender: PeGender) => {
    const upload = uploadMap.get(`${cls.id}:${gender}`)
    const label = peGenderLabel(gender)
    const count = expectedCount(cls, gender)

    if (!upload) {
      return (
        <button
          key={gender}
          type="button"
          onClick={() => startUpload(cls.id, gender)}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border/70 px-3 py-3.5 text-center transition hover:border-brand-blue/60 hover:bg-brand-blue/5"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Upload className="size-4 text-muted-foreground" />
            {label} · 待上传
          </span>
          <span className="text-xs text-brand-orange">待上传 {count} 条成绩</span>
        </button>
      )
    }

    return (
      <div
        key={gender}
        role="button"
        tabIndex={0}
        onClick={() => setViewing(upload)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setViewing(upload)
        }}
        className="flex cursor-pointer flex-col gap-1.5 rounded-xl border border-brand-green/40 bg-brand-green/8 px-3 py-3.5 transition hover:border-brand-green/70 hover:shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-brand-green">
            <HeartPulse className="size-4" />
            {label} · 已上传
          </span>
          <span className="shrink-0 text-xs font-semibold text-brand-green">
            {upload.rowCount} 条
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground" title={upload.fileName}>
          {upload.fileName}
        </p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {upload.uploaderName} · {formatTime(upload.uploadedAt)}
          </span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-0.5 rounded px-1 py-0.5 text-brand-blue transition hover:bg-brand-blue/10"
              onClick={(e) => {
                e.stopPropagation()
                setViewing(upload)
              }}
            >
              <Eye className="size-3.5" />
              查看
            </button>
            <button
              type="button"
              className="flex items-center gap-0.5 rounded px-1 py-0.5 transition hover:bg-brand-blue/10"
              onClick={(e) => {
                e.stopPropagation()
                startUpload(cls.id, gender)
              }}
            >
              <Upload className="size-3.5" />
              重新上传
            </button>
          </span>
        </div>
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
              班级评价
            </Link>
            {isAdmin && (
              <Link
                href="/offline-award-cards"
                className="relative flex items-center gap-1.5 px-4 py-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                <Download className="size-4" />
                线下奖卡下载
              </Link>
            )}
            <span className="relative flex items-center gap-1.5 px-4 py-4 text-sm font-semibold text-foreground">
              <HeartPulse className="size-4" />
              体质健康成绩导入
              <span className="absolute inset-x-4 bottom-1.5 h-0.5 rounded-full bg-gradient-to-r from-primary to-primary-2 shadow-[0_0_10px_-1px] shadow-primary/50" />
            </span>
          </nav>

          <span className="shrink-0 text-xs text-muted-foreground">
            {currentTeacher ? `${currentTeacher.name} · 体育组` : "体育组"}
          </span>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFilePicked}
        aria-label="选择成绩 Excel 文件"
      />

      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-4 max-w-[1240px]">
        <main className="glass-panel flex min-h-0 w-full min-w-0  flex-col gap-6 overflow-y-auto rounded-2xl p-4 sm:p-6">
          {!canImportPeScores ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <HeartPulse className="size-10 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">暂无导入权限</p>
              <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                体质健康成绩导入仅对体育任课老师与管理员开放。可在右上角切换身份为「钱进 · 语文、体育任课教师」或「李静 · 管理员」后体验。
              </p>
              <Link
                href="/"
                className="mt-2 rounded-xl bg-gradient-to-r from-primary to-primary-2 px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30 transition hover:shadow-lg hover:shadow-primary/40 hover:brightness-105"
              >
                返回主页
              </Link>
            </div>
          ) : (
            <>
              {/* ---------------- 标题 + 统计 ---------------- */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-foreground">体质健康成绩导入</h1>
                    <span className="rounded-full bg-brand-blue/15 px-2.5 py-0.5 text-xs font-medium text-brand-blue">
                      {getSemesterLabel()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    按班级分别上传 1-5 年级男生 / 女生体质健康成绩（.xlsx），点击卡片即可选择文件
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="glass-panel flex flex-col gap-1 rounded-2xl p-4">
                  <span className="text-xs text-muted-foreground">已上传成绩条数</span>
                  <span className="text-2xl font-bold text-brand-green">{uploadedRows}</span>
                  <span className="text-[11px] text-muted-foreground">
                    已上传 {uploadedFiles} 个文件
                  </span>
                </div>
                <div className="glass-panel flex flex-col gap-1 rounded-2xl p-4">
                  <span className="text-xs text-muted-foreground">待上传成绩数</span>
                  <span className="text-2xl font-bold text-brand-orange">{pendingStudents}</span>
                  <span className="text-[11px] text-muted-foreground">
                    剩余 {totalFiles - uploadedFiles} 个文件待上传
                  </span>
                </div>
                <div className="glass-panel flex flex-col gap-2 rounded-2xl p-4">
                  <span className="text-xs text-muted-foreground">上传进度</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">{uploadedFiles}</span>
                    <span className="text-sm text-muted-foreground">/ {totalFiles} 个文件</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-green to-chart-2 transition-[width] duration-300"
                      style={{ width: totalFiles ? `${(uploadedFiles / totalFiles) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>

              {/* ---------------- 班级卡片 ---------------- */}
              {PE_GRADE_NAMES.map((grade) => {
                const classes = visibleClasses.filter((c) => c.gradeName === grade)
                if (classes.length === 0) return null
                return (
                  <section key={grade} className="flex flex-col gap-3">
                    <h2 className="text-sm font-semibold text-foreground">{grade}</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {classes.map((cls) => {
                        const maleUploaded = uploadMap.has(`${cls.id}:male`)
                        const femaleUploaded = uploadMap.has(`${cls.id}:female`)
                        const clsDone = maleUploaded && femaleUploaded
                        return (
                          <div
                            key={cls.id}
                            className={cn(
                              "glass-panel flex flex-col gap-3 rounded-2xl p-4 transition",
                              clsDone && "border-brand-green/40",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-foreground">{cls.name}</p>
                              <span className="text-[11px] text-muted-foreground">
                                全班 {cls.maleCount + cls.femaleCount} 人 · 男 {cls.maleCount} / 女{" "}
                                {cls.femaleCount}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {renderSlot(cls, "male")}
                              {renderSlot(cls, "female")}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </>
          )}
        </main>
      </div>

      {/* ---------------- 查看已上传文件 ---------------- */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="glass-surface max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {viewingClass?.name ?? ""} {viewing ? peGenderLabel(viewing.gender) : ""}成绩 ·{" "}
              {viewing?.fileName}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                共 {viewing.rowCount} 条成绩 · 上传人 {viewing.uploaderName} ·{" "}
                {formatTime(viewing.uploadedAt)}
              </p>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full min-w-max text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-gradient-to-r from-primary/8 to-brand-blue/5">
                      {viewing.preview[0]?.map((cell, i) => (
                        <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold text-foreground">
                          {String(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewing.preview.slice(1).map((row, ri) => (
                      <tr key={ri} className="border-b border-border/40 last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {viewing.rowCount > viewing.preview.length - 1 && (
                <p className="text-[11px] text-muted-foreground">
                  仅预览前 {viewing.preview.length - 1} 条数据
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setViewing(null)}>
              关闭
            </Button>
            <Button onClick={downloadViewing}>
              <Download className="size-4" />
              下载文件
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PeScoreImportPageWithProvider() {
  return (
    <EvaluationProvider>
      <PeScoreImportPage />
    </EvaluationProvider>
  )
}
