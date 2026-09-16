import { EvaluationDashboard } from "@/components/evaluation/evaluation-dashboard"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function ActivityManagementPage() {
  return (
    <EvaluationProvider>
      <EvaluationDashboard initialMainTab="activity" />
    </EvaluationProvider>
  )
}
