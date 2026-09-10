"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { EvaluationProvider } from "@/lib/evaluation-context"
import { ActivityEnrollView } from "@/components/activity/parent-activity-pages"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"

function EnrollPageInner() {
  const params = useSearchParams()
  const studentId = params.get("student") ?? ""

  if (!studentId) {
    return (
      <StandalonePageShell mainId="activity-enroll-main" activeLabel="活动报名" activeIcon="calendar">
        <main id="activity-enroll-main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-10">
        <p className="rounded-xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          缺少学生信息，请从
          <Link href="/" className="mx-1 font-medium text-brand-blue hover:underline">
            家长首页
          </Link>
          进入活动报名
        </p>
        </main>
      </StandalonePageShell>
    )
  }

  return (
    <StandalonePageShell mainId="activity-enroll-main" activeLabel="活动报名" activeIcon="calendar">
      <main id="activity-enroll-main" className="w-full">
        <ActivityEnrollView studentId={studentId} focusActivityId={params.get("id")} />
      </main>
    </StandalonePageShell>
  )
}

export default function ActivityEnrollPage() {
  return (
    <EvaluationProvider>
      <Suspense fallback={null}>
        <EnrollPageInner />
      </Suspense>
    </EvaluationProvider>
  )
}
