import { Suspense } from "react"
import { AwardCardTab } from "@/components/evaluation/award-card-tab"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function AwardCardsPage() {
  return <EvaluationProvider><StandalonePageShell mainId="award-cards-main" activeLabel="奖卡发放" activeIcon="download"><main id="award-cards-main"><Suspense fallback={<div className="min-h-64" aria-label="正在加载奖卡发放">正在加载…</div>}><AwardCardTab /></Suspense></main></StandalonePageShell></EvaluationProvider>
}
