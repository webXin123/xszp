import { HonorUploadTab } from "@/components/evaluation/honor-upload-tab"
import { StandalonePageShell } from "@/components/evaluation/standalone-page-shell"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function HonorUploadPage() {
  return <EvaluationProvider><StandalonePageShell mainId="honor-upload-main" activeLabel="荣誉录入" activeIcon="file"><main id="honor-upload-main"><HonorUploadTab /></main></StandalonePageShell></EvaluationProvider>
}
