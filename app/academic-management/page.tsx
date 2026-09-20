import { AcademicManagementPage } from "@/components/evaluation/evaluation-dashboard"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function AcademicManagementStandalonePage() {
  return <EvaluationProvider><StandalonePageShell mainId="academic-management-main" activeLabel="教务管理" activeIcon="file"><main id="academic-management-main"><AcademicManagementPage /></main></StandalonePageShell></EvaluationProvider>
}
