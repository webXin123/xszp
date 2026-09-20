import { EvaluationDashboard } from "@/components/evaluation/evaluation-dashboard"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function WorkbenchEmbeddedPage() {
  return <EvaluationProvider><EvaluationDashboard embedded /></EvaluationProvider>
}
