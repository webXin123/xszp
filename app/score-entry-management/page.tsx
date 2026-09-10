"use client"

import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { EvaluationProvider, useEvaluation } from "@/lib/evaluation-context"
import { usePermission } from "@/lib/use-permission"
import { ScoreEntryManagement } from "@/components/admin/score-entry-management"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"

function ScoreEntryManagementPageContent() {
  const { grades } = useEvaluation()
  const { role } = usePermission()
  const isDirector = role === "director"

  return <StandalonePageShell mainId="score-entry-management-main" activeLabel="成绩录入管理" activeIcon="file">
      <main id="score-entry-management-main" className="flex w-full flex-col gap-4 pt-1">
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
    </StandalonePageShell>
}

export default function ScoreEntryManagementPage() {
  return <EvaluationProvider><ScoreEntryManagementPageContent /></EvaluationProvider>
}
