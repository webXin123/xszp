import { MallManagement } from "@/components/mall/mall-management"
import { EvaluationProvider } from "@/lib/evaluation-context"

export default function MallManagementPage() {
  return <EvaluationProvider><MallManagement /></EvaluationProvider>
}
