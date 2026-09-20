"use client"

import { useRouter } from "next/navigation"
import { AdminDataDashboard } from "@/components/admin/admin-data-dashboard"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"
import { EvaluationProvider } from "@/lib/evaluation-context"

function AdminDataDashboardPageContent() {
  const router = useRouter()
  return <StandalonePageShell mainId="admin-data-dashboard-main" activeLabel="五育积分数据看板" activeIcon="file"><main id="admin-data-dashboard-main"><AdminDataDashboard onBack={() => router.push("/")} /></main></StandalonePageShell>
}

export default function AdminDataDashboardPage() {
  return <EvaluationProvider><AdminDataDashboardPageContent /></EvaluationProvider>
}
