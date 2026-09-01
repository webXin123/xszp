"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { EvaluationProvider } from "@/lib/evaluation-context"
import { ActivityEnrollView } from "@/components/activity/parent-activity-pages"

function EnrollPageInner() {
  const params = useSearchParams()
  const studentId = params.get("student") ?? ""

  if (!studentId) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-16">
        <p className="rounded-xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          缺少学生信息，请从
          <Link href="/" className="mx-1 font-medium text-brand-blue hover:underline">
            家长首页
          </Link>
          进入活动报名
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <ActivityEnrollView studentId={studentId} focusActivityId={params.get("id")} />
    </div>
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
