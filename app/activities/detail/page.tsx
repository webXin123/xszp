"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { EvaluationProvider } from "@/lib/evaluation-context"
import { ActivityDetailView } from "@/components/activity/parent-activity-pages"

function DetailPageInner() {
  const params = useSearchParams()
  const studentId = params.get("student") ?? ""
  const activityId = params.get("id")

  if (!studentId || !activityId) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-16">
        <p className="rounded-xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          缺少活动或学生信息，请从
          <Link href="/" className="mx-1 font-medium text-brand-blue hover:underline">
            家长首页
          </Link>
          进入活动详情
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <ActivityDetailView studentId={studentId} activityId={activityId} />
    </div>
  )
}

export default function ActivityDetailPage() {
  return (
    <EvaluationProvider>
      <Suspense fallback={null}>
        <DetailPageInner />
      </Suspense>
    </EvaluationProvider>
  )
}
