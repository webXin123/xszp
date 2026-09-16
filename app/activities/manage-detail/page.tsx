import { Suspense } from "react"
import { ActivityManagementDetailPage } from "@/components/activity/activity-management-detail-page"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function ActivityManagementDetailRoute() {
  return (
    <EvaluationProvider>
      <StandalonePageShell mainId="activity-manage-detail-main" activeLabel="活动管理" activeIcon="calendar">
        <main id="activity-manage-detail-main" className="w-full pb-4">
          <Suspense fallback={<div className="rounded-2xl border border-[#dbe2f8] bg-white px-4 py-16 text-center text-sm text-muted-foreground">正在加载活动详情…</div>}>
            <ActivityManagementDetailPage />
          </Suspense>
        </main>
      </StandalonePageShell>
    </EvaluationProvider>
  )
}
