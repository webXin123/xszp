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
          className="flex min-h-[108px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#bfcdf5] bg-[#fbfcff] px-3 py-3.5 text-center transition-colors hover:border-primary/60 hover:bg-primary/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Upload className="size-4 text-primary" aria-hidden="true" />
            {label} · 待上传
          </span>
          <span className="rounded-md bg-[#fff4e4] px-1.5 py-0.5 text-xs font-medium text-brand-orange">待上传 {count} 条成绩</span>
        </button>
      )
    }

    return (
      <div key={gender} className="flex min-h-[108px] flex-col gap-2 rounded-xl border border-[#bfe6d1] bg-[#f0fbf5] px-3 py-3.5">
        <button type="button" onClick={() => setViewing(upload)} className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/45">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-green">
              <HeartPulse className="size-4" aria-hidden="true" />
              {label} · 已上传
            </span>
            <span className="shrink-0 rounded-md bg-white/75 px-1.5 py-0.5 text-xs font-bold text-brand-green">
              {upload.rowCount} 条
            </span>
          </div>
          <p className="mt-1.5 truncate text-xs text-muted-foreground" title={upload.fileName}>
            {upload.fileName}
          </p>
        </button>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {upload.uploaderName} · {formatTime(upload.uploadedAt)}
          </span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-0.5 rounded px-1 py-0.5 text-brand-blue transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={() => setViewing(upload)}
            >
              <Eye className="size-3.5" aria-hidden="true" />
              查看
            </button>
            <button
              type="button"
              className="flex items-center gap-0.5 rounded px-1 py-0.5 transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={() => startUpload(cls.id, gender)}
            >
              <Upload className="size-3.5" aria-hidden="true" />
              重新上传
            </button>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#eef1ff] px-4 pb-5 pt-16 sm:px-6">
      {/* 固定顶栏：与主站一致 */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#d7def8] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center justify-between gap-4 px-4">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-[#d5ddf7]">
              <Image src="/xszp/images/logo.png" alt="屹力学生综评" width={30} height={30} />
            </span>
            <div className="hidden flex-col leading-tight md:flex">
              <span className="text-sm font-bold text-foreground">屹力学生综评</span>
              <span className="text-xs text-muted-foreground">综合评价平台</span>
            </div>
          </div>

          <nav className="flex min-w-0 items-center gap-1">
            <Link
              href="/class-evaluation"
              className="relative flex items-center gap-1.5 px-4 py-4 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              班级评价
            </Link>
            {isAdmin && (
              <Link
                href="/offline-award-cards"
                className="relative flex items-center gap-1.5 px-4 py-4 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Download className="size-4" aria-hidden="true" />
                线下奖卡下载
              </Link>
            )}
            <span className="relative flex items-center gap-1.5 px-4 py-4 text-sm font-semibold text-primary">
              <HeartPulse className="size-4" aria-hidden="true" />
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

      <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-4 pt-1">
        <main className="flex w-full min-w-0 flex-col gap-5 rounded-[26px] border border-[#cbd5f5] bg-white p-4 shadow-[0_24px_52px_-34px_rgba(48,62,139,0.76)] sm:p-6">
          {!canImportPeScores ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c8d4f7] bg-[#f7f8ff] py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><HeartPulse className="size-7" aria-hidden="true" /></span>
              <p className="text-sm font-semibold text-foreground">暂无导入权限</p>
              <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                体质健康成绩导入仅对体育教师与管理员开放。可在右上角切换身份为「钱进 · 体育教师」或「李静 · 管理员」后体验。
              </p>
              <Link
                href="/"
                className="mt-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_10px_20px_-14px_rgba(63,81,188,0.95)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
              >
                返回主页
              </Link>
            </div>
          ) : (
            <>
              {/* ---------------- 标题 + 统计 ---------------- */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce3f8] bg-[#f6f8ff] px-4 py-3.5 sm:px-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_16px_-10px_rgba(63,81,188,0.9)]"><HeartPulse className="size-5" aria-hidden="true" /></span>
                    <h1 className="text-lg font-bold text-foreground">体质健康成绩导入</h1>
                    <span className="rounded-full border border-[#d7e2ff] bg-white px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {getSemesterLabel()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    按班级分别上传 1-5 年级男生 / 女生体质健康成绩（.xlsx），点击卡片即可选择文件
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1 rounded-2xl border border-[#d6e7de] bg-[#f4fcf7] p-4 shadow-[0_10px_22px_-22px_rgba(38,128,90,0.68)]">
                  <span className="text-xs font-medium text-muted-foreground">已上传成绩条数</span>
                  <span className="text-2xl font-bold text-brand-green">{uploadedRows}</span>
                  <span className="text-xs text-muted-foreground">
                    已上传 {uploadedFiles} 个文件
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-2xl border border-[#f1dec5] bg-[#fff9f2] p-4 shadow-[0_10px_22px_-22px_rgba(179,107,36,0.52)]">
                  <span className="text-xs font-medium text-muted-foreground">待上传成绩数</span>
                  <span className="text-2xl font-bold text-brand-orange">{pendingStudents}</span>
                  <span className="text-xs text-muted-foreground">
                    剩余 {totalFiles - uploadedFiles} 个文件待上传
                  </span>
                </div>
                <div className="flex flex-col gap-2 rounded-2xl border border-[#d8e0f7] bg-[#f7f9ff] p-4 shadow-[0_10px_22px_-22px_rgba(53,67,150,0.58)]">
                  <span className="text-xs font-medium text-muted-foreground">上传进度</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">{uploadedFiles}</span>
                    <span className="text-sm text-muted-foreground">/ {totalFiles} 个文件</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#e1e6f7]">
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
                  <section key={grade} className="flex flex-col gap-3 rounded-2xl border border-[#dce3f8] bg-[#f5f7ff] p-3 sm:p-4">
                    <div className="flex items-center gap-2"><span aria-hidden="true" className="flex size-7 items-center justify-center rounded-lg bg-white text-primary shadow-[0_6px_12px_-10px_rgba(63,81,188,0.8)]">{grade.slice(0, 1)}</span><h2 className="text-sm font-bold text-foreground">{grade}</h2></div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {classes.map((cls) => {
                        const maleUploaded = uploadMap.has(`${cls.id}:male`)
                        const femaleUploaded = uploadMap.has(`${cls.id}:female`)
                        const clsDone = maleUploaded && femaleUploaded
                        return (
                          <div
                            key={cls.id}
                            className={cn(
                              "flex flex-col gap-3 rounded-2xl border border-[#dfe5f7] bg-white p-4 shadow-[0_10px_22px_-22px_rgba(53,67,150,0.58)] transition-colors hover:border-primary/35",
                              clsDone && "border-[#bfe6d1] bg-[#fcfffd]",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">{cls.name}</p>
                              <span className="shrink-0 rounded-md bg-[#f2f4fb] px-1.5 py-0.5 text-xs text-muted-foreground">
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
        <DialogContent className="max-h-[85vh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[24px] border border-[#cbd5f5] bg-white p-0 shadow-[0_28px_70px_-36px_rgba(48,62,139,0.72)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-3xl">
          <DialogHeader className="border-b border-[#dce3f8] bg-[#f6f8ff] px-5 py-4">
            <DialogTitle>
              {viewingClass?.name ?? ""} {viewing ? peGenderLabel(viewing.gender) : ""}成绩 ·{" "}
              {viewing?.fileName}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="flex flex-col gap-3 px-5 py-4">
              <p className="text-xs text-muted-foreground">
                共 {viewing.rowCount} 条成绩 · 上传人 {viewing.uploaderName} ·{" "}
                {formatTime(viewing.uploadedAt)}
              </p>
              <div className="overflow-x-auto rounded-xl border border-[#d8e0f7] bg-[#fbfcff]">
                <table className="w-full min-w-max text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#d8e0f7] bg-[#eff3ff]">
                      {viewing.preview[0]?.map((cell, i) => (
                        <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold text-foreground">
                          {String(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewing.preview.slice(1).map((row, ri) => (
                      <tr key={ri} className="border-b border-[#e6eaf7] last:border-0">
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
                <p className="text-xs text-muted-foreground">
                  仅预览前 {viewing.preview.length - 1} 条数据
                </p>
              )}
            </div>
          )}
          <DialogFooter className="mx-0 mb-0 border-t border-[#dce3f8] bg-white px-5 py-4">
            <Button variant="outline" className="border-[#d8e0f7] bg-[#fbfcff]" onClick={() => setViewing(null)}>
              关闭
            </Button>
            <Button onClick={downloadViewing}>
              <Download className="size-4" aria-hidden="true" />
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
