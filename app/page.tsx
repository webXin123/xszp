import { EvaluationDashboard } from "@/components/evaluation/evaluation-dashboard"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function Home() {
  return (
    <EvaluationProvider>
      <EvaluationDashboard />
    </EvaluationProvider>
  )
}
