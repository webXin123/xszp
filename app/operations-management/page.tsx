import { OperationsManagementPage } from "@/components/evaluation/evaluation-dashboard"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function OperationsManagementStandalonePage() {
  return <EvaluationProvider><StandalonePageShell mainId="operations-management-main" activeLabel="运营管理" activeIcon="calendar"><main id="operations-management-main"><OperationsManagementPage /></main></StandalonePageShell></EvaluationProvider>
}
