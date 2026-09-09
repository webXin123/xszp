"use client"

import Image from "next/image"
import Link from "next/link"
import { FileSpreadsheet, House, ShieldAlert } from "lucide-react"
import { EvaluationProvider, useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { ScoreEntryManagement } from "@/components/admin/score-entry-management"

function ScoreEntryManagementPageContent() {
  const { grades, currentTeacher } = useEvaluation()
  const { role } = usePermission()
  const isDirector = role === "director"

  return (
    <div className="min-h-screen bg-[#eef1ff] px-4 pb-6 pt-16 sm:px-6">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#d7def8] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center justify-between gap-4 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-[#d5ddf7]">
              <Image src="/xszp/images/logo.png" alt="屹力学生综评" width={30} height={30} />
            </span>
            <span className="hidden flex-col leading-tight md:flex"><span className="text-sm font-bold text-foreground">屹力学生综评</span><span className="text-xs text-muted-foreground">综合评价平台</span></span>
          </Link>
          <nav className="flex min-w-0 items-center gap-1 text-sm">
            <Link href="/" className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-[#f1f3ff] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><House className="size-4" aria-hidden="true" />管理员首页</Link>
            <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 font-semibold text-primary"><FileSpreadsheet className="size-4" aria-hidden="true" />成绩录入管理</span>
          </nav>
          <span className="shrink-0 text-xs text-muted-foreground">{currentTeacher ? `${currentTeacher.name} · 管理员` : "管理员"}</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 pt-1">
        {isDirector ? (
          <ScoreEntryManagement grades={grades} />
        ) : (
          <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[26px] border border-[#cbd5f5] bg-white p-8 text-center shadow-[0_24px_52px_-34px_rgba(48,62,139,0.76)]">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldAlert className="size-7" aria-hidden="true" /></span>
            <h1 className="mt-4 text-lg font-bold text-foreground">暂无成绩录入管理权限</h1>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">仅管理员可发布学期成绩录入任务并查看任课教师进度。</p>
            <Link href="/" className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_9px_18px_-12px_rgba(63,81,188,0.88)] transition-colors hover:bg-primary/90">返回管理员首页</Link>
          </section>
        )}
      </main>
    </div>
  )
}

export default function ScoreEntryManagementPage() {
  return <EvaluationProvider><ScoreEntryManagementPageContent /></EvaluationProvider>
}
