import { EvaluationDashboard } from "@/components/evaluation/evaluation-dashboard"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function ClassRatingPage() {
  return <EvaluationProvider><EvaluationDashboard standaloneView="evaluation" /></EvaluationProvider>
}
