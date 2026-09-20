import { TeachingWorkPage } from "@/components/evaluation/evaluation-dashboard"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function TeachingWorkStandalonePage() {
  return <EvaluationProvider><StandalonePageShell mainId="teaching-work-main" activeLabel="教学工作" activeIcon="file"><main id="teaching-work-main"><TeachingWorkPage /></main></StandalonePageShell></EvaluationProvider>
}
